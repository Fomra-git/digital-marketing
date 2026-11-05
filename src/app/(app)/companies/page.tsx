import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { NoPermission } from "@/components/shared/no-permission";
import {
  CompaniesView,
  type CompanyRow,
} from "@/components/companies/companies-view";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const ctx = await requireAppContext();
  if (!ctx.canAnywhere(P.companiesView))
    return <NoPermission what="companies" />;

  const { data, error } = await ctx.supabase
    .from("companies")
    .select(
      "id, name, industry, status, logo_url, website_url, created_at, projects(count), company_members(count)",
    )
    .eq("organization_id", ctx.organization.id)
    .is("deleted_at", null)
    .is("projects.deleted_at", null)
    .order("name");
  if (error) throw error;

  const rows: CompanyRow[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    status: c.status,
    logo_url: c.logo_url,
    website_url: c.website_url,
    created_at: c.created_at,
    project_count: c.projects?.[0]?.count ?? 0,
    member_count: c.company_members?.[0]?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="All companies you have access to. Each company has its own projects, team and settings."
      />
      <CompaniesView companies={rows} canCreate={ctx.can(P.companiesCreate)} />
    </div>
  );
}
