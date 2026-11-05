"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notifications";
import { cn, timeAgo } from "@/lib/utils";
import { useShell } from "./shell-context";

type Item = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/** Header bell: unread badge, latest items, live updates via Supabase Realtime. */
export function NotificationBell() {
  const { userId, unreadNotifications } = useShell();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [unread, setUnread] = useState(unreadNotifications);
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState(false);
  // Re-sync when the server count changes (after navigation / refresh).
  const [serverCount, setServerCount] = useState(unreadNotifications);
  if (serverCount !== unreadNotifications) {
    setServerCount(unreadNotifications);
    setUnread(unreadNotifications);
  }

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) {
      toast.error("Could not load notifications.");
      return;
    }
    setItems(data);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setUnread((n) => n + 1);
          const row = payload.new as Item;
          setItems((prev) => (prev ? [row, ...prev].slice(0, 8) : prev));
          toast(row.title, { description: row.body ?? undefined });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function openItem(item: Item) {
    if (!item.read_at) {
      setUnread((n) => Math.max(0, n - 1));
      setItems(
        (prev) =>
          prev?.map((i) =>
            i.id === item.id ? { ...i, read_at: new Date().toISOString() } : i,
          ) ?? prev,
      );
      void markNotificationRead(item.id);
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  async function readAll() {
    const res = await markAllNotificationsRead();
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setUnread(0);
    setItems(
      (prev) =>
        prev?.map((i) => ({
          ...i,
          read_at: i.read_at ?? new Date().toISOString(),
        })) ?? prev,
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void load();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[22rem] max-w-[calc(100vw-1rem)] p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={readAll}
            disabled={unread === 0}
          >
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items === null ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              You are all caught up.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className="flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted/60"
              >
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    item.read_at ? "bg-transparent" : "bg-primary",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm",
                      !item.read_at && "font-medium",
                    )}
                  >
                    {item.title}
                  </span>
                  {item.body && (
                    <span className="line-clamp-2 block text-xs text-muted-foreground">
                      {item.body}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {timeAgo(item.created_at)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            <Link href="/notifications">View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
