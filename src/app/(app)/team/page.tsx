import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { NoPermission } from "@/components/shared/no-permission";
import { TeamView, type TeamRow } from "@/components/team/team-view";
import {
  getAssignments,
  getDepartmentOptions,
  getMemberOptions,
  getRoleOptions,
} from "@/server/queries/team";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await requireAppContext();
  if (!ctx.can(P.usersView) && !ctx.can(P.usersManage))
    return <NoPermission what="the team directory" />;

  const [members, assignments, departments, roles] = await Promise.all([
    getMemberOptions(ctx),
    getAssignments(ctx),
    getDepartmentOptions(ctx),
    getRoleOptions(ctx),
  ]);

  const companyName = new Map(ctx.companies.map((c) => [c.id, c.name]));
  const projectName = new Map(ctx.projects.map((p) => [p.id, p.name]));
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));

  const rows: TeamRow[] = members.map((m) => ({
    user_id: m.user_id,
    name: m.full_name ?? m.email,
    email: m.email,
    avatar_url: m.avatar_url,
    job_title: m.job_title,
    department: m.department_id
      ? (departmentName.get(m.department_id) ?? null)
      : null,
    status: m.status,
    roles: assignments
      .filter((a) => a.user_id === m.user_id && a.role)
      .map((a) => ({
        key: a.id,
        name: a.role!.name,
        color: a.role!.color,
        where: a.project_id
          ? `Project: ${projectName.get(a.project_id) ?? "—"}`
          : a.company_id
            ? `Company: ${companyName.get(a.company_id) ?? "—"}`
            : "Whole organization",
      })),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Everyone in the organization, their department and what they can access."
      />
      <TeamView
        rows={rows}
        canManage={ctx.can(P.usersManage)}
        roles={roles}
        departments={departments}
      />
    </div>
  );
}
