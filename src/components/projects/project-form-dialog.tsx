"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  projectSchema,
  PROJECT_STATUSES,
  type ProjectInput,
} from "@/lib/validations/project";
import { createProject, updateProject } from "@/server/actions/projects";
import { humanize, slugify } from "@/lib/utils";
import type { MemberOption } from "@/server/queries/team";

const NONE = "__none__";

export function ProjectFormDialog({
  open,
  onOpenChange,
  companies,
  members,
  project,
  defaultCompanyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Companies the user may create projects in (ignored when editing). */
  companies: { id: string; name: string }[];
  members: MemberOption[];
  project?: ProjectInput & { id: string };
  defaultCompanyId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(project);

  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    values: project ?? {
      company_id:
        defaultCompanyId ?? (companies.length === 1 ? companies[0].id : ""),
      name: "",
      slug: "",
      description: "",
      website_url: "",
      category: "",
      start_date: "",
      end_date: "",
      status: "active",
      manager_id: "",
    },
  });
  const errors = form.formState.errors;
  const name = form.watch("name");

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const res = project
        ? await updateProject(project.id, values)
        : await createProject(values);
      if (!res.ok) {
        setFormError(res.error);
        Object.entries(res.fieldErrors ?? {}).forEach(([key, msgs]) =>
          form.setError(key as keyof ProjectInput, { message: msgs?.[0] }),
        );
        return;
      }
      toast.success(res.message);
      onOpenChange(false);
      if (
        !project &&
        res.data &&
        typeof res.data === "object" &&
        "id" in res.data
      ) {
        router.push(`/projects/${(res.data as { id: string }).id}`);
      } else {
        router.refresh();
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            Projects group the marketing work for one product, property, brand
            or campaign.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          {formError && (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Company"
              htmlFor="company_id"
              error={errors.company_id?.message}
              required
            >
              <Controller
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={editing || Boolean(defaultCompanyId)}
                  >
                    <SelectTrigger
                      id="company_id"
                      aria-invalid={!!errors.company_id}
                    >
                      <SelectValue placeholder="Choose a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Project name"
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
              label="Short name (URL)"
              htmlFor="slug"
              error={errors.slug?.message}
              hint={
                !editing
                  ? `Defaults to “${slugify(name) || "project-name"}”`
                  : undefined
              }
            >
              <Input
                id="slug"
                placeholder={slugify(name)}
                {...form.register("slug")}
              />
            </FormField>
            <FormField
              label="Category"
              htmlFor="category"
              error={errors.category?.message}
            >
              <Input
                id="category"
                placeholder="e.g. Residential launch"
                {...form.register("category")}
              />
            </FormField>
          </div>
          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={3}
              {...form.register("description")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Website"
              htmlFor="website_url"
              error={errors.website_url?.message}
            >
              <Input
                id="website_url"
                type="url"
                inputMode="url"
                placeholder="https://"
                {...form.register("website_url")}
                aria-invalid={!!errors.website_url}
              />
            </FormField>
            <FormField label="Marketing manager" htmlFor="manager_id">
              <Controller
                control={form.control}
                name="manager_id"
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <SelectTrigger id="manager_id">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Not assigned</SelectItem>
                      {members
                        .filter((m) => m.status === "active")
                        .map((m) => (
                          <SelectItem key={m.user_id} value={m.user_id}>
                            {m.full_name ?? m.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Start date"
              htmlFor="start_date"
              error={errors.start_date?.message}
            >
              <Input
                id="start_date"
                type="date"
                {...form.register("start_date")}
              />
            </FormField>
            <FormField
              label="End date"
              htmlFor="end_date"
              error={errors.end_date?.message}
            >
              <Input
                id="end_date"
                type="date"
                {...form.register("end_date")}
                aria-invalid={!!errors.end_date}
              />
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {humanize(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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
              {editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
