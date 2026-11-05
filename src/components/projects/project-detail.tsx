"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Globe,
  Pencil,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FormField } from "@/components/shared/form-field";
import { ImageUpload } from "@/components/shared/image-upload";
import { AssignmentsPanel } from "@/components/team/assignments-panel";
import { useShell } from "@/components/layout/shell-context";
import {
  projectSettingsSchema,
  type ProjectInput,
  type ProjectSettingsInput,
} from "@/lib/validations/project";
import {
  deleteProject,
  setProjectImage,
  updateProjectSettings,
} from "@/server/actions/projects";
import { formatDate } from "@/lib/utils";
import { P } from "@/lib/permissions";
import type {
  MemberOption,
  RoleOption,
  ScopedAssignment,
} from "@/server/queries/team";
import { ProjectFormDialog } from "./project-form-dialog";

export type ProjectDetailData = {
  id: string;
  company_id: string;
  company_name: string;
  name: string;
  slug: string;
  description: string | null;
  website_url: string | null;
  image_url: string | null;
  category: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectInput["status"];
  manager_id: string | null;
  manager_name: string | null;
  created_at: string;
};

export function ProjectDetail({
  project,
  settings,
  assignments,
  inheritedCount,
  members,
  roles,
}: {
  project: ProjectDetailData;
  settings: ProjectSettingsInput | null;
  assignments: ScopedAssignment[];
  inheritedCount: number;
  members: MemberOption[];
  roles: RoleOption[];
}) {
  const router = useRouter();
  const { can, organizationId } = useShell();
  const scope = { companyId: project.company_id, projectId: project.id };
  const canEdit = can(P.projectsEdit, scope);
  const canDelete = can(P.projectsDelete, scope);
  const canManageUsers = can(P.usersManage);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  function onDelete() {
    startDelete(async () => {
      const res = await deleteProject(project.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push("/projects");
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>
            <span>/</span>
            <Link
              href={`/companies/${project.company_id}`}
              className="hover:underline"
            >
              {project.company_name}
            </Link>
          </span>
        }
        title={
          <span className="flex items-center gap-3">
            <EntityAvatar
              name={project.name}
              src={project.image_url}
              square
              className="size-10"
            />
            <span className="truncate">{project.name}</span>
            <StatusBadge status={project.status} />
          </span>
        }
        description={project.category ?? undefined}
        actions={
          <>
            {canEdit && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                className="text-destructive hover:bg-danger-soft hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 /> Delete
              </Button>
            )}
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          {canEdit && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Added {formatDate(project.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {project.description || "No description yet."}
              </p>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Detail icon={Building2} label="Company">
                  <Link
                    href={`/companies/${project.company_id}`}
                    className="text-primary-strong hover:underline"
                  >
                    {project.company_name}
                  </Link>
                </Detail>
                <Detail icon={UserRound} label="Marketing manager">
                  {project.manager_name}
                </Detail>
                <Detail icon={Globe} label="Website">
                  {project.website_url ? (
                    <a
                      href={project.website_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-primary-strong hover:underline"
                    >
                      {project.website_url} <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </Detail>
                <Detail icon={Tag} label="Category">
                  {project.category}
                </Detail>
                <Detail icon={CalendarDays} label="Timeline">
                  {project.start_date
                    ? `${formatDate(project.start_date)} → ${project.end_date ? formatDate(project.end_date) : "ongoing"}`
                    : null}
                </Detail>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Project image</CardTitle>
              <CardDescription>Logo or key visual.</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                organizationId={organizationId}
                kind="projects"
                entityId={project.id}
                name={project.name}
                currentUrl={project.image_url}
                disabled={!canEdit}
                onSaved={(url) => setProjectImage(project.id, url)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <AssignmentsPanel
            title="Project team"
            description="People with a role on this project only."
            assignments={assignments}
            members={members}
            roles={roles}
            companyId={project.company_id}
            projectId={project.id}
            canManage={canManageUsers}
            orgWideCount={inheritedCount}
            inheritedLabel="company-wide or organization-wide roles"
          />
        </TabsContent>

        {canEdit && settings && (
          <TabsContent value="settings">
            <ProjectSettingsForm projectId={project.id} settings={settings} />
          </TabsContent>
        )}
      </Tabs>

      {canEdit && (
        <ProjectFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          companies={[{ id: project.company_id, name: project.company_name }]}
          members={members}
          project={{
            id: project.id,
            company_id: project.company_id,
            name: project.name,
            slug: project.slug,
            description: project.description ?? "",
            website_url: project.website_url ?? "",
            category: project.category ?? "",
            start_date: project.start_date ?? "",
            end_date: project.end_date ?? "",
            status: project.status,
            manager_id: project.manager_id ?? "",
          }}
        />
      )}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The project disappears from lists and dashboards. Its history is
              kept for reporting and the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={onDelete}
              disabled={deleting}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Globe;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate">
          {children || <span className="text-muted-foreground">—</span>}
        </dd>
      </div>
    </div>
  );
}

const TRI = [
  { value: "inherit", label: "Same as company" },
  { value: "yes", label: "Required" },
  { value: "no", label: "Not required" },
] as const;

function ProjectSettingsForm({
  projectId,
  settings,
}: {
  projectId: string;
  settings: ProjectSettingsInput;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ProjectSettingsInput>({
    resolver: zodResolver(projectSettingsSchema),
    values: settings,
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await updateProjectSettings(projectId, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project settings</CardTitle>
        <CardDescription>
          Approval rules and the targets used for advertising alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid max-w-xl gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["social_approval_required", "Social post approval"],
                ["creative_approval_required", "Creative approval"],
              ] as const
            ).map(([key, label]) => (
              <FormField key={key} label={label} htmlFor={key}>
                <Controller
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id={key}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRI.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            ))}
            <FormField
              label="Monthly ad budget"
              htmlFor="monthly_ad_budget"
              error={errors.monthly_ad_budget?.message}
            >
              <Input
                id="monthly_ad_budget"
                inputMode="decimal"
                placeholder="e.g. 250000"
                {...form.register("monthly_ad_budget")}
              />
            </FormField>
            <FormField
              label="Target cost per lead"
              htmlFor="target_cpl"
              error={errors.target_cpl?.message}
            >
              <Input
                id="target_cpl"
                inputMode="decimal"
                placeholder="e.g. 350"
                {...form.register("target_cpl")}
              />
            </FormField>
          </div>
          <div>
            <Button type="submit" loading={pending}>
              Save settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
