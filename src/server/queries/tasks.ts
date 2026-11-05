import "server-only";
import type { AppContext } from "@/lib/auth/context";
import type {
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from "@/lib/validations/task";

export type Person = {
  user_id: string;
  name: string;
  avatar_url: string | null;
};

export type TaskListItem = {
  id: string;
  task_number: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  due_date: string | null;
  start_date: string | null;
  company_id: string;
  company_name: string;
  project_id: string | null;
  project_name: string | null;
  parent_task_id: string | null;
  created_by: string | null;
  requires_approval: boolean;
  completed_at: string | null;
  updated_at: string;
  sort_order: number;
  assignees: Person[];
};

const LIST_SELECT =
  "id, task_number, title, status, priority, category, due_date, start_date, company_id, project_id, parent_task_id, created_by, requires_approval, completed_at, updated_at, sort_order, company:companies(name), project:projects!tasks_project_id_company_id_fkey(name), task_assignees(user_id, profile:profiles!task_assignees_user_id_fkey(full_name, email, avatar_url))";

type Row = {
  id: string;
  task_number: number;
  title: string;
  status: string;
  priority: string;
  category: string;
  due_date: string | null;
  start_date: string | null;
  company_id: string;
  project_id: string | null;
  parent_task_id: string | null;
  created_by: string | null;
  requires_approval: boolean;
  completed_at: string | null;
  updated_at: string;
  sort_order: number;
  company: { name: string } | null;
  project: { name: string } | null;
  task_assignees: {
    user_id: string;
    profile: {
      full_name: string | null;
      email: string;
      avatar_url: string | null;
    } | null;
  }[];
};

export function toListItem(r: Row): TaskListItem {
  return {
    id: r.id,
    task_number: r.task_number,
    title: r.title,
    status: r.status as TaskStatus,
    priority: r.priority as TaskPriority,
    category: r.category as TaskCategory,
    due_date: r.due_date,
    start_date: r.start_date,
    company_id: r.company_id,
    company_name: r.company?.name ?? "—",
    project_id: r.project_id,
    project_name: r.project?.name ?? null,
    parent_task_id: r.parent_task_id,
    created_by: r.created_by,
    requires_approval: r.requires_approval,
    completed_at: r.completed_at,
    updated_at: r.updated_at,
    sort_order: r.sort_order,
    assignees: r.task_assignees.map((a) => ({
      user_id: a.user_id,
      name: a.profile?.full_name ?? a.profile?.email ?? "Unknown",
      avatar_url: a.profile?.avatar_url ?? null,
    })),
  };
}

/**
 * Tasks visible to the user (RLS decides) in the header scope. Open tasks are
 * all loaded; finished ones only from the last 90 days to keep boards fast.
 */
export async function listTasks(
  ctx: AppContext,
  opts: {
    companyId?: string | null;
    projectId?: string | null;
    assigneeId?: string;
    limit?: number;
  } = {},
): Promise<TaskListItem[]> {
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  let query = ctx.supabase
    .from("tasks")
    .select(LIST_SELECT)
    .is("deleted_at", null)
    .or(`status.not.in.(completed,cancelled),updated_at.gte.${since}`)
    .order("sort_order")
    .order("updated_at", { ascending: false })
    .limit(opts.limit ?? 1000);
  if (opts.projectId) query = query.eq("project_id", opts.projectId);
  else if (opts.companyId) query = query.eq("company_id", opts.companyId);
  const { data, error } = await query;
  if (error) throw error;
  let rows = ((data ?? []) as unknown as Row[]).map(toListItem);
  if (opts.assigneeId)
    rows = rows.filter((t) =>
      t.assignees.some((a) => a.user_id === opts.assigneeId),
    );
  return rows;
}

/** Companies/projects where the user may create tasks (for the create dialog). */
export function taskCreationScopes(ctx: AppContext) {
  const companies = ctx.companies.filter(
    (c) =>
      ctx.can("tasks.create", { companyId: c.id }) ||
      ctx.projects.some(
        (p) =>
          p.company_id === c.id &&
          ctx.can("tasks.create", { companyId: c.id, projectId: p.id }),
      ),
  );
  const projects = ctx.projects.filter((p) =>
    ctx.can("tasks.create", { companyId: p.company_id, projectId: p.id }),
  );
  return {
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      companyLevel: ctx.can("tasks.create", { companyId: c.id }),
      canAssign: ctx.can("tasks.assign", { companyId: c.id }),
    })),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      company_id: p.company_id,
      canAssign: ctx.can("tasks.assign", {
        companyId: p.company_id,
        projectId: p.id,
      }),
    })),
  };
}
export type TaskCreationScopes = ReturnType<typeof taskCreationScopes>;
