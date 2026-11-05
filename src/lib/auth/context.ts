import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, type ServerSupabase } from "@/lib/supabase/server";
import {
  can,
  canAnywhere,
  isOrgAdmin,
  type Grant,
  type Scope,
} from "@/lib/permissions";

export const SCOPE_COMPANY_COOKIE = "dm_company";
export const SCOPE_PROJECT_COOKIE = "dm_project";

export type SessionUser = { id: string; email: string };

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  timezone: string;
  currency: string;
  primary_color: string;
};

export type ScopeCompany = {
  id: string;
  name: string;
  logo_url: string | null;
  status: string;
};
export type ScopeProject = {
  id: string;
  name: string;
  company_id: string;
  status: string;
};

export type AppContext = {
  supabase: ServerSupabase;
  user: SessionUser;
  profile: Profile;
  organization: Organization;
  memberStatus: string;
  grants: Grant[];
  companies: ScopeCompany[];
  projects: ScopeProject[];
  /** Company/project chosen in the header switcher (validated against access). */
  selection: { companyId: string | null; projectId: string | null };
  can: (permission: string, scope?: Scope) => boolean;
  canAnywhere: (permission: string) => boolean;
  isAdmin: boolean;
};

/** Verified user from the session cookie (JWT validated by Supabase). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return {
    id: data.claims.sub,
    email: (data.claims.email as string | undefined) ?? "",
  };
});

type MembershipState =
  | { kind: "member"; ctx: AppContext }
  | { kind: "no-organization"; bootstrapOpen: boolean }
  | { kind: "suspended" };

/**
 * Loads everything the authenticated shell needs, once per request
 * (React cache). Every query runs as the user, so RLS decides what comes back.
 */
export const loadAppContext = cache(
  async (): Promise<MembershipState | null> => {
    const user = await getSessionUser();
    if (!user) return null;
    const supabase = await createClient();

    const { data: memberships } = await supabase
      .from("organization_members")
      .select(
        "status, organization:organizations(id, name, slug, logo_url, timezone, currency, primary_color)",
      )
      .eq("user_id", user.id);

    const active = memberships?.find(
      (m) => m.status === "active" && m.organization,
    );
    if (!active?.organization) {
      if (memberships?.some((m) => m.status === "suspended"))
        return { kind: "suspended" };
      const { data: open } = await supabase.rpc("organization_bootstrap_open");
      return { kind: "no-organization", bootstrapOpen: Boolean(open) };
    }

    const organization = active.organization as Organization;

    const [profileRes, grantsRes, companiesRes, projectsRes, cookieStore] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, full_name, avatar_url, job_title")
          .eq("id", user.id)
          .single(),
        supabase.rpc("get_my_grants"),
        supabase
          .from("companies")
          .select("id, name, logo_url, status")
          .eq("organization_id", organization.id)
          .is("deleted_at", null)
          .order("name"),
        supabase
          .from("projects")
          .select("id, name, company_id, status")
          .is("deleted_at", null)
          .order("name"),
        cookies(),
      ]);

    const grants = ((grantsRes.data ?? []) as Grant[]).filter(
      (g) => g.organization_id === organization.id,
    );
    const companies = (companiesRes.data ?? []) as ScopeCompany[];
    const companyIds = new Set(companies.map((c) => c.id));
    const projects = ((projectsRes.data ?? []) as ScopeProject[]).filter((p) =>
      companyIds.has(p.company_id),
    );

    // Header selection, validated so a stale or forged cookie cannot widen access.
    let companyId = cookieStore.get(SCOPE_COMPANY_COOKIE)?.value ?? null;
    let projectId = cookieStore.get(SCOPE_PROJECT_COOKIE)?.value ?? null;
    if (companyId && !companyIds.has(companyId)) companyId = null;
    const project = projectId
      ? projects.find((p) => p.id === projectId)
      : undefined;
    if (!project || (companyId && project.company_id !== companyId))
      projectId = null;
    if (project && !companyId) companyId = project.company_id;

    const profile: Profile = profileRes.data ?? {
      id: user.id,
      email: user.email,
      full_name: null,
      avatar_url: null,
      job_title: null,
    };

    const ctx: AppContext = {
      supabase,
      user,
      profile,
      organization,
      memberStatus: active.status,
      grants,
      companies,
      projects,
      selection: { companyId, projectId },
      can: (permission, scope) => can(grants, permission, scope),
      canAnywhere: (permission) => canAnywhere(grants, permission),
      isAdmin: isOrgAdmin(grants),
    };
    return { kind: "member", ctx };
  },
);

/** For pages and layouts inside the app shell. Redirects when not allowed in. */
export async function requireAppContext(): Promise<AppContext> {
  const state = await loadAppContext();
  if (!state) redirect("/login");
  if (state.kind === "suspended") redirect("/no-access?reason=suspended");
  if (state.kind === "no-organization")
    redirect(state.bootstrapOpen ? "/onboarding" : "/no-access");
  return state.ctx;
}

/**
 * For server actions: same as requireAppContext but returns null instead of
 * redirecting, so the action can answer with a proper error message.
 */
export async function getActionContext(): Promise<AppContext | null> {
  const state = await loadAppContext();
  return state?.kind === "member" ? state.ctx : null;
}

/** Page-level guard: show the "no permission" screen instead of rendering. */
export function hasPageAccess(ctx: AppContext, permission: string) {
  return ctx.canAnywhere(permission);
}
