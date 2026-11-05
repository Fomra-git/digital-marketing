import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { NoPermission } from "@/components/shared/no-permission";
import {
  ProjectsView,
  type ProjectRow,
} from "@/components/projects/projects-view";
import { getMemberOptions } from "@/server/queries/team";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const ctx = await requireAppContext();
  if (!ctx.canAnywhere(P.projectsView)) return <NoPermission what="projects" />;

  const { companyId, projectId } = ctx.selection;
  let query = ctx.supabase
    .from("projects")
    .select(
      "id, name, status, category, image_url, start_date, company_id, company:companies(name), manager:profiles!projects_manager_id_fkey(full_name, email), project_members(count)",
    )
    .is("deleted_at", null)
    .order("name");
  if (projectId) query = query.eq("id", projectId);
  else if (companyId) query = query.eq("company_id", companyId);
  const { data, error } = await query;
  if (error) throw error;

  const visibleCompanyIds = new Set(ctx.companies.map((c) => c.id));
  const rows: ProjectRow[] = (data ?? [])
    .filter((p) => visibleCompanyIds.has(p.company_id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      category: p.category,
      image_url: p.image_url,
      start_date: p.start_date,
      company_id: p.company_id,
      company_name: p.company?.name ?? "—",
      manager: p.manager?.full_name ?? p.manager?.email ?? null,
      member_count: p.project_members?.[0]?.count ?? 0,
    }));

  const creatableCompanies = ctx.companies
    .filter((c) => ctx.can(P.projectsCreate, { companyId: c.id }))
    .map((c) => ({ id: c.id, name: c.name }));
  const members = creatableCompanies.length ? await getMemberOptions(ctx) : [];
  const scopeLabel = companyId
    ? ctx.companies.find((c) => c.id === companyId)?.name
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={
          scopeLabel
            ? `Projects of ${scopeLabel}. Change the company in the header to see others.`
            : "Projects across all companies you can access."
        }
      />
      <ProjectsView
        projects={rows}
        creatableCompanies={creatableCompanies}
        members={members}
        defaultCompanyId={companyId ?? undefined}
        scopeLabel={scopeLabel}
      />
    </div>
  );
}
