import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import { NoPermission } from "@/components/shared/no-permission";
import { OrganizationSettings } from "@/components/settings/organization-settings";

export const metadata: Metadata = { title: "Organization settings" };

export default async function OrganizationSettingsPage() {
  const ctx = await requireAppContext();
  if (!ctx.can(P.settingsManage))
    return <NoPermission what="organization settings" />;
  const { data: org, error } = await ctx.supabase
    .from("organizations")
    .select(
      "id, name, slug, website_url, timezone, currency, primary_color, logo_url",
    )
    .eq("id", ctx.organization.id)
    .single();
  if (error) throw error;
  return <OrganizationSettings org={org} />;
}
