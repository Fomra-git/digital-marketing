import { z } from "zod";
import { id, optionalDate, optionalId, optionalText } from "./common";

export const TASK_STATUSES = [
  "new",
  "assigned",
  "in_progress",
  "waiting_for_review",
  "revision_required",
  "approved",
  "completed",
  "on_hold",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_CATEGORIES = [
  "meta_ads",
  "google_ads",
  "social_media",
  "graphic_design",
  "ai_video",
  "video_shooting",
  "video_editing",
  "content_writing",
  "seo",
  "website_optimization",
  "reporting",
  "other",
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting_for_review: "Waiting for review",
  revision_required: "Revision required",
  approved: "Approved",
  completed: "Completed",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  social_media: "Social Media",
  graphic_design: "Graphic Design",
  ai_video: "AI Video Creation",
  video_shooting: "Video Shooting",
  video_editing: "Video Editing",
  content_writing: "Content Writing",
  seo: "SEO",
  website_optimization: "Website Optimization",
  reporting: "Reporting",
  other: "Other",
};

export const OPEN_STATUSES: TaskStatus[] = [
  "new",
  "assigned",
  "in_progress",
  "waiting_for_review",
  "revision_required",
  "on_hold",
];

export const taskSchema = z
  .object({
    company_id: id,
    project_id: optionalId,
    department_id: optionalId,
    parent_task_id: optionalId,
    title: z.string().trim().min(2, "Give the task a title").max(200),
    description: optionalText(10000),
    category: z.enum(TASK_CATEGORIES),
    priority: z.enum(TASK_PRIORITIES),
    start_date: optionalDate,
    due_date: optionalDate,
    requires_approval: z.boolean(),
    reviewer_id: optionalId,
    assignee_ids: z.array(id).max(20),
  })
  .refine((v) => !v.start_date || !v.due_date || v.due_date >= v.start_date, {
    message: "Due date must be on or after the start date",
    path: ["due_date"],
  });
export type TaskInput = z.input<typeof taskSchema>;

export const commentSchema = z.object({
  task_id: id,
  body: z.string().trim().min(1, "Write a comment").max(10000),
  mentions: z.array(id).max(20),
  is_revision_request: z.boolean().optional(),
});
export type CommentInput = z.input<typeof commentSchema>;

export const attachmentSchema = z.object({
  storage_path: z.string().min(3).max(500),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().max(200).nullable(),
  size_bytes: z.number().int().nonnegative(),
  comment_id: optionalId.optional(),
});
export type AttachmentInput = z.input<typeof attachmentSchema>;

export function taskCode(n: number) {
  return `TSK-${String(n).padStart(6, "0")}`;
}

/**
 * Status moves offered in the UI. The database is the authority (see
 * private.guard_task_update); this only avoids offering moves that would fail.
 */
export function allowedStatusMoves(
  current: TaskStatus,
  opts: {
    canEdit: boolean;
    canApprove: boolean;
    isAssignee: boolean;
    requiresApproval: boolean;
  },
): TaskStatus[] {
  if (opts.canApprove) return TASK_STATUSES.filter((s) => s !== current);
  const finishing: TaskStatus[] = opts.requiresApproval
    ? ["waiting_for_review"]
    : ["waiting_for_review", "completed"];
  if (opts.canEdit) {
    return TASK_STATUSES.filter(
      (s) =>
        s !== current &&
        s !== "approved" &&
        s !== "revision_required" &&
        (s !== "completed" || !opts.requiresApproval),
    );
  }
  if (!opts.isAssignee) return [];
  const moves: Partial<Record<TaskStatus, TaskStatus[]>> = {
    new: ["in_progress", "on_hold"],
    assigned: ["in_progress", "on_hold"],
    in_progress: [...finishing, "on_hold"],
    revision_required: ["in_progress", ...finishing],
    on_hold: ["in_progress"],
    approved: opts.requiresApproval ? [] : ["completed"],
  };
  return moves[current] ?? [];
}
