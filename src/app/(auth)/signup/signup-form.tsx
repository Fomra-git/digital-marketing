"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { signUp } from "@/server/actions/auth";

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const res = await signUp(values);
      if (!res) return;
      if (!res.ok) setError(res.error);
      else setSent(true);
    });
  });

  if (sent) {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center">
        <MailCheck className="mx-auto size-8 text-primary" />
        <p className="font-medium">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to{" "}
          <strong>{form.getValues("email")}</strong>. Open it to finish creating
          your account.
        </p>
      </div>
    );
  }

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
        label="Full name"
        htmlFor="full_name"
        error={errors.full_name?.message}
      >
        <Input
          id="full_name"
          autoComplete="name"
          {...form.register("full_name")}
          aria-invalid={!!errors.full_name}
        />
      </FormField>
      <FormField
        label="Work email"
        htmlFor="email"
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          {...form.register("email")}
          aria-invalid={!!errors.email}
        />
      </FormField>
      <FormField
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
          aria-invalid={!!errors.password}
        />
      </FormField>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Create account
      </Button>
    </form>
  );
}
