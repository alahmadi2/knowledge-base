import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Building2, Network, Users, FileCheck2 } from "lucide-react";
import { WhatsNew, type WhatsNewItem } from "@/features/knowledge/whats-new";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const since = new Date(Date.now() - 10 * 86400_000).toISOString();
  const [sectors, departments, users, published, recentRes] = await Promise.all([
    supabase.from("sectors").select("id", { count: "exact", head: true }),
    supabase.from("departments").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_status", "active"),
    supabase
      .from("knowledge_versions")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("knowledge_versions")
      .select(
        `knowledge_item_id, title_ar, title_en, summary_ar, summary_en, version_label,
         importance, is_first_version, published_at, display_duration_days,
         knowledge_items!inner(is_archived, knowledge_types(name_ar, name_en))`
      )
      .eq("status", "published")
      .eq("knowledge_items.is_archived", false)
      .gte("published_at", since)
      .order("published_at", { ascending: false })
      .limit(30),
  ]);

  // ضمن مدة الظهور المحددة من المضيف فقط، والعاجل أولاً
  const whatsNewItems: WhatsNewItem[] = (recentRes.data ?? [])
    .filter((v) => {
      if (!v.published_at) return false;
      return (
        Date.now() - new Date(v.published_at).getTime() <
        v.display_duration_days * 86400_000
      );
    })
    .sort((a, b) =>
      a.importance === b.importance ? 0 : a.importance === "urgent" ? -1 : b.importance === "urgent" ? 1 : 0
    )
    .slice(0, 8)
    .map((v) => {
      const t = (v.knowledge_items as unknown as { knowledge_types: { name_ar: string; name_en: string } | null } | null)?.knowledge_types;
      return {
        item_id: v.knowledge_item_id,
        title: locale === "ar" ? v.title_ar : v.title_en,
        summary: locale === "ar" ? v.summary_ar : v.summary_en,
        type_name: t ? (locale === "ar" ? t.name_ar : t.name_en) : null,
        importance: v.importance,
        is_first_version: v.is_first_version,
        version_label: v.version_label,
      };
    });

  const name =
    locale === "ar" ? session.profile.full_name_ar : session.profile.full_name_en;

  const stats = [
    { label: dict.dashboard.stats.sectors, value: sectors.count ?? 0, icon: Building2 },
    { label: dict.dashboard.stats.departments, value: departments.count ?? 0, icon: Network },
    { label: dict.dashboard.stats.users, value: users.count ?? 0, icon: Users },
    { label: dict.dashboard.stats.published, value: published.count ?? 0, icon: FileCheck2 },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-xl font-bold text-ink">
        {dict.dashboard.greeting}، {name}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">{dict.dashboard.subtitle}</p>

      {whatsNewItems.length > 0 && (
        <div className="mt-6">
          <WhatsNew dict={dict} locale={locale} items={whatsNewItems} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-soft">{s.label}</p>
              <s.icon className="h-4 w-4 text-brand-muted" />
            </div>
            <p className="mt-2 text-2xl font-bold text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-dashed p-5">
        <p className="text-sm leading-relaxed text-ink-soft">
          {dict.dashboard.nextPhases}
        </p>
      </Card>
    </div>
  );
}
