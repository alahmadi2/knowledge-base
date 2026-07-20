import { z } from "zod";

export const sectorSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(30),
  name_ar: z.string().trim().min(2).max(120),
  name_en: z.string().trim().min(2).max(120),
  is_active: z.boolean(),
});
export type SectorInput = z.infer<typeof sectorSchema>;

export const departmentSchema = z.object({
  id: z.string().uuid().optional(),
  sector_id: z.string().uuid(),
  parent_department_id: z.string().uuid().nullable(),
  level: z.enum(["administration", "department", "sub_department"]),
  code: z.string().trim().min(1).max(30),
  name_ar: z.string().trim().min(2).max(120),
  name_en: z.string().trim().min(2).max(120),
  manager_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;
