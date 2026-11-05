import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { id as idSchema } from "@/lib/validations/common";
import {
  getAssignments,
  getMemberOptions,
  getRoleOptions,
} from "@/server/queries/team";
import {
  CompanyDetail,
  type CompanyDetailData,
} from "@/components/companies/company-detail";

export const metadata: Metadata = { title: "Company" };

export default async function CompanyPage({
  params,
}: PageProps<"/companies/[companyId]">) {
  const { companyId } = await params;
  if (!idSchema.safeParse(companyId).success) notFound();
  const ctx = await requireAppContext();

  const { data: company } = await ctx.supabase
    .from("companies")
    .select(
      "id, name, slug, description, logo_url, website_url, industry, contact_name, contact_email, contact_phone, address, status, created_at",
    )
    .eq("id", companyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!company) notFound();

  const canManageUsers = ctx.can(P.usersManage);
  const [projectsRes, settingsRes, assignments, orgWide, members, roles] =
    await Promise.all([
      ctx.supabase
        .from("projects")
        .select(
          "id, name, status, category, start_date, image_url, manager:profiles!projects_manager_id_fkey(full_name, email)",
        )
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("name"),
      ctx.supabase
        .from("company_settings")
        .select(
          "social_approval_required, creative_approval_required, brand_primary_color, brand_guidelines_url",
        )
        .eq("company_id", companyId)
        .maybeSingle(),
      getAssignments(ctx, { companyId }),
      ctx.supabase
        .from("user_role_assignments")
        .select("user_id")
        .eq("organization_id", ctx.organization.id)
        .eq("scope", "organization"),
      canManageUsers || ctx.can(P.projectsCreate, { companyId })
        ? getMemberOptions(ctx)
        : Promise.resolve([]),
      canManageUsers ? getRoleOptions(ctx) : Promise.resolve([]),
    ]);

  const settings = settingsRes.data
    ? {
        social_approval_required: settingsRes.data.social_approval_required,
        creative_approval_required: settingsRes.data.creative_approval_required,
        brand_primary_color: settingsRes.data.brand_primary_color ?? "",
        brand_guidelines_url: settingsRes.data.brand_guidelines_url ?? "",
      }
    : null;

  return (
    <CompanyDetail
      company={company as CompanyDetailData}
      projects={(projectsRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        category: p.category,
        start_date: p.start_date,
        image_url: p.image_url,
        manager: p.manager?.full_name ?? p.manager?.email ?? null,
      }))}
      settings={settings}
      assignments={assignments}
      members={members}
      roles={roles}
      orgWideCount={new Set((orgWide.data ?? []).map((a) => a.user_id)).size}
    />
  );
}
