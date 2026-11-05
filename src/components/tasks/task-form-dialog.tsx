"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  CATEGORY_LABELS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  taskSchema,
  type TaskInput,
} from "@/lib/validations/task";
import {
  createTask,
  getAssignableUsers,
  updateTask,
  type AssignableUser,
} from "@/server/actions/tasks";
import type { TaskCreationScopes } from "@/server/queries/tasks";
import type { DepartmentOption } from "@/server/queries/team";
import { humanize } from "@/lib/utils";
import { useShell } from "@/components/layout/shell-context";
import { PeoplePicker } from "./people-picker";

const NONE = "__none__";

export type EditableTask = TaskInput & { id: string };

export function TaskFormDialog({
  open,
  onOpenChange,
  scopes,
  departments,
  task,
  defaults,
  parentTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scopes: TaskCreationScopes;
  departments: DepartmentOption[];
  task?: EditableTask;
  defaults?: Partial<TaskInput>;
  /** When creating a subtask, the parent's title (company/project are locked). */
  parentTitle?: string;
}) {
  const router = useRouter();
  const { userId } = useShell();
  const editing = Boolean(task);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [people, setPeople] = useState<AssignableUser[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  const initial: TaskInput = task ?? {
    company_id:
      defaults?.company_id ??
      (scopes.companies.length === 1 ? scopes.companies[0].id : ""),
    project_id: defaults?.project_id ?? "",
    department_id: defaults?.department_id ?? "",
    parent_task_id: defaults?.parent_task_id ?? "",
    title: "",
    description: "",
    category: defaults?.category ?? "other",
    priority: "medium",
    start_date: "",
    due_date: "",
    requires_approval: true,
    reviewer_id: "",
    assignee_ids: defaults?.assignee_ids ?? [],
  };

  const form = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    values: initial,
  });
  const errors = form.formState.errors;
  const companyId = useWatch({ control: form.control, name: "company_id" });
  const projectId = useWatch({ control: form.control, name: "project_id" });
  const assigneeIds = useWatch({ control: form.control, name: "assignee_ids" });

  const company = scopes.companies.find((c) => c.id === companyId);
  const companyProjects = useMemo(
    () => scopes.projects.filter((p) => p.company_id === companyId),
    [scopes.projects, companyId],
  );
  const project = scopes.projects.find((p) => p.id === projectId);
  const canAssign = project ? project.canAssign : Boolean(company?.canAssign);
  const lockedScope = editing || Boolean(parentTitle);

  // Who can be assigned depends on the company/project.
  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for an async fetch
    setLoadingPeople(true);
    getAssignableUsers(companyId, projectId || null).then((list) => {
      if (cancelled) return;
      setPeople(list);
      setLoadingPeople(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, companyId, projectId]);

  // Without the assign permission you can only take the task yourself.
  const pickable = canAssign
    ? people
    : people.filter((p) => p.user_id === userId);

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const res = task
        ? await updateTask(task.id, values)
        : await createTask(values);
      if (!res.ok) {
        setFormError(res.error);
        Object.entries(res.fieldErrors ?? {}).forEach(([key, msgs]) =>
          form.setError(key as keyof TaskInput, { message: msgs?.[0] }),
        );
        return;
      }
      toast.success(res.message);
      onOpenChange(false);
      form.reset();
      if (
        !task &&
        res.data &&
        typeof res.data === "object" &&
        "id" in res.data &&
        !parentTitle
      ) {
        router.push(`/tasks/${(res.data as { id: string }).id}`);
      } else {
        router.refresh();
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit task" : parentTitle ? "New subtask" : "New task"}
          </DialogTitle>
          <DialogDescription>
            {parentTitle
              ? `Part of “${parentTitle}”.`
              : "Every task belongs to a company and, optionally, one of its projects."}
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
          <FormField
            label="Title"
            htmlFor="title"
            error={errors.title?.message}
            required
          >
            <Input
              id="title"
              placeholder="e.g. Design 5 Diwali carousel posts"
              {...form.register("title")}
              aria-invalid={!!errors.title}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Company"
              htmlFor="company_id"
              error={errors.company_id?.message}
              required
            >
              <Select
                value={companyId}
                disabled={lockedScope}
                onValueChange={(v) => {
                  form.setValue("company_id", v);
                  form.setValue("project_id", "");
                  form.setValue("assignee_ids", []);
                  form.setValue("reviewer_id", "");
                }}
              >
                <SelectTrigger
                  id="company_id"
                  aria-invalid={!!errors.company_id}
                >
                  <SelectValue placeholder="Choose a company" />
                </SelectTrigger>
                <SelectContent>
                  {scopes.companies.map((c) => (
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
                value={projectId || NONE}
                disabled={lockedScope || !companyId}
                onValueChange={(v) => {
                  form.setValue("project_id", v === NONE ? "" : v);
                  form.setValue("assignee_ids", []);
                }}
              >
                <SelectTrigger id="project_id">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(company?.companyLevel || editing) && (
                    <SelectItem value={NONE}>
                      Company-level (no project)
                    </SelectItem>
                  )}
                  {companyProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={4}
              placeholder="What needs to be done, references, acceptance criteria…"
              {...form.register("description")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Category" htmlFor="category">
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Priority" htmlFor="priority">
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {humanize(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Department" htmlFor="department_id">
              <Controller
                control={form.control}
                name="department_id"
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                  >
                    <SelectTrigger id="department_id">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {departments
                        .filter((d) => d.is_active)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              label="Due date"
              htmlFor="due_date"
              error={errors.due_date?.message}
            >
              <Input
                id="due_date"
                type="date"
                {...form.register("due_date")}
                aria-invalid={!!errors.due_date}
              />
            </FormField>
          </div>

          {!editing && (
            <FormField
              label="Assign to"
              htmlFor="assignees"
              hint={
                !companyId
                  ? "Choose the company first."
                  : canAssign
                    ? "Only people with access to this company or project are listed."
                    : "You can assign this task to yourself."
              }
            >
              <Controller
                control={form.control}
                name="assignee_ids"
                render={({ field }) => (
                  <PeoplePicker
                    id="assignees"
                    people={pickable}
                    value={field.value}
                    onChange={field.onChange}
                    loading={loadingPeople}
                    disabled={!companyId}
                    placeholder="Nobody yet"
                  />
                )}
              />
            </FormField>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Reviewer"
              htmlFor="reviewer_id"
              hint="Gets the review request. Defaults to the creator."
            >
              <Controller
                control={form.control}
                name="reviewer_id"
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                    disabled={!companyId}
                  >
                    <SelectTrigger id="reviewer_id">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Task creator</SelectItem>
                      {people.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <label className="flex items-center justify-between gap-4 rounded-lg border p-3 sm:mt-6">
              <span>
                <span className="block text-sm font-medium">
                  Needs approval
                </span>
                <span className="block text-xs text-muted-foreground">
                  Must be approved before it is completed.
                </span>
              </span>
              <Controller
                control={form.control}
                name="requires_approval"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </label>
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
              {editing ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
