import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSessionUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReportRow = {
  full_name_ar: string;
  full_name_en: string;
  email: string;
  department_name_ar: string | null;
  department_name_en: string | null;
  viewed: boolean;
  view_count: number;
  confirmed: boolean;
  confirmed_at: string | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const session = await getSessionUser();
  if (!session || !session.isManager) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
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
  if (!version || error) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rows = (report ?? []) as ReportRow[];
  const ref =
    (version.knowledge_items as unknown as { reference_number: string } | null)
      ?.reference_number ?? versionId;
  const title = locale === "ar" ? version.title_ar : version.title_en;
  const t = dict.reports.table;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(dict.reports.detailTitle, {
    views: [{ rightToLeft: locale === "ar" }],
  });

  // ترويسة التقرير
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = `${title} — ${ref} · v${version.version_label}`;
  ws.getCell("A1").font = { bold: true, size: 13, color: { argb: "FF2A3335" } };
  ws.addRow([]);

  const header = ws.addRow([
    t.employee, t.email, t.department, t.viewed, t.views, t.confirmed, t.confirmedAt,
  ]);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2A3335" } };
    cell.alignment = { horizontal: "center" };
  });

  for (const r of rows) {
    const row = ws.addRow([
      locale === "ar" ? r.full_name_ar : r.full_name_en,
      r.email,
      (locale === "ar" ? r.department_name_ar : r.department_name_en) ?? "",
      r.viewed ? "✓" : "✗",
      r.view_count,
      r.confirmed ? "✓" : "✗",
      r.confirmed_at
        ? new Date(r.confirmed_at).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB")
        : "",
    ]);
    row.getCell(6).font = {
      color: { argb: r.confirmed ? "FF3E7D5B" : "FFA94446" },
      bold: true,
    };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(6).alignment = { horizontal: "center" };
  }

  ws.columns = [
    { width: 28 }, { width: 30 }, { width: 22 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 22 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="read-report-${ref}.xlsx"`,
    },
  });
}
