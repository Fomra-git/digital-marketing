"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Columns3,
  List,
  ListTodo,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DataTable,
  dataTableColumns,
} from "@/components/data-table/data-table";
import { useShell } from "@/components/layout/shell-context";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  taskCode,
} from "@/lib/validations/task";
import type { TaskCreationScopes, TaskListItem } from "@/server/queries/tasks";
import type { DepartmentOption } from "@/server/queries/team";
import { AvatarStack } from "./avatar-stack";
import {
  DueDate,
  PriorityBadge,
  TaskStatusBadge,
  isOverdue,
} from "./task-badges";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskKanban } from "./task-kanban";
import { TaskCalendar } from "./task-calendar";

type View = "kanban" | "list" | "calendar";
const ALL = "__all__";

const col = dataTableColumns<TaskListItem>();
const columns = [
  col.accessor("task_number", {
    header: "ID",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {taskCode(getValue())}
      </span>
    ),
  }),
  col.accessor("title", {
    header: "Task",
    cell: ({ row }) => (
      <Link
        href={`/tasks/${row.original.id}`}
        className="block max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="block truncate font-medium hover:underline">
          {row.original.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {row.original.project_name
            ? `${row.original.company_name} › ${row.original.project_name}`
            : row.original.company_name}
        </span>
      </Link>
    ),
  }),
  col.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => <TaskStatusBadge status={getValue()} />,
  }),
  col.accessor("priority", {
    header: "Priority",
    sortFn: (a, b) =>
      TASK_PRIORITIES.indexOf(a.original.priority) -
      TASK_PRIORITIES.indexOf(b.original.priority),
    cell: ({ getValue }) => <PriorityBadge priority={getValue()} />,
  }),
  col.accessor("category", {
    header: "Category",
    cell: ({ getValue }) => (
      <span className="text-sm">{CATEGORY_LABELS[getValue()]}</span>
    ),
  }),
  col.accessor((t) => t.assignees.map((a) => a.name).join(", "), {
    id: "assignees",
    header: "Assignees",
    enableSorting: false,
    cell: ({ row }) => <AvatarStack people={row.original.assignees} />,
  }),
  col.accessor((t) => t.due_date ?? "9999-12-31", {
    id: "due",
    header: "Due",
    cell: ({ row }) => (
      <DueDate due={row.original.due_date} status={row.original.status} />
    ),
  }),
];

export function TasksBoard({
  initialTasks,
  scopes,
  departments,
  people,
  canSeeAll,
}: {
  initialTasks: TaskListItem[];
  scopes: TaskCreationScopes;
  departments: DepartmentOption[];
  people: { user_id: string; name: string }[];
  canSeeAll: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { userId, selection } = useShell();
  const view = (
    ["kanban", "list", "calendar"].includes(params.get("view") ?? "")
      ? params.get("view")
      : "kanban"
  ) as View;

  const [tasks, setTasks] = useState(initialTasks);
  const [source, setSource] = useState(initialTasks);
  if (source !== initialTasks) {
    // server data refreshed (router.refresh / navigation)
    setSource(initialTasks);
    setTasks(initialTasks);
  }

  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL);
  const [priority, setPriority] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [assignee, setAssignee] = useState(params.get("assignee") ?? ALL);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (
        status === "overdue"
          ? !isOverdue(t.due_date, t.status)
          : status !== ALL && t.status !== status
      )
        return false;
      if (status === ALL && view !== "kanban" && t.status === "cancelled")
        return false;
      if (priority !== ALL && t.priority !== priority) return false;
      if (category !== ALL && t.category !== category) return false;
      if (assignee === "me" && !t.assignees.some((a) => a.user_id === userId))
        return false;
      if (assignee === "unassigned" && t.assignees.length) return false;
      if (
        assignee !== ALL &&
        assignee !== "me" &&
        assignee !== "unassigned" &&
        !t.assignees.some((a) => a.user_id === assignee)
      )
        return false;
      if (
        text &&
        !`${t.title} ${taskCode(t.task_number)} ${t.company_name} ${t.project_name ?? ""}`
          .toLowerCase()
          .includes(text)
      )
        return false;
      return true;
    });
  }, [tasks, q, status, priority, category, assignee, userId, view]);

  function setView(v: View) {
    const next = new URLSearchParams(params);
    next.set("view", v);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const canCreate = scopes.companies.length > 0;
  const newButton = canCreate ? (
    <Button onClick={() => setCreateOpen(true)}>
      <Plus /> New task
    </Button>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="inline-flex w-fit rounded-lg bg-muted p-1"
          role="tablist"
          aria-label="Task view"
        >
          {(
            [
              ["kanban", "Board", Columns3],
              ["list", "List", List],
              ["calendar", "Calendar", CalendarDays],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === v
                  ? "bg-card shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        {newButton}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(4,minmax(0,11rem))]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks or TSK-…"
            className="pl-9"
            aria-label="Search tasks"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            {TASK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger aria-label="Priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {TASK_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger aria-label="Assignee">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {canSeeAll ? "Everyone" : "All my tasks"}
            </SelectItem>
            <SelectItem value="me">Assigned to me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {canSeeAll &&
              people.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks yet"
          description={
            canCreate
              ? "Create the first task and assign it to your team."
              : "Tasks assigned to you will appear here."
          }
          action={newButton}
        />
      ) : view === "kanban" ? (
        <TaskKanban
          tasks={filtered}
          onTasksChange={(next) =>
            setTasks((all) =>
              all.map((t) => next.find((n) => n.id === t.id) ?? t),
            )
          }
        />
      ) : view === "calendar" ? (
        <TaskCalendar
          tasks={filtered}
          onTasksChange={(next) =>
            setTasks((all) =>
              all.map((t) => next.find((n) => n.id === t.id) ?? t),
            )
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Filter this list…"
          onRowClick={(t) => router.push(`/tasks/${t.id}`)}
          pageSize={25}
        />
      )}

      {canCreate && (
        <TaskFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          scopes={scopes}
          departments={departments}
          defaults={
            scopes.companies.some((c) => c.id === selection.companyId)
              ? {
                  company_id: selection.companyId!,
                  project_id: selection.projectId ?? undefined,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
