"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notifications";
import { cn, formatDateTime, humanize, timeAgo } from "@/lib/utils";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsList({
  items,
  unreadOnly,
}: {
  items: Item[];
  unreadOnly: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = items.filter((i) => !i.read_at).length;

  function open(item: Item) {
    startTransition(async () => {
      if (!item.read_at) await markNotificationRead(item.id);
      if (item.link) router.push(item.link);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
          <Link
            href="/notifications"
            className={cn(
              "rounded-md px-3 py-1",
              !unreadOnly && "bg-card shadow-sm",
            )}
          >
            All
          </Link>
          <Link
            href="/notifications?filter=unread"
            className={cn(
              "rounded-md px-3 py-1",
              unreadOnly && "bg-card shadow-sm",
            )}
          >
            Unread
          </Link>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={unread === 0 || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await markAllNotificationsRead();
              if (!res.ok) toast.error(res.error);
              else router.refresh();
            })
          }
        >
          <CheckCheck /> Mark all as read
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          No unread notifications.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => open(item)}
                className="flex w-full gap-3 p-4 text-left hover:bg-muted/50"
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
                    <span className="block text-sm text-muted-foreground">
                      {item.body}
                    </span>
                  )}
                  <span
                    className="mt-1 block text-xs text-muted-foreground"
                    title={formatDateTime(item.created_at)}
                  >
                    {humanize(item.type)} · {timeAgo(item.created_at)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
