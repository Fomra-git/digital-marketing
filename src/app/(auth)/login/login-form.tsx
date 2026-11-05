"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { signIn } from "@/server/actions/auth";

const ERRORS: Record<string, string> = {
  link_expired:
    "That sign-in link has expired or was already used. Please sign in again.",
  auth: "We could not complete sign-in. Please try again.",
};

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(
    initialError ? (ERRORS[initialError] ?? ERRORS.auth) : null,
  );
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const res = await signIn(values, next);
      if (res && !res.ok) setError(res.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-danger-soft px-3 py-2 text-sm text-destructive"
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
          inputMode="email"
          {...form.register("email")}
          aria-invalid={!!form.formState.errors.email}
        />
      </FormField>
      <FormField
        label="Password"
        htmlFor="password"
        error={form.formState.errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
          aria-invalid={!!form.formState.errors.password}
        />
      </FormField>
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm text-primary-strong hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
