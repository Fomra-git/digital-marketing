import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronsUp,
  Minus,
} from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { cn, formatDate } from "@/lib/utils";
import {
  STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/validations/task";

export const STATUS_STYLES: Record<TaskStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-50 text-blue-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  waiting_for_review: "bg-amber-50 text-amber-800",
  revision_required: "bg-orange-50 text-orange-700",
  approved: "bg-teal-50 text-teal-700",
  completed: "bg-green-50 text-green-700",
  on_hold: "bg-slate-100 text-slate-600",
  cancelled: "bg-slate-100 text-slate-500 line-through",
};

/** Small coloured bar shown on Kanban column headers. */
export const STATUS_DOT: Record<TaskStatus, string> = {
  new: "bg-slate-400",
  assigned: "bg-blue-500",
  in_progress: "bg-indigo-500",
  waiting_for_review: "bg-amber-500",
  revision_required: "bg-orange-500",
  approved: "bg-teal-500",
  completed: "bg-green-600",
  on_hold: "bg-slate-400",
  cancelled: "bg-slate-300",
};

export function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY: Record<
  TaskPriority,
  { label: string; icon: typeof Minus; className: string }
> = {
  low: { label: "Low", icon: ArrowDown, className: "text-slate-500" },
  medium: { label: "Medium", icon: Minus, className: "text-blue-600" },
  high: { label: "High", icon: ArrowUp, className: "text-orange-600" },
  urgent: { label: "Urgent", icon: ChevronsUp, className: "text-red-600" },
};

export function PriorityBadge({
  priority,
  showLabel = true,
}: {
  priority: TaskPriority;
  showLabel?: boolean;
}) {
  const p = PRIORITY[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        p.className,
      )}
      title={`${p.label} priority`}
    >
      <p.icon className="size-3.5" />
      {showLabel && p.label}
    </span>
  );
}

export function isOverdue(due: string | null, status: TaskStatus) {
  if (!due || ["completed", "cancelled", "approved"].includes(status))
    return false;
  return differenceInCalendarDays(parseISO(due), new Date()) < 0;
}

export function DueDate({
  due,
  status,
}: {
  due: string | null;
  status: TaskStatus;
}) {
  if (!due)
    return <span className="text-xs text-muted-foreground">No due date</span>;
  const days = differenceInCalendarDays(parseISO(due), new Date());
  const done = ["completed", "cancelled", "approved"].includes(status);
  const overdue = !done && days < 0;
  const soon = !done && days >= 0 && days <= 1;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs whitespace-nowrap",
        overdue
          ? "font-medium text-destructive"
          : soon
            ? "font-medium text-amber-700"
            : "text-muted-foreground",
      )}
    >
      {overdue ? (
        <AlertTriangle className="size-3.5" />
      ) : (
        <CalendarClock className="size-3.5" />
      )}
      {overdue
        ? `Overdue · ${formatDate(due, "d MMM")}`
        : days === 0 && !done
          ? "Due today"
          : days === 1 && !done
            ? "Due tomorrow"
            : formatDate(due, "d MMM yyyy")}
    </span>
  );
}
