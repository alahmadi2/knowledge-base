import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { diffWords, type DiffPart } from "@/lib/diff";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

export const dynamic = "force-dynamic";

function DiffText({ parts }: { parts: DiffPart[] }) {
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-loose">
      {parts.map((p, i) =>
        p.type === "same" ? (
          <span key={i}>{p.text}</span>
        ) : p.type === "added" ? (
          <ins key={i} className="rounded bg-state-success-bg px-0.5 text-state-success no-underline">
            {p.text}
          </ins>
        ) : (
          <del key={i} className="rounded bg-state-danger-bg px-0.5 text-state-danger">
            {p.text}
          </del>
        )
      )}
    </p>
  );
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const { a, b } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("knowledge_items")
    .select("id, reference_number, current_version_id")
    .eq("id", id)
    .single();
  if (!item) notFound();

  // الافتراضي: الإصدار الحالي مقابل الذي قبله مباشرة
  let idA = a ?? null;
  let idB = b ?? item.current_version_id;
  if (!idA || !idB) {
    const { data: latest } = await supabase
      .from("knowledge_versions")
      .select("id")
      .eq("knowledge_item_id", id)
      .in("status", ["published", "superseded", "expired"])
      .order("version_major", { ascending: false })
      .order("version_minor", { ascending: false })
      .limit(2);
    if (!latest || latest.length < 2) notFound();
    idB = idB ?? latest[0].id;
    idA = idA ?? latest[1].id;
  }

  const [{ data: va }, { data: vb }] = await Promise.all([
    supabase.from("knowledge_versions").select("*").eq("id", idA).eq("knowledge_item_id", id).single(),
    supabase.from("knowledge_versions").select("*").eq("id", idB).eq("knowledge_item_id", id).single(),
  ]);
  if (!va || !vb) notFound();

  const pick = (v: typeof va, ar: string, en: string) =>
    (locale === "ar" ? v[ar] : v[en]) as string;

  const metaRows: { label: string; a: string; b: string }[] = [
    {
      label: dict.contribute.fields.importance,
      a: dict.knowledge.importance[va.importance as keyof Dictionary["knowledge"]["importance"]],
      b: dict.knowledge.importance[vb.importance as keyof Dictionary["knowledge"]["importance"]],
    },
    {
      label: dict.contribute.fields.confidentiality,
      a: dict.contribute.confidentiality[va.confidentiality as keyof Dictionary["contribute"]["confidentiality"]],
      b: dict.contribute.confidentiality[vb.confidentiality as keyof Dictionary["contribute"]["confidentiality"]],
    },
    {
      label: dict.contribute.fields.audience,
      a: dict.contribute.audience[va.audience as keyof Dictionary["contribute"]["audience"]],
      b: dict.contribute.audience[vb.audience as keyof Dictionary["contribute"]["audience"]],
    },
    {
      label: dict.contribute.fields.tags,
      a: (va.tags ?? []).join("، ") || dict.common.none,
      b: (vb.tags ?? []).join("، ") || dict.common.none,
    },
  ];

  const textBlocks = [
    { label: dict.contribute.table.title, a: pick(va, "title_ar", "title_en"), b: pick(vb, "title_ar", "title_en") },
    { label: locale === "ar" ? "الملخص" : "Summary", a: pick(va, "summary_ar", "summary_en"), b: pick(vb, "summary_ar", "summary_en") },
    { label: dict.contribute.sections.content, a: pick(va, "content_ar", "content_en"), b: pick(vb, "content_ar", "content_en") },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink">{dict.compare.title}</h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
          <span className="font-mono text-xs" dir="ltr">{item.reference_number}</span>
          <Badge tone="danger">v{va.version_label}</Badge>
          <span>←</span>
          <Badge tone="success">v{vb.version_label}</Badge>
        </p>
      </div>

      {vb.update_reason && (
        <Card className="p-4 text-sm">
          <span className="font-medium">{dict.knowledge.updateReason}:</span>{" "}
          <span className="text-ink-soft">{vb.update_reason}</span>
          {vb.change_summary && (
            <>
              <br />
              <span className="font-medium">{dict.knowledge.changeSummary}:</span>{" "}
              <span className="text-ink-soft">{vb.change_summary}</span>
            </>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">{dict.compare.metadata}</h2>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-surface-line">
            {metaRows.map((r) => {
              const changed = r.a !== r.b;
              return (
                <tr key={r.label}>
                  <td className="py-2 pe-3 text-xs text-ink-faint">{r.label}</td>
                  <td className="py-2 pe-3">
                    {changed ? <del className="rounded bg-state-danger-bg px-1 text-state-danger">{r.a}</del> : <span className="text-ink-soft">{r.a}</span>}
                  </td>
                  <td className="py-2">
                    {changed ? <ins className="rounded bg-state-success-bg px-1 text-state-success no-underline">{r.b}</ins> : <span className="text-ink-soft">{dict.compare.unchanged}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {textBlocks.map((blk) => (
        <Card key={blk.label} className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">{blk.label}</h2>
          {blk.a === blk.b ? (
            <p className="text-sm text-ink-faint">{dict.compare.unchanged}</p>
          ) : (
            <div dir={locale === "ar" ? "rtl" : "ltr"}>
              <DiffText parts={diffWords(blk.a, blk.b)} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
