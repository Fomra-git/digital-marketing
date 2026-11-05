"use client";

import { createContext, useContext, useMemo } from "react";
import {
  can,
  canAnywhere,
  isOrgAdmin,
  type Grant,
  type Scope,
} from "@/lib/permissions";
import type { ScopeCompany, ScopeProject } from "@/lib/auth/context";

export type ShellData = {
  userId: string;
  organizationId: string;
  organizationName: string;
  organizationLogo: string | null;
  profile: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    job_title: string | null;
  };
  grants: Grant[];
  companies: ScopeCompany[];
  projects: ScopeProject[];
  selection: { companyId: string | null; projectId: string | null };
  unreadNotifications: number;
};

type ShellContextValue = ShellData & {
  can: (permission: string, scope?: Scope) => boolean;
  canAnywhere: (permission: string) => boolean;
  isAdmin: boolean;
};

const ShellContext = createContext<ShellContextValue | null>(null);

/**
 * Makes the signed-in user's grants and scope available to client components.
 * Permission checks here only decide what to show; the database enforces.
 */
export function ShellProvider({
  value,
  children,
}: {
  value: ShellData;
  children: React.ReactNode;
}) {
  const ctx = useMemo<ShellContextValue>(
    () => ({
      ...value,
      can: (permission, scope) => can(value.grants, permission, scope),
      canAnywhere: (permission) => canAnywhere(value.grants, permission),
      isAdmin: isOrgAdmin(value.grants),
    }),
    [value],
  );
  return <ShellContext value={ctx}>{children}</ShellContext>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside the app shell");
  return ctx;
}
