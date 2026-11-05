import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { id as idSchema } from "@/lib/validations/common";
import {
  getAssignments,
  getDepartmentOptions,
  getMemberOptions,
  getRoleOptions,
} from "@/server/queries/team";
import { MemberDetail } from "@/components/team/member-detail";

export const metadata: Metadata = { title: "Team member" };

export default async function MemberPage({
  params,
}: PageProps<"/team/[userId]">) {
  const { userId } = await params;
  if (!idSchema.safeParse(userId).success) notFound();
  const ctx = await requireAppContext();

  const { data: membership } = await ctx.supabase
    .from("organization_members")
    .select(
      "user_id, status, is_owner, department_id, reports_to, profile:profiles!organization_members_user_id_fkey(full_name, email, phone, avatar_url, job_title)",
    )
    .eq("organization_id", ctx.organization.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership?.profile) notFound();

  const isSelf = userId === ctx.user.id;
  const canSeeRoles = isSelf || ctx.can(P.usersView) || ctx.can(P.usersManage);
  const canManage = ctx.can(P.usersManage);
  const canSeeActivity = isSelf || ctx.can(P.activityView);

  const [assignments, departments, members, roles, activity] =
    await Promise.all([
      canSeeRoles ? getAssignments(ctx, { userId }) : Promise.resolve([]),
      getDepartmentOptions(ctx),
      getMemberOptions(ctx),
      canManage ? getRoleOptions(ctx) : Promise.resolve([]),
      canSeeActivity
        ? ctx.supabase
            .from("activity_logs")
            .select("id, action, entity_type, summary, created_at")
            .eq("organization_id", ctx.organization.id)
            .eq("actor_id", userId)
            .order("created_at", { ascending: false })
            .limit(10)
            .then((r) => r.data ?? [])
        : Promise.resolve(null),
    ]);

  return (
    <MemberDetail
      member={{
        user_id: membership.user_id,
        status: membership.status,
        is_owner: membership.is_owner,
        department_id: membership.department_id,
        reports_to: membership.reports_to,
        full_name: membership.profile.full_name,
        email: membership.profile.email,
        phone: membership.profile.phone,
        avatar_url: membership.profile.avatar_url,
        job_title: membership.profile.job_title,
      }}
      assignments={assignments}
      showAssignments={canSeeRoles}
      departments={departments}
      members={members}
      roles={roles}
      activity={activity}
    />
  );
}
