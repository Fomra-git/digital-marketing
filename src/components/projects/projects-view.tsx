"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DataTable,
  dataTableColumns,
} from "@/components/data-table/data-table";
import { formatDate } from "@/lib/utils";
import type { MemberOption } from "@/server/queries/team";
import { ProjectFormDialog } from "./project-form-dialog";

export type ProjectRow = {
  id: string;
  name: string;
  status: string;
  category: string | null;
  image_url: string | null;
  start_date: string | null;
  company_id: string;
  company_name: string;
  manager: string | null;
  member_count: number;
};

const col = dataTableColumns<ProjectRow>();
const columns = [
  col.accessor("name", {
    header: "Project",
    cell: ({ row }) => (
      <Link
        href={`/projects/${row.original.id}`}
        className="flex items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <EntityAvatar
          name={row.original.name}
          src={row.original.image_url}
          square
          className="size-9"
        />
        <span className="min-w-0">
          <span className="block truncate font-medium hover:underline">
            {row.original.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.original.category ?? "No category"}
          </span>
        </span>
      </Link>
    ),
  }),
  col.accessor("company_name", { header: "Company" }),
  col.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
  col.accessor("manager", {
    header: "Manager",
    cell: ({ getValue }) =>
      getValue() ?? <span className="text-muted-foreground">—</span>,
  }),
  col.accessor("member_count", {
    header: "Team",
    cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
  }),
  col.accessor("start_date", {
    header: "Start",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{formatDate(getValue())}</span>
    ),
  }),
];

export function ProjectsView({
  projects,
  creatableCompanies,
  members,
  defaultCompanyId,
  scopeLabel,
}: {
  projects: ProjectRow[];
  creatableCompanies: { id: string; name: string }[];
  members: MemberOption[];
  defaultCompanyId?: string;
  scopeLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const canCreate = creatableCompanies.length > 0;
  const newButton = canCreate ? (
    <Button onClick={() => setOpen(true)}>
      <Plus /> New project
    </Button>
  ) : null;

  return (
    <>
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={
            scopeLabel ? `No projects in ${scopeLabel}` : "No projects yet"
          }
          description={
            canCreate
              ? "Create a project to organize campaigns, content and SEO work."
              : "You have not been given access to any project yet."
          }
          action={newButton}
        />
      ) : (
        <DataTable
          columns={columns}
          data={projects}
          searchPlaceholder="Search projects…"
          onRowClick={(p) => router.push(`/projects/${p.id}`)}
          toolbar={newButton}
        />
      )}
      {canCreate && (
        <ProjectFormDialog
          open={open}
          onOpenChange={setOpen}
          companies={creatableCompanies}
          members={members}
          defaultCompanyId={
            defaultCompanyId &&
            creatableCompanies.some((c) => c.id === defaultCompanyId)
              ? defaultCompanyId
              : undefined
          }
        />
      )}
    </>
  );
}
