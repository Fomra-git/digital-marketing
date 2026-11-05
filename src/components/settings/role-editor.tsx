"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Save, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EntityAvatar } from "@/components/ui/avatar";
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
import { FormField } from "@/components/shared/form-field";
import { roleSchema, type RoleInput } from "@/lib/validations/team";
import {
  deleteRole,
  setRolePermissions,
  updateRole,
} from "@/server/actions/roles";
import { humanize } from "@/lib/utils";

export type PermissionDef = {
  key: string;
  module: string;
  label: string;
  description: string | null;
};
export type RoleHolder = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  where: string;
};

const MODULE_LABELS: Record<string, string> = {
  administration: "Administration",
  companies: "Companies",
  projects: "Projects",
  dashboard: "Dashboards",
  team: "Team performance",
  reports: "Reports",
  tasks: "Tasks",
  daily_reports: "Daily reports",
  social: "Social media",
  ads: "Advertising (Meta & Google)",
  creatives: "Creative studio",
  video: "Video production",
  seo: "SEO",
};

export function RoleEditor({
  role,
  permissions,
  granted,
  holders,
  canManage,
}: {
  role: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    is_system: boolean;
    grants_all: boolean;
  };
  permissions: PermissionDef[];
  granted: string[];
  holders: RoleHolder[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(granted));
  const [saving, startSaving] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const editable = canManage && !role.grants_all;
  const dirty =
    selected.size !== granted.length || granted.some((k) => !selected.has(k));

  const modules = useMemo(() => {
    const map = new Map<string, PermissionDef[]>();
    for (const p of permissions)
      map.set(p.module, [...(map.get(p.module) ?? []), p]);
    return [...map.entries()];
  }, [permissions]);

  const form = useForm<RoleInput>({
    resolver: zodResolver(roleSchema),
    values: {
      name: role.name,
      description: role.description ?? "",
      color: role.color,
      copy_from_role_id: "",
    },
  });
  const errors = form.formState.errors;

  function toggle(key: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleModule(keys: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
      return next;
    });
  }

  function savePermissions() {
    startSaving(async () => {
      const res = await setRolePermissions(role.id, [...selected]);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  }

  const onSaveDetails = form.handleSubmit((values) =>
    startSaving(async () => {
      const res = await updateRole(role.id, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    }),
  );

  function onDelete() {
    startSaving(async () => {
      const res = await deleteRole(role.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push("/settings/roles");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/settings/roles"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← All roles
        </Link>
        {canManage && !role.is_system && (
          <Button
            variant="outline"
            className="text-destructive hover:bg-danger-soft hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 /> Delete role
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ background: role.color }}
              />
              {role.name} — permissions
            </CardTitle>
            <CardDescription>
              {role.grants_all
                ? "This role has full access to everything. It cannot be narrowed."
                : `${selected.size} of ${permissions.length} permissions selected.`}
            </CardDescription>
            {editable && (
              <CardAction>
                <Button
                  onClick={savePermissions}
                  loading={saving}
                  disabled={!dirty}
                >
                  <Save /> Save permissions
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {role.grants_all ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
                <Lock className="size-4 text-muted-foreground" />
                Full access: every current and future permission, at the level
                where the role is assigned.
              </div>
            ) : (
              modules.map(([module, perms]) => {
                const keys = perms.map((p) => p.key);
                const count = keys.filter((k) => selected.has(k)).length;
                const state =
                  count === 0
                    ? false
                    : count === keys.length
                      ? true
                      : "indeterminate";
                return (
                  <fieldset key={module} className="rounded-lg border">
                    <legend className="sr-only">
                      {MODULE_LABELS[module] ?? humanize(module)}
                    </legend>
                    <label className="flex cursor-pointer items-center gap-3 border-b bg-muted/40 px-4 py-2.5">
                      <Checkbox
                        checked={state}
                        disabled={!editable}
                        onCheckedChange={(v) => toggleModule(keys, v === true)}
                        aria-label={`All ${MODULE_LABELS[module] ?? module} permissions`}
                      />
                      <span className="text-sm font-medium">
                        {MODULE_LABELS[module] ?? humanize(module)}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {count}/{keys.length}
                      </span>
                    </label>
                    <div className="grid gap-x-6 gap-y-1 p-3 sm:grid-cols-2">
                      {perms.map((p) => (
                        <label
                          key={p.key}
                          className="flex cursor-pointer items-start gap-3 rounded-md p-1.5 hover:bg-muted/50"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={selected.has(p.key)}
                            disabled={!editable}
                            onCheckedChange={(v) => toggle(p.key, v === true)}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm">{p.label}</span>
                            <span className="block font-mono text-[11px] text-muted-foreground">
                              {p.key}
                            </span>
                            {p.description && (
                              <span className="block text-xs text-muted-foreground">
                                {p.description}
                              </span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              {role.is_system && (
                <CardDescription>
                  Default role: it can be renamed and adjusted, not deleted.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={onSaveDetails} className="grid gap-4" noValidate>
                <FormField
                  label="Name"
                  htmlFor="name"
                  error={errors.name?.message}
                >
                  <Input
                    id="name"
                    disabled={!canManage || role.grants_all}
                    {...form.register("name")}
                  />
                </FormField>
                <FormField
                  label="Description"
                  htmlFor="description"
                  error={errors.description?.message}
                >
                  <Textarea
                    id="description"
                    rows={3}
                    disabled={!canManage || role.grants_all}
                    {...form.register("description")}
                  />
                </FormField>
                <FormField
                  label="Colour"
                  htmlFor="color"
                  error={errors.color?.message}
                >
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      disabled={!canManage || role.grants_all}
                      {...form.register("color")}
                    />
                    <span
                      className="size-9 shrink-0 rounded-lg border"
                      style={{ background: form.watch("color") }}
                    />
                  </div>
                </FormField>
                {canManage && !role.grants_all && (
                  <Button
                    type="submit"
                    variant="outline"
                    loading={saving}
                    disabled={!form.formState.isDirty}
                  >
                    Save details
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>People with this role</CardTitle>
              <CardDescription>
                {holders.length} assignment{holders.length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {holders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nobody has this role yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {holders.map((h, i) => (
                    <li key={`${h.user_id}-${i}`}>
                      <Link
                        href={`/team/${h.user_id}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <EntityAvatar
                          name={h.name}
                          src={h.avatar_url}
                          className="size-7"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm">
                            {h.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {h.where}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the {role.name} role?</AlertDialogTitle>
            <AlertDialogDescription>
              {holders.length
                ? `${holders.length} assignment${holders.length === 1 ? "" : "s"} will be removed and those people lose these permissions immediately.`
                : "Nobody has this role, so nobody loses access."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={onDelete}
              disabled={saving}
            >
              Delete role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
