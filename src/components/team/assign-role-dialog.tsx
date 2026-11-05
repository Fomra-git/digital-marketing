"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { useShell } from "@/components/layout/shell-context";
import { assignRoleSchema, type AssignRoleInput } from "@/lib/validations/team";
import { assignRole } from "@/server/actions/team";
import type { MemberOption, RoleOption } from "@/server/queries/team";

const ORG = "__organization__";
const ALL_PROJECTS = "__all__";

/**
 * Give a person a role at organization, company or project level.
 * Pass fixedCompanyId / fixedProjectId to lock the level (company/project pages).
 */
export function AssignRoleDialog({
  open,
  onOpenChange,
  members,
  roles,
  fixedUserId,
  fixedCompanyId,
  fixedProjectId,
  title = "Assign a role",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MemberOption[];
  roles: RoleOption[];
  fixedUserId?: string;
  fixedCompanyId?: string;
  fixedProjectId?: string;
  title?: string;
}) {
  const router = useRouter();
  const { companies, projects, isAdmin } = useShell();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AssignRoleInput>({
    resolver: zodResolver(assignRoleSchema),
    values: {
      user_id: fixedUserId ?? "",
      role_id: "",
      company_id: fixedCompanyId ?? "",
      project_id: fixedProjectId ?? "",
    },
  });
  const companyId = form.watch("company_id");
  const companyProjects = useMemo(
    () => projects.filter((p) => p.company_id === companyId),
    [projects, companyId],
  );
  // Full-access roles can only be granted by a Super Admin (enforced in the DB too).
  const assignableRoles = roles.filter((r) => isAdmin || !r.grants_all);
  const activeMembers = members.filter((m) => m.status === "active");

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const res = await assignRole(values);
      if (!res.ok) return setError(res.error);
      toast.success(res.message);
      onOpenChange(false);
      router.refresh();
    });
  });

  const errors = form.formState.errors;
  const lockedScope = Boolean(fixedCompanyId || fixedProjectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Roles decide what someone can do. The level decides where: the whole
            organization, one company (and all its projects) or a single
            project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {!fixedUserId && (
            <FormField
              label="Person"
              htmlFor="user_id"
              error={errors.user_id?.message}
              required
            >
              <Controller
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="user_id" aria-invalid={!!errors.user_id}>
                      <SelectValue placeholder="Choose a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMembers.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.full_name ?? m.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField
            label="Role"
            htmlFor="role_id"
            error={errors.role_id?.message}
            required
          >
            <Controller
              control={form.control}
              name="role_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role_id" aria-invalid={!!errors.role_id}>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <span
                          className="size-2 rounded-full"
                          style={{ background: r.color }}
                        />
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          {!lockedScope && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Level"
                htmlFor="company_id"
                hint="Organization-wide applies to every company."
              >
                <Select
                  value={companyId || ORG}
                  onValueChange={(v) => {
                    form.setValue("company_id", v === ORG ? "" : v);
                    form.setValue("project_id", "");
                  }}
                >
                  <SelectTrigger id="company_id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ORG}>Whole organization</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label="Project"
                htmlFor="project_id"
                error={errors.project_id?.message}
              >
                <Select
                  value={form.watch("project_id") || ALL_PROJECTS}
                  onValueChange={(v) =>
                    form.setValue("project_id", v === ALL_PROJECTS ? "" : v)
                  }
                  disabled={!companyId}
                >
                  <SelectTrigger id="project_id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PROJECTS}>
                      {companyId ? "All projects of the company" : "—"}
                    </SelectItem>
                    {companyProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Assign role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
