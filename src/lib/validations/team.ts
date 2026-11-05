import { z } from "zod";
import { hexColor, id, optionalId, optionalText } from "./common";

export const inviteMemberSchema = z
  .object({
    email: z.email("Enter a valid email address").trim().toLowerCase(),
    full_name: z.string().trim().min(2, "Name is required").max(120),
    job_title: optionalText(120),
    department_id: optionalId,
    role_id: optionalId,
    company_id: optionalId,
    project_id: optionalId,
  })
  .refine((v) => !v.project_id || v.company_id, {
    message: "Choose the company first",
    path: ["project_id"],
  });
export type InviteMemberInput = z.input<typeof inviteMemberSchema>;

export const assignRoleSchema = z
  .object({
    user_id: id,
    role_id: id,
    company_id: optionalId,
    project_id: optionalId,
  })
  .refine((v) => !v.project_id || v.company_id, {
    message: "Choose the company first",
    path: ["project_id"],
  });
export type AssignRoleInput = z.input<typeof assignRoleSchema>;

export const memberUpdateSchema = z.object({
  department_id: optionalId,
  reports_to: optionalId,
});
export type MemberUpdateInput = z.input<typeof memberUpdateSchema>;

export const roleSchema = z.object({
  name: z.string().trim().min(2, "Role name is required").max(80),
  description: optionalText(300),
  color: hexColor,
  copy_from_role_id: optionalId,
});
export type RoleInput = z.input<typeof roleSchema>;

export const rolePermissionsSchema = z.object({
  role_id: id,
  permission_keys: z.array(z.string().regex(/^[a-z_]+\.[a-z_]+$/)).max(200),
});

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Department name is required").max(80),
  description: optionalText(300),
  color: hexColor,
  head_user_id: optionalId,
  is_active: z.boolean(),
});
export type DepartmentInput = z.input<typeof departmentSchema>;

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Your name is required").max(120),
  job_title: optionalText(120),
  phone: optionalText(40),
  timezone: z.string().trim().min(1).max(64),
});
export type ProfileInput = z.input<typeof profileSchema>;
