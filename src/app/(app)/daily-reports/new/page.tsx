import type { Metadata } from "next";
import { format } from "date-fns";
import { requireAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { NoPermission } from "@/components/shared/no-permission";
import { DailyReportForm } from "@/components/daily-reports/daily-report-form";
import { reportScopes } from "@/server/queries/daily-reports";

export const metadata: Metadata = { title: "New daily report" };

export default async function NewDailyReportPage() {
  const ctx = await requireAppContext();
  const scopes = reportScopes(ctx);
  if (!scopes.companies.length) return <NoPermission what="daily reports" />;
  const { companyId, projectId } = ctx.selection;
  const company =
    scopes.companies.find((c) => c.id === companyId) ??
    (scopes.companies.length === 1 ? scopes.companies[0] : undefined);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Daily report"
        description="Saved drafts are only visible to you until you submit."
      />
      <DailyReportForm
        scopes={scopes}
        initial={{
          company_id: company?.id ?? "",
          project_id:
            company &&
            projectId &&
            scopes.projects.some((p) => p.id === projectId)
              ? projectId
              : "",
          report_date: format(new Date(), "yyyy-MM-dd"),
          completed_activities: "",
          work_in_progress: "",
          pending_activities: "",
          challenges: "",
          tomorrow_plan: "",
          hours_worked: "",
        }}
      />
    </div>
  );
}
