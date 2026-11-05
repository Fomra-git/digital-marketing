import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { NoPermission } from "@/components/shared/no-permission";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: LayoutProps<"/settings">) {
  const ctx = await requireAppContext();
  const tabs = [
    {
      href: "/settings/organization",
      label: "Organization",
      show: ctx.can(P.settingsManage),
    },
    {
      href: "/settings/roles",
      label: "Roles & permissions",
      show: ctx.can(P.rolesManage) || ctx.can(P.usersManage),
    },
    {
      href: "/settings/departments",
      label: "Departments",
      show: ctx.can(P.departmentsManage),
    },
  ].filter((t) => t.show);

  if (!tabs.length) return <NoPermission what="settings" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your organization, roles, permissions and departments."
      />
      <SettingsNav tabs={tabs.map(({ href, label }) => ({ href, label }))} />
      {children}
    </div>
  );
}
