import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { NoPermission } from "@/components/shared/no-permission";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { listTasks, taskCreationScopes } from "@/server/queries/tasks";
import { getDepartmentOptions } from "@/server/queries/team";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const ctx = await requireAppContext();
  if (!ctx.canAnywhere("tasks.view") && !ctx.canAnywhere("tasks.view_all"))
    return <NoPermission what="tasks" />;

  const { companyId, projectId } = ctx.selection;
  const [tasks, departments] = await Promise.all([
    listTasks(ctx, { companyId, projectId }),
    getDepartmentOptions(ctx),
  ]);
  const scopes = taskCreationScopes(ctx);
  const people = [
    ...new Map(
      tasks.flatMap((t) => t.assignees).map((p) => [p.user_id, p]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const scopeName = projectId
    ? ctx.projects.find((p) => p.id === projectId)?.name
    : companyId
      ? ctx.companies.find((c) => c.id === companyId)?.name
      : undefined;
  const canSeeAll = ctx.canAnywhere("tasks.view_all");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={
          (scopeName ? `${scopeName}. ` : "All companies. ") +
          (canSeeAll
            ? "Drag cards between columns to update their status."
            : "Tasks you created or are assigned to.")
        }
      />
      <Suspense fallback={<PageSkeleton />}>
        <TasksBoard
          initialTasks={tasks}
          scopes={scopes}
          departments={departments}
          people={people}
          canSeeAll={canSeeAll}
        />
      </Suspense>
    </div>
  );
}
