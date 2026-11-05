import { z } from "zod";
import { optionalEmail, optionalText, optionalUrl, slug } from "./common";

export const COMPANY_STATUSES = ["active", "inactive"] as const;

export const companySchema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
  slug,
  description: optionalText(2000),
  website_url: optionalUrl,
  industry: optionalText(80),
  contact_name: optionalText(120),
  contact_email: optionalEmail,
  contact_phone: optionalText(40),
  address: optionalText(500),
  status: z.enum(COMPANY_STATUSES),
});
export type CompanyInput = z.input<typeof companySchema>;

export const companySettingsSchema = z.object({
  social_approval_required: z.boolean(),
  creative_approval_required: z.boolean(),
  brand_primary_color: z
    .string()
    .trim()
    .refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), "Use a hex colour"),
  brand_guidelines_url: optionalUrl,
});
export type CompanySettingsInput = z.input<typeof companySettingsSchema>;
