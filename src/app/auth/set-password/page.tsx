import Image from "next/image";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Choose a password" };

export default function SetPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2">
          <Image src="/icon.svg" alt="" width={32} height={32} />
          <span className="font-semibold">{APP_NAME}</span>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Choose your password
          </h1>
          <p className="text-sm text-muted-foreground">
            You will use it with your email address to sign in.
          </p>
        </div>
        <SetPasswordForm />
      </div>
    </main>
  );
}
