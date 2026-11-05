import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.input<typeof loginSchema>;

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .refine(
    (v) => /[A-Za-z]/.test(v) && /\d/.test(v),
    "Include at least one letter and one number",
  );

export const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Your name is required").max(120),
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password,
});
export type SignupInput = z.input<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
});
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

export const setPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
export type SetPasswordInput = z.input<typeof setPasswordSchema>;
