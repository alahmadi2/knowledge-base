import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, RoleCode, SessionUser } from "@/types/db";

// جلب المستخدم الحالي + ملفه + أدواره — مرة واحدة لكل طلب
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roleRows }, { data: managedDepts }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("user_roles")
        .select("department_id, roles(code)")
        .eq("user_id", user.id),
      supabase.from("departments").select("id").eq("manager_id", user.id),
    ]);

  if (!profile) return null;

  const roles = (roleRows ?? [])
    .map((r) => (r.roles as unknown as { code: RoleCode } | null)?.code)
    .filter(Boolean) as RoleCode[];

  const managedFromRoles = (roleRows ?? [])
    .filter(
      (r) =>
        (r.roles as unknown as { code: RoleCode } | null)?.code ===
          "department_manager" && r.department_id
    )
    .map((r) => r.department_id as string);

  const managedDepartmentIds = Array.from(
    new Set([...(managedDepts ?? []).map((d) => d.id), ...managedFromRoles])
  );

  const isSuperAdmin = roles.includes("super_admin");
  return {
    profile: profile as Profile,
    roles,
    managedDepartmentIds,
    isSuperAdmin,
    isManager: isSuperAdmin || managedDepartmentIds.length > 0,
    isContributor:
      isSuperAdmin ||
      roles.includes("content_contributor") ||
      roles.includes("department_manager"),
  };
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.profile.account_status !== "active") redirect("/login?disabled=1");
  return session;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (!session.isSuperAdmin) redirect("/dashboard");
  return session;
}
