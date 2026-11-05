"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { companySchema, type CompanyInput } from "@/lib/validations/company";
import { createCompany, updateCompany } from "@/server/actions/companies";
import { slugify } from "@/lib/utils";

export type CompanyFormValues = CompanyInput & { id?: string };

const EMPTY: CompanyInput = {
  name: "",
  slug: "",
  description: "",
  website_url: "",
  industry: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  status: "active",
};

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: CompanyFormValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(company?.id);

  const form = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    values: company ? { ...EMPTY, ...company } : EMPTY,
  });
  const errors = form.formState.errors;
  const name = form.watch("name");

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const res = editing
        ? await updateCompany(company!.id!, values)
        : await createCompany(values);
      if (!res.ok) {
        setFormError(res.error);
        Object.entries(res.fieldErrors ?? {}).forEach(([key, msgs]) =>
          form.setError(key as keyof CompanyInput, { message: msgs?.[0] }),
        );
        return;
      }
      toast.success(res.message);
      onOpenChange(false);
      form.reset();
      if (
        !editing &&
        res.data &&
        typeof res.data === "object" &&
        "id" in res.data
      ) {
        router.push(`/companies/${(res.data as { id: string }).id}`);
      } else {
        router.refresh();
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit company" : "New company"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the company profile."
              : "Add a company. You can add its logo, projects and team next."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          {formError && (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Company name"
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
              label="Short name (URL)"
              htmlFor="slug"
              error={errors.slug?.message}
              hint={
                !editing
                  ? `Defaults to “${slugify(name) || "company-name"}”`
                  : undefined
              }
            >
              <Input
                id="slug"
                placeholder={slugify(name)}
                {...form.register("slug")}
              />
            </FormField>
            <FormField
              label="Industry / category"
              htmlFor="industry"
              error={errors.industry?.message}
            >
              <Input
                id="industry"
                placeholder="e.g. Real estate"
                {...form.register("industry")}
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
                inputMode="url"
                placeholder="https://"
                {...form.register("website_url")}
                aria-invalid={!!errors.website_url}
              />
            </FormField>
          </div>
          <FormField
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={3}
              {...form.register("description")}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Contact person"
              htmlFor="contact_name"
              error={errors.contact_name?.message}
            >
              <Input id="contact_name" {...form.register("contact_name")} />
            </FormField>
            <FormField
              label="Contact email"
              htmlFor="contact_email"
              error={errors.contact_email?.message}
            >
              <Input
                id="contact_email"
                type="email"
                inputMode="email"
                {...form.register("contact_email")}
                aria-invalid={!!errors.contact_email}
              />
            </FormField>
            <FormField
              label="Contact phone"
              htmlFor="contact_phone"
              error={errors.contact_phone?.message}
            >
              <Input
                id="contact_phone"
                type="tel"
                inputMode="tel"
                {...form.register("contact_phone")}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <FormField
              label="Address"
              htmlFor="address"
              error={errors.address?.message}
            >
              <Input id="address" {...form.register("address")} />
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "Save changes" : "Create company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
