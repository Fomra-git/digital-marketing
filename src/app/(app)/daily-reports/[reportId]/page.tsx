import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAppContext } from "@/lib/auth/context";
import { id as idSchema } from "@/lib/validations/common";
import { ReportDetail } from "@/components/daily-reports/report-detail";
import { reportScopes } from "@/server/queries/daily-reports";

export const metadata: Metadata = { title: "Daily report" };

export default async function DailyReportPage({
  params,
}: PageProps<"/daily-reports/[reportId]">) {
  const { reportId } = await params;
  if (!idSchema.safeParse(reportId).success) notFound();
  const ctx = await requireAppContext();
  const db = ctx.supabase;

  const { data: r } = await db
    .from("daily_reports")
    .select(
      "*, company:companies(name), project:projects!daily_reports_project_id_company_id_fkey(name), author:profiles!daily_reports_user_id_fkey(full_name, email, avatar_url), reviewer:profiles!daily_reports_reviewed_by_fkey(full_name, email)",
    )
    .eq("id", reportId)
    .maybeSingle();
  if (!r) notFound();

  const [commentsRes, filesRes] = await Promise.all([
    db
      .from("daily_report_comments")
      .select(
        "id, body, created_at, author:profiles!daily_report_comments_author_id_fkey(full_name, email, avatar_url)",
      )
      .eq("daily_report_id", reportId)
      .order("created_at"),
    db
      .from("daily_report_attachments")
      .select(
        "id, file_name, storage_path, size_bytes, created_at, uploaded_by, uploader:profiles!daily_report_attachments_uploaded_by_fkey(full_name, email)",
      )
      .eq("daily_report_id", reportId)
      .order("created_at"),
  ]);

  return (
    <ReportDetail
      scopes={reportScopes(ctx)}
      report={{
        id: r.id,
        user_id: r.user_id,
        author: r.author?.full_name ?? r.author?.email ?? "Unknown",
        avatar_url: r.author?.avatar_url ?? null,
        report_date: r.report_date,
        status: r.status,
        company_id: r.company_id,
        company_name: r.company?.name ?? "—",
        project_id: r.project_id,
        project_name: r.project?.name ?? null,
        completed_activities: r.completed_activities,
        work_in_progress: r.work_in_progress,
        pending_activities: r.pending_activities,
        challenges: r.challenges,
        tomorrow_plan: r.tomorrow_plan,
        hours_worked: r.hours_worked,
        submitted_at: r.submitted_at,
        reviewed_at: r.reviewed_at,
        reviewer: r.reviewer?.full_name ?? r.reviewer?.email ?? null,
      }}
      comments={(commentsRes.data ?? []).map((c) => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        author: c.author?.full_name ?? c.author?.email ?? "Unknown",
        avatar_url: c.author?.avatar_url ?? null,
      }))}
      attachments={(filesRes.data ?? []).map((f) => ({
        id: f.id,
        file_name: f.file_name,
        storage_path: f.storage_path,
        size_bytes: f.size_bytes,
        created_at: f.created_at,
        uploaded_by: f.uploaded_by,
        uploader_name: f.uploader?.full_name ?? f.uploader?.email ?? "Unknown",
      }))}
    />
  );
}
