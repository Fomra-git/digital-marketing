/**
 * Permission evaluation shared by server and client code.
 *
 * This mirrors the SQL helpers in supabase/migrations/..._authorization.sql
 * exactly. It is used to decide what to SHOW. Enforcement always happens in
 * the database (RLS + triggers) and is re-checked in server actions.
 */

export type Grant = {
  organization_id: string;
  company_id: string | null;
  project_id: string | null;
  permission_key: string; // "module.action" or "*"
};

export type Scope = {
  companyId?: string | null;
  /** When projectId is given, companyId must be the project's company. */
  projectId?: string | null;
};

const ALL = "*";

function grants(g: Grant, permission: string) {
  return g.permission_key === permission || g.permission_key === ALL;
}

/**
 * - no scope: organization-level permission (e.g. companies.create, roles.manage)
 * - company scope: org-wide or company-wide grant
 * - project scope: org-wide, company-wide (of the project's company) or project grant
 */
export function can(
  all: Grant[],
  permission: string,
  scope: Scope = {},
): boolean {
  const { companyId, projectId } = scope;
  return all.some((g) => {
    if (!grants(g, permission)) return false;
    if (g.company_id === null) return true; // organization scope covers everything
    if (!companyId) return false;
    if (projectId) {
      return (
        (g.company_id === companyId && g.project_id === null) ||
        g.project_id === projectId
      );
    }
    return g.company_id === companyId && g.project_id === null;
  });
}

/** Holds the permission somewhere (any company or project). Used for navigation. */
export function canAnywhere(all: Grant[], permission: string): boolean {
  return all.some((g) => grants(g, permission));
}

export function isOrgAdmin(all: Grant[]): boolean {
  return all.some((g) => g.permission_key === ALL && g.company_id === null);
}

/** Permission keys, typed, so typos fail at compile time. */
export const P = {
  settingsManage: "settings.manage",
  usersView: "users.view",
  usersManage: "users.manage",
  rolesManage: "roles.manage",
  departmentsManage: "departments.manage",
  integrationsManage: "integrations.manage",
  activityView: "activity.view",
  companiesView: "companies.view",
  companiesCreate: "companies.create",
  companiesEdit: "companies.edit",
  companiesDelete: "companies.delete",
  projectsView: "projects.view",
  projectsCreate: "projects.create",
  projectsEdit: "projects.edit",
  projectsDelete: "projects.delete",
  dashboardExecutive: "dashboard.executive",
  teamPerformance: "team.view_performance",
  reportsView: "reports.view",
  reportsExport: "reports.export",
} as const;

export type PermissionKey = (typeof P)[keyof typeof P] | (string & {});
