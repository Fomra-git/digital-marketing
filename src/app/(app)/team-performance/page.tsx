import type { Metadata } from "next";
import Link from "next/link";
import { format, startOfMonth, subDays } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ListTodo,
} from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntityAvatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { NoPermission } from "@/components/shared/no-permission";
import { StatusChart } from "@/components/dashboard/status-chart";
import {
  RangePicker,
  RANGES,
  type RangeKey,
} from "@/components/performance/range-picker";
import { DueDate } from "@/components/tasks/task-badges";
import {
  completionRate,
  formatHours,
  getAssigneeSummary,
} from "@/server/queries/performance";
import { getDepartmentOptions, getMemberOptions } from "@/server/queries/team";
import { listTasks } from "@/server/queries/tasks";
import { taskCode } from "@/lib/validations/task";

export const metadata: Metadata = { title: "Team performance" };

function rangeDates(key: RangeKey) {
  const today = new Date();
  if (key === "all") return {};
  const from =
    key === "7d"
      ? subDays(today, 6)
      : key === "30d"
        ? subDays(today, 29)
        : startOfMonth(today);
  return { from: format(from, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
}

export default async function TeamPerformancePage({
  searchParams,
}: PageProps<"/team-performance">) {
  const ctx = await requireAppContext();
  if (!ctx.canAnywhere(P.teamPerformance))
    return <NoPermission what="team performance" />;
  const params = await searchParams;
  const range = (
    RANGES.some((r) => r.key === params.range) ? params.range : "30d"
  ) as RangeKey;
  const { from, to } = rangeDates(range);
  const { companyId, projectId } = ctx.selection;
  const today = format(new Date(), "yyyy-MM-dd");

  const [summary, members, departments, tasks, reportsToday] =
    await Promise.all([
      getAssigneeSummary(ctx, { companyId, projectId, from, to }),
      getMemberOptions(ctx),
      getDepartmentOptions(ctx),
      listTasks(ctx, { companyId, projectId }),
      ctx.supabase
        .from("daily_reports")
        .select("user_id")
        .eq("report_date", today)
        .neq("status", "draft"),
    ]);

  const memberById = new Map(members.map((m) => [m.user_id, m]));
  const deptById = new Map(departments.map((d) => [d.id, d]));
  const rows = summary
    .map((s) => ({ ...s, member: memberById.get(s.user_id) }))
    .filter((r) => r.member)
    .sort((a, b) => b.overdue - a.overdue || b.pending - a.pending);

  const totals = rows.reduce(
    (t, r) => ({
      assigned: t.assigned + r.assigned,
      completed: t.completed + r.completed,
      pending: t.pending + r.pending,
      overdue: t.overdue + r.overdue,
    }),
    { assigned: 0, completed: 0, pending: 0, overdue: 0 },
  );

  const byDept = new Map<
    string,
    {
      name: string;
      assigned: number;
      completed: number;
      overdue: number;
      people: number;
    }
  >();
  for (const r of rows) {
    const d = r.member!.department_id
      ? deptById.get(r.member!.department_id)
      : undefined;
    const key = d?.id ?? "none";
    const entry = byDept.get(key) ?? {
      name: d?.name ?? "No department",
      assigned: 0,
      completed: 0,
      overdue: 0,
      people: 0,
    };
    entry.assigned += r.assigned;
    entry.completed += r.completed;
    entry.overdue += r.overdue;
    entry.people += 1;
    byDept.set(key, entry);
  }
  const departmentsRows = [...byDept.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const overdueTasks = tasks
    .filter(
      (t) =>
        t.due_date &&
        t.due_date < today &&
        !["completed", "cancelled", "approved"].includes(t.status),
    )
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
    .slice(0, 10);

  const submittedToday = new Set(
    (reportsToday.data ?? []).map((r) => r.user_id),
  );
  const activeAssignees = rows
    .map((r) => r.member!)
    .filter((m) => m.status === "active");
  const missingReports = activeAssignees.filter(
    (m) => !submittedToday.has(m.user_id),
  );
  const scopeName = projectId
    ? ctx.projects.find((p) => p.id === projectId)?.name
    : companyId
      ? ctx.companies.find((c) => c.id === companyId)?.name
      : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team performance"
        description={`${scopeName ?? "All companies"} · based on task outcomes (assigned, completed, overdue, review), not on login time or clicks.`}
        actions={<RangePicker current={range} base="/team-performance" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tasks assigned"
          value={totals.assigned}
          hint="Due or created in this period"
          icon={ListTodo}
        />
        <StatCard
          label="Completed"
          value={totals.completed}
          hint={`${completionRate(totals)}% completion`}
          icon={CheckCircle2}
          tone="blue"
        />
        <StatCard
          label="Pending"
          value={totals.pending}
          hint="Not completed yet"
          icon={ClipboardList}
          tone="violet"
        />
        <StatCard
          label="Overdue"
          value={totals.overdue}
          hint="Past due and not finished"
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No assigned tasks in this period"
          description="Assign tasks to your team to see their progress here."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                Sorted by overdue, then pending work.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">In review</TableHead>
                    <TableHead className="text-right">Revisions</TableHead>
                    <TableHead className="text-right">Avg. time</TableHead>
                    <TableHead className="min-w-36">Completion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const pct = completionRate(r);
                    return (
                      <TableRow key={r.user_id}>
                        <TableCell>
                          <Link
                            href={`/team/${r.user_id}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <EntityAvatar
                              name={r.member!.full_name ?? r.member!.email}
                              src={r.member!.avatar_url}
                              className="size-7"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">
                                {r.member!.full_name ?? r.member!.email}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {r.member!.department_id
                                  ? deptById.get(r.member!.department_id)?.name
                                  : "No department"}
                              </span>
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.assigned}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.completed}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.pending}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${r.overdue ? "font-semibold text-destructive" : ""}`}
                        >
                          {r.overdue}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.under_review}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.revisions}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatHours(r.avg_completion_hours)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-valuenow={pct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label="Completion"
                            >
                              <div
                                className="h-full rounded-full bg-[#0D9488]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-9 text-right text-xs tabular-nums">
                              {pct}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Completion rate by department</CardTitle>
                <CardDescription>
                  Completed ÷ assigned in this period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatusChart
                  data={departmentsRows.map((d) => ({
                    label: d.name,
                    count: completionRate(d),
                  }))}
                  seriesLabel="Completion rate"
                  valueSuffix="%"
                  max={100}
                />
                <ul className="mt-4 divide-y text-sm">
                  {departmentsRows.map((d) => (
                    <li
                      key={d.name}
                      className="flex items-center justify-between py-2"
                    >
                      <span>{d.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {d.people} people · {d.completed}/{d.assigned} done ·{" "}
                        {d.overdue} overdue
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Overdue tasks</CardTitle>
                  <CardDescription>Oldest first.</CardDescription>
                </CardHeader>
                <CardContent>
                  {overdueTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing overdue.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {overdueTasks.map((t) => (
                        <li key={t.id}>
                          <Link
                            href={`/tasks/${t.id}`}
                            className="flex items-center gap-3 py-2 text-sm hover:underline"
                          >
                            <span className="font-mono text-xs text-muted-foreground">
                              {taskCode(t.task_number)}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {t.title}
                            </span>
                            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                              {t.assignees.map((a) => a.name).join(", ") ||
                                "Unassigned"}
                            </span>
                            <DueDate due={t.due_date} status={t.status} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily reports today</CardTitle>
                  <CardDescription>
                    {activeAssignees.length - missingReports.length} of{" "}
                    {activeAssignees.length} people with tasks have submitted.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {missingReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Everyone has submitted.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {missingReports.map((m) => (
                        <li
                          key={m.user_id}
                          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs"
                        >
                          <EntityAvatar
                            name={m.full_name ?? m.email}
                            src={m.avatar_url}
                            className="size-5 text-[8px]"
                          />
                          {m.full_name ?? m.email}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href="/daily-reports?tab=team"
                    className="mt-3 inline-block text-sm text-primary-strong hover:underline"
                  >
                    Review team reports →
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
