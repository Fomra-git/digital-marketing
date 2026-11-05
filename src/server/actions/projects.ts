"use server";

import { revalidatePath } from "next/cache";
import { getActionContext } from "@/lib/auth/context";
import { P } from "@/lib/permissions";
import {
  dbFailure,
  failure,
  success,
  validationFailure,
  type ActionResult,
} from "@/lib/actions";
import {
  projectSchema,
  projectSettingsSchema,
  type ProjectInput,
  type ProjectSettingsInput,
} from "@/lib/validations/project";
import { nullable, slugify } from "@/lib/utils";

const SESSION_EXPIRED = "Your session has expired. Please sign in again.";

function toRow(input: ReturnType<typeof projectSchema.parse>) {
  return {
    name: input.name,
    slug: input.slug || slugify(input.name),
    description: nullable(input.description),
    website_url: nullable(input.website_url),
    category: nullable(input.category),
    start_date: nullable(input.start_date),
    end_date: nullable(input.end_date),
    status: input.status,
    manager_id: nullable(input.manager_id),
  };
}

export async function createProject(
  input: ProjectInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const companyId = parsed.data.company_id;
  if (!ctx.can(P.projectsCreate, { companyId }))
    return failure(
      "You do not have permission to create projects for this company.",
    );

  const row = { ...toRow(parsed.data), company_id: companyId };
  let { data, error } = await ctx.supabase
    .from("projects")
    .insert(row)
    .select("id")
    .single();
  if (error?.code === "23505" && !parsed.data.slug) {
    ({ data, error } = await ctx.supabase
      .from("projects")
      .insert({
        ...row,
        slug: `${row.slug}-${crypto.randomUUID().slice(0, 4)}`,
      })
      .select("id")
      .single());
  }
  if (error || !data)
    return error
      ? dbFailure(error, "create project")
      : failure("Could not create the project.");

  revalidatePath("/", "layout");
  return success({ id: data.id }, `${row.name} created.`);
}

export async function updateProject(
  projectId: string,
  input: ProjectInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const project = ctx.projects.find((p) => p.id === projectId);
  if (!project)
    return failure(
      "The project was not found or you no longer have access to it.",
    );
  if (!ctx.can(P.projectsEdit, { companyId: project.company_id, projectId })) {
    return failure("You do not have permission to edit this project.");
  }

  // company_id is immutable (enforced in the database too)
  const { data, error } = await ctx.supabase
    .from("projects")
    .update(toRow(parsed.data))
    .eq("id", projectId)
    .select("id");
  if (error) return dbFailure(error, "update project");
  if (!data?.length)
    return failure("You do not have permission to edit this project.");

  revalidatePath("/", "layout");
  return success(undefined, "Project saved.");
}

export async function setProjectImage(
  projectId: string,
  imageUrl: string | null,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const project = ctx.projects.find((p) => p.id === projectId);
  if (!project) return failure("Project not found.");
  if (
    !ctx.can(P.projectsEdit, { companyId: project.company_id, projectId }) &&
    !ctx.can(P.projectsCreate, { companyId: project.company_id })
  ) {
    return failure("You do not have permission to change this image.");
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (
    imageUrl &&
    !imageUrl.startsWith(
      `${base}/storage/v1/object/public/branding/${ctx.organization.id}/projects/${projectId}/`,
    )
  ) {
    return failure("Invalid image location.");
  }
  const { error } = await ctx.supabase
    .from("projects")
    .update({ image_url: imageUrl })
    .eq("id", projectId);
  if (error) return dbFailure(error, "set project image");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return success(undefined, "Image updated.");
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const project = ctx.projects.find((p) => p.id === projectId);
  if (!project) return failure("Project not found.");
  if (
    !ctx.can(P.projectsDelete, { companyId: project.company_id, projectId })
  ) {
    return failure("You do not have permission to delete this project.");
  }
  const { data, error } = await ctx.supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString(), status: "archived" })
    .eq("id", projectId)
    .select("id");
  if (error) return dbFailure(error, "delete project");
  if (!data?.length)
    return failure("You do not have permission to delete this project.");
  revalidatePath("/", "layout");
  return success(undefined, "Project deleted.");
}

const triState = (v: "inherit" | "yes" | "no") =>
  v === "inherit" ? null : v === "yes";

export async function updateProjectSettings(
  projectId: string,
  input: ProjectSettingsInput,
): Promise<ActionResult> {
  const ctx = await getActionContext();
  if (!ctx) return failure(SESSION_EXPIRED);
  const project = ctx.projects.find((p) => p.id === projectId);
  if (!project) return failure("Project not found.");
  if (!ctx.can(P.projectsEdit, { companyId: project.company_id, projectId }))
    return failure("You do not have permission to change these settings.");
  const parsed = projectSettingsSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const { data, error } = await ctx.supabase
    .from("project_settings")
    .update({
      social_approval_required: triState(parsed.data.social_approval_required),
      creative_approval_required: triState(
        parsed.data.creative_approval_required,
      ),
      monthly_ad_budget:
        parsed.data.monthly_ad_budget === ""
          ? null
          : Number(parsed.data.monthly_ad_budget),
      target_cpl:
        parsed.data.target_cpl === "" ? null : Number(parsed.data.target_cpl),
      updated_by: ctx.user.id,
    })
    .eq("project_id", projectId)
    .select("project_id");
  if (error) return dbFailure(error, "update project settings");
  if (!data?.length)
    return failure("You do not have permission to change these settings.");
  revalidatePath(`/projects/${projectId}`);
  return success(undefined, "Settings saved.");
}
