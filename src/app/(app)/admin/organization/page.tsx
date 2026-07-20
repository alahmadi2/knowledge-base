import { requireSuperAdmin } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { OrgManager } from "@/features/org/org-manager";
import type { Department, Profile, Sector } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function OrganizationPage() {
  await requireSuperAdmin();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const [{ data: sectors }, { data: departments }, { data: managers }] =
    await Promise.all([
      supabase.from("sectors").select("*").order("display_order").order("code"),
      supabase.from("departments").select("*").order("display_order").order("code"),
      supabase
        .from("profiles")
        .select("id, full_name_ar, full_name_en, email")
        .eq("account_status", "active")
        .order("full_name_ar"),
    ]);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-xl font-bold text-ink">{dict.org.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{dict.org.subtitle}</p>
      <div className="mt-6">
        <OrgManager
          dict={dict}
          locale={locale}
          sectors={(sectors ?? []) as Sector[]}
          departments={(departments ?? []) as Department[]}
          managers={(managers ?? []) as Pick<Profile, "id" | "full_name_ar" | "full_name_en" | "email">[]}
        />
      </div>
    </div>
  );
}
