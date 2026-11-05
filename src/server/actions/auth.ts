"use server";

import { redirect } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const SERVICE_DOWN = "We cannot reach the sign-in service right now. Please try again in a moment.";
import { publicEnv } from "@/lib/env";
import {
  failure,
  success,
  validationFailure,
  type ActionResult,
} from "@/lib/actions";
import {
  forgotPasswordSchema,
  loginSchema,
  setPasswordSchema,
  signupSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type SetPasswordInput,
  type SignupInput,
} from "@/lib/validations/auth";

/** Only allow redirects back into this app (prevents open redirects). */
function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//"))
    return "/dashboard";
  return next;
}

export async function signIn(
  input: LoginInput,
  next?: string,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (isAuthRetryableFetchError(error)) return failure(SERVICE_DOWN);
    if (error.code === "email_not_confirmed")
      return failure(
        "Please confirm your email address first. Check your inbox.",
      );
    return failure("Incorrect email or password.");
  }
  redirect(safeNext(next));
}

export async function signUp(
  input: SignupInput,
): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/dashboard`,
    },
  });
  if (error) {
    if (isAuthRetryableFetchError(error)) return failure(SERVICE_DOWN);
    if (error.code === "signup_disabled")
      return failure(
        "Self sign-up is disabled. Ask an administrator for an invitation.",
      );
    if (error.code === "user_already_exists")
      return failure(
        "An account with this email already exists. Sign in instead.",
      );
    if (error.code === "weak_password") return failure(error.message);
    return failure("We could not create your account. Please try again.");
  }
  if (data.session) redirect("/dashboard");
  return success(
    { needsConfirmation: true },
    "Check your inbox to confirm your email address.",
  );
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/auth/set-password`,
  });
  // Same answer whether or not the account exists (no account enumeration).
  return success(
    undefined,
    "If an account exists for that email, a reset link is on its way.",
  );
}

export async function setPassword(
  input: SetPasswordInput,
): Promise<ActionResult> {
  const parsed = setPasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub)
    return failure("Your reset link has expired. Request a new one.");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "same_password")
      return failure("Choose a password you have not used before.");
    return failure(error.message || "Could not update your password.");
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
