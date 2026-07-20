import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KnowledgeBadges } from "@/features/knowledge/badges";

export const dynamic = "force-dynamic";

type ListRow = {
  item_id: string;
  version_id: string;
  reference_number: string;
  title: string;
  summary: string;
  version_label: string;
  published_at: string | null;
  importance: string;
  is_first_version: boolean;
  display_duration_days: number;
  type_name: string | null;
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  await requireUser();
  const { q, type } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data: types } = await supabase
    .from("knowledge_types")
    .select("id, name_ar, name_en")
    .eq("is_active", true)
    .order("display_order");

  let rows: ListRow[] = [];

  if (q?.trim()) {
    // بحث موحد يحترم الصلاحيات (RPC مع تطبيع الحروف العربية)
    const { data } = await supabase.rpc("search_knowledge", {
      p_query: q.trim(),
      p_limit: 30,
    });
    rows = (data ?? []).map((r: Record<string, unknown>) => ({
      item_id: r.item_id as string,
      version_id: r.version_id as string,
      reference_number: r.reference_number as string,
      title: (locale === "ar" ? r.title_ar : r.title_en) as string,
      summary: (locale === "ar" ? r.summary_ar : r.summary_en) as string,
      version_label: r.version_label as string,
      published_at: r.published_at as string | null,
      importance: "normal",
      is_first_version: true,
      display_duration_days: 0,
      type_name: null,
    }));
  } else {
    let query = supabase
      .from("knowledge_items")
      .select(
        `id, reference_number, type_id,
         knowledge_types(name_ar, name_en),
         current:knowledge_versions!fk_items_current_version(
           id, title_ar, title_en, summary_ar, summary_en, version_label,
           published_at, importance, is_first_version, display_duration_days, status
         )`
      )
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (type) query = query.eq("type_id", type);
    const { data } = await query;

    rows = (data ?? [])
      .map((it) => {
        const cur = it.current as unknown as {
          id: string; title_ar: string; title_en: string;
          summary_ar: string; summary_en: string; version_label: string;
          published_at: string | null; importance: string;
          is_first_version: boolean; display_duration_days: number; status: string;
        } | null;
        if (!cur || cur.status !== "published") return null;
        const t = it.knowledge_types as unknown as { name_ar: string; name_en: string } | null;
        return {
          item_id: it.id,
          version_id: cur.id,
          reference_number: it.reference_number,
          title: locale === "ar" ? cur.title_ar : cur.title_en,
          summary: locale === "ar" ? cur.summary_ar : cur.summary_en,
          version_label: cur.version_label,
          published_at: cur.published_at,
          importance: cur.importance,
          is_first_version: cur.is_first_version,
          display_duration_days: cur.display_duration_days,
          type_name: t ? (locale === "ar" ? t.name_ar : t.name_en) : null,
        };
      })
      .filter(Boolean) as ListRow[];
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold text-ink">{dict.knowledge.bank}</h1>

      <form action="/knowledge" className="mt-4 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-ink-faint" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={dict.knowledge.searchPlaceholder}
            className="h-10 w-full rounded-md border border-surface-line bg-white ps-9 pe-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
          />
        </div>
        <select
          name="type"
          defaultValue={type ?? ""}
          className="h-10 rounded-md border border-surface-line bg-white px-3 text-sm"
        >
          <option value="">{dict.knowledge.allTypes}</option>
          {(types ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {locale === "ar" ? t.name_ar : t.name_en}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-soft">
          {dict.common.search}
        </button>
      </form>

      {q?.trim() && (
        <p className="mt-4 text-sm text-ink-soft">
          {dict.knowledge.searchResults}: <span className="font-medium text-ink">{q}</span>
        </p>
      )}

      {rows.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon={<BookOpen className="h-8 w-8" />}
            message={q?.trim() ? dict.knowledge.noResults : dict.knowledge.noItems}
          />
        </Card>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.item_id}>
              <Link href={`/knowledge/${r.item_id}`}>
                <Card className="p-4 transition-colors hover:border-brand-accent">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-ink-faint" dir="ltr">
                      {r.reference_number}
                    </span>
                    {r.type_name && <Badge tone="neutral">{r.type_name}</Badge>}
                    <KnowledgeBadges
                      dict={dict}
                      importance={r.importance}
                      isFirstVersion={r.is_first_version}
                      publishedAt={r.published_at}
                      displayDays={r.display_duration_days}
                    />
                    <span className="ms-auto font-mono text-xs text-ink-faint" dir="ltr">
                      v{r.version_label}
                    </span>
                  </div>
                  <h2 className="mt-2 font-semibold text-ink">{r.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {r.summary}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
