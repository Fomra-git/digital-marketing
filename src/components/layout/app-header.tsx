"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNav } from "./app-sidebar";
import { ScopeSwitcher } from "./scope-switcher";
import { GlobalSearch } from "./global-search";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

export function AppHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-card/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:gap-3 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-72 border-0 p-0 [&>button]:text-white"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation
          </SheetDescription>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <ScopeSwitcher className="min-w-0 flex-1" />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <GlobalSearch />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
