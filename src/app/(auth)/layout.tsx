import Image from "next/image";
import { APP_NAME } from "@/lib/config";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Image src="/icon.svg" alt="" width={36} height={36} />
          <span className="text-lg font-semibold">{APP_NAME}</span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl leading-tight font-semibold">
            Every company, campaign and creative —{" "}
            <span className="text-primary">one control room.</span>
          </h2>
          <p className="text-slate-400">
            Plan, assign, approve and monitor all digital marketing across your
            companies and projects, with access controlled down to each module.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Internal use only · Access is granted by your administrator
        </p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-primary/20 blur-3xl" />
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Image src="/icon.svg" alt="" width={32} height={32} />
            <span className="font-semibold">{APP_NAME}</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
