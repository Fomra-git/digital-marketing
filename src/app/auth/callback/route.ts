import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

/**
 * Completes email links:
 *  - ?code=...                 PKCE links (sign-up confirmation, password reset)
 *  - ?token_hash=...&type=...  links from customised email templates (recommended, see README)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      const target =
        type === "invite" || type === "recovery" ? "/auth/set-password" : next;
      return NextResponse.redirect(new URL(target, origin));
    }
  } else if (next === "/auth/set-password") {
    // Default Supabase invite emails put the session in the URL fragment,
    // which only the browser can read: let the page pick it up.
    return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/login?error=link_expired", origin));
}
