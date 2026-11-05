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
  companySchema,
  companySettingsSchema,
  type CompanyInput,
  type CompanySettingsInput,
} from "@/lib/validations/company";
import { id as idSchema } from "@/lib/validations/common";
import { nullable, slugify } from "@/lib/utils";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

function toRow(input: ReturnType<typeof companySchema.parse>) {
  return {
    name: input.name,
    slug: input.slug || slugify(input.name),
    description: nullable(input.description),
    website_url: nullable(input.website_url),
    industry: nullable(input.industry),
    contact_name: nullable(input.contact_name),
    contact_email: nullable(input.contact_email),
    contact_phone: nullable(input.contact_phone),
    address: nullable(input.address),
    status: input.status,
  };
}

export async function createCompany(
  input: CompanyInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.companiesCreate))
    return failure("You do not have permission to create companies.");
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const row = { ...toRow(parsed.data), organization_id: ctx.organization.id };
  let { data, error } = await ctx.supabase
    .from("companies")
    .insert(row)
    .select("id")
    .single();
  if (error?.code === "23505" && !parsed.data.slug) {
    // auto-generated slug collided: retry once with a short suffix
    ({ data, error } = await ctx.supabase
      .from("companies")
      .insert({
        ...row,
        slug: `${row.slug}-${crypto.randomUUID().slice(0, 4)}`,
      })
      .select("id")
      .single());
  }
  if (error || !data)
    return error
      ? dbFailure(error, "create company")
      : failure("Could not create the company.");

  revalidatePath("/", "layout");
  return success({ id: data.id }, `${row.name} created.`);
}

export async function updateCompany(
  companyId: string,
  input: CompanyInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!idSchema.safeParse(companyId).success)
    return failure("Invalid company.");
  if (!ctx.can(P.companiesEdit, { companyId }))
    return failure("You do not have permission to edit this company.");
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const { data, error } = await ctx.supabase
    .from("companies")
    .update(toRow(parsed.data))
    .eq("id", companyId)
    .select("id");
  if (error) return dbFailure(error, "update company");
  if (!data?.length)
    return failure(
      "The company was not found or you no longer have access to it.",
    );

  revalidatePath("/", "layout");
  return success(undefined, "Company saved.");
}

export async function setCompanyLogo(
  companyId: string,
  logoUrl: string | null,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.companiesEdit, { companyId }) && !ctx.can(P.companiesCreate)) {
    return failure("You do not have permission to change this logo.");
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    logoUrl &&
    !logoUrl.startsWith(
      `${base}/storage/v1/object/public/branding/${ctx.organization.id}/companies/${companyId}/`,
    )
  ) {
    return failure("Invalid logo location.");
  }
  const { error } = await ctx.supabase
    .from("companies")
    .update({ logo_url: logoUrl })
    .eq("id", companyId);
  if (error) return dbFailure(error, "set company logo");
  revalidatePath("/", "layout");
  return success(undefined, "Logo updated.");
}

export async function deleteCompany(companyId: string): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.companiesDelete, { companyId }))
    return failure("You do not have permission to delete this company.");

  // Soft delete: history (tasks, reports, metrics) is kept for auditing.
  const { data, error } = await ctx.supabase
    .from("companies")
    .update({ deleted_at: new Date().toISOString(), status: "inactive" })
    .eq("id", companyId)
    .select("id");
  if (error) return dbFailure(error, "delete company");
  if (!data?.length)
    return failure(
      "The company was not found or you no longer have access to it.",
    );

  revalidatePath("/", "layout");
  return success(undefined, "Company deleted.");
}

export async function updateCompanySettings(
  companyId: string,
  input: CompanySettingsInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  if (!ctx.can(P.companiesEdit, { companyId }))
    return failure("You do not have permission to change these settings.");
  const parsed = companySettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const { data, error } = await ctx.supabase
    .from("company_settings")
    .update({
      social_approval_required: parsed.data.social_approval_required,
      creative_approval_required: parsed.data.creative_approval_required,
      brand_primary_color: nullable(parsed.data.brand_primary_color),
      brand_guidelines_url: nullable(parsed.data.brand_guidelines_url),
      updated_by: ctx.user.id,
    })
    .eq("company_id", companyId)
    .select("company_id");
  if (error) return dbFailure(error, "update company settings");
  if (!data?.length)
    return failure("You do not have permission to change these settings.");

  revalidatePath(`/companies/${companyId}`);
  return success(undefined, "Settings saved.");
}
