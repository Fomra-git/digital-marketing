import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationsList } from "@/components/profile/notifications-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: PageProps<"/notifications">) {
  const ctx = await requireAppContext();
  const params = await searchParams;
  const unreadOnly = params.filter === "unread";

  let query = ctx.supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (unreadOnly) query = query.is("read_at", null);
  const { data, error } = await query;
  if (error) throw error;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Assignments, approvals, feedback and alerts addressed to you."
      />
      {(data ?? []).length === 0 && !unreadOnly ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You will be notified here when something needs your attention."
        />
      ) : (
        <NotificationsList items={data ?? []} unreadOnly={unreadOnly} />
      )}
    </div>
  );
}
