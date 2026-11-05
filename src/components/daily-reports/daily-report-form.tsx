"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import {
  dailyReportSchema,
  type DailyReportInput,
} from "@/lib/validations/daily-report";
import { saveDailyReport } from "@/server/actions/daily-reports";

const NONE = "__none__";

export type ReportScopes = {
  companies: { id: string; name: string }[];
  projects: { id: string; name: string; company_id: string }[];
};

const FIELDS = [
  [
    "completed_activities",
    "Completed today",
    "What did you finish? One item per line.",
  ],
  ["work_in_progress", "Work in progress", "What are you still working on?"],
  [
    "pending_activities",
    "Pending",
    "What is waiting on you or on someone else?",
  ],
  [
    "challenges",
    "Challenges / blockers",
    "Anything slowing you down that your manager should know.",
  ],
  ["tomorrow_plan", "Plan for tomorrow", "What will you do next?"],
] as const;

export function DailyReportForm({
  scopes,
  initial,
  reportId,
  status,
}: {
  scopes: ReportScopes;
  initial: Omit<DailyReportInput, "submit">;
  reportId?: string;
  status?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<DailyReportInput>({
    resolver: zodResolver(dailyReportSchema),
    values: { ...initial, submit: false },
  });
  const errors = form.formState.errors;
  const companyId = useWatch({ control: form.control, name: "company_id" });
  const projectId = useWatch({ control: form.control, name: "project_id" });
  const locked = Boolean(reportId);

  function save(submit: boolean) {
    form.setValue("submit", submit);
    void form.handleSubmit((values) => {
      setError(null);
      startTransition(async () => {
        const res = await saveDailyReport({ ...values, submit }, reportId);
        if (!res.ok) {
          setError(res.error);
          Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) =>
            form.setError(k as keyof DailyReportInput, { message: m?.[0] }),
          );
          return;
        }
        toast.success(res.message);
        router.push(`/daily-reports/${res.data.id}`);
        router.refresh();
      });
    })();
  }

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="grid gap-5"
          noValidate
        >
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField
              label="Date"
              htmlFor="report_date"
              error={errors.report_date?.message}
              required
            >
              <Input
                id="report_date"
                type="date"
                disabled={locked}
                {...form.register("report_date")}
              />
            </FormField>
            <FormField
              label="Company"
              htmlFor="company_id"
              error={errors.company_id?.message}
              required
              className="sm:col-span-2"
            >
              <Select
                value={companyId}
                disabled={locked}
                onValueChange={(v) => {
                  form.setValue("company_id", v);
                  form.setValue("project_id", "");
                }}
              >
                <SelectTrigger id="company_id">
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
              label="Hours worked"
              htmlFor="hours_worked"
              error={errors.hours_worked?.message}
            >
              <Input
                id="hours_worked"
                inputMode="decimal"
                placeholder="e.g. 8"
                {...form.register("hours_worked")}
              />
            </FormField>
          </div>
          <FormField
            label="Project"
            htmlFor="project_id"
            hint="Optional. One report per company (and project) per day."
          >
            <Select
              value={projectId || NONE}
              disabled={locked || !companyId}
              onValueChange={(v) =>
                form.setValue("project_id", v === NONE ? "" : v)
              }
            >
              <SelectTrigger id="project_id">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Whole company</SelectItem>
                {scopes.projects
                  .filter((p) => p.company_id === companyId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </FormField>
          {FIELDS.map(([name, label, hint]) => (
            <FormField
              key={name}
              label={label}
              htmlFor={name}
              error={errors[name]?.message}
              hint={hint}
            >
              <Textarea
                id={name}
                rows={name === "completed_activities" ? 5 : 3}
                {...form.register(name)}
              />
            </FormField>
          ))}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => save(false)}
              loading={pending}
            >
              <Save /> Save {status && status !== "draft" ? "changes" : "draft"}
            </Button>
            {(!status || status === "draft") && (
              <Button
                type="button"
                onClick={() => save(true)}
                loading={pending}
              >
                <Send /> Submit to manager
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
