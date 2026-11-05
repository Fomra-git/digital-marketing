import { requireAppContext } from "@/lib/auth/context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import {
  ShellProvider,
  type ShellData,
} from "@/components/layout/shell-context";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireAppContext();

  const { count } = await ctx.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  const shell: ShellData = {
    userId: ctx.user.id,
    organizationId: ctx.organization.id,
    organizationName: ctx.organization.name,
    organizationLogo: ctx.organization.logo_url,
    profile: {
      full_name: ctx.profile.full_name,
      email: ctx.profile.email || ctx.user.email,
      avatar_url: ctx.profile.avatar_url,
      job_title: ctx.profile.job_title,
    },
    grants: ctx.grants,
    companies: ctx.companies,
    projects: ctx.projects,
    selection: ctx.selection,
    unreadNotifications: count ?? 0,
  };

  return (
    <ShellProvider value={shell}>
      <AppSidebar />
      <div className="flex min-h-dvh flex-col lg:pl-64">
        <AppHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </ShellProvider>
  );
}
