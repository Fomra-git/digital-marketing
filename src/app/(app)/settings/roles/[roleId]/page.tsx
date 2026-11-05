import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { id as idSchema } from "@/lib/validations/common";
import { NoPermission } from "@/components/shared/no-permission";
import { RoleEditor } from "@/components/settings/role-editor";

export const metadata: Metadata = { title: "Role" };

export default async function RolePage({
  params,
}: PageProps<"/settings/roles/[roleId]">) {
  const { roleId } = await params;
  if (!idSchema.safeParse(roleId).success) notFound();
  const ctx = await requireAppContext();
  if (!ctx.can(P.rolesManage) && !ctx.can(P.usersManage))
    return <NoPermission what="roles" />;

  const [roleRes, permsRes, holdersRes] = await Promise.all([
    ctx.supabase
      .from("roles")
      .select(
        "id, name, description, color, is_system, grants_all, role_permissions(permission_key)",
      )
      .eq("id", roleId)
      .eq("organization_id", ctx.organization.id)
      .maybeSingle(),
    ctx.supabase
      .from("permissions")
      .select("key, module, label, description")
      .order("sort_order"),
    ctx.supabase
      .from("user_role_assignments")
      .select(
        "user_id, company_id, project_id, profile:profiles!user_role_assignments_user_id_fkey(full_name, email, avatar_url)",
      )
      .eq("role_id", roleId),
  ]);
  const role = roleRes.data;
  if (!role) notFound();

  const companyName = new Map(ctx.companies.map((c) => [c.id, c.name]));
  const projectName = new Map(ctx.projects.map((p) => [p.id, p.name]));

  return (
    <RoleEditor
      role={role}
      permissions={permsRes.data ?? []}
      granted={role.role_permissions.map((rp) => rp.permission_key)}
      canManage={ctx.can(P.rolesManage)}
      holders={(holdersRes.data ?? []).map((h) => ({
        user_id: h.user_id,
        name: h.profile?.full_name ?? h.profile?.email ?? "Unknown",
        avatar_url: h.profile?.avatar_url ?? null,
        where: h.project_id
          ? `Project: ${projectName.get(h.project_id) ?? "—"}`
          : h.company_id
            ? `Company: ${companyName.get(h.company_id) ?? "—"}`
            : "Whole organization",
      }))}
    />
  );
}
