import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

export const dynamic = "force-dynamic";

type StatusKey = keyof Dictionary["knowledge"]["status"];
const statusTone: Record<StatusKey, "neutral" | "warning" | "danger" | "success" | "info" | "accent"> = {
  draft: "neutral",
  pending_approval: "warning",
  returned_for_revision: "warning",
  rejected: "danger",
  approved: "info",
  published: "success",
  expired: "danger",
  archived: "neutral",
  superseded: "neutral",
};

export default async function ContributePage() {
  const session = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data: versions } = await supabase
    .from("knowledge_versions")
    .select("id, knowledge_item_id, title_ar, title_en, version_label, status, updated_at, knowledge_items(reference_number)")
    .eq("created_by", session.profile.id)
    .order("updated_at", { ascending: false });

  const rows = versions ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">{dict.contribute.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{dict.contribute.subtitle}</p>
        </div>
        <Link
          href="/contribute/new"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white hover:bg-brand-soft"
        >
          <Plus className="h-4 w-4" />
          {dict.contribute.addNew}
        </Link>
      </div>

      <Card className="mt-6">
        {rows.length === 0 ? (
          <EmptyState message={dict.contribute.noContent} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{dict.contribute.table.title}</TH>
                <TH>{dict.knowledge.reference}</TH>
                <TH>{dict.contribute.table.version}</TH>
                <TH>{dict.contribute.table.status}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((v) => {
                const ref = (v.knowledge_items as unknown as { reference_number: string } | null)?.reference_number;
                const status = v.status as StatusKey;
                const editable = status === "draft" || status === "returned_for_revision";
                const href = editable
                  ? `/contribute/${v.id}/edit`
                  : `/knowledge/${v.knowledge_item_id}?v=${v.id}`;
                return (
                  <TR key={v.id}>
                    <TD>
                      <Link href={href} className="font-medium text-ink hover:text-brand-muted hover:underline">
                        {locale === "ar" ? v.title_ar : v.title_en}
                      </Link>
                    </TD>
                    <TD dir="ltr" className="font-mono text-xs text-ink-soft">{ref}</TD>
                    <TD dir="ltr" className="font-mono text-xs">{v.version_label}</TD>
                    <TD>
                      <Badge tone={statusTone[status]}>{dict.knowledge.status[status]}</Badge>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
