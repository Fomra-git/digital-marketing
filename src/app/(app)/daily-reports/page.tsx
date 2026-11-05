import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NoPermission } from "@/components/shared/no-permission";
import { ReportsList } from "@/components/daily-reports/reports-list";
import { listReports, reportScopes } from "@/server/queries/daily-reports";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Daily reports" };

export default async function DailyReportsPage({
  searchParams,
}: PageProps<"/daily-reports">) {
  const ctx = await requireAppContext();
  const params = await searchParams;
  const canSubmit = reportScopes(ctx).companies.length > 0;
  const canSeeTeam =
    ctx.canAnywhere("daily_reports.view_all") ||
    ctx.canAnywhere("daily_reports.review");
  if (!canSubmit && !canSeeTeam) return <NoPermission what="daily reports" />;

  const tab =
    params.tab === "team" && canSeeTeam ? "team" : canSubmit ? "mine" : "team";
  const status = typeof params.status === "string" ? params.status : undefined;
  const { companyId, projectId } = ctx.selection;
  let reports = await listReports(ctx, {
    mine: tab === "mine",
    companyId,
    projectId,
  });
  if (tab === "team")
    reports = reports.filter(
      (r) => r.user_id !== ctx.user.id && (!status || r.status === status),
    );

  const tabs = [
    canSubmit && { key: "mine", label: "My reports", href: "/daily-reports" },
    canSeeTeam && {
      key: "team",
      label: "Team reports",
      href: "/daily-reports?tab=team",
    },
  ].filter(Boolean) as { key: string; label: string; href: string }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily reports"
        description="What was done, what is in progress and what is blocked — one short report per day."
        actions={
          canSubmit ? (
            <Button asChild>
              <Link href="/daily-reports/new">
                <Plus /> Write today&apos;s report
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex rounded-lg bg-muted p-1 text-sm">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium",
                tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {tab === "team" && (
          <nav className="inline-flex rounded-lg bg-muted p-1 text-sm">
            {[
              [undefined, "All"],
              ["submitted", "Awaiting review"],
              ["reviewed", "Reviewed"],
            ].map(([s, label]) => (
              <Link
                key={label}
                href={
                  s
                    ? `/daily-reports?tab=team&status=${s}`
                    : "/daily-reports?tab=team"
                }
                className={cn(
                  "rounded-md px-3 py-1.5",
                  status === s ? "bg-card shadow-sm" : "text-muted-foreground",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      {reports.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            tab === "mine"
              ? "You have not written a report yet"
              : "No team reports here"
          }
          description={
            tab === "mine"
              ? "Takes two minutes: what you completed, what is in progress and tomorrow's plan."
              : "Submitted reports from your team appear here."
          }
        />
      ) : (
        <ReportsList reports={reports} showAuthor={tab === "team"} />
      )}
    </div>
  );
}
