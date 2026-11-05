import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAppContext } from "@/lib/auth/context";
import { id as idSchema } from "@/lib/validations/common";
import type { TaskStatus } from "@/lib/validations/task";
import {
  TaskDetail,
  type TaskDetailData,
} from "@/components/tasks/task-detail";
import {
  listTasks,
  taskCreationScopes,
  toListItem,
} from "@/server/queries/tasks";
import { getDepartmentOptions } from "@/server/queries/team";

export const metadata: Metadata = { title: "Task" };

const person = (
  p: {
    id?: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null,
  id: string | null,
) =>
  p && id
    ? { user_id: id, name: p.full_name ?? p.email, avatar_url: p.avatar_url }
    : null;

export default async function TaskPage({
  params,
}: PageProps<"/tasks/[taskId]">) {
  const { taskId } = await params;
  if (!idSchema.safeParse(taskId).success) notFound();
  const ctx = await requireAppContext();
  const db = ctx.supabase;

  const { data: t } = await db
    .from("tasks")
    .select(
      "*, company:companies(name), project:projects!tasks_project_id_company_id_fkey(name), department:departments(name), reviewer:profiles!tasks_reviewer_id_fkey(full_name, email, avatar_url), task_assignees(user_id, profile:profiles!task_assignees_user_id_fkey(full_name, email, avatar_url))",
    )
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!t) notFound();

  const [
    parentRes,
    creatorRes,
    subtasksRes,
    depsRes,
    blockingRes,
    commentsRes,
    historyRes,
    filesRes,
    candidates,
    departments,
  ] = await Promise.all([
    t.parent_task_id
      ? db
          .from("tasks")
          .select("id, title, task_number")
          .eq("id", t.parent_task_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    t.created_by
      ? db
          .from("profiles")
          .select("full_name, email, avatar_url")
          .eq("id", t.created_by)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("tasks")
      .select(
        "id, task_number, title, status, priority, category, due_date, start_date, company_id, project_id, parent_task_id, created_by, requires_approval, completed_at, updated_at, sort_order, company:companies(name), project:projects!tasks_project_id_company_id_fkey(name), task_assignees(user_id, profile:profiles!task_assignees_user_id_fkey(full_name, email, avatar_url))",
      )
      .eq("parent_task_id", taskId)
      .is("deleted_at", null)
      .order("created_at"),
    db
      .from("task_dependencies")
      .select(
        "depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, task_number, title, status)",
      )
      .eq("task_id", taskId),
    db
      .from("task_dependencies")
      .select(
        "task:tasks!task_dependencies_task_id_fkey(id, task_number, title, status)",
      )
      .eq("depends_on_task_id", taskId),
    db
      .from("task_comments")
      .select(
        "id, body, created_at, is_revision_request, author_id, author:profiles!task_comments_author_id_fkey(full_name, email, avatar_url)",
      )
      .eq("task_id", taskId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    db
      .from("task_activity_logs")
      .select(
        "id, action, from_value, to_value, created_at, actor:profiles!task_activity_logs_actor_id_fkey(full_name, email)",
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("task_attachments")
      .select(
        "id, file_name, storage_path, size_bytes, created_at, uploaded_by, uploader:profiles!task_attachments_uploaded_by_fkey(full_name, email)",
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
    listTasks(ctx, { companyId: t.company_id, limit: 300 }),
    getDepartmentOptions(ctx),
  ]);

  const assignees = t.task_assignees.map((a) => ({
    user_id: a.user_id,
    name: a.profile?.full_name ?? a.profile?.email ?? "Unknown",
    avatar_url: a.profile?.avatar_url ?? null,
  }));
  const history = historyRes.data ?? [];
  // Names for "assigned X" history entries (ids are stored as text)
  const ids = [
    ...new Set(
      history
        .flatMap((h) => [h.from_value, h.to_value])
        .filter((v): v is string => !!v && idSchema.safeParse(v).success),
    ),
  ];
  const { data: named } = ids.length
    ? await db.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] };
  const peopleNames = Object.fromEntries(
    (named ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );

  const data: TaskDetailData = {
    id: t.id,
    task_number: t.task_number,
    title: t.title,
    description: t.description,
    status: t.status as TaskStatus,
    priority: t.priority as TaskDetailData["priority"],
    category: t.category as TaskDetailData["category"],
    company_id: t.company_id,
    company_name: t.company?.name ?? "—",
    project_id: t.project_id,
    project_name: t.project?.name ?? null,
    department_id: t.department_id,
    department_name: t.department?.name ?? null,
    parent: parentRes.data ?? null,
    start_date: t.start_date,
    due_date: t.due_date,
    requires_approval: t.requires_approval,
    reviewer: person(t.reviewer, t.reviewer_id),
    creator: person(creatorRes.data, t.created_by),
    created_at: t.created_at,
    started_at: t.started_at,
    submitted_at: t.submitted_at,
    completed_at: t.completed_at,
    approved_at: t.approved_at,
    assignees,
  };

  const ref = (
    x: {
      id: string;
      task_number: number;
      title: string;
      status: string;
    } | null,
  ) => (x ? { ...x, status: x.status as TaskStatus } : null);

  return (
    <TaskDetail
      task={data}
      subtasks={(subtasksRes.data ?? []).map((r) =>
        toListItem(r as Parameters<typeof toListItem>[0]),
      )}
      dependsOn={(depsRes.data ?? [])
        .map((d) => ref(d.depends_on))
        .filter((x) => x !== null)}
      blocking={(blockingRes.data ?? [])
        .map((d) => ref(d.task))
        .filter((x) => x !== null)}
      dependencyCandidates={candidates
        .filter(
          (c) =>
            c.id !== taskId &&
            c.parent_task_id !== taskId &&
            !["cancelled"].includes(c.status),
        )
        .map((c) => ({
          id: c.id,
          task_number: c.task_number,
          title: c.title,
          status: c.status,
        }))}
      comments={(commentsRes.data ?? []).map((c) => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        is_revision_request: c.is_revision_request,
        author: {
          user_id: c.author_id,
          name: c.author?.full_name ?? c.author?.email ?? "Unknown",
          avatar_url: c.author?.avatar_url ?? null,
        },
      }))}
      history={history.map((h) => ({
        id: h.id,
        action: h.action,
        from_value: h.from_value,
        to_value: h.to_value,
        created_at: h.created_at,
        actor: h.actor?.full_name ?? h.actor?.email ?? null,
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
      scopes={taskCreationScopes(ctx)}
      departments={departments}
      peopleNames={peopleNames}
    />
  );
}
