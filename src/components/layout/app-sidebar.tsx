"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";
import { EntityAvatar } from "@/components/ui/avatar";
import { NAV_SECTIONS } from "./nav-config";
import { useShell } from "./shell-context";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { canAnywhere, organizationName, organizationLogo } = useShell();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
        <EntityAvatar
          name={organizationName}
          src={organizationLogo}
          square
          className="size-8 bg-sidebar-accent"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {organizationName}
          </p>
          <p className="truncate text-[11px] text-sidebar-muted">{APP_NAME}</p>
        </div>
      </div>

      <nav
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
        aria-label="Main"
      >
        {NAV_SECTIONS.map((section, i) => {
          const items = section.items.filter(
            (item) => !item.anyOf || item.anyOf.some((p) => canAnywhere(p)),
          );
          if (!items.length) return null;
          return (
            <div key={section.title ?? i} className="space-y-1">
              {section.title ? (
                <p className="px-3 pb-1 text-[11px] font-medium tracking-wider text-sidebar-muted uppercase">
                  {section.title}
                </p>
              ) : null}
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-4.5 shrink-0",
                        active
                          ? "text-sidebar-primary"
                          : "text-sidebar-muted group-hover:text-sidebar-foreground",
                      )}
                    />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
      <SidebarNav />
    </aside>
  );
}
