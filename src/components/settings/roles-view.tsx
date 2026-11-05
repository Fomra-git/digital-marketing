"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Plus, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { roleSchema, type RoleInput } from "@/lib/validations/team";
import { createRole } from "@/server/actions/roles";

export type RoleSummary = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_system: boolean;
  grants_all: boolean;
  permission_count: number;
  assignment_count: number;
};

const NONE = "__none__";

export function RolesView({
  roles,
  totalPermissions,
  canManage,
}: {
  roles: RoleSummary[];
  totalPermissions: number;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">
          A role is a set of permissions. Give someone a role for the whole
          organization, one company, or a single project from their page in
          Team.
        </p>
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus /> New role
          </Button>
        )}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <li key={r.id}>
            <Link
              href={`/settings/roles/${r.id}`}
              className="flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ background: r.color }}
                  />
                  <span className="font-semibold">{r.name}</span>
                </div>
                {r.is_system ? (
                  <Badge variant="secondary">
                    <Lock /> Default
                  </Badge>
                ) : (
                  <Badge variant="outline">Custom</Badge>
                )}
              </div>
              <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                {r.description ?? "No description."}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3.5" />
                  {r.grants_all
                    ? "Full access"
                    : `${r.permission_count} of ${totalPermissions} permissions`}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {r.assignment_count} assignment
                  {r.assignment_count === 1 ? "" : "s"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {canManage && (
        <NewRoleDialog open={open} onOpenChange={setOpen} roles={roles} />
      )}
    </div>
  );
}

function NewRoleDialog({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  roles: RoleSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<RoleInput>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#64748B",
      copy_from_role_id: "",
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await createRole(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      onOpenChange(false);
      form.reset();
      router.push(`/settings/roles/${res.data.id}`);
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>
            Create a role, then choose its permissions on the next screen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField
            label="Role name"
            htmlFor="name"
            error={errors.name?.message}
            required
          >
            <Input
              id="name"
              placeholder="e.g. SEO Viewer"
              {...form.register("name")}
              aria-invalid={!!errors.name}
            />
          </FormField>
          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={2}
              {...form.register("description")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Colour"
              htmlFor="color"
              error={errors.color?.message}
            >
              <div className="flex gap-2">
                <Input id="color" {...form.register("color")} />
                <input
                  type="color"
                  aria-label="Pick colour"
                  value={form.watch("color")}
                  onChange={(e) =>
                    form.setValue("color", e.target.value.toUpperCase())
                  }
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border bg-card p-1"
                />
              </div>
            </FormField>
            <FormField
              label="Start from"
              htmlFor="copy_from_role_id"
              hint="Copies that role's permissions."
            >
              <Select
                value={form.watch("copy_from_role_id") || NONE}
                onValueChange={(v) =>
                  form.setValue("copy_from_role_id", v === NONE ? "" : v)
                }
              >
                <SelectTrigger id="copy_from_role_id">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No permissions</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
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
              Create role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
