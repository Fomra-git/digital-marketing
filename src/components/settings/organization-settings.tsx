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
import {
  organizationSettingsSchema,
  type OrganizationSettingsInput,
} from "@/lib/validations/organization";
import {
  setOrganizationLogo,
  updateOrganization,
} from "@/server/actions/organization";

type Org = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  timezone: string;
  currency: string;
  primary_color: string;
  logo_url: string | null;
};

export function OrganizationSettings({ org }: { org: Org }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<OrganizationSettingsInput>({
    resolver: zodResolver(organizationSettingsSchema),
    values: {
      name: org.name,
      website_url: org.website_url ?? "",
      timezone: org.timezone,
      currency: org.currency,
      primary_color: org.primary_color,
    },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await updateOrganization(values);
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
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>
            Used across the app and on exported reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Name"
                htmlFor="name"
                error={errors.name?.message}
                required
              >
                <Input
                  id="name"
                  {...form.register("name")}
                  aria-invalid={!!errors.name}
                />
              </FormField>
              <FormField
                label="Website"
                htmlFor="website_url"
                error={errors.website_url?.message}
              >
                <Input
                  id="website_url"
                  type="url"
                  placeholder="https://"
                  {...form.register("website_url")}
                />
              </FormField>
              <FormField
                label="Time zone"
                htmlFor="timezone"
                error={errors.timezone?.message}
                hint="IANA name, e.g. Asia/Kolkata"
              >
                <Input id="timezone" {...form.register("timezone")} />
              </FormField>
              <FormField
                label="Currency"
                htmlFor="currency"
                error={errors.currency?.message}
                hint="Used for ad spend and budgets"
              >
                <Input
                  id="currency"
                  maxLength={3}
                  className="uppercase"
                  {...form.register("currency")}
                />
              </FormField>
              <FormField
                label="Brand colour"
                htmlFor="primary_color"
                error={errors.primary_color?.message}
              >
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    {...form.register("primary_color")}
                  />
                  <span
                    className="size-9 shrink-0 rounded-lg border"
                    style={{ background: form.watch("primary_color") }}
                  />
                </div>
              </FormField>
              <FormField
                label="Short name"
                htmlFor="slug"
                hint="Set when the organization was created."
              >
                <Input id="slug" value={org.slug} disabled readOnly />
              </FormField>
            </div>
            <div>
              <Button type="submit" loading={pending}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Shown in the sidebar.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            organizationId={org.id}
            kind="organization"
            entityId={org.id}
            name={org.name}
            currentUrl={org.logo_url}
            onSaved={setOrganizationLogo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
