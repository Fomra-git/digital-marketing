import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const ctx = await requireAppContext();
  const { data, error } = await ctx.supabase
    .from("profiles")
    .select("full_name, email, phone, job_title, timezone, avatar_url")
    .eq("id", ctx.user.id)
    .single();
  if (error) throw error;
  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="How you appear to your colleagues."
      />
      <ProfileForm
        profile={data}
        userId={ctx.user.id}
        organizationId={ctx.organization.id}
      />
    </div>
  );
}
