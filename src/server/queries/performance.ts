import "server-only";
import type { AppContext } from "@/lib/auth/context";

export type SummaryRow = {
  user_id: string;
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
  under_review: number;
  revisions: number;
  avg_completion_hours: number | null;
};

/** Task outcomes per assignee (RLS-filtered in the database). */
export async function getAssigneeSummary(
  ctx: AppContext,
  opts: {
    companyId?: string | null;
    projectId?: string | null;
    from?: string;
    to?: string;
  } = {},
): Promise<SummaryRow[]> {
  const { data, error } = await ctx.supabase.rpc("task_assignee_summary", {
    p_company_id: opts.companyId ?? undefined,
    p_project_id: opts.projectId ?? undefined,
    p_from: opts.from,
    p_to: opts.to,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    user_id: r.user_id,
    assigned: Number(r.assigned),
    completed: Number(r.completed),
    pending: Number(r.pending),
    overdue: Number(r.overdue),
    under_review: Number(r.under_review),
    revisions: Number(r.revisions),
    avg_completion_hours:
      r.avg_completion_hours === null ? null : Number(r.avg_completion_hours),
  }));
}

export function completionRate(r: Pick<SummaryRow, "assigned" | "completed">) {
  return r.assigned ? Math.round((r.completed / r.assigned) * 100) : 0;
}

export function formatHours(h: number | null) {
  if (h === null) return "—";
  return h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`;
}
