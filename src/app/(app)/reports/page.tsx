import Link from "next/link";
import { redirect } from "next/navigation";
import { FileBarChart2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type SummaryRow = {
  version_id: string;
  item_id: string;
  reference_number: string;
  title_ar: string;
  title_en: string;
  version_label: string;
  department_name_ar: string;
  department_name_en: string;
  published_at: string | null;
  targeted_count: number;
  viewed_count: number;
  confirmed_count: number;
};

export default async function ReportsPage() {
  const session = await requireUser();
  if (!session.isManager) redirect("/dashboard");
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data } = await supabase.rpc("read_confirmation_summary");
  const rows = (data ?? []) as SummaryRow[];

  const pct = (r: SummaryRow) =>
    r.targeted_count > 0 ? Math.round((r.confirmed_count / r.targeted_count) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold text-ink">{dict.reports.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{dict.reports.subtitle}</p>

      <Card className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={<FileBarChart2 className="h-8 w-8" />}
            message={dict.reports.empty}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{dict.contribute.table.title}</TH>
                <TH>{dict.reports.targeted}</TH>
                <TH>{dict.reports.viewed}</TH>
                <TH>{dict.reports.confirmed}</TH>
                <TH className="w-48">{dict.reports.completion}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => {
                const p = pct(r);
                return (
                  <TR key={r.version_id}>
                    <TD>
                      <Link
                        href={`/reports/${r.version_id}`}
                        className="font-medium text-ink hover:text-brand-muted hover:underline"
                      >
                        {locale === "ar" ? r.title_ar : r.title_en}
                      </Link>
                      <span className="ms-2 font-mono text-xs text-ink-faint" dir="ltr">
                        {r.reference_number} · v{r.version_label}
                      </span>
                    </TD>
                    <TD className="tabular-nums">{r.targeted_count}</TD>
                    <TD className="tabular-nums">{r.viewed_count}</TD>
                    <TD className="tabular-nums">{r.confirmed_count}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-page">
                          <div
                            className={
                              p >= 80
                                ? "h-full rounded-full bg-state-success"
                                : p >= 40
                                  ? "h-full rounded-full bg-brand-accent"
                                  : "h-full rounded-full bg-state-warning"
                            }
                            style={{ width: `${p}%` }}
                          />
                        </div>
                        <span className="w-10 text-end text-xs tabular-nums text-ink-soft">
                          {p}%
                        </span>
                      </div>
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
