import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { NoPermission } from "@/components/shared/no-permission";
import { RolesView } from "@/components/settings/roles-view";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  const ctx = await requireAppContext();
  if (!ctx.can(P.rolesManage) && !ctx.can(P.usersManage))
    return <NoPermission what="roles" />;

  const [rolesRes, permsRes] = await Promise.all([
    ctx.supabase
      .from("roles")
      .select(
        "id, name, description, color, is_system, grants_all, role_permissions(count), user_role_assignments(count)",
      )
      .eq("organization_id", ctx.organization.id)
      .order("is_system", { ascending: false })
      .order("name"),
    ctx.supabase
      .from("permissions")
      .select("key", { count: "exact", head: true }),
  ]);
  if (rolesRes.error) throw rolesRes.error;

  return (
    <RolesView
      canManage={ctx.can(P.rolesManage)}
      totalPermissions={permsRes.count ?? 0}
      roles={(rolesRes.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        color: r.color,
        is_system: r.is_system,
        grants_all: r.grants_all,
        permission_count: r.role_permissions?.[0]?.count ?? 0,
        assignment_count: r.user_role_assignments?.[0]?.count ?? 0,
      }))}
    />
  );
}
