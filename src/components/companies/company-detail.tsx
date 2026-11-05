"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ExternalLink,
  FolderKanban,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserRound,
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { ImageUpload } from "@/components/shared/image-upload";
import { AssignmentsPanel } from "@/components/team/assignments-panel";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { useShell } from "@/components/layout/shell-context";
import {
  companySettingsSchema,
  type CompanySettingsInput,
} from "@/lib/validations/company";
import {
  deleteCompany,
  setCompanyLogo,
  updateCompanySettings,
} from "@/server/actions/companies";
import { formatDate, humanize } from "@/lib/utils";
import { P } from "@/lib/permissions";
import type {
  MemberOption,
  RoleOption,
  ScopedAssignment,
} from "@/server/queries/team";
import { CompanyFormDialog } from "./company-form-dialog";

export type CompanyDetailData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  industry: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export type CompanyProject = {
  id: string;
  name: string;
  status: string;
  category: string | null;
  start_date: string | null;
  image_url: string | null;
  manager: string | null;
};

export function CompanyDetail({
  company,
  projects,
  settings,
  assignments,
  members,
  roles,
  orgWideCount,
}: {
  company: CompanyDetailData;
  projects: CompanyProject[];
  settings: CompanySettingsInput | null;
  assignments: ScopedAssignment[];
  members: MemberOption[];
  roles: RoleOption[];
  orgWideCount: number;
}) {
  const router = useRouter();
  const { can, organizationId } = useShell();
  const scope = { companyId: company.id };
  const canEdit = can(P.companiesEdit, scope);
  const canDelete = can(P.companiesDelete, scope);
  const canCreateProject = can(P.projectsCreate, scope);
  const canManageUsers = can(P.usersManage);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [deleting, startDelete] = useTransition();

  function onDelete() {
    startDelete(async () => {
      const res = await deleteCompany(company.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push("/companies");
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/companies" className="hover:underline">
            Companies
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <EntityAvatar
              name={company.name}
              src={company.logo_url}
              square
              className="size-10"
            />
            <span className="truncate">{company.name}</span>
            <StatusBadge status={company.status} />
          </span>
        }
        description={company.industry ?? undefined}
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
          <TabsTrigger value="projects">
            Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          {canEdit && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Added {formatDate(company.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {company.description || "No description yet."}
              </p>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Detail icon={Globe} label="Website">
                  {company.website_url ? (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-primary-strong hover:underline"
                    >
                      {company.website_url} <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </Detail>
                <Detail icon={UserRound} label="Contact person">
                  {company.contact_name}
                </Detail>
                <Detail icon={Mail} label="Email">
                  {company.contact_email ? (
                    <a
                      href={`mailto:${company.contact_email}`}
                      className="text-primary-strong hover:underline"
                    >
                      {company.contact_email}
                    </a>
                  ) : null}
                </Detail>
                <Detail icon={Phone} label="Phone">
                  {company.contact_phone ? (
                    <a
                      href={`tel:${company.contact_phone}`}
                      className="hover:underline"
                    >
                      {company.contact_phone}
                    </a>
                  ) : null}
                </Detail>
                <Detail icon={MapPin} label="Address">
                  {company.address}
                </Detail>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Shown in the switcher, lists and reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                organizationId={organizationId}
                kind="companies"
                entityId={company.id}
                name={company.name}
                currentUrl={company.logo_url}
                disabled={!canEdit}
                onSaved={(url) => setCompanyLogo(company.id, url)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>
                Projects of {company.name} that you can access.
              </CardDescription>
              {canCreateProject && (
                <CardAction>
                  <Button size="sm" onClick={() => setProjectOpen(true)}>
                    <Plus /> New project
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  className="py-8"
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {projects.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/projects/${p.id}`}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                      >
                        <EntityAvatar
                          name={p.name}
                          src={p.image_url}
                          square
                          className="size-10"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {p.manager
                              ? `Manager: ${p.manager}`
                              : (p.category ?? "No manager yet")}
                          </span>
                        </span>
                        <StatusBadge status={p.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <AssignmentsPanel
            title="Company team"
            description={`People with a role for ${company.name}. A company role also covers all of its projects.`}
            assignments={assignments}
            members={members}
            roles={roles}
            companyId={company.id}
            canManage={canManageUsers}
            orgWideCount={orgWideCount}
          />
        </TabsContent>

        {canEdit && settings && (
          <TabsContent value="settings">
            <CompanySettingsForm companyId={company.id} settings={settings} />
          </TabsContent>
        )}
      </Tabs>

      {canEdit && (
        <CompanyFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          company={{ ...nullsToEmpty(company), id: company.id }}
        />
      )}
      {canCreateProject && (
        <ProjectFormDialog
          open={projectOpen}
          onOpenChange={setProjectOpen}
          companies={[{ id: company.id, name: company.name }]}
          defaultCompanyId={company.id}
          members={members}
        />
      )}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {company.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The company and its projects disappear from lists and dashboards.
              Its history (tasks, reports, metrics and the audit log) is kept so
              nothing is lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={onDelete}
              disabled={deleting}
            >
              Delete company
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function nullsToEmpty(c: CompanyDetailData) {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    website_url: c.website_url ?? "",
    industry: c.industry ?? "",
    contact_name: c.contact_name ?? "",
    contact_email: c.contact_email ?? "",
    contact_phone: c.contact_phone ?? "",
    address: c.address ?? "",
    status: c.status,
  };
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

function CompanySettingsForm({
  companyId,
  settings,
}: {
  companyId: string;
  settings: CompanySettingsInput;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    values: settings,
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await updateCompanySettings(companyId, values);
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
        <CardTitle>Company settings</CardTitle>
        <CardDescription>
          Defaults for every project of this company. Projects can override
          approval rules.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid max-w-xl gap-5" noValidate>
          {(
            ["social_approval_required", "creative_approval_required"] as const
          ).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div>
                <p className="text-sm font-medium">
                  {humanize(key.replace("_required", ""))} required
                </p>
                <p className="text-xs text-muted-foreground">
                  {key === "social_approval_required"
                    ? "Posts need manager approval before they can be scheduled."
                    : "Creatives need manager approval before they are completed."}
                </p>
              </div>
              <Controller
                control={form.control}
                name={key}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label={humanize(key)}
                  />
                )}
              />
            </div>
          ))}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Brand colour"
              htmlFor="brand_primary_color"
              error={errors.brand_primary_color?.message}
            >
              <Input
                id="brand_primary_color"
                placeholder="#14B8A6"
                {...form.register("brand_primary_color")}
              />
            </FormField>
            <FormField
              label="Brand guidelines link"
              htmlFor="brand_guidelines_url"
              error={errors.brand_guidelines_url?.message}
            >
              <Input
                id="brand_guidelines_url"
                type="url"
                placeholder="https://"
                {...form.register("brand_guidelines_url")}
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
