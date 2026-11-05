"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EntityAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { revokeAssignment } from "@/server/actions/team";
import type {
  MemberOption,
  RoleOption,
  ScopedAssignment,
} from "@/server/queries/team";
import { AssignRoleDialog } from "./assign-role-dialog";

export function RoleChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2 py-0.5 text-xs font-medium">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {name}
    </span>
  );
}

/** People with roles at one company / project, grouped by person. */
export function AssignmentsPanel({
  title,
  description,
  assignments,
  members,
  roles,
  companyId,
  projectId,
  canManage,
  orgWideCount,
  inheritedLabel = "organization-wide roles",
}: {
  title: string;
  description: string;
  assignments: ScopedAssignment[];
  members: MemberOption[];
  roles: RoleOption[];
  companyId?: string;
  projectId?: string;
  canManage: boolean;
  orgWideCount?: number;
  /** Describes where the extra access comes from. */
  inheritedLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const people = new Map<
    string,
    { profile: ScopedAssignment["profile"]; items: ScopedAssignment[] }
  >();
  for (const a of assignments) {
    const entry = people.get(a.user_id) ?? { profile: a.profile, items: [] };
    entry.items.push(a);
    people.set(a.user_id, entry);
  }

  function revoke(id: string) {
    startTransition(async () => {
      const res = await revokeAssignment(id);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(res.message);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {canManage && (
          <CardAction>
            <Button size="sm" onClick={() => setOpen(true)}>
              <UserPlus /> Add person
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {people.size === 0 ? (
          <EmptyState
            title="Nobody assigned here yet"
            description={
              canManage
                ? "Add people and choose what role they have here."
                : undefined
            }
            className="py-8"
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {[...people.entries()].map(([userId, { profile, items }]) => (
              <li
                key={userId}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/team/${userId}`}
                  className="flex min-w-0 items-center gap-3 hover:underline"
                >
                  <EntityAvatar
                    name={profile?.full_name ?? profile?.email}
                    src={profile?.avatar_url}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {profile?.full_name ?? profile?.email}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {profile?.job_title ?? profile?.email}
                    </span>
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-1.5">
                  {items.map((a) =>
                    a.role ? (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-0.5"
                      >
                        <RoleChip name={a.role.name} color={a.role.color} />
                        {canManage && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => revoke(a.id)}
                            className="rounded p-0.5 text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                            aria-label={`Remove ${a.role.name} role`}
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </span>
                    ) : null,
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {orgWideCount ? (
          <p className="text-xs text-muted-foreground">
            Plus {orgWideCount} {orgWideCount === 1 ? "person" : "people"} with
            {inheritedLabel}, who can also access this.
          </p>
        ) : null}
      </CardContent>
      {canManage && (
        <AssignRoleDialog
          open={open}
          onOpenChange={setOpen}
          members={members}
          roles={roles}
          fixedCompanyId={companyId}
          fixedProjectId={projectId}
          title="Add a person"
        />
      )}
    </Card>
  );
}
