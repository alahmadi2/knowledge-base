import { z } from "zod";

export const knowledgeDraftSchema = z.object({
  department_id: z.string().uuid(),
  type_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  title_ar: z.string().trim().min(3).max(200),
  title_en: z.string().trim().min(3).max(200),
  summary_ar: z.string().trim().min(3).max(500),
  summary_en: z.string().trim().min(3).max(500),
  content_ar: z.string().trim().min(3),
  content_en: z.string().trim().min(3),
  tags: z.array(z.string().trim().min(1)).max(20),
  importance: z.enum(["normal", "important", "urgent"]),
  confidentiality: z.enum([
    "all_employees",
    "specific_department",
    "multiple_departments",
    "managers_only",
    "specific_users",
    "confidential",
    "top_secret",
  ]),
  audience: z.enum([
    "all_employees",
    "sector",
    "administration",
    "department",
    "multiple_departments",
    "roles",
    "specific_users",
  ]),
  target_department_ids: z.array(z.string().uuid()),
  target_sector_ids: z.array(z.string().uuid()),
  target_role_ids: z.array(z.string().uuid()),
  target_user_ids: z.array(z.string().uuid()),
  display_duration_days: z.coerce.number().int().min(1).max(10),
  expiry_date: z.string().nullable(),
  requires_read_confirmation: z.boolean(),
  send_in_app_notification: z.boolean(),
  send_whatsapp: z.boolean(),
  allow_download: z.boolean(),
  allow_print: z.boolean(),
})
.superRefine((d, ctx) => {
  const needsDepts = ["sector", "administration", "department", "multiple_departments"].includes(d.audience);
  if (d.audience === "sector" && d.target_sector_ids.length === 0)
    ctx.addIssue({ code: "custom", path: ["target_sector_ids"], message: "required" });
  if (needsDepts && d.audience !== "sector" && d.target_department_ids.length === 0)
    ctx.addIssue({ code: "custom", path: ["target_department_ids"], message: "required" });
  if (d.audience === "roles" && d.target_role_ids.length === 0)
    ctx.addIssue({ code: "custom", path: ["target_role_ids"], message: "required" });
  const needsUsers = d.audience === "specific_users" ||
    d.confidentiality === "specific_users" || d.confidentiality === "top_secret";
  if (needsUsers && d.target_user_ids.length === 0)
    ctx.addIssue({ code: "custom", path: ["target_user_ids"], message: "required" });
});

export type KnowledgeDraftInput = z.infer<typeof knowledgeDraftSchema>;
