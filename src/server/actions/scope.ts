"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  getActionContext,
  SCOPE_COMPANY_COOKIE,
  SCOPE_PROJECT_COOKIE,
} from "@/lib/auth/context";
import { failure, success, type ActionResult } from "@/lib/actions";

/** Header company / project switcher. Only accessible ids are accepted. */
export async function setScope(
  companyId: string | null,
  projectId: string | null,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure("Your session has expired. Please sign in again.");

  if (companyId && !ctx.companies.some((c) => c.id === companyId))
    return failure("Company not available.");
  const project = projectId
    ? ctx.projects.find((p) => p.id === projectId)
    : null;
  if (
    projectId &&
    (!project || (companyId && project.company_id !== companyId))
  )
    return failure("Project not available.");

  const store = await cookies();
  const options = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
  };
  if (companyId) store.set(SCOPE_COMPANY_COOKIE, companyId, options);
  else store.delete(SCOPE_COMPANY_COOKIE);
  if (projectId) store.set(SCOPE_PROJECT_COOKIE, projectId, options);
  else store.delete(SCOPE_PROJECT_COOKIE);

  revalidatePath("/", "layout");
  return success(undefined);
}
