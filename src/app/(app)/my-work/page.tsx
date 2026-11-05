import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  ListTodo,
  Plus,
  Timer,
} from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  DueDate,
  PriorityBadge,
  TaskStatusBadge,
} from "@/components/tasks/task-badges";
import { listTasks } from "@/server/queries/tasks";
import {
  completionRate,
  formatHours,
  getAssigneeSummary,
} from "@/server/queries/performance";
import { reportScopes } from "@/server/queries/daily-reports";
import {
  OPEN_STATUSES,
  STATUS_LABELS,
  taskCode,
  type TaskStatus,
} from "@/lib/validations/task";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "My work" };

export default async function MyWorkPage() {
  const ctx = await requireAppContext();
  const { companyId, projectId } = ctx.selection;
  const today = format(new Date(), "yyyy-MM-dd");

  const [summary, tasks, reviewRes, todayReport, activityRes] =
    await Promise.all([
      getAssigneeSummary(ctx, { companyId, projectId }),
      listTasks(ctx, { companyId, projectId }),
      ctx.supabase
        .from("tasks")
        .select("id, task_number, title, submitted_at")
        .eq("status", "waiting_for_review")
        .or(
          `reviewer_id.eq.${ctx.user.id},and(reviewer_id.is.null,created_by.eq.${ctx.user.id})`,
        )
        .is("deleted_at", null)
        .order("submitted_at")
        .limit(10),
      ctx.supabase
        .from("daily_reports")
        .select("id, status")
        .eq("user_id", ctx.user.id)
        .eq("report_date", today)
        .limit(1)
        .maybeSingle(),
      ctx.supabase
        .from("task_activity_logs")
        .select(
          "id, action, from_value, to_value, created_at, task:tasks(id, task_number, title), actor:profiles!task_activity_logs_actor_id_fkey(full_name, email)",
        )
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const me = summary.find((s) => s.user_id === ctx.user.id) ?? {
    assigned: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    under_review: 0,
    revisions: 0,
    avg_completion_hours: null,
  };
  const mine = tasks
    .filter(
      (t) =>
        t.assignees.some((a) => a.user_id === ctx.user.id) &&
        OPEN_STATUSES.includes(t.status),
    )
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const canReport = reportScopes(ctx).companies.length > 0;
  const firstName = (ctx.profile.full_name ?? "").split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Your work, ${firstName}`}
        description="Tasks assigned to you, things waiting for your review and today's report."
        actions={
          canReport ? (
            <Button asChild variant={todayReport.data ? "outline" : "default"}>
              <Link
                href={
                  todayReport.data
                    ? `/daily-reports/${todayReport.data.id}`
                    : "/daily-reports/new"
                }
              >
                <ClipboardCheck />{" "}
                {todayReport.data
                  ? todayReport.data.status === "draft"
                    ? "Finish today's report"
                    : "Today's report"
                  : "Write today's report"}
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open tasks"
          value={me.pending}
          hint={`${me.assigned} assigned in total`}
          icon={ListTodo}
          href="/tasks?assignee=me"
        />
        <StatCard
          label="Overdue"
          value={me.overdue}
          hint={me.overdue ? "Needs attention" : "Nothing overdue"}
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Completed"
          value={me.completed}
          hint={`${completionRate(me)}% completion rate`}
          icon={CheckCircle2}
          tone="blue"
        />
        <StatCard
          label="Avg. completion time"
          value={formatHours(me.avg_completion_hours)}
          hint={`${me.under_review} under review`}
          icon={Timer}
          tone="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My open tasks</CardTitle>
            <CardDescription>Soonest due first.</CardDescription>
            <CardAction>
              <Button asChild size="sm" variant="outline">
                <Link href="/tasks?view=list&assignee=me">View all</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {mine.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No open tasks. Nice work.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {mine.slice(0, 12).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tasks/${t.id}`}
                      className="flex flex-col gap-1 p-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {taskCode(t.task_number)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {t.title}
                      </span>
                      <span className="flex items-center gap-3">
                        <PriorityBadge
                          priority={t.priority}
                          showLabel={false}
                        />
                        <DueDate due={t.due_date} status={t.status} />
                        <TaskStatusBadge status={t.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="size-4 text-muted-foreground" /> Waiting for
                your review
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(reviewRes.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing to review.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(reviewRes.data ?? []).map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tasks/${t.id}`}
                        className="block rounded-md p-1.5 text-sm hover:bg-muted"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {taskCode(t.task_number)}
                        </span>{" "}
                        {t.title}
                        {t.submitted_at && (
                          <span className="block text-xs text-muted-foreground">
                            Submitted {timeAgo(t.submitted_at)}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" /> Recent
                updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(activityRes.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No task activity yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(activityRes.data ?? []).map((a) => (
                    <li key={a.id} className="text-sm">
                      <span className="font-medium">
                        {a.actor?.full_name ?? a.actor?.email ?? "System"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {a.action === "status_changed"
                          ? `moved to ${STATUS_LABELS[a.to_value as TaskStatus] ?? a.to_value}`
                          : a.action.replace(/_/g, " ")}
                      </span>{" "}
                      {a.task && (
                        <Link
                          href={`/tasks/${a.task.id}`}
                          className="hover:underline"
                        >
                          {taskCode(a.task.task_number)}
                        </Link>
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {timeAgo(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {ctx.canAnywhere("tasks.create") && (
        <p className="text-center text-sm text-muted-foreground">
          Need to plan something new?{" "}
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 font-medium text-primary-strong hover:underline"
          >
            <Plus className="size-3.5" /> Create a task
          </Link>
        </p>
      )}
    </div>
  );
}
