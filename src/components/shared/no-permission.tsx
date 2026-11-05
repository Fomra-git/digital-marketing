import { Lock } from "lucide-react";

export function NoPermission({ what = "this page" }: { what?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-5" />
      </div>
      <p className="font-medium">You do not have access to {what}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ask an administrator to give your role the right permission for the
        company or project you need.
      </p>
    </div>
  );
}
