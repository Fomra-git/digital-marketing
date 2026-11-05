"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EntityAvatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import {
  FileAttachments,
  type AttachmentItem,
} from "@/components/shared/file-attachments";
import { useShell } from "@/components/layout/shell-context";
import {
  addDailyReportAttachment,
  addDailyReportComment,
  deleteDailyReport,
  deleteDailyReportAttachment,
  getDailyReportFileUrl,
  reviewDailyReport,
} from "@/server/actions/daily-reports";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";
import { DailyReportForm, type ReportScopes } from "./daily-report-form";
import { ReportStatus } from "./reports-list";

export type ReportDetailData = {
  id: string;
  user_id: string;
  author: string;
  avatar_url: string | null;
  report_date: string;
  status: string;
  company_id: string;
  company_name: string;
  project_id: string | null;
  project_name: string | null;
  completed_activities: string | null;
  work_in_progress: string | null;
  pending_activities: string | null;
  challenges: string | null;
  tomorrow_plan: string | null;
  hours_worked: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer: string | null;
};

export type ReportComment = {
  id: string;
  body: string;
  created_at: string;
  author: string;
  avatar_url: string | null;
};

const SECTIONS = [
  ["completed_activities", "Completed"],
  ["work_in_progress", "In progress"],
  ["pending_activities", "Pending"],
  ["challenges", "Challenges / blockers"],
  ["tomorrow_plan", "Tomorrow's plan"],
] as const;

export function ReportDetail({
  report,
  comments,
  attachments,
  scopes,
}: {
  report: ReportDetailData;
  comments: ReportComment[];
  attachments: AttachmentItem[];
  scopes: ReportScopes;
}) {
  const router = useRouter();
  const { userId, can } = useShell();
  const isAuthor = report.user_id === userId;
  const canReview =
    !isAuthor &&
    can("daily_reports.review", {
      companyId: report.company_id,
      projectId: report.project_id,
    });
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    after?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      if (after) after();
      else router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title={`Edit report · ${formatDate(report.report_date)}`}
          actions={
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          }
        />
        <DailyReportForm
          scopes={scopes}
          reportId={report.id}
          status={report.status}
          initial={{
            company_id: report.company_id,
            project_id: report.project_id ?? "",
            report_date: report.report_date,
            completed_activities: report.completed_activities ?? "",
            work_in_progress: report.work_in_progress ?? "",
            pending_activities: report.pending_activities ?? "",
            challenges: report.challenges ?? "",
            tomorrow_plan: report.tomorrow_plan ?? "",
            hours_worked: report.hours_worked?.toString() ?? "",
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={isAuthor ? "/daily-reports" : "/daily-reports?tab=team"}
            className="hover:underline"
          >
            Daily reports
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <EntityAvatar
              name={report.author}
              src={report.avatar_url}
              className="size-9"
            />
            <span className="truncate">
              {isAuthor ? "My report" : report.author} ·{" "}
              {formatDate(report.report_date, "EEE, d MMM yyyy")}
            </span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ReportStatus status={report.status} />
            <span>
              {report.project_name
                ? `${report.company_name} › ${report.project_name}`
                : report.company_name}
            </span>
            {report.hours_worked !== null && (
              <span>· {report.hours_worked} h</span>
            )}
          </span>
        }
        actions={
          isAuthor && report.status !== "reviewed" ? (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
              {report.status === "draft" && (
                <Button
                  variant="outline"
                  onClick={() =>
                    run(
                      () => deleteDailyReport(report.id),
                      () => router.push("/daily-reports"),
                    )
                  }
                >
                  <Trash2 /> Delete draft
                </Button>
              )}
            </>
          ) : null
        }
      />

      <Card>
        <CardContent className="grid gap-5">
          {SECTIONS.map(([key, label]) => (
            <section key={key}>
              <h2 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
              </h2>
              <p className="text-sm whitespace-pre-line">
                {report[key] || (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </section>
          ))}
          <p className="border-t pt-3 text-xs text-muted-foreground">
            {report.submitted_at
              ? `Submitted ${formatDateTime(report.submitted_at)}`
              : "Not submitted yet — only you can see this draft."}
            {report.reviewed_at &&
              ` · Reviewed by ${report.reviewer ?? "a manager"} ${timeAgo(report.reviewed_at)}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          <FileAttachments
            bucket="daily-report-files"
            entityId={report.id}
            items={attachments}
            currentUserId={userId}
            canUpload={isAuthor && report.status !== "reviewed"}
            maxBytes={50 * 1024 * 1024}
            onRegister={(input) => addDailyReportAttachment(report.id, input)}
            onDelete={(id) => deleteDailyReportAttachment(id, report.id)}
            getUrl={getDailyReportFileUrl}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <EntityAvatar name={c.author} src={c.avatar_url} />
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{c.author}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(c.created_at)}
                      </span>
                    </p>
                    <p className="text-sm whitespace-pre-line">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(isAuthor || canReview) && report.status !== "draft" && (
            <div className="space-y-2 border-t pt-4">
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  canReview
                    ? "Feedback for the team member (optional when reviewing)…"
                    : "Reply to your manager…"
                }
                aria-label="Feedback"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={!note.trim() || pending}
                  onClick={() =>
                    run(
                      () => addDailyReportComment(report.id, note),
                      () => {
                        setNote("");
                        router.refresh();
                      },
                    )
                  }
                >
                  Add comment
                </Button>
                {canReview && report.status === "submitted" && (
                  <Button
                    loading={pending}
                    onClick={() =>
                      run(
                        () => reviewDailyReport(report.id, note),
                        () => {
                          setNote("");
                          router.refresh();
                        },
                      )
                    }
                  >
                    <CheckCircle2 /> Mark as reviewed
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
