"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  inviteMemberSchema,
  type InviteMemberInput,
} from "@/lib/validations/team";
import { inviteMember } from "@/server/actions/team";
import type { DepartmentOption, RoleOption } from "@/server/queries/team";

const NONE = "__none__";
const ORG = "__organization__";

export function InviteMemberDialog({
  open,
  onOpenChange,
  roles,
  departments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: RoleOption[];
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const { companies, projects, isAdmin } = useShell();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      full_name: "",
      job_title: "",
      department_id: "",
      role_id: "",
      company_id: "",
      project_id: "",
    },
  });
  const errors = form.formState.errors;
  const roleId = form.watch("role_id");
  const companyId = form.watch("company_id");
  const companyProjects = useMemo(
    () => projects.filter((p) => p.company_id === companyId),
    [projects, companyId],
  );

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const res = await inviteMember(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(res.message);
      form.reset();
      onOpenChange(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            They get an email to set their password. If they already have an
            account, they are added straight away.
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Full name"
              htmlFor="full_name"
              error={errors.full_name?.message}
              required
            >
              <Input
                id="full_name"
                {...form.register("full_name")}
                aria-invalid={!!errors.full_name}
              />
            </FormField>
            <FormField
              label="Work email"
              htmlFor="email"
              error={errors.email?.message}
              required
            >
              <Input
                id="email"
                type="email"
                inputMode="email"
                {...form.register("email")}
                aria-invalid={!!errors.email}
              />
            </FormField>
            <FormField label="Job title" htmlFor="job_title">
              <Input
                id="job_title"
                placeholder="e.g. Graphic Designer"
                {...form.register("job_title")}
              />
            </FormField>
            <FormField label="Department" htmlFor="department_id">
              <Select
                value={form.watch("department_id") || NONE}
                onValueChange={(v) =>
                  form.setValue("department_id", v === NONE ? "" : v)
                }
              >
                <SelectTrigger id="department_id">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No department</SelectItem>
                  {departments
                    .filter((d) => d.is_active)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">First role (optional)</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Role" htmlFor="role_id">
                <Select
                  value={roleId || NONE}
                  onValueChange={(v) =>
                    form.setValue("role_id", v === NONE ? "" : v)
                  }
                >
                  <SelectTrigger id="role_id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Assign later</SelectItem>
                    {roles
                      .filter((r) => isAdmin || !r.grants_all)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Level" htmlFor="company_id">
                <Select
                  value={companyId || ORG}
                  disabled={!roleId}
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
                  value={form.watch("project_id") || NONE}
                  disabled={!roleId || !companyId}
                  onValueChange={(v) =>
                    form.setValue("project_id", v === NONE ? "" : v)
                  }
                >
                  <SelectTrigger id="project_id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All projects</SelectItem>
                    {companyProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
