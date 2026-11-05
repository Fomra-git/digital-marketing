"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DataTable,
  dataTableColumns,
} from "@/components/data-table/data-table";
import type { DepartmentOption, RoleOption } from "@/server/queries/team";
import { InviteMemberDialog } from "./invite-member-dialog";
import { RoleChip } from "./assignments-panel";

export type TeamRow = {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
  department: string | null;
  status: string;
  roles: { key: string; name: string; color: string; where: string }[];
};

const col = dataTableColumns<TeamRow>();
const columns = [
  col.accessor("name", {
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/team/${row.original.user_id}`}
        className="flex items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <EntityAvatar name={row.original.name} src={row.original.avatar_url} />
        <span className="min-w-0">
          <span className="block truncate font-medium hover:underline">
            {row.original.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.original.email}
          </span>
        </span>
      </Link>
    ),
  }),
  col.accessor("job_title", {
    header: "Title",
    cell: ({ getValue }) =>
      getValue() ?? <span className="text-muted-foreground">—</span>,
  }),
  col.accessor("department", {
    header: "Department",
    cell: ({ getValue }) =>
      getValue() ?? <span className="text-muted-foreground">—</span>,
  }),
  col.accessor((r) => r.roles.map((x) => x.name).join(" "), {
    id: "roles",
    header: "Roles",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.roles.length ? (
        <div className="flex max-w-xs flex-wrap gap-1">
          {row.original.roles.slice(0, 3).map((r) => (
            <span key={r.key} title={r.where}>
              <RoleChip name={r.name} color={r.color} />
            </span>
          ))}
          {row.original.roles.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{row.original.roles.length - 3}
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">No roles</span>
      ),
  }),
  col.accessor("status", {
    header: "Access",
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
];

export function TeamView({
  rows,
  canManage,
  roles,
  departments,
}: {
  rows: TeamRow[];
  canManage: boolean;
  roles: RoleOption[];
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const invite = canManage ? (
    <Button onClick={() => setOpen(true)}>
      <UserPlus /> Invite member
    </Button>
  ) : null;

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No team members yet" action={invite} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchPlaceholder="Search people, titles, roles…"
          onRowClick={(r) => router.push(`/team/${r.user_id}`)}
          toolbar={invite}
        />
      )}
      {canManage && (
        <InviteMemberDialog
          open={open}
          onOpenChange={setOpen}
          roles={roles}
          departments={departments}
        />
      )}
    </>
  );
}
