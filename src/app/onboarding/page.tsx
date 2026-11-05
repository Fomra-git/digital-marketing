import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadAppContext } from "@/lib/auth/context";
import { APP_NAME } from "@/lib/config";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your organization" };

export default async function OnboardingPage() {
  const state = await loadAppContext();
  if (!state) redirect("/login");
  if (state.kind === "member") redirect("/dashboard");
  if (state.kind === "suspended" || !state.bootstrapOpen)
    redirect("/no-access");

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-2">
          <Image src="/icon.svg" alt="" width={32} height={32} />
          <span className="font-semibold">{APP_NAME}</span>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set up your organization
          </h1>
          <p className="text-sm text-muted-foreground">
            You are the first person here, so you become the owner and Super
            Admin. Default departments and roles are created for you; you can
            change them later.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
