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
import {
  roleSchema,
  rolePermissionsSchema,
  type RoleInput,
} from "@/lib/validations/team";
import { nullable, slugify } from "@/lib/utils";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

export async function createRole(
  input: RoleInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.rolesManage))
    return failure("You do not have permission to manage roles.");
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const key = `custom_${slugify(parsed.data.name).replace(/-/g, "_")}`.slice(
    0,
    60,
  );
  const { data: role, error } = await ctx.supabase
    .from("roles")
    .insert({
      organization_id: ctx.organization.id,
      key,
      name: parsed.data.name,
      description: nullable(parsed.data.description),
      color: parsed.data.color,
    })
    .select("id")
    .single();
  if (error || !role) {
    if (error?.code === "23505")
      return failure("A role with this name already exists.");
    return error
      ? dbFailure(error, "create role")
      : failure("Could not create the role.");
  }

  if (parsed.data.copy_from_role_id) {
    const { data: source } = await ctx.supabase
      .from("roles")
      .select("grants_all, role_permissions(permission_key)")
      .eq("id", parsed.data.copy_from_role_id)
      .single();
    let keys = source?.role_permissions.map((rp) => rp.permission_key) ?? [];
    if (source?.grants_all) {
      // Copying a full-access role copies its permissions explicitly; the new
      // custom role never becomes full-access itself.
      const { data: all } = await ctx.supabase
        .from("permissions")
        .select("key");
      keys = all?.map((p) => p.key) ?? [];
    }
    if (keys.length) {
      const { error: copyError } = await ctx.supabase
        .from("role_permissions")
        .insert(
          keys.map((permission_key) => ({ role_id: role.id, permission_key })),
        );
      if (copyError) return dbFailure(copyError, "copy role permissions");
    }
  }

  revalidatePath("/settings/roles", "layout");
  return success({ id: role.id }, `${parsed.data.name} created.`);
}

export async function updateRole(
  roleId: string,
  input: RoleInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.rolesManage))
    return failure("You do not have permission to manage roles.");
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const { data, error } = await ctx.supabase
    .from("roles")
    .update({
      name: parsed.data.name,
      description: nullable(parsed.data.description),
      color: parsed.data.color,
    })
    .eq("id", roleId)
    .eq("organization_id", ctx.organization.id)
    .select("id");
  if (error) return dbFailure(error, "update role");
  if (!data?.length) return failure("Role not found.");
  revalidatePath("/settings/roles", "layout");
  return success(undefined, "Role saved.");
}

/** Replace a role's permission set with exactly the given keys. */
export async function setRolePermissions(
  roleId: string,
  permissionKeys: string[],
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.rolesManage))
    return failure("You do not have permission to manage roles.");
  const parsed = rolePermissionsSchema.safeParse({
    role_id: roleId,
    permission_keys: permissionKeys,
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const { data: role, error: roleError } = await ctx.supabase
    .from("roles")
    .select("id, grants_all, role_permissions(permission_key)")
    .eq("id", roleId)
    .eq("organization_id", ctx.organization.id)
    .single();
  if (roleError || !role) return failure("Role not found.");
  if (role.grants_all)
    return failure(
      "This role has full access; its permissions cannot be narrowed.",
    );

  const wanted = new Set(parsed.data.permission_keys);
  const current = new Set(role.role_permissions.map((rp) => rp.permission_key));
  const toAdd = [...wanted].filter((k) => !current.has(k));
  const toRemove = [...current].filter((k) => !wanted.has(k));

  if (toAdd.length) {
    const { error } = await ctx.supabase
      .from("role_permissions")
      .insert(
        toAdd.map((permission_key) => ({ role_id: roleId, permission_key })),
      );
    if (error) return dbFailure(error, "add role permissions");
  }
  if (toRemove.length) {
    const { error } = await ctx.supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .in("permission_key", toRemove);
    if (error) return dbFailure(error, "remove role permissions");
  }

  revalidatePath("/", "layout");
  return success(
    undefined,
    `Permissions updated (${toAdd.length} added, ${toRemove.length} removed).`,
  );
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.rolesManage))
    return failure("You do not have permission to manage roles.");

  const { data, error } = await ctx.supabase
    .from("roles")
    .delete()
    .eq("id", roleId)
    .eq("organization_id", ctx.organization.id)
    .select("id");
  if (error) return dbFailure(error, "delete role");
  if (!data?.length) return failure("Role not found.");
  revalidatePath("/", "layout");
  return success(
    undefined,
    "Role deleted. Everyone who had it lost those permissions.",
  );
}
