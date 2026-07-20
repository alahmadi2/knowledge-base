import { requireSuperAdmin } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { UsersManager, type UserRow } from "@/features/users/users-manager";
import type { Department, RoleCode } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireSuperAdmin();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const [{ data: profiles }, { data: userRoles }, { data: departments }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("full_name_ar"),
      supabase.from("user_roles").select("user_id, department_id, roles(code)"),
      supabase.from("departments").select("*").eq("is_active", true).order("code"),
    ]);

  const rolesByUser = new Map<string, { code: RoleCode; department_id: string | null }[]>();
  for (const r of userRoles ?? []) {
    const code = (r.roles as unknown as { code: RoleCode } | null)?.code;
    if (!code) continue;
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push({ code, department_id: r.department_id });
    rolesByUser.set(r.user_id, list);
  }

  const rows: UserRow[] = (profiles ?? []).map((p) => ({
    profile: p,
    roles: rolesByUser.get(p.id) ?? [],
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-xl font-bold text-ink">{dict.users.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{dict.users.subtitle}</p>
      <div className="mt-6">
        <UsersManager
          dict={dict}
          locale={locale}
          rows={rows}
          departments={(departments ?? []) as Department[]}
        />
      </div>
    </div>
  );
}
