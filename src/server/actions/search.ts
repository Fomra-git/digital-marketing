"use server";

import { getActionContext } from "@/lib/auth/context";

export type SearchResult = {
  entity_type: string;
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
};

// Entity types whose pages exist. Later phases add tasks, campaigns, keywords,
// social posts, creatives and videos here as their modules ship.
const ROUTED_TYPES = new Set(["company", "project", "member"]);

/** Permission-aware search: the database function runs under the caller's RLS. */
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const ctx = await getActionContext();
  if (!ctx) return [];
  const { data, error } = await ctx.supabase.rpc("global_search", {
    p_query: q,
    p_limit: 6,
  });
  if (error) {
    console.error("[search] failed", error);
    return [];
  }
  return (data ?? [])
    .filter((r) => ROUTED_TYPES.has(r.entity_type))
    .map((r) => ({
      entity_type: r.entity_type,
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
      url: r.url,
    }));
}
