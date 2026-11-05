import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadAppContext } from "@/lib/auth/context";
import { signOut } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Waiting for access" };

export default async function NoAccessPage() {
  const state = await loadAppContext();
  if (!state) redirect("/login");
  if (state.kind === "member") redirect("/dashboard");
  const suspended = state.kind === "suspended";

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning-soft text-amber-700">
          <ShieldAlert className="size-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">
            {suspended
              ? "Your access is suspended"
              : "You do not have access yet"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {suspended
              ? "An administrator has suspended your account. Contact them if you think this is a mistake."
              : "Your account exists, but an administrator has not added you to the organization yet. Ask them to invite you using this email address."}
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}
