import { redirect } from "next/navigation";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";

export default async function SettingsIndex() {
  const ctx = await requireAppContext();
  if (ctx.can(P.settingsManage)) redirect("/settings/organization");
  if (ctx.can(P.rolesManage) || ctx.can(P.usersManage))
    redirect("/settings/roles");
  if (ctx.can(P.departmentsManage)) redirect("/settings/departments");
  return null;
}
