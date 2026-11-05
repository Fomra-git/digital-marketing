"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth/context";
import {
  dbFailure,
  failure,
  success,
  validationFailure,
  type ActionResult,
} from "@/lib/actions";
import { profileSchema, type ProfileInput } from "@/lib/validations/team";
import { nullable } from "@/lib/utils";

export async function updateProfile(
  input: ProfileInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure("Your session has expired. Please sign in again.");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      job_title: nullable(parsed.data.job_title),
      phone: nullable(parsed.data.phone),
      timezone: parsed.data.timezone,
    })
    .eq("id", ctx.user.id);
  if (error) return dbFailure(error, "update profile");
  revalidatePath("/", "layout");
  return success(undefined, "Profile saved.");
}

export async function setAvatar(
  avatarUrl: string | null,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure("Your session has expired. Please sign in again.");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    avatarUrl &&
    !avatarUrl.startsWith(
      `${base}/storage/v1/object/public/branding/${ctx.organization.id}/avatars/${ctx.user.id}/`,
    )
  ) {
    return failure("Invalid image location.");
  }
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", ctx.user.id);
  if (error) return dbFailure(error, "set avatar");
  revalidatePath("/", "layout");
  return success(undefined, "Photo updated.");
}
