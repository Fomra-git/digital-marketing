"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import {
  createOrganizationSchema,
  type CreateOrganizationInput,
} from "@/lib/validations/organization";
import { createOrganization } from "@/server/actions/organization";
import { slugify } from "@/lib/utils";

export function OnboardingForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: "", slug: "" },
  });
  const name = form.watch("name");

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const res = await createOrganization(values);
      if (res && !res.ok) setError(res.error);
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
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
      <FormField
        label="Organization name"
        htmlFor="name"
        error={form.formState.errors.name?.message}
        required
      >
        <Input
          id="name"
          placeholder="e.g. Fomra Group"
          {...form.register("name")}
          aria-invalid={!!form.formState.errors.name}
        />
      </FormField>
      <FormField
        label="Short name (URL)"
        htmlFor="slug"
        error={form.formState.errors.slug?.message}
        hint={`Leave empty to use “${slugify(name) || "your-organization"}”.`}
      >
        <Input
          id="slug"
          placeholder={slugify(name) || "your-organization"}
          {...form.register("slug")}
        />
      </FormField>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Create organization
      </Button>
    </form>
  );
}
