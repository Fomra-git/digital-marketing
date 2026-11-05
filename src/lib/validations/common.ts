import { z } from "zod";

/** Optional free text: trimmed, '' allowed (stored as NULL). */
export const optionalText = (max = 2000) =>
  z.string().trim().max(max, `Must be ${max} characters or fewer`);

export const optionalUrl = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || z.url({ protocol: /^https?$/ }).safeParse(v).success,
    "Enter a full URL starting with https://",
  );

export const optionalEmail = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || z.email().safeParse(v).success,
    "Enter a valid email address",
  );

export const optionalDate = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Use the date picker (YYYY-MM-DD)",
  );

export const id = z.guid("Invalid identifier");
export const optionalId = z.union([z.literal(""), z.guid()]);

export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(80)
  .refine(
    (v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v),
    "Lowercase letters, numbers and single dashes only",
  );

export const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #14B8A6");
