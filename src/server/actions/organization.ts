"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActionContext, getSessionUser } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import {
  dbFailure,
  failure,
  success,
  validationFailure,
  type ActionResult,
} from "@/lib/actions";
import {
  createOrganizationSchema,
  organizationSettingsSchema,
  type CreateOrganizationInput,
  type OrganizationSettingsInput,
} from "@/lib/validations/organization";
import { nullable } from "@/lib/utils";

/** First-run bootstrap: the database refuses this once an organization exists. */
export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return failure("Your session has expired. Please sign in again.");
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug || undefined,
  });
  if (error) return dbFailure(error, "create_organization");
  redirect("/dashboard");
}

export async function updateOrganization(
  input: OrganizationSettingsInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure("Your session has expired. Please sign in again.");
  if (!ctx.can(P.settingsManage))
    return failure(
      "You do not have permission to change organization settings.",
    );
  const parsed = organizationSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const { data, error } = await ctx.supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      website_url: nullable(parsed.data.website_url),
      timezone: parsed.data.timezone,
      currency: parsed.data.currency.toUpperCase(),
      primary_color: parsed.data.primary_color,
    })
    .eq("id", ctx.organization.id)
    .select("id");
  if (error) return dbFailure(error, "update organization");
  if (!data?.length)
    return failure(
      "You do not have permission to change organization settings.",
    );
  revalidatePath("/", "layout");
  return success(undefined, "Organization settings saved.");
}

export async function setOrganizationLogo(
  logoUrl: string | null,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure("Your session has expired. Please sign in again.");
  if (!ctx.can(P.settingsManage))
    return failure("You do not have permission to change the logo.");
  if (logoUrl && !isBrandingUrl(logoUrl, ctx.organization.id))
    return failure("Invalid logo location.");

  const { error } = await ctx.supabase
    .from("organizations")
    .update({ logo_url: logoUrl })
    .eq("id", ctx.organization.id);
  if (error) return dbFailure(error, "set organization logo");
  revalidatePath("/", "layout");
  return success(undefined, "Logo updated.");
}

/** Image URLs stored on records must point at this organization's branding folder. */
function isBrandingUrl(url: string, organizationId: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    Boolean(base) &&
    url.startsWith(
      `${base}/storage/v1/object/public/branding/${organizationId}/`,
    )
  );
}
