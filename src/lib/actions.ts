import type { PostgrestError } from "@supabase/supabase-js";
import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export function success<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function failure(
  error: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function validationFailure(error: ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return {
    ok: false,
    error: "Please fix the highlighted fields.",
    fieldErrors,
  };
}

/**
 * Turns database errors into messages people can act on. Our own triggers
 * raise with readable messages (SQLSTATE 42501 / 23503 / 23514), so those are
 * passed through; anything else gets a generic message (details are logged).
 */
export function dbFailure(
  error: PostgrestError | { code?: string; message: string },
  context?: string,
): ActionResult<never> {
  const code = error.code ?? "";
  if (code === "23505")
    return failure("A record with these details already exists.");
  if (code === "42501") {
    const own =
      error.message &&
      !/row-level security|permission denied/i.test(error.message);
    return failure(
      own ? error.message : "You do not have permission to do that.",
    );
  }
  if (code === "23503" || code === "23514" || code === "P0001")
    return failure(error.message);
  if (code === "PGRST116")
    return failure(
      "The record was not found or you no longer have access to it.",
    );
  console.error(`[db] ${context ?? "query"} failed`, error);
  return failure("Something went wrong while saving. Please try again.");
}
