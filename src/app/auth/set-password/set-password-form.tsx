"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { createClient } from "@/lib/supabase/client";
import {
  setPasswordSchema,
  type SetPasswordInput,
} from "@/lib/validations/auth";
import { setPassword } from "@/server/actions/auth";

export function SetPasswordForm() {
  const [ready, setReady] = useState<"checking" | "ok" | "missing">("checking");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      // Invitation links from the default email template carry the session in
      // the URL fragment (#access_token=...). Store it as a cookie session.
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        window.history.replaceState(null, "", window.location.pathname);
      }
      const { data } = await supabase.auth.getClaims();
      setReady(data?.claims?.sub ? "ok" : "missing");
    })();
  }, []);

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const res = await setPassword(values);
      if (res && !res.ok) setError(res.error);
    });
  });

  if (ready === "checking")
    return <p className="text-sm text-muted-foreground">Checking your link…</p>;
  if (ready === "missing") {
    return (
      <div className="space-y-3 rounded-xl border bg-card p-5 text-sm">
        <p>This link has expired or was already used.</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <FormField
        label="New password"
        htmlFor="password"
        error={form.formState.errors.password?.message}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
          aria-invalid={!!form.formState.errors.password}
        />
      </FormField>
      <FormField
        label="Confirm password"
        htmlFor="confirm"
        error={form.formState.errors.confirm?.message}
      >
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          {...form.register("confirm")}
          aria-invalid={!!form.formState.errors.confirm}
        />
      </FormField>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Save password and continue
      </Button>
    </form>
  );
}
