import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Eye,
  ListTodo,
  CheckCircle2,
  Circle,
  FolderKanban,
  History,
  ShieldCheck,
  Users,
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
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { RoleChip } from "@/components/team/assignments-panel";
import { StatusChart } from "@/components/dashboard/status-chart";
import { getAssignments } from "@/server/queries/team";
import { listTasks } from "@/server/queries/tasks";
import { humanize, timeAgo } from "@/lib/utils";
import { PROJECT_STATUSES } from "@/lib/validations/project";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireAppContext();
  const { companyId, projectId } = ctx.selection;
  const company = ctx.companies.find((c) => c.id === companyId);
  const project = ctx.projects.find((p) => p.id === projectId);

  // Everything below is filtered by the header selection and by RLS.
  const projects = ctx.projects.filter(
    (p) =>
      (!companyId || p.company_id === companyId) &&
      (!projectId || p.id === projectId),
  );
  const companies = companyId
    ? ctx.companies.filter((c) => c.id === companyId)
    : ctx.companies;
  const canSeeTeam = ctx.can(P.usersView) || ctx.can(P.usersManage);

  let activityQuery = ctx.supabase
    .from("activity_logs")
    .select(
      "id, action, entity_type, summary, created_at, actor:profiles!activity_logs_actor_id_fkey(full_name, email)",
    )
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(8);
  if (projectId) activityQuery = activityQuery.eq("project_id", projectId);
  else if (companyId) activityQuery = activityQuery.eq("company_id", companyId);

  const [membersRes, activityRes, myAssignments, rolesRes, invitedRes, tasks] =
    await Promise.all([
      ctx.supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ctx.organization.id)
        .eq("status", "active"),
      activityQuery,
      getAssignments(ctx, { userId: ctx.user.id }),
      ctx.isAdmin
        ? ctx.supabase
            .from("user_role_assignments")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", ctx.organization.id)
        : Promise.resolve({ count: null }),
      ctx.isAdmin
        ? ctx.supabase
            .from("organization_members")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", ctx.organization.id)
        : Promise.resolve({ count: null }),
      ctx.canAnywhere("tasks.view") || ctx.canAnywhere("tasks.view_all")
        ? listTasks(ctx, { companyId, projectId })
        : Promise.resolve(null),
    ]);

  const today = new Date().toISOString().slice(0, 10);
  const openTasks =
    tasks?.filter((t) => !["completed", "cancelled"].includes(t.status)) ?? [];
  const taskStats = tasks
    ? {
        open: openTasks.length,
        overdue: openTasks.filter(
          (t) => t.status !== "approved" && t.due_date && t.due_date < today,
        ).length,
        review: openTasks.filter((t) => t.status === "waiting_for_review")
          .length,
        completed: tasks.filter((t) => t.status === "completed").length,
      }
    : null;

  const statusData = PROJECT_STATUSES.map((s) => ({
    label: humanize(s),
    count: projects.filter((p) => p.status === s).length,
  }));
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const activeCompanies = companies.filter((c) => c.status === "active").length;
  const firstName = (ctx.profile.full_name ?? "").split(" ")[0] || "there";

  const checklist = ctx.isAdmin
    ? [
        {
          done: ctx.companies.length > 0,
          label: "Add your first company",
          href: "/companies",
        },
        {
          done: ctx.projects.length > 0,
          label: "Create a project",
          href: "/projects",
        },
        {
          done: (invitedRes.count ?? 0) > 1,
          label: "Invite your team",
          href: "/team",
        },
        {
          done: (rolesRes.count ?? 0) > 1,
          label: "Give people roles for companies or projects",
          href: "/team",
        },
        {
          done: Boolean(ctx.organization.logo_url),
          label: "Upload your organization logo",
          href: "/settings/organization",
        },
      ]
    : [];
  const checklistOpen = checklist.some((c) => !c.done);

  const companyName = new Map(ctx.companies.map((c) => [c.id, c.name]));
  const projectName = new Map(ctx.projects.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={
          project
            ? `Showing ${project.name} (${company?.name}).`
            : company
              ? `Showing ${company.name} and its projects.`
              : `Overview of ${ctx.organization.name}. Pick a company in the header to focus.`
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={company ? "Company" : "Companies"}
          value={companies.length}
          hint={`${activeCompanies} active`}
          icon={Building2}
          href={
            ctx.canAnywhere(P.companiesView)
              ? company
                ? `/companies/${company.id}`
                : "/companies"
              : undefined
          }
        />
        <StatCard
          label="Active projects"
          value={activeProjects}
          hint={`${projects.length} in total`}
          icon={FolderKanban}
          tone="blue"
          href={ctx.canAnywhere(P.projectsView) ? "/projects" : undefined}
        />
        <StatCard
          label="Team members"
          value={membersRes.count ?? "—"}
          hint="Active in the organization"
          icon={Users}
          tone="violet"
          href={canSeeTeam ? "/team" : undefined}
        />
        <StatCard
          label="My roles"
          value={myAssignments.length}
          hint={ctx.isAdmin ? "Super Admin" : "Across companies and projects"}
          icon={ShieldCheck}
          tone="amber"
          href={`/team/${ctx.user.id}`}
        />
      </div>

      {taskStats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open tasks"
            value={taskStats.open}
            hint="Not completed or cancelled"
            icon={ListTodo}
            href="/tasks"
          />
          <StatCard
            label="Overdue tasks"
            value={taskStats.overdue}
            hint="Past due date"
            icon={AlertTriangle}
            tone="amber"
            href="/tasks?view=list"
          />
          <StatCard
            label="Waiting for review"
            value={taskStats.review}
            hint="Submitted, not yet approved"
            icon={Eye}
            tone="violet"
            href="/tasks"
          />
          <StatCard
            label="Completed tasks"
            value={taskStats.completed}
            hint="Last 90 days"
            icon={CheckCircle2}
            tone="blue"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projects by status</CardTitle>
            <CardDescription>
              {projects.length} project{projects.length === 1 ? "" : "s"} you
              can access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                title="No projects yet"
                className="py-10"
              />
            ) : (
              <StatusChart data={statusData} />
            )}
          </CardContent>
        </Card>

        {checklistOpen ? (
          <Card>
            <CardHeader>
              <CardTitle>Getting started</CardTitle>
              <CardDescription>
                {checklist.filter((c) => c.done).length} of {checklist.length}{" "}
                done
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {checklist.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted"
                    >
                      {item.done ? (
                        <CheckCircle2 className="size-4 text-success" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                      <span
                        className={
                          item.done ? "text-muted-foreground line-through" : ""
                        }
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>My access</CardTitle>
              <CardDescription>Roles you hold and where.</CardDescription>
            </CardHeader>
            <CardContent>
              {myAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roles assigned yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {myAssignments.map((a) => (
                    <li key={a.id} className="flex flex-col gap-1">
                      {a.role && (
                        <RoleChip name={a.role.name} color={a.role.color} />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {a.project_id
                          ? `Project: ${projectName.get(a.project_id) ?? "—"}`
                          : a.company_id
                            ? `Company: ${companyName.get(a.company_id) ?? "—"}`
                            : "Whole organization"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" /> Recent activity
          </CardTitle>
          <CardDescription>
            {ctx.can(P.activityView)
              ? "Latest changes in this scope."
              : "Your latest changes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(activityRes.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing recorded yet.
            </p>
          ) : (
            <ul className="divide-y">
              {(activityRes.data ?? []).map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-4 py-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium">
                      {a.actor?.full_name ?? a.actor?.email ?? "System"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {a.action}{" "}
                      {humanize(a.entity_type).toLowerCase().replace(/s$/, "")}
                    </span>
                    {a.summary ? <span> · {a.summary}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
