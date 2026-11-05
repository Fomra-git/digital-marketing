/**
 * Public (browser-safe) environment. Only NEXT_PUBLIC_* values belong here.
 * Server-only secrets are read in src/lib/supabase/admin.ts and must never be
 * imported from client components.
 *
 * Values are checked when first used (not at import time) so `next build`
 * works without secrets present. Each process.env.NEXT_PUBLIC_* reference is
 * written out literally because Next.js inlines them into browser bundles.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  // New Supabase projects issue a "publishable" key; older ones an "anon" key.
  // Both are safe to expose: they only grant what RLS allows.
  get supabaseKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};
