import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { EntityAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate, timeAgo } from "@/lib/utils";
import type { ReportListItem } from "@/server/queries/daily-reports";

const STATUS = {
  draft: { label: "Draft", variant: "secondary" },
  submitted: { label: "Awaiting review", variant: "warning" },
  reviewed: { label: "Reviewed", variant: "success" },
} as const;

export function ReportStatus({ status }: { status: string }) {
  const s = STATUS[status as keyof typeof STATUS] ?? STATUS.draft;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function ReportsList({
  reports,
  showAuthor,
}: {
  reports: ReportListItem[];
  showAuthor?: boolean;
}) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {reports.map((r) => (
        <li key={r.id}>
          <Link
            href={`/daily-reports/${r.id}`}
            className="flex flex-col gap-2 p-4 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {showAuthor && (
                <EntityAvatar name={r.author} src={r.avatar_url} />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {showAuthor && <>{r.author} · </>}
                  {formatDate(r.report_date, "EEE, d MMM yyyy")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.project_name
                    ? `${r.company_name} › ${r.project_name}`
                    : r.company_name}
                  {r.summary ? ` — ${r.summary.split("\n")[0]}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {r.comment_count > 0 && (
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="size-3.5" /> {r.comment_count}
                </span>
              )}
              {r.submitted_at && (
                <span>Submitted {timeAgo(r.submitted_at)}</span>
              )}
              <ReportStatus status={r.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
