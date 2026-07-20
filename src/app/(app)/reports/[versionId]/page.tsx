import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Eye, MinusCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ExportCsvButton, type ReportRow } from "./export-csv";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ versionId: string }>;
}) {
  const session = await requireUser();
  if (!session.isManager) redirect("/dashboard");
  const { versionId } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const [{ data: version }, { data: report, error }] = await Promise.all([
    supabase
      .from("knowledge_versions")
      .select("title_ar, title_en, version_label, knowledge_items(reference_number)")
      .eq("id", versionId)
      .single(),
    supabase.rpc("read_confirmation_report", { p_version_id: versionId }),
  ]);
  if (!version || error) notFound();

  const rows = (report ?? []) as ReportRow[];
  const confirmed = rows.filter((r) => r.confirmed).length;
  const viewed = rows.filter((r) => r.viewed).length;
  const ref = (version.knowledge_items as unknown as { reference_number: string } | null)
    ?.reference_number;
  const title = locale === "ar" ? version.title_ar : version.title_en;

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">{dict.reports.detailTitle}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {title}
            <span className="ms-2 font-mono text-xs text-ink-faint" dir="ltr">
              {ref} · v{version.version_label}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/reports/${versionId}/export`}
            className="inline-flex h-8 items-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-soft"
          >
            {dict.reports.exportXlsx}
          </a>
          <ExportCsvButton
            dict={dict}
            locale={locale}
            rows={rows}
            fileName={`read-report-${ref ?? versionId}`}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-ink-soft">{dict.reports.targeted}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-soft">{dict.reports.viewed}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{viewed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-soft">{dict.reports.confirmed}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-state-success">
            {confirmed}
            <span className="ms-1 text-sm font-normal text-ink-faint">
              / {rows.length}
            </span>
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <Table>
          <THead>
            <TR>
              <TH>{dict.reports.table.employee}</TH>
              <TH>{dict.reports.table.department}</TH>
              <TH>{dict.reports.table.viewed}</TH>
              <TH>{dict.reports.table.confirmed}</TH>
              <TH>{dict.reports.table.confirmedAt}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.user_id}>
                <TD>
                  <span className="font-medium">
                    {locale === "ar" ? r.full_name_ar : r.full_name_en}
                  </span>
                  <span className="ms-2 text-xs text-ink-faint" dir="ltr">
                    {r.email}
                  </span>
                </TD>
                <TD className="text-sm text-ink-soft">
                  {(locale === "ar" ? r.department_name_ar : r.department_name_en) ??
                    dict.common.none}
                </TD>
                <TD>
                  {r.viewed ? (
                    <span className="flex items-center gap-1.5 text-sm text-ink">
                      <Eye className="h-4 w-4 text-brand-muted" />
                      {r.view_count}×
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-ink-faint">
                      <MinusCircle className="h-4 w-4" />
                      {dict.reports.table.notYet}
                    </span>
                  )}
                </TD>
                <TD>
                  {r.confirmed ? (
                    <Badge tone="success">
                      <CheckCircle2 className="me-1 h-3 w-3" />
                      {dict.reports.confirmed}
                    </Badge>
                  ) : (
                    <Badge tone="warning">{dict.reports.table.notYet}</Badge>
                  )}
                </TD>
                <TD className="text-xs text-ink-soft">{fmt(r.confirmed_at)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
