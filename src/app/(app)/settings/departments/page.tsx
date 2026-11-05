import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { NoPermission } from "@/components/shared/no-permission";
import { DepartmentsView } from "@/components/settings/departments-view";
import { getMemberOptions } from "@/server/queries/team";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  const ctx = await requireAppContext();
  if (!ctx.can(P.departmentsManage)) return <NoPermission what="departments" />;

  const [deptRes, members] = await Promise.all([
    ctx.supabase
      .from("departments")
      .select(
        "id, name, description, color, is_active, head_user_id, head:profiles!departments_head_user_id_fkey(full_name, email), organization_members(count)",
      )
      .eq("organization_id", ctx.organization.id)
      .order("name"),
    getMemberOptions(ctx),
  ]);
  if (deptRes.error) throw deptRes.error;

  return (
    <DepartmentsView
      members={members}
      departments={(deptRes.data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        color: d.color,
        is_active: d.is_active,
        head_user_id: d.head_user_id,
        head_name: d.head?.full_name ?? d.head?.email ?? null,
        member_count: d.organization_members?.[0]?.count ?? 0,
      }))}
    />
  );
}
