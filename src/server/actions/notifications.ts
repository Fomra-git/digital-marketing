"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth/context";
import { dbFailure, failure, success, type ActionResult } from "@/lib/actions";

export async function markNotificationRead(
  notificationId: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure("Your session has expired. Please sign in again.");
  const { error } = await ctx.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);
  if (error) return dbFailure(error, "mark notification read");
  revalidatePath("/notifications");
  return success(undefined);
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure("Your session has expired. Please sign in again.");
  const { error } = await ctx.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", ctx.user.id)
    .is("read_at", null);
  if (error) return dbFailure(error, "mark all notifications read");
  revalidatePath("/notifications");
  return success(undefined, "All notifications marked as read.");
}
