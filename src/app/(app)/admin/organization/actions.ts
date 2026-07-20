"use server";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sectorSchema, departmentSchema } from "@/schemas/org";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveSector(input: unknown): Promise<ActionResult> {
  const session = await requireSuperAdmin();
  const parsed = sectorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const supabase = await createClient();
  const { id, ...data } = parsed.data;

  const { error } = id
    ? await supabase
        .from("sectors")
        .update({ ...data, updated_by: session.profile.id })
        .eq("id", id)
    : await supabase
        .from("sectors")
        .insert({ ...data, created_by: session.profile.id });

  if (error) return { ok: false, error: error.code === "23505" ? "duplicate" : "db" };
  revalidatePath("/admin/organization");
  return { ok: true };
}

export async function saveDepartment(input: unknown): Promise<ActionResult> {
  const session = await requireSuperAdmin();
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const supabase = await createClient();
  const { id, ...data } = parsed.data;

  // اتساق المستوى مع الوحدة الأم (نفس قيد قاعدة البيانات)
  if (data.level === "administration" && data.parent_department_id) {
    return { ok: false, error: "validation" };
  }
  if (data.level === "sub_department" && !data.parent_department_id) {
    return { ok: false, error: "validation" };
  }

  const { error } = id
    ? await supabase
        .from("departments")
        .update({ ...data, updated_by: session.profile.id })
        .eq("id", id)
    : await supabase
        .from("departments")
        .insert({ ...data, created_by: session.profile.id });

  if (error) return { ok: false, error: error.code === "23505" ? "duplicate" : "db" };
  revalidatePath("/admin/organization");
  return { ok: true };
}
