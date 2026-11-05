"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth/context";
import {
  dbFailure,
  failure,
  success,
  validationFailure,
  type ActionResult,
} from "@/lib/actions";
import {
  dailyReportSchema,
  type DailyReportInput,
} from "@/lib/validations/daily-report";
import { attachmentSchema, type AttachmentInput } from "@/lib/validations/task";
import { id as idSchema } from "@/lib/validations/common";
import { nullable } from "@/lib/utils";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

function revalidate(id?: string) {
  revalidatePath("/daily-reports");
  revalidatePath("/team-performance");
  if (id) revalidatePath(`/daily-reports/${id}`);
}

/** Create or update the caller's report; `submit` sends it to their manager. */
export async function saveDailyReport(
  input: DailyReportInput,
  reportId?: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const parsed = dailyReportSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  const projectId = nullable(v.project_id);
  if (!ctx.companies.some((c) => c.id === v.company_id))
    return failure("Company not available.");
  if (
    projectId &&
    !ctx.projects.some(
      (p) => p.id === projectId && p.company_id === v.company_id,
    )
  ) {
    return failure("Project not available.");
  }
  if (
    !ctx.can("daily_reports.submit", { companyId: v.company_id, projectId })
  ) {
    return failure(
      "You do not have permission to submit daily reports for this company.",
    );
  }

  const content = {
    completed_activities: nullable(v.completed_activities),
    work_in_progress: nullable(v.work_in_progress),
    pending_activities: nullable(v.pending_activities),
    challenges: nullable(v.challenges),
    tomorrow_plan: nullable(v.tomorrow_plan),
    hours_worked: v.hours_worked === "" ? null : Number(v.hours_worked),
  };

  let id = reportId;
  if (id) {
    if (!idSchema.safeParse(id).success) return failure("Invalid report.");
    const { data, error } = await ctx.supabase
      .from("daily_reports")
      .update(content)
      .eq("id", id)
      .eq("user_id", ctx.user.id)
      .select("id, status");
    if (error) return dbFailure(error, "update daily report");
    if (!data?.length) return failure("This report can no longer be edited.");
  } else {
    const { data, error } = await ctx.supabase
      .from("daily_reports")
      .insert({
        ...content,
        company_id: v.company_id,
        project_id: projectId,
        report_date: v.report_date,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505")
        return failure(
          "You already have a report for this date and company. Open it from the list to edit it.",
        );
      return dbFailure(error, "create daily report");
    }
    id = data.id;
  }

  if (v.submit) {
    const { error } = await ctx.supabase
      .from("daily_reports")
      .update({ status: "submitted" })
      .eq("id", id)
      .eq("status", "draft");
    if (error) return dbFailure(error, "submit daily report");
  }
  revalidate(id);
  return success(
    { id: id! },
    v.submit ? "Report submitted to your manager." : "Draft saved.",
  );
}

export async function deleteDailyReport(
  reportId: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const { data, error } = await ctx.supabase
    .from("daily_reports")
    .delete()
    .eq("id", reportId)
    .select("id");
  if (error) return dbFailure(error, "delete daily report");
  if (!data?.length) return failure("Only your own drafts can be deleted.");
  revalidate();
  return success(undefined, "Draft deleted.");
}

export async function reviewDailyReport(
  reportId: string,
  comment?: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const text = comment?.trim();
  if (text) {
    const { error } = await ctx.supabase
      .from("daily_report_comments")
      .insert({ daily_report_id: reportId, body: text.slice(0, 5000) });
    if (error) return dbFailure(error, "comment daily report");
  }
  const { data, error } = await ctx.supabase
    .from("daily_reports")
    .update({ status: "reviewed" })
    .eq("id", reportId)
    .eq("status", "submitted")
    .select("id");
  if (error) return dbFailure(error, "review daily report");
  if (!data?.length)
    return failure(
      "Only submitted reports can be marked as reviewed, by a reviewer.",
    );
  revalidate(reportId);
  return success(undefined, "Marked as reviewed.");
}

export async function addDailyReportComment(
  reportId: string,
  body: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const text = body.trim();
  if (!text) return failure("Write a comment.");
  const { error } = await ctx.supabase
    .from("daily_report_comments")
    .insert({ daily_report_id: reportId, body: text.slice(0, 5000) });
  if (error) return dbFailure(error, "comment daily report");
  revalidate(reportId);
  return success(undefined, "Comment added.");
}

export async function addDailyReportAttachment(
  reportId: string,
  input: AttachmentInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const parsed = attachmentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  if (!parsed.data.storage_path.startsWith(`${reportId}/`))
    return failure("Invalid file location.");
  const { error } = await ctx.supabase.from("daily_report_attachments").insert({
    daily_report_id: reportId,
    storage_path: parsed.data.storage_path,
    file_name: parsed.data.file_name,
    mime_type: parsed.data.mime_type,
    size_bytes: parsed.data.size_bytes,
  });
  if (error) return dbFailure(error, "add report attachment");
  revalidate(reportId);
  return success(undefined, "File attached.");
}

export async function deleteDailyReportAttachment(
  attachmentId: string,
  reportId: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const { data, error } = await ctx.supabase
    .from("daily_report_attachments")
    .delete()
    .eq("id", attachmentId)
    .select("storage_path");
  if (error) return dbFailure(error, "delete report attachment");
  if (!data?.length) return failure("You cannot remove this file.");
  await ctx.supabase.storage
    .from("daily-report-files")
    .remove(data.map((d) => d.storage_path));
  revalidate(reportId);
  return success(undefined, "File removed.");
}

export async function getDailyReportFileUrl(
  storagePath: string,
): Promise<ActionResult<{ url: string }>> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const { data, error } = await ctx.supabase.storage
    .from("daily-report-files")
    .createSignedUrl(storagePath, 300);
  if (error || !data) return failure("You cannot open this file.");
  return success({ url: data.signedUrl });
}
