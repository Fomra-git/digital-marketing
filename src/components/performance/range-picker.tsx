import Link from "next/link";
import { cn } from "@/lib/utils";

export const RANGES = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

export function RangePicker({
  current,
  base,
}: {
  current: RangeKey;
  base: string;
}) {
  return (
    <nav
      className="inline-flex flex-wrap rounded-lg bg-muted p-1 text-sm"
      aria-label="Date range"
    >
      {RANGES.map((r) => (
        <Link
          key={r.key}
          href={`${base}?range=${r.key}`}
          aria-current={current === r.key ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5",
            current === r.key
              ? "bg-card font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </Link>
      ))}
    </nav>
  );
}
