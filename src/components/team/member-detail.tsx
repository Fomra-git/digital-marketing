"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Ban,
  Building2,
  FolderKanban,
  Globe2,
  Mail,
  Phone,
  ShieldCheck,
  UserMinus,
  UserRoundCheck,
  X,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { useShell } from "@/components/layout/shell-context";
import {
  memberUpdateSchema,
  type MemberUpdateInput,
} from "@/lib/validations/team";
import {
  removeMember,
  revokeAssignment,
  setMemberStatus,
  updateMember,
} from "@/server/actions/team";
import { humanize, timeAgo } from "@/lib/utils";
import { P } from "@/lib/permissions";
import type {
  DepartmentOption,
  MemberOption,
  RoleOption,
  ScopedAssignment,
} from "@/server/queries/team";
import { AssignRoleDialog } from "./assign-role-dialog";
import { RoleChip } from "./assignments-panel";

const NONE = "__none__";

export type MemberDetailData = {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  status: string;
  is_owner: boolean;
  department_id: string | null;
  reports_to: string | null;
};

export type ActivityItem = {
  id: string;
  action: string;
  entity_type: string;
  summary: string | null;
  created_at: string;
};

export function MemberDetail({
  member,
  assignments,
  showAssignments,
  departments,
  members,
  roles,
  activity,
}: {
  member: MemberDetailData;
  assignments: ScopedAssignment[];
  showAssignments: boolean;
  departments: DepartmentOption[];
  members: MemberOption[];
  roles: RoleOption[];
  activity: ActivityItem[] | null;
}) {
  const router = useRouter();
  const { can, userId, companies, projects } = useShell();
  const canManage = can(P.usersManage);
  const isSelf = member.user_id === userId;
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "suspend" | "remove">(null);
  const [pending, startTransition] = useTransition();

  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const name = member.full_name ?? member.email;

  const form = useForm<MemberUpdateInput>({
    resolver: zodResolver(memberUpdateSchema),
    values: {
      department_id: member.department_id ?? "",
      reports_to: member.reports_to ?? "",
    },
  });

  function run(
    fn: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    after?: () => void,
  ) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setConfirm(null);
      if (after) after();
      else router.refresh();
    });
  }

  const onSave = form.handleSubmit((values) =>
    run(() => updateMember(member.user_id, values)),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/team" className="hover:underline">
            Team
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <EntityAvatar
              name={name}
              src={member.avatar_url}
              className="size-10"
            />
            <span className="truncate">{name}</span>
            <StatusBadge status={member.status} />
            {member.is_owner && (
              <span className="rounded-full bg-sidebar px-2 py-0.5 text-xs font-medium text-white">
                Owner
              </span>
            )}
          </span>
        }
        description={member.job_title ?? undefined}
        actions={
          canManage && !isSelf && !member.is_owner ? (
            <>
              {member.status === "active" ? (
                <Button variant="outline" onClick={() => setConfirm("suspend")}>
                  <Ban /> Suspend access
                </Button>
              ) : (
                <Button
                  variant="outline"
                  loading={pending}
                  onClick={() =>
                    run(() => setMemberStatus(member.user_id, "active"))
                  }
                >
                  <UserRoundCheck /> Restore access
                </Button>
              )}
              <Button
                variant="outline"
                className="text-destructive hover:bg-danger-soft hover:text-destructive"
                onClick={() => setConfirm("remove")}
              >
                <UserMinus /> Remove
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {showAssignments && (
            <Card>
              <CardHeader>
                <CardTitle>Roles and access</CardTitle>
                <CardDescription>
                  What {isSelf ? "you" : name} can do, and where.
                </CardDescription>
                {canManage && (
                  <CardAction>
                    <Button size="sm" onClick={() => setAssignOpen(true)}>
                      <ShieldCheck /> Assign role
                    </Button>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <EmptyState
                    title="No roles yet"
                    description="Without a role this person cannot see any company or project."
                    className="py-8"
                  />
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {assignments.map((a) => {
                      const Icon = a.project_id
                        ? FolderKanban
                        : a.company_id
                          ? Building2
                          : Globe2;
                      const where = a.project_id
                        ? `${companyName.get(a.company_id ?? "") ?? "—"} › ${projectName.get(a.project_id) ?? "Project"}`
                        : a.company_id
                          ? `${companyName.get(a.company_id) ?? "Company"} (all projects)`
                          : "Whole organization";
                      return (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-3 p-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <Icon className="size-4" />
                            </span>
                            <div className="min-w-0">
                              {a.role && (
                                <RoleChip
                                  name={a.role.name}
                                  color={a.role.color}
                                />
                              )}
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {where}
                              </p>
                            </div>
                          </div>
                          {canManage &&
                            !(
                              member.is_owner &&
                              a.role?.grants_all &&
                              !a.company_id
                            ) && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={pending}
                                onClick={() =>
                                  run(() => revokeAssignment(a.id))
                                }
                                aria-label="Remove role"
                              >
                                <X />
                              </Button>
                            )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {activity && (
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>
                  Changes made by {isSelf ? "you" : name}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recorded activity yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {activity.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-4 text-sm"
                      >
                        <span>
                          <span className="font-medium">
                            {humanize(item.action)}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {humanize(item.entity_type).replace(/s$/, "")}
                          </span>
                          {item.summary ? <> · {item.summary}</> : null}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeAgo(item.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                <a
                  href={`mailto:${member.email}`}
                  className="truncate hover:underline"
                >
                  {member.email}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {member.phone ? (
                  <a href={`tel:${member.phone}`} className="hover:underline">
                    {member.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Department and reporting</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSave} className="grid gap-4">
                <FormField label="Department" htmlFor="department_id">
                  <Select
                    disabled={!canManage}
                    value={form.watch("department_id") || NONE}
                    onValueChange={(v) =>
                      form.setValue("department_id", v === NONE ? "" : v, {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger id="department_id">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No department</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Reports to" htmlFor="reports_to">
                  <Select
                    disabled={!canManage}
                    value={form.watch("reports_to") || NONE}
                    onValueChange={(v) =>
                      form.setValue("reports_to", v === NONE ? "" : v, {
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger id="reports_to">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nobody</SelectItem>
                      {members
                        .filter((m) => m.user_id !== member.user_id)
                        .map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name ?? m.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </FormField>
                {canManage && (
                  <Button
                    type="submit"
                    loading={pending}
                    disabled={!form.formState.isDirty}
                  >
                    Save
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {canManage && (
        <AssignRoleDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          members={members}
          roles={roles}
          fixedUserId={member.user_id}
          title={`Assign a role to ${name}`}
        />
      )}

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "suspend"
                ? `Suspend ${name}?`
                : `Remove ${name} from the organization?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "suspend"
                ? "They lose access to everything immediately. Their roles are kept, so you can restore access later."
                : "Their roles are removed and they lose access. Work they did (tasks, reports, history) stays in the system."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                if (confirm === "suspend")
                  run(() => setMemberStatus(member.user_id, "suspended"));
                else
                  run(
                    () => removeMember(member.user_id),
                    () => router.push("/team"),
                  );
              }}
            >
              {confirm === "suspend" ? "Suspend access" : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
