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
  ProjectDetail,
  type ProjectDetailData,
} from "@/components/projects/project-detail";

export const metadata: Metadata = { title: "Project" };

const tri = (v: boolean | null) => (v === null ? "inherit" : v ? "yes" : "no");

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  if (!idSchema.safeParse(projectId).success) notFound();
  const ctx = await requireAppContext();

  const { data: project } = await ctx.supabase
    .from("projects")
    .select(
      "id, company_id, name, slug, description, website_url, image_url, category, start_date, end_date, status, manager_id, created_at, company:companies(name), manager:profiles!projects_manager_id_fkey(full_name, email)",
    )
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!project) notFound();

  const canManageUsers = ctx.can(P.usersManage);
  const canEdit = ctx.can(P.projectsEdit, {
    companyId: project.company_id,
    projectId,
  });
  const [settingsRes, assignments, inherited, members, roles] =
    await Promise.all([
      ctx.supabase
        .from("project_settings")
        .select(
          "social_approval_required, creative_approval_required, monthly_ad_budget, target_cpl",
        )
        .eq("project_id", projectId)
        .maybeSingle(),
      getAssignments(ctx, { projectId }),
      ctx.supabase
        .from("user_role_assignments")
        .select("user_id")
        .eq("organization_id", ctx.organization.id)
        .or(
          `scope.eq.organization,and(company_id.eq.${project.company_id},project_id.is.null)`,
        ),
      canManageUsers || canEdit ? getMemberOptions(ctx) : Promise.resolve([]),
      canManageUsers ? getRoleOptions(ctx) : Promise.resolve([]),
    ]);

  const s = settingsRes.data;
  const data: ProjectDetailData = {
    id: project.id,
    company_id: project.company_id,
    company_name: project.company?.name ?? "—",
    name: project.name,
    slug: project.slug,
    description: project.description,
    website_url: project.website_url,
    image_url: project.image_url,
    category: project.category,
    start_date: project.start_date,
    end_date: project.end_date,
    status: project.status as ProjectDetailData["status"],
    manager_id: project.manager_id,
    manager_name: project.manager?.full_name ?? project.manager?.email ?? null,
    created_at: project.created_at,
  };

  return (
    <ProjectDetail
      project={data}
      settings={
        s
          ? {
              social_approval_required: tri(s.social_approval_required),
              creative_approval_required: tri(s.creative_approval_required),
              monthly_ad_budget: s.monthly_ad_budget?.toString() ?? "",
              target_cpl: s.target_cpl?.toString() ?? "",
            }
          : null
      }
      assignments={assignments}
      inheritedCount={
        new Set((inherited.data ?? []).map((a) => a.user_id)).size
      }
      members={members}
      roles={roles}
    />
  );
}
