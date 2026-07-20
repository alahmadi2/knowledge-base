import { z } from "zod";

const base = {
  full_name_ar: z.string().trim().min(2).max(120),
  full_name_en: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/)
    .optional()
    .or(z.literal("")),
  employee_number: z.string().trim().max(30).optional().or(z.literal("")),
  department_id: z.string().uuid().nullable(),
  preferred_language: z.enum(["ar", "en"]),
  roles: z
    .array(z.enum(["super_admin", "department_manager", "content_contributor", "employee"]))
    .min(1),
  manager_department_id: z.string().uuid().nullable(),
};

export const createUserSchema = z.object({
  ...base,
  password: z.string().min(8).max(72),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  ...base,
  id: z.string().uuid(),
  account_status: z.enum(["active", "disabled"]),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
