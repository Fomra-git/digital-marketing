"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import {
  dbFailure,
  failure,
  success,
  validationFailure,
  type ActionResult,
} from "@/lib/actions";
import { departmentSchema, type DepartmentInput } from "@/lib/validations/team";
import { nullable, slugify } from "@/lib/utils";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

export async function createDepartment(
  input: DepartmentInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.departmentsManage))
    return failure("You do not have permission to manage departments.");
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const { error } = await ctx.supabase.from("departments").insert({
    organization_id: ctx.organization.id,
    key: slugify(parsed.data.name).replace(/-/g, "_"),
    name: parsed.data.name,
    description: nullable(parsed.data.description),
    color: parsed.data.color,
    head_user_id: nullable(parsed.data.head_user_id),
    is_active: parsed.data.is_active,
  });
  if (error)
    return error.code === "23505"
      ? failure("A department with this name already exists.")
      : dbFailure(error, "create department");
  revalidatePath("/settings/departments");
  revalidatePath("/team");
  return success(undefined, `${parsed.data.name} created.`);
}

export async function updateDepartment(
  departmentId: string,
  input: DepartmentInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.departmentsManage))
    return failure("You do not have permission to manage departments.");
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const { data, error } = await ctx.supabase
    .from("departments")
    .update({
      name: parsed.data.name,
      description: nullable(parsed.data.description),
      color: parsed.data.color,
      head_user_id: nullable(parsed.data.head_user_id),
      is_active: parsed.data.is_active,
    })
    .eq("id", departmentId)
    .select("id");
  if (error) return dbFailure(error, "update department");
  if (!data?.length) return failure("Department not found.");
  revalidatePath("/settings/departments");
  revalidatePath("/team");
  return success(undefined, "Department saved.");
}

export async function deleteDepartment(
  departmentId: string,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.departmentsManage))
    return failure("You do not have permission to manage departments.");
  const { data, error } = await ctx.supabase
    .from("departments")
    .delete()
    .eq("id", departmentId)
    .select("id");
  if (error) return dbFailure(error, "delete department");
  if (!data?.length) return failure("Department not found.");
  revalidatePath("/settings/departments");
  revalidatePath("/team");
  return success(
    undefined,
    "Department deleted. Its members are now unassigned.",
  );
}
