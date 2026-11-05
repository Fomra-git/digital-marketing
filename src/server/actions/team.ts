"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth/context";
import { createAdminClient, getServiceRoleKey } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { P } from "@/lib/permissions";
import {
  dbFailure,
  failure,
  success,
  validationFailure,
  type ActionResult,
} from "@/lib/actions";
import {
  assignRoleSchema,
  inviteMemberSchema,
  memberUpdateSchema,
  type AssignRoleInput,
  type InviteMemberInput,
  type MemberUpdateInput,
} from "@/lib/validations/team";
import { id as idSchema } from "@/lib/validations/common";
import { nullable } from "@/lib/utils";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

/**
 * Invite a person (or add an existing account) to the organization, optionally
 * with a first role. The service-role key is used ONLY for the Supabase Auth
 * admin calls; membership and role rows are written with the acting user's
 * client so RLS and the escalation guards in the database still apply.
 */
export async function inviteMember(
  input: InviteMemberInput,
): Promise<ActionResult<{ userId: string; invited: boolean }>> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.usersManage))
    return failure("You do not have permission to add team members.");
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;

  if (v.company_id && !ctx.companies.some((c) => c.id === v.company_id))
    return failure("Company not available.");
  if (
    v.project_id &&
    !ctx.projects.some(
      (p) => p.id === v.project_id && p.company_id === v.company_id,
    )
  ) {
    return failure("Project not available.");
  }
  if (!getServiceRoleKey()) {
    return failure(
      "Invitations need SUPABASE_SECRET_KEY to be configured on the server. See the setup guide.",
    );
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", v.email)
    .maybeSingle();

  let userId = existing?.id;
  let invited = false;
  if (userId) {
    const { data: member } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", ctx.organization.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (member)
      return failure("This person is already a member of the organization.");
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(v.email, {
      data: { full_name: v.full_name },
      redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/auth/set-password`,
    });
    if (error || !data.user) {
      console.error("[team] invite failed", error);
      return failure(error?.message ?? "Could not send the invitation.");
    }
    userId = data.user.id;
    invited = true;
    if (v.job_title)
      await admin
        .from("profiles")
        .update({ job_title: v.job_title })
        .eq("id", userId);
  }

  const { error: memberError } = await ctx.supabase
    .from("organization_members")
    .insert({
      organization_id: ctx.organization.id,
      user_id: userId,
      department_id: nullable(v.department_id),
      invited_by: ctx.user.id,
      status: "active",
    });
  if (memberError) return dbFailure(memberError, "add organization member");

  if (v.role_id) {
    const { error } = await ctx.supabase.from("user_role_assignments").insert({
      organization_id: ctx.organization.id,
      user_id: userId,
      role_id: v.role_id,
      company_id: nullable(v.company_id),
      project_id: nullable(v.project_id),
    });
    if (error) {
      revalidatePath("/team");
      const reason = dbFailure(error, "assign first role");
      return failure(
        `Member added, but the role could not be assigned. ${reason.ok ? "" : reason.error}`,
      );
    }
  }

  revalidatePath("/team");
  return success(
    { userId, invited },
    invited
      ? `Invitation sent to ${v.email}.`
      : `${v.full_name} was added to the organization.`,
  );
}

export async function assignRole(
  input: AssignRoleInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.usersManage))
    return failure("You do not have permission to assign roles.");
  const parsed = assignRoleSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const v = parsed.data;

  const { error } = await ctx.supabase.from("user_role_assignments").insert({
    organization_id: ctx.organization.id,
    user_id: v.user_id,
    role_id: v.role_id,
    company_id: nullable(v.company_id),
    project_id: nullable(v.project_id),
  });
  if (error) {
    if (error.code === "23505")
      return failure("This person already has that role at that level.");
    return dbFailure(error, "assign role");
  }
  revalidatePath("/team", "layout");
  revalidatePath("/companies", "layout");
  revalidatePath("/projects", "layout");
  return success(undefined, "Role assigned.");
}

export async function revokeAssignment(
  assignmentId: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.usersManage))
    return failure("You do not have permission to change roles.");
  if (!idSchema.safeParse(assignmentId).success)
    return failure("Invalid assignment.");

  const { data, error } = await ctx.supabase
    .from("user_role_assignments")
    .delete()
    .eq("id", assignmentId)
    .select("id");
  if (error) return dbFailure(error, "revoke assignment");
  if (!data?.length) return failure("The role assignment was not found.");
  revalidatePath("/team", "layout");
  revalidatePath("/companies", "layout");
  revalidatePath("/projects", "layout");
  return success(undefined, "Role removed.");
}

export async function updateMember(
  userId: string,
  input: MemberUpdateInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.usersManage))
    return failure("You do not have permission to edit team members.");
  const parsed = memberUpdateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  if (parsed.data.reports_to === userId)
    return failure("A person cannot report to themselves.");

  const { data, error } = await ctx.supabase
    .from("organization_members")
    .update({
      department_id: nullable(parsed.data.department_id),
      reports_to: nullable(parsed.data.reports_to),
    })
    .eq("organization_id", ctx.organization.id)
    .eq("user_id", userId)
    .select("id");
  if (error) return dbFailure(error, "update member");
  if (!data?.length) return failure("Member not found.");
  revalidatePath("/team", "layout");
  return success(undefined, "Member updated.");
}

export async function setMemberStatus(
  userId: string,
  status: "active" | "suspended",
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.usersManage))
    return failure("You do not have permission to change member access.");
  if (userId === ctx.user.id)
    return failure("You cannot change your own access.");

  const { data, error } = await ctx.supabase
    .from("organization_members")
    .update({ status })
    .eq("organization_id", ctx.organization.id)
    .eq("user_id", userId)
    .select("id");
  if (error) return dbFailure(error, "set member status");
  if (!data?.length) return failure("Member not found.");
  revalidatePath("/team", "layout");
  return success(
    undefined,
    status === "suspended" ? "Access suspended." : "Access restored.",
  );
}

export async function removeMember(userId: string): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.usersManage))
    return failure("You do not have permission to remove team members.");
  if (userId === ctx.user.id) return failure("You cannot remove yourself.");

  const { data, error } = await ctx.supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", ctx.organization.id)
    .eq("user_id", userId)
    .select("id");
  if (error) return dbFailure(error, "remove member");
  if (!data?.length) return failure("Member not found.");
  revalidatePath("/team", "layout");
  return success(undefined, "Member removed from the organization.");
}
