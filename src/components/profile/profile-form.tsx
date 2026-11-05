"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { ImageUpload } from "@/components/shared/image-upload";
import { profileSchema, type ProfileInput } from "@/lib/validations/team";
import { setAvatar, updateProfile } from "@/server/actions/profile";

type Profile = {
  full_name: string | null;
  email: string;
  phone: string | null;
  job_title: string | null;
  timezone: string;
  avatar_url: string | null;
};

export function ProfileForm({
  profile,
  userId,
  organizationId,
}: {
  profile: Profile;
  userId: string;
  organizationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile.full_name ?? "",
      job_title: profile.job_title ?? "",
      phone: profile.phone ?? "",
      timezone: profile.timezone,
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await updateProfile(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    }),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Your email ({profile.email}) is your sign-in and cannot be changed
            here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Full name"
                htmlFor="full_name"
                error={errors.full_name?.message}
                required
              >
                <Input
                  id="full_name"
                  autoComplete="name"
                  {...form.register("full_name")}
                  aria-invalid={!!errors.full_name}
                />
              </FormField>
              <FormField
                label="Job title"
                htmlFor="job_title"
                error={errors.job_title?.message}
              >
                <Input id="job_title" {...form.register("job_title")} />
              </FormField>
              <FormField
                label="Phone"
                htmlFor="phone"
                error={errors.phone?.message}
              >
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  {...form.register("phone")}
                />
              </FormField>
              <FormField
                label="Time zone"
                htmlFor="timezone"
                error={errors.timezone?.message}
              >
                <Input id="timezone" {...form.register("timezone")} />
              </FormField>
            </div>
            <div>
              <Button
                type="submit"
                loading={pending}
                disabled={!form.formState.isDirty}
              >
                Save profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload
            organizationId={organizationId}
            kind="avatars"
            entityId={userId}
            name={profile.full_name ?? profile.email}
            currentUrl={profile.avatar_url}
            onSaved={setAvatar}
            round
          />
        </CardContent>
      </Card>
    </div>
  );
}
