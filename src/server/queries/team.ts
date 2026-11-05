import "server-only";
import type { AppContext } from "@/lib/auth/context";

export type MemberOption = {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
  status: string;
  department_id: string | null;
};

export type RoleOption = {
  id: string;
  key: string;
  name: string;
  color: string;
  grants_all: boolean;
  is_system: boolean;
};

export type DepartmentOption = {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
};

export async function getMemberOptions(
  ctx: AppContext,
): Promise<MemberOption[]> {
  const { data, error } = await ctx.supabase
    .from("organization_members")
    .select(
      "user_id, status, department_id, profile:profiles!organization_members_user_id_fkey(full_name, email, avatar_url, job_title)",
    )
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;
  return (data ?? [])
    .filter((m) => m.profile)
    .map((m) => ({
      user_id: m.user_id,
      status: m.status,
      department_id: m.department_id,
      full_name: m.profile!.full_name,
      email: m.profile!.email,
      avatar_url: m.profile!.avatar_url,
      job_title: m.profile!.job_title,
    }))
    .sort((a, b) =>
      (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email),
    );
}

export async function getRoleOptions(ctx: AppContext): Promise<RoleOption[]> {
  const { data, error } = await ctx.supabase
    .from("roles")
    .select("id, key, name, color, grants_all, is_system")
    .eq("organization_id", ctx.organization.id)
    .order("is_system", { ascending: false })
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getDepartmentOptions(
  ctx: AppContext,
): Promise<DepartmentOption[]> {
  const { data, error } = await ctx.supabase
    .from("departments")
    .select("id, name, color, is_active")
    .eq("organization_id", ctx.organization.id)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export type ScopedAssignment = {
  id: string;
  user_id: string;
  scope: string;
  company_id: string | null;
  project_id: string | null;
  role: { id: string; name: string; color: string; grants_all: boolean } | null;
  profile: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    job_title: string | null;
  } | null;
};

/** Role assignments, optionally limited to one company or project scope. */
export async function getAssignments(
  ctx: AppContext,
  filter: { companyId?: string; projectId?: string; userId?: string } = {},
): Promise<ScopedAssignment[]> {
  let query = ctx.supabase
    .from("user_role_assignments")
    .select(
      "id, user_id, scope, company_id, project_id, role:roles(id, name, color, grants_all), profile:profiles!user_role_assignments_user_id_fkey(full_name, email, avatar_url, job_title)",
    )
    .eq("organization_id", ctx.organization.id)
    .order("created_at");
  if (filter.projectId) query = query.eq("project_id", filter.projectId);
  else if (filter.companyId)
    query = query.eq("company_id", filter.companyId).is("project_id", null);
  if (filter.userId) query = query.eq("user_id", filter.userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ScopedAssignment[];
}
