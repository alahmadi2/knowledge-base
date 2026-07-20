import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  question: string;
  status: "new" | "under_review" | "answered" | "closed";
  is_private: boolean;
  created_at: string;
  requester: { full_name_ar: string; full_name_en: string } | null;
  knowledge_items: { reference_number: string } | null;
  version: { title_ar: string; title_en: string } | null;
};

const tone: Record<Row["status"], "info" | "warning" | "success" | "neutral"> = {
  new: "info",
  under_review: "warning",
  answered: "success",
  closed: "neutral",
};

export default async function ClarificationsPage() {
  await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  // RLS يعرض: طلباتي + المسند إليّ + طلبات قسمي (للمدير) + الكل (للمشرف)
  const { data } = await supabase
    .from("clarification_requests")
    .select(
      `id, question, status, is_private, created_at,
       requester:profiles!clarification_requests_requested_by_fkey(full_name_ar, full_name_en),
       knowledge_items(reference_number),
       version:knowledge_versions(title_ar, title_en)`
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-bold text-ink">{dict.clarifications.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{dict.clarifications.subtitle}</p>

      <Card className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={<MessageCircleQuestion className="h-8 w-8" />}
            message={dict.clarifications.empty}
          />
        ) : (
          <ul className="divide-y divide-surface-line">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/clarifications/${r.id}`}
                  className="block px-4 py-3 hover:bg-surface-page/60"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tone[r.status]}>
                      {dict.clarifications.status[r.status]}
                    </Badge>
                    <span className="text-xs text-ink-faint">
                      {dict.clarifications.about}:{" "}
                      {r.version
                        ? locale === "ar"
                          ? r.version.title_ar
                          : r.version.title_en
                        : dict.common.none}
                    </span>
                    <span className="ms-auto text-xs text-ink-faint">
                      {new Date(r.created_at).toLocaleDateString(
                        locale === "ar" ? "ar-SA" : "en-GB",
                        { dateStyle: "medium" }
                      )}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink">{r.question}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {dict.clarifications.by}:{" "}
                    {r.requester
                      ? locale === "ar"
                        ? r.requester.full_name_ar
                        : r.requester.full_name_en
                      : dict.common.none}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
