"use server";

import { revalidatePath } from "next/cache";
import { getActionContext, type AppContext } from "@/lib/auth/context";
import {
  dbFailure,
  failure,
  success,
  validationFailure,
  type ActionResult,
} from "@/lib/actions";
import {
  attachmentSchema,
  commentSchema,
  taskSchema,
  TASK_STATUSES,
  type AttachmentInput,
  type CommentInput,
  type TaskInput,
  type TaskStatus,
} from "@/lib/validations/task";
import { id as idSchema } from "@/lib/validations/common";
import { nullable } from "@/lib/utils";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

function revalidateTasks(taskId?: string) {
  revalidatePath("/tasks");
  revalidatePath("/my-work");
  revalidatePath("/team-performance");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}

function scopeOf(ctx: AppContext, companyId: string, projectId: string | null) {
  if (!ctx.companies.some((c) => c.id === companyId)) return null;
  if (
    projectId &&
    !ctx.projects.some((p) => p.id === projectId && p.company_id === companyId)
  )
    return null;
  return { companyId, projectId };
}

async function loadTask(ctx: AppContext, taskId: string) {
  if (!idSchema.safeParse(taskId).success) return null;
  const { data } = await ctx.supabase
    .from("tasks")
    .select(
      "id, company_id, project_id, created_by, status, requires_approval, task_assignees(user_id)",
    )
    .eq("id", taskId)
    .maybeSingle();
  return data;
}

export type AssignableUser = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  job_title: string | null;
};

/** People who can see work at this company/project (and so can be assigned). */
export async function getAssignableUsers(
  companyId: string,
  projectId: string | null,
): Promise<AssignableUser[]> {
  const ctx = await getActionContext();
  if (!ctx || !scopeOf(ctx, companyId, projectId)) return [];
  const { data: ids } = await ctx.supabase.rpc("task_assignable_users", {
    p_company_id: companyId,
    p_project_id: projectId ?? undefined,
  });
  const userIds = (ids ?? []).map((r) => r.user_id);
  if (!userIds.length) return [];
  const { data } = await ctx.supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, job_title")
    .in("id", userIds)
    .order("full_name");
  return (data ?? []).map((p) => ({
    user_id: p.id,
    name: p.full_name ?? p.email,
    avatar_url: p.avatar_url,
    job_title: p.job_title,
  }));
}

export async function createTask(
  input: TaskInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;
  const projectId = nullable(v.project_id);
  const scope = scopeOf(ctx, v.company_id, projectId);
  if (!scope) return failure("Company or project not available.");
  if (!ctx.can("tasks.create", scope))
    return failure("You do not have permission to create tasks here.");

  const others = v.assignee_ids.filter((u) => u !== ctx.user.id);
  if (others.length && !ctx.can("tasks.assign", scope)) {
    return failure(
      "You can create tasks for yourself, but assigning others needs the 'Assign tasks' permission.",
    );
  }

  const { data: task, error } = await ctx.supabase
    .from("tasks")
    .insert({
      company_id: v.company_id,
      project_id: projectId,
      department_id: nullable(v.department_id),
      parent_task_id: nullable(v.parent_task_id),
      title: v.title,
      description: nullable(v.description),
      category: v.category,
      priority: v.priority,
      start_date: nullable(v.start_date),
      due_date: nullable(v.due_date),
      requires_approval: v.requires_approval,
      reviewer_id: nullable(v.reviewer_id),
      status: v.assignee_ids.length ? "assigned" : "new",
    })
    .select("id")
    .single();
  if (error || !task)
    return error
      ? dbFailure(error, "create task")
      : failure("Could not create the task.");

  if (v.assignee_ids.length) {
    const { error: aErr } = await ctx.supabase
      .from("task_assignees")
      .insert(v.assignee_ids.map((user_id) => ({ task_id: task.id, user_id })));
    if (aErr) {
      revalidateTasks(task.id);
      const reason = dbFailure(aErr, "assign task");
      return failure(
        `Task created, but it could not be assigned. ${reason.ok ? "" : reason.error}`,
      );
    }
  }

  revalidateTasks(task.id);
  return success({ id: task.id }, "Task created.");
}

export async function updateTask(
  taskId: string,
  input: Omit<TaskInput, "assignee_ids">,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const parsed = taskSchema.safeParse({ ...input, assignee_ids: [] });
  if (!parsed.success) return validationFailure(parsed.error);
  const task = await loadTask(ctx, taskId);
  if (!task)
    return failure(
      "The task was not found or you no longer have access to it.",
    );
  const v = parsed.data;
  const projectId = nullable(v.project_id);
  if (!scopeOf(ctx, v.company_id, projectId))
    return failure("Company or project not available.");

  const { data, error } = await ctx.supabase
    .from("tasks")
    .update({
      company_id: v.company_id,
      project_id: projectId,
      department_id: nullable(v.department_id),
      title: v.title,
      description: nullable(v.description),
      category: v.category,
      priority: v.priority,
      start_date: nullable(v.start_date),
      due_date: nullable(v.due_date),
      requires_approval: v.requires_approval,
      reviewer_id: nullable(v.reviewer_id),
    })
    .eq("id", taskId)
    .select("id");
  if (error) return dbFailure(error, "update task");
  if (!data?.length)
    return failure("You do not have permission to edit this task.");
  revalidateTasks(taskId);
  return success(undefined, "Task saved.");
}

/** Move a task through the workflow. A note on "revision required" is saved as a comment. */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  note?: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!TASK_STATUSES.includes(status)) return failure("Unknown status.");
  const task = await loadTask(ctx, taskId);
  if (!task)
    return failure(
      "The task was not found or you no longer have access to it.",
    );
  if (task.status === status) return success(undefined);

  const { data, error } = await ctx.supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .select("id");
  if (error) return dbFailure(error, "update task status");
  if (!data?.length)
    return failure("You cannot change the status of this task.");

  const text = note?.trim();
  if (text) {
    await ctx.supabase.from("task_comments").insert({
      task_id: taskId,
      body: text.slice(0, 10000),
      is_revision_request: status === "revision_required",
    });
  }
  revalidateTasks(taskId);
  return success(undefined, "Status updated.");
}

export async function setTaskAssignees(
  taskId: string,
  userIds: string[],
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (
    !userIds.every((u) => idSchema.safeParse(u).success) ||
    userIds.length > 20
  )
    return failure("Invalid people.");
  const task = await loadTask(ctx, taskId);
  if (!task)
    return failure(
      "The task was not found or you no longer have access to it.",
    );
  if (
    !ctx.can("tasks.assign", {
      companyId: task.company_id,
      projectId: task.project_id,
    })
  ) {
    return failure("You do not have permission to assign this task.");
  }

  const current = new Set(task.task_assignees.map((a) => a.user_id));
  const wanted = new Set(userIds);
  const toAdd = [...wanted].filter((u) => !current.has(u));
  const toRemove = [...current].filter((u) => !wanted.has(u));

  if (toAdd.length) {
    const { error } = await ctx.supabase
      .from("task_assignees")
      .insert(toAdd.map((user_id) => ({ task_id: taskId, user_id })));
    if (error) return dbFailure(error, "add assignees");
  }
  if (toRemove.length) {
    const { error } = await ctx.supabase
      .from("task_assignees")
      .delete()
      .eq("task_id", taskId)
      .in("user_id", toRemove);
    if (error) return dbFailure(error, "remove assignees");
  }
  if (task.status === "new" && wanted.size > 0) {
    await ctx.supabase
      .from("tasks")
      .update({ status: "assigned" })
      .eq("id", taskId);
  }
  revalidateTasks(taskId);
  return success(undefined, "Assignees updated.");
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const task = await loadTask(ctx, taskId);
  if (!task)
    return failure(
      "The task was not found or you no longer have access to it.",
    );
  if (
    !ctx.can("tasks.delete", {
      companyId: task.company_id,
      projectId: task.project_id,
    })
  ) {
    return failure("You do not have permission to delete this task.");
  }
  const { data, error } = await ctx.supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("id");
  if (error) return dbFailure(error, "delete task");
  if (!data?.length)
    return failure("You do not have permission to delete this task.");
  revalidateTasks();
  return success(undefined, "Task deleted.");
}

export async function addTaskDependency(
  taskId: string,
  dependsOnTaskId: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (taskId === dependsOnTaskId)
    return failure("A task cannot depend on itself.");
  if (!idSchema.safeParse(dependsOnTaskId).success)
    return failure("Choose a task.");
  const { error } = await ctx.supabase
    .from("task_dependencies")
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId });
  if (error)
    return error.code === "23505"
      ? failure("That dependency already exists.")
      : dbFailure(error, "add dependency");
  revalidateTasks(taskId);
  return success(undefined, "Dependency added.");
}

export async function removeTaskDependency(
  taskId: string,
  dependsOnTaskId: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const { data, error } = await ctx.supabase
    .from("task_dependencies")
    .delete()
    .eq("task_id", taskId)
    .eq("depends_on_task_id", dependsOnTaskId)
    .select("task_id");
  if (error) return dbFailure(error, "remove dependency");
  if (!data?.length)
    return failure("You cannot change this task's dependencies.");
  revalidateTasks(taskId);
  return success(undefined, "Dependency removed.");
}

export async function addTaskComment(
  input: CommentInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const { error } = await ctx.supabase.from("task_comments").insert({
    task_id: parsed.data.task_id,
    body: parsed.data.body,
    mentions: [...new Set(parsed.data.mentions)],
    is_revision_request: false,
  });
  if (error) return dbFailure(error, "add comment");
  revalidatePath(`/tasks/${parsed.data.task_id}`);
  return success(undefined, "Comment posted.");
}

export async function deleteTaskComment(
  commentId: string,
  taskId: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const { data, error } = await ctx.supabase
    .from("task_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .select("id");
  if (error) return dbFailure(error, "delete comment");
  if (!data?.length) return failure("You can only delete your own comments.");
  revalidatePath(`/tasks/${taskId}`);
  return success(undefined, "Comment deleted.");
}

/** Records a file the browser has already uploaded to task-files/{taskId}/… */
export async function addTaskAttachment(
  taskId: string,
  input: AttachmentInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const parsed = attachmentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  if (!parsed.data.storage_path.startsWith(`${taskId}/`))
    return failure("Invalid file location.");
  const { error } = await ctx.supabase.from("task_attachments").insert({
    task_id: taskId,
    storage_path: parsed.data.storage_path,
    file_name: parsed.data.file_name,
    mime_type: parsed.data.mime_type,
    size_bytes: parsed.data.size_bytes,
    comment_id: parsed.data.comment_id ? parsed.data.comment_id : null,
  });
  if (error) return dbFailure(error, "add attachment");
  revalidatePath(`/tasks/${taskId}`);
  return success(undefined, "File attached.");
}

export async function deleteTaskAttachment(
  attachmentId: string,
  taskId: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const { data, error } = await ctx.supabase
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId)
    .select("storage_path");
  if (error) return dbFailure(error, "delete attachment");
  if (!data?.length) return failure("You cannot remove this file.");
  await ctx.supabase.storage
    .from("task-files")
    .remove(data.map((d) => d.storage_path));
  revalidatePath(`/tasks/${taskId}`);
  return success(undefined, "File removed.");
}

/** Short-lived download link; storage policies decide whether it is allowed. */
export async function getTaskFileUrl(
  storagePath: string,
): Promise<ActionResult<{ url: string }>> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const { data, error } = await ctx.supabase.storage
    .from("task-files")
    .createSignedUrl(storagePath, 60 * 5);
  if (error || !data) return failure("You cannot open this file.");
  return success({ url: data.signedUrl });
}

/** Calendar drag-and-drop: change only the due date. */
export async function rescheduleTask(
  taskId: string,
  dueDate: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return failure("Invalid date.");
  const { data, error } = await ctx.supabase
    .from("tasks")
    .update({ due_date: dueDate })
    .eq("id", taskId)
    .select("id");
  if (error) return dbFailure(error, "reschedule task");
  if (!data?.length) return failure("You cannot reschedule this task.");
  revalidateTasks(taskId);
  return success(undefined, "Due date changed.");
}
