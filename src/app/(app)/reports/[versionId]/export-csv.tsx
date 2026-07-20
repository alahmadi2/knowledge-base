"use client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Locale } from "@/lib/i18n/config";

export type ReportRow = {
  user_id: string;
  full_name_ar: string;
  full_name_en: string;
  email: string;
  department_name_ar: string | null;
  department_name_en: string | null;
  viewed: boolean;
  first_viewed_at: string | null;
  view_count: number;
  confirmed: boolean;
  confirmed_at: string | null;
};

// تصدير CSV بترميز UTF-8 مع BOM — يفتح في Excel بالعربية سليمة
export function ExportCsvButton({
  dict,
  locale,
  rows,
  fileName,
}: {
  dict: Dictionary;
  locale: Locale;
  rows: ReportRow[];
  fileName: string;
}) {
  const download = () => {
    const t = dict.reports.table;
    const header = [t.employee, t.email, t.department, t.viewed, t.views, t.confirmed, t.confirmedAt];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        locale === "ar" ? r.full_name_ar : r.full_name_en,
        r.email,
        (locale === "ar" ? r.department_name_ar : r.department_name_en) ?? "",
        r.viewed ? "✓" : "—",
        r.view_count,
        r.confirmed ? "✓" : "—",
        r.confirmed_at ? new Date(r.confirmed_at).toISOString() : "",
      ]
        .map(esc)
        .join(",")
    );
    const csv = "\uFEFF" + [header.map(esc).join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" size="sm" onClick={download}>
      <Download className="h-4 w-4" />
      {dict.reports.exportCsv}
    </Button>
  );
}
