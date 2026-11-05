"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityAvatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DataTable,
  dataTableColumns,
} from "@/components/data-table/data-table";
import { formatDate } from "@/lib/utils";
import { CompanyFormDialog } from "./company-form-dialog";

export type CompanyRow = {
  id: string;
  name: string;
  industry: string | null;
  status: string;
  logo_url: string | null;
  website_url: string | null;
  created_at: string;
  project_count: number;
  member_count: number;
};

const col = dataTableColumns<CompanyRow>();
const columns = [
  col.accessor("name", {
    header: "Company",
    cell: ({ row }) => (
      <Link
        href={`/companies/${row.original.id}`}
        className="flex items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <EntityAvatar
          name={row.original.name}
          src={row.original.logo_url}
          square
          className="size-9"
        />
        <span className="min-w-0">
          <span className="block truncate font-medium hover:underline">
            {row.original.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.original.industry ?? "No category"}
          </span>
        </span>
      </Link>
    ),
  }),
  col.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
  }),
  col.accessor("project_count", {
    header: "Projects",
    cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
  }),
  col.accessor("member_count", {
    header: "Team",
    cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span>,
  }),
  col.accessor("website_url", {
    header: "Website",
    enableSorting: false,
    cell: ({ getValue }) => {
      const url = getValue();
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-primary-strong hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {new URL(url).hostname} <ExternalLink className="size-3" />
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  }),
  col.accessor("created_at", {
    header: "Added",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{formatDate(getValue())}</span>
    ),
  }),
];

export function CompaniesView({
  companies,
  canCreate,
}: {
  companies: CompanyRow[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      {companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description={
            canCreate
              ? "Add your first company to start organizing projects and teams."
              : "You have not been given access to any company yet."
          }
          action={
            canCreate ? (
              <Button onClick={() => setOpen(true)}>
                <Plus /> New company
              </Button>
            ) : null
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={companies}
          searchPlaceholder="Search companies…"
          onRowClick={(c) => router.push(`/companies/${c.id}`)}
          toolbar={
            canCreate ? (
              <Button onClick={() => setOpen(true)}>
                <Plus /> New company
              </Button>
            ) : null
          }
        />
      )}
      {canCreate && <CompanyFormDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
