"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { EmptyState } from "@/components/shared/empty-state";
import { departmentSchema, type DepartmentInput } from "@/lib/validations/team";
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from "@/server/actions/departments";
import type { MemberOption } from "@/server/queries/team";

export type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  head_user_id: string | null;
  head_name: string | null;
  member_count: number;
};

const NONE = "__none__";

export function DepartmentsView({
  departments,
  members,
}: {
  departments: DepartmentRow[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<DepartmentRow | null | "new">(null);
  const [deleting, setDeleting] = useState<DepartmentRow | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const res = await deleteDepartment(deleting.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Departments group people for reports and team dashboards.
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus /> New department
        </Button>
      </div>
      {departments.length === 0 ? (
        <EmptyState icon={Users} title="No departments yet" />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {departments.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: d.color }}
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {d.name}
                    {!d.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {d.description ?? "No description"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{d.head_name ? `Head: ${d.head_name}` : "No head"}</span>
                <span className="tabular-nums">
                  {d.member_count} member{d.member_count === 1 ? "" : "s"}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditing(d)}
                  aria-label={`Edit ${d.name}`}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleting(d)}
                  aria-label={`Delete ${d.name}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DepartmentDialog
        key={editing === "new" ? "new" : (editing?.id ?? "closed")}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        department={editing === "new" ? null : editing}
        members={members}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its {deleting?.member_count ?? 0} member(s) stay in the
              organization without a department. You can mark it inactive
              instead to keep it in old reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={pending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DepartmentDialog({
  open,
  onOpenChange,
  department,
  members,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  department: DepartmentRow | null;
  members: MemberOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: department?.name ?? "",
      description: department?.description ?? "",
      color: department?.color ?? "#14B8A6",
      head_user_id: department?.head_user_id ?? "",
      is_active: department?.is_active ?? true,
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = department
        ? await updateDepartment(department.id, values)
        : await createDepartment(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      onOpenChange(false);
      router.refresh();
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {department ? "Edit department" : "New department"}
          </DialogTitle>
          <DialogDescription>
            People are placed in a department from their page in Team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField
            label="Name"
            htmlFor="name"
            error={errors.name?.message}
            required
          >
            <Input
              id="name"
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
            <FormField label="Department head" htmlFor="head_user_id">
              <Select
                value={form.watch("head_user_id") || NONE}
                onValueChange={(v) =>
                  form.setValue("head_user_id", v === NONE ? "" : v)
                }
              >
                <SelectTrigger id="head_user_id">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nobody</SelectItem>
                  {members
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.full_name ?? m.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
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
          </div>
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span className="text-sm">Active</span>
            <Controller
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {department ? "Save changes" : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
