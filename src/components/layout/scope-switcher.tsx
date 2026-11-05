"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronsUpDown,
  FolderKanban,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EntityAvatar } from "@/components/ui/avatar";
import { setScope } from "@/server/actions/scope";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

/**
 * Header company + project switcher. The selection is stored in an httpOnly
 * cookie and every dashboard / list filters by it (server-side).
 */
export function ScopeSwitcher({ className }: { className?: string }) {
  const { companies, projects, selection } = useShell();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const company = companies.find((c) => c.id === selection.companyId) ?? null;
  const project = projects.find((p) => p.id === selection.projectId) ?? null;
  const companyProjects = company
    ? projects.filter((p) => p.company_id === company.id)
    : [];

  function choose(companyId: string | null, projectId: string | null) {
    startTransition(async () => {
      const res = await setScope(companyId, projectId);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  if (!companies.length) return null;

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-0 max-w-[13rem] justify-between gap-2"
            disabled={pending}
          >
            {company ? (
              <EntityAvatar
                name={company.name}
                src={company.logo_url}
                square
                className="size-5 text-[9px]"
              />
            ) : (
              <Layers className="text-muted-foreground" />
            )}
            <span className="truncate">{company?.name ?? "All companies"}</span>
            <ChevronsUpDown className="ml-auto opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Company</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => choose(null, null)}>
            <Layers /> All companies
            {!company && <Check className="ml-auto text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {companies.map((c) => (
            <DropdownMenuItem key={c.id} onSelect={() => choose(c.id, null)}>
              <EntityAvatar
                name={c.name}
                src={c.logo_url}
                square
                className="size-5 text-[9px]"
              />
              <span className="truncate">{c.name}</span>
              {c.status === "inactive" && (
                <span className="text-xs text-muted-foreground">inactive</span>
              )}
              {company?.id === c.id && (
                <Check className="ml-auto text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {company && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hidden min-w-0 max-w-[12rem] justify-between gap-2 sm:inline-flex"
              disabled={pending}
            >
              <FolderKanban className="text-muted-foreground" />
              <span className="truncate">
                {project?.name ?? "All projects"}
              </span>
              <ChevronsUpDown className="ml-auto opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>Project in {company.name}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => choose(company.id, null)}>
              <Building2 /> All projects
              {!project && <Check className="ml-auto text-primary" />}
            </DropdownMenuItem>
            {companyProjects.length > 0 && <DropdownMenuSeparator />}
            {companyProjects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => choose(company.id, p.id)}
              >
                <FolderKanban />
                <span className="truncate">{p.name}</span>
                {project?.id === p.id && (
                  <Check className="ml-auto text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            {companyProjects.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No projects you can access yet.
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
