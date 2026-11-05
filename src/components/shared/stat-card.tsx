import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  href,
  tone = "primary",
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: React.ReactNode;
  href?: string;
  tone?: "primary" | "blue" | "amber" | "violet" | "slate";
}) {
  const tones = {
    primary: "bg-primary-soft text-primary-strong",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };
  const body = (
    <div className="flex h-full items-start justify-between gap-3 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md">
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {hint ? (
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          tones[tone],
        )}
      >
        <Icon className="size-5" />
      </div>
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {body}
    </Link>
  ) : (
    body
  );
}
