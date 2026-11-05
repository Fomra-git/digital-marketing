import { z } from "zod";
import { hexColor, optionalUrl, slug } from "./common";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(120),
  slug,
});
export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required").max(120),
  website_url: optionalUrl,
  timezone: z.string().trim().min(1).max(64),
  currency: z
    .string()
    .trim()
    .length(3, "Use a 3-letter currency code such as INR"),
  primary_color: hexColor,
});
export type OrganizationSettingsInput = z.input<
  typeof organizationSettingsSchema
>;
