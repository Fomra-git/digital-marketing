"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import FullCalendar, {
  type EventDropInfo,
  type EventInput,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import { toast } from "sonner";
import { taskCode, type TaskStatus } from "@/lib/validations/task";
import { rescheduleTask } from "@/server/actions/tasks";
import type { TaskListItem } from "@/server/queries/tasks";

// Event colours by status; the status name is also in the event tooltip, so
// colour is never the only signal.
const COLORS: Record<TaskStatus, string> = {
  new: "#64748B",
  assigned: "#2563EB",
  in_progress: "#4F46E5",
  waiting_for_review: "#B45309",
  revision_required: "#C2410C",
  approved: "#0D9488",
  completed: "#15803D",
  on_hold: "#64748B",
  cancelled: "#94A3B8",
};

/** Month view of tasks by due date. Drag a task to another day to reschedule it. */
export function TaskCalendar({
  tasks,
  onTasksChange,
}: {
  tasks: TaskListItem[];
  onTasksChange: (t: TaskListItem[]) => void;
}) {
  const router = useRouter();
  const events = useMemo<EventInput[]>(
    () =>
      tasks
        .filter((t) => t.due_date)
        .map((t) => ({
          id: t.id,
          title: `${taskCode(t.task_number)} ${t.title}`,
          start: t.due_date!,
          allDay: true,
          color: COLORS[t.status],
          contrastColor: "#FFFFFF",
          extendedProps: { status: t.status },
        })),
    [tasks],
  );
  const undated = tasks.filter((t) => !t.due_date).length;

  async function onDrop(info: EventDropInfo) {
    const id = info.event.id;
    const date = info.event.startStr.slice(0, 10);
    const previous = tasks;
    onTasksChange(
      tasks.map((t) => (t.id === id ? { ...t, due_date: date } : t)),
    );
    const res = await rescheduleTask(id, date);
    if (!res.ok) {
      info.revert();
      onTasksChange(previous);
      toast.error(res.error);
    } else toast.success(res.message);
  }

  return (
    <div className="space-y-2">
      <div className="task-calendar rounded-xl border bg-card p-3 text-sm">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin, classicThemePlugin]}
          initialView="dayGridMonth"
          height="auto"
          firstDay={1}
          dayMaxEvents={3}
          editable
          eventDurationEditable={false}
          events={events}
          headerToolbar={{ start: "title", center: "", end: "today prev,next" }}
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            router.push(`/tasks/${info.event.id}`);
          }}
          eventDrop={onDrop}
        />
      </div>
      {undated > 0 && (
        <p className="text-xs text-muted-foreground">
          {undated} task{undated === 1 ? " has" : "s have"} no due date and{" "}
          {undated === 1 ? "is" : "are"} not shown on the calendar.
        </p>
      )}
    </div>
  );
}
