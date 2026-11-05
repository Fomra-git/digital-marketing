"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";
import { requestPasswordReset } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const res = await requestPasswordReset(values);
      if (res.ok) setMessage(res.message ?? "Check your inbox.");
      else setError(res.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {message && (
        <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <FormField
        label="Email"
        htmlFor="email"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
        />
      </FormField>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}
