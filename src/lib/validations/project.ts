import { z } from "zod";
import {
  id,
  optionalDate,
  optionalId,
  optionalText,
  optionalUrl,
  slug,
} from "./common";

export const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "archived",
] as const;

export const projectSchema = z
  .object({
    company_id: id,
    name: z.string().trim().min(2, "Project name is required").max(120),
    slug,
    description: optionalText(2000),
    website_url: optionalUrl,
    category: optionalText(80),
    start_date: optionalDate,
    end_date: optionalDate,
    status: z.enum(PROJECT_STATUSES),
    manager_id: optionalId,
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    message: "End date must be on or after the start date",
    path: ["end_date"],
  });
export type ProjectInput = z.input<typeof projectSchema>;

export const projectSettingsSchema = z.object({
  social_approval_required: z.enum(["inherit", "yes", "no"]),
  creative_approval_required: z.enum(["inherit", "yes", "no"]),
  monthly_ad_budget: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      "Enter an amount",
    ),
  target_cpl: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      "Enter an amount",
    ),
});
export type ProjectSettingsInput = z.input<typeof projectSettingsSchema>;
