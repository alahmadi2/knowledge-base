import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/types/db";
import type { Option, UserOption } from "./knowledge-form";

// خيارات النموذج: الأقسام المتاحة للمضيف حسب صلاحياته + المراجع
export async function loadFormOptions(session: SessionUser) {
  const supabase = await createClient();
  const [deptsRes, sectorsRes, typesRes, catsRes, rolesRes, usersRes] =
    await Promise.all([
      supabase.from("departments").select("id, name_ar, name_en").eq("is_active", true).order("code"),
      supabase.from("sectors").select("id, name_ar, name_en").eq("is_active", true).order("code"),
      supabase.from("knowledge_types").select("id, name_ar, name_en").eq("is_active", true).order("display_order"),
      supabase.from("knowledge_categories").select("id, name_ar, name_en").eq("is_active", true).order("display_order"),
      supabase.from("roles").select("id, name_ar, name_en"),
      supabase.from("profiles").select("id, full_name_ar, full_name_en, email").eq("account_status", "active").order("full_name_ar"),
    ]);

  let departments = (deptsRes.data ?? []) as Option[];
  if (!session.isSuperAdmin) {
    const myDeptIds = new Set(
      [session.profile.department_id, ...session.managedDepartmentIds].filter(Boolean) as string[]
    );
    departments = departments.filter((d) => myDeptIds.has(d.id));
  }

  return {
    departments,
    sectors: (sectorsRes.data ?? []) as Option[],
    types: (typesRes.data ?? []) as Option[],
    categories: (catsRes.data ?? []) as Option[],
    roles: (rolesRes.data ?? []) as Option[],
    users: (usersRes.data ?? []) as UserOption[],
  };
}
