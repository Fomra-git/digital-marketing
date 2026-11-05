import "server-only";
import type { AppContext } from "@/lib/auth/context";

export function reportScopes(ctx: AppContext) {
  return {
    companies: ctx.companies
      .filter(
        (c) =>
          ctx.can("daily_reports.submit", { companyId: c.id }) ||
          ctx.projects.some(
            (p) =>
              p.company_id === c.id &&
              ctx.can("daily_reports.submit", {
                companyId: c.id,
                projectId: p.id,
              }),
          ),
      )
      .map((c) => ({ id: c.id, name: c.name })),
    projects: ctx.projects
      .filter((p) =>
        ctx.can("daily_reports.submit", {
          companyId: p.company_id,
          projectId: p.id,
        }),
      )
      .map((p) => ({ id: p.id, name: p.name, company_id: p.company_id })),
  };
}

export type ReportListItem = {
  id: string;
  report_date: string;
  status: string;
  user_id: string;
  author: string;
  avatar_url: string | null;
  company_name: string;
  project_name: string | null;
  submitted_at: string | null;
  summary: string | null;
  comment_count: number;
};

export async function listReports(
  ctx: AppContext,
  opts: {
    mine?: boolean;
    companyId?: string | null;
    projectId?: string | null;
    from?: string;
    to?: string;
    limit?: number;
  },
): Promise<ReportListItem[]> {
  let q = ctx.supabase
    .from("daily_reports")
    .select(
      "id, report_date, status, user_id, submitted_at, completed_activities, company:companies(name), project:projects!daily_reports_project_id_company_id_fkey(name), author:profiles!daily_reports_user_id_fkey(full_name, email, avatar_url), daily_report_comments(count)",
    )
    .order("report_date", { ascending: false })
    .order("submitted_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.mine) q = q.eq("user_id", ctx.user.id);
  else q = q.neq("status", "draft");
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  else if (opts.companyId) q = q.eq("company_id", opts.companyId);
  if (opts.from) q = q.gte("report_date", opts.from);
  if (opts.to) q = q.lte("report_date", opts.to);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    report_date: r.report_date,
    status: r.status,
    user_id: r.user_id,
    author: r.author?.full_name ?? r.author?.email ?? "Unknown",
    avatar_url: r.author?.avatar_url ?? null,
    company_name: r.company?.name ?? "—",
    project_name: r.project?.name ?? null,
    submitted_at: r.submitted_at,
    summary: r.completed_activities,
    comment_count: r.daily_report_comments?.[0]?.count ?? 0,
  }));
}
