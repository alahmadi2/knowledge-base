"use server";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserSchema, updateUserSchema } from "@/schemas/users";
import type { RoleCode } from "@/types/db";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: "validation" | "email_exists" | "db" };

async function syncRoles(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  roles: RoleCode[],
  managerDeptId: string | null,
  assignedBy: string
) {
  // مزامنة كاملة: حذف الحالي ثم إدراج الجديد (عملية إدارية عبر Service Role)
  await admin.from("user_roles").delete().eq("user_id", userId);
  const { data: roleRows } = await admin
    .from("roles")
    .select("id, code")
    .in("code", roles);
  const inserts = (roleRows ?? []).map((r) => ({
    user_id: userId,
    role_id: r.id,
    department_id: r.code === "department_manager" ? managerDeptId : null,
    assigned_by: assignedBy,
  }));
  if (inserts.length) await admin.from("user_roles").insert(inserts);
}

export async function createUser(input: unknown): Promise<ActionResult> {
  const session = await requireSuperAdmin();
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;
  if (d.roles.includes("department_manager") && !d.manager_department_id)
    return { ok: false, error: "validation" };

  const admin = createAdminClient();

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    return {
      ok: false,
      error: authErr?.message.toLowerCase().includes("already")
        ? "email_exists"
        : "db",
    };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name_ar: d.full_name_ar,
    full_name_en: d.full_name_en,
    email: d.email,
    phone: d.phone || null,
    employee_number: d.employee_number || null,
    department_id: d.department_id,
    preferred_language: d.preferred_language,
    created_by: session.profile.id,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      ok: false,
      error: profileErr.code === "23505" ? "email_exists" : "db",
    };
  }

  await syncRoles(
    admin,
    created.user.id,
    d.roles,
    d.manager_department_id,
    session.profile.id
  );

  await admin.from("audit_logs").insert({
    user_id: session.profile.id,
    action: "user.created",
    entity_type: "profile",
    entity_id: created.user.id,
    new_data: { email: d.email, roles: d.roles },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(input: unknown): Promise<ActionResult> {
  const session = await requireSuperAdmin();
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;
  if (d.roles.includes("department_manager") && !d.manager_department_id)
    return { ok: false, error: "validation" };

  const admin = createAdminClient();

  const { data: before } = await admin
    .from("profiles")
    .select("account_status, department_id")
    .eq("id", d.id)
    .single();

  const { error } = await admin
    .from("profiles")
    .update({
      full_name_ar: d.full_name_ar,
      full_name_en: d.full_name_en,
      phone: d.phone || null,
      employee_number: d.employee_number || null,
      department_id: d.department_id,
      preferred_language: d.preferred_language,
      account_status: d.account_status,
      updated_by: session.profile.id,
    })
    .eq("id", d.id);
  if (error) return { ok: false, error: "db" };

  await syncRoles(admin, d.id, d.roles, d.manager_department_id, session.profile.id);

  // إيقاف الحساب يُنهي الجلسات فوراً
  if (d.account_status === "disabled" && before?.account_status === "active") {
    await admin.auth.admin.signOut(d.id, "global").catch(() => {});
  }

  await admin.from("audit_logs").insert({
    user_id: session.profile.id,
    action: "user.updated",
    entity_type: "profile",
    entity_id: d.id,
    old_data: before ?? undefined,
    new_data: { roles: d.roles, account_status: d.account_status },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
