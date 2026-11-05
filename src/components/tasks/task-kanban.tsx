"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  taskCode,
  type TaskStatus,
} from "@/lib/validations/task";
import { updateTaskStatus } from "@/server/actions/tasks";
import type { TaskListItem } from "@/server/queries/tasks";
import { AvatarStack } from "./avatar-stack";
import { DueDate, PriorityBadge, STATUS_DOT } from "./task-badges";

const COLUMNS: TaskStatus[] = [
  "new",
  "assigned",
  "in_progress",
  "waiting_for_review",
  "revision_required",
  "approved",
  "completed",
  "on_hold",
];

/**
 * Drag a card to another column to change its status. The move is applied
 * optimistically and rolled back if the database refuses it (for example an
 * assignee trying to approve their own task).
 */
export function TaskKanban({
  tasks,
  onTasksChange,
}: {
  tasks: TaskListItem[];
  onTasksChange: (t: TaskListItem[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  );
  const active = tasks.find((t) => t.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const to = e.over?.id as TaskStatus | undefined;
    const task = tasks.find((t) => t.id === e.active.id);
    if (!to || !task || task.status === to) return;
    const previous = tasks;
    onTasksChange(
      tasks.map((t) => (t.id === task.id ? { ...t, status: to } : t)),
    );
    const res = await updateTaskStatus(task.id, to);
    if (!res.ok) {
      onTasksChange(previous);
      toast.error(res.error);
    } else {
      toast.success(
        `${taskCode(task.task_number)} moved to ${STATUS_LABELS[to]}`,
      );
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-3">
          {COLUMNS.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {active ? <Card task={active} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tasks,
}: {
  status: TaskStatus;
  tasks: TaskListItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_LABELS[status]}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors",
        isOver && "border-primary bg-primary-soft/40",
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
        <h3 className="text-sm font-medium">{STATUS_LABELS[status]}</h3>
        <span className="ml-auto rounded-full bg-card px-2 text-xs text-muted-foreground tabular-nums">
          {tasks.length}
        </span>
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
        {tasks.map((t) => (
          <DraggableCard key={t.id} task={t} />
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Drop tasks here
          </p>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ task }: { task: TaskListItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("touch-manipulation", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <Card task={task} />
    </div>
  );
}

function Card({ task, overlay }: { task: TaskListItem; overlay?: boolean }) {
  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-3 shadow-xs",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">
          {taskCode(task.task_number)}
        </span>
        <PriorityBadge priority={task.priority} showLabel={false} />
      </div>
      <Link
        href={`/tasks/${task.id}`}
        className="line-clamp-2 text-sm font-medium hover:underline"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {task.title}
      </Link>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {task.project_name
          ? `${task.company_name} › ${task.project_name}`
          : task.company_name}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <DueDate due={task.due_date} status={task.status} />
        <AvatarStack people={task.assignees} />
      </div>
    </article>
  );
}
