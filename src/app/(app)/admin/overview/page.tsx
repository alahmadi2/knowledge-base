import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  BookOpenCheck,
  ClipboardCheck,
  Eye,
  Library,
  MessagesSquare,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await requireSuperAdmin();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data: alertSettings } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "alerts")
    .single();
  const staleMonths = Number(
    (alertSettings?.value as Record<string, unknown>)?.stale_review_months ?? 12
  );
  const staleBefore = new Date();
  staleBefore.setMonth(staleBefore.getMonth() - staleMonths);

  const [
    items,
    published,
    pending,
    overdue,
    waFailed,
    { data: readSummary },
    { data: topViewed },
    { data: staleRows },
    { data: audit },
  ] = await Promise.all([
    supabase.from("knowledge_items").select("id", { count: "exact", head: true }),
    supabase
      .from("knowledge_versions")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("approval_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("sla_due_at", new Date().toISOString()),
    supabase
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
    supabase.rpc("read_confirmation_summary"),
    supabase
      .from("knowledge_items")
      .select(
        "id, reference_number, view_count, current:knowledge_versions!fk_items_current_version(title_ar, title_en, status)"
      )
      .eq("is_archived", false)
      .order("view_count", { ascending: false })
      .limit(5),
    supabase
      .from("knowledge_items")
      .select(
        "id, reference_number, current:knowledge_versions!fk_items_current_version(title_ar, title_en, status, published_at)"
      )
      .eq("is_archived", false)
      .not("current_version_id", "is", null)
      .limit(60),
    supabase
      .from("audit_logs")
      .select("id, action, created_at, profiles(full_name_ar, full_name_en)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  type Summary = { targeted_count: number; confirmed_count: number };
  const summaries = (readSummary ?? []) as Summary[];
  const avgPct =
    summaries.length === 0
      ? null
      : Math.round(
          (summaries.reduce(
            (acc, s) =>
              acc + (s.targeted_count > 0 ? s.confirmed_count / s.targeted_count : 0),
            0
          ) /
            summaries.length) *
            100
        );

  type CurrentV = {
    title_ar: string;
    title_en: string;
    status: string;
    published_at?: string | null;
  } | null;

  const stale = (staleRows ?? [])
    .map((r) => ({ ...r, current: r.current as unknown as CurrentV }))
    .filter(
      (r) =>
        r.current?.status === "published" &&
        r.current.published_at &&
        new Date(r.current.published_at) < staleBefore
    )
    .slice(0, 5);

  const kpis = [
    { label: dict.overview.totalItems, value: items.count ?? 0, icon: Library },
    { label: dict.overview.publishedVersions, value: published.count ?? 0, icon: BookOpenCheck },
    {
      label: dict.overview.pendingApprovals,
      value: pending.count ?? 0,
      icon: ClipboardCheck,
      sub:
        (overdue.count ?? 0) > 0
          ? `${overdue.count} ${dict.overview.overdue}`
          : undefined,
    },
    {
      label: dict.overview.avgReadCompletion,
      value: avgPct === null ? "—" : `${avgPct}%`,
      icon: Eye,
    },
    {
      label: dict.overview.waFailed,
      value: waFailed.count ?? 0,
      icon: MessagesSquare,
      danger: (waFailed.count ?? 0) > 0,
    },
  ];

  const title = (c: CurrentV) =>
    c ? (locale === "ar" ? c.title_ar : c.title_en) : dict.common.none;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-xl font-bold text-ink">{dict.overview.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{dict.overview.subtitle}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-soft">{k.label}</p>
              <k.icon className="h-4 w-4 text-brand-muted" />
            </div>
            <p
              className={`mt-2 text-2xl font-bold tabular-nums ${
                "danger" in k && k.danger ? "text-state-danger" : "text-ink"
              }`}
            >
              {k.value}
            </p>
            {"sub" in k && k.sub && (
              <p className="mt-1 flex items-center gap-1 text-xs text-state-danger">
                <AlertTriangle className="h-3 w-3" />
                {k.sub}
              </p>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">{dict.overview.mostViewed}</h2>
          <ul className="mt-3 divide-y divide-surface-line">
            {(topViewed ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2.5">
                <Link
                  href={`/knowledge/${r.id}`}
                  className="min-w-0 truncate text-sm font-medium text-ink hover:text-brand-muted hover:underline"
                >
                  {title(r.current as unknown as CurrentV)}
                </Link>
                <span className="ms-3 shrink-0 text-xs tabular-nums text-ink-soft">
                  {r.view_count} {dict.overview.views}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">{dict.overview.staleContent}</h2>
          <p className="mt-0.5 text-xs text-ink-faint">{dict.overview.staleHint}</p>
          {stale.length === 0 ? (
            <p className="mt-3 text-sm text-state-success">{dict.overview.staleEmpty}</p>
          ) : (
            <ul className="mt-3 divide-y divide-surface-line">
              {stale.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5">
                  <Link
                    href={`/knowledge/${r.id}`}
                    className="min-w-0 truncate text-sm font-medium text-ink hover:text-brand-muted hover:underline"
                  >
                    {title(r.current)}
                  </Link>
                  <Badge tone="warning" className="ms-3 shrink-0">
                    {new Date(r.current!.published_at!).toLocaleDateString(
                      locale === "ar" ? "ar-SA" : "en-GB",
                      { year: "numeric", month: "short" }
                    )}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold text-ink">{dict.overview.recentAudit}</h2>
        <ul className="mt-3 divide-y divide-surface-line">
          {(audit ?? []).map((a) => {
            const p = a.profiles as unknown as {
              full_name_ar: string;
              full_name_en: string;
            } | null;
            return (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-mono text-xs text-ink" dir="ltr">
                  {a.action}
                </span>
                <span className="text-xs text-ink-soft">
                  {p ? (locale === "ar" ? p.full_name_ar : p.full_name_en) : "—"} ·{" "}
                  {new Date(a.created_at).toLocaleString(
                    locale === "ar" ? "ar-SA" : "en-GB",
                    { dateStyle: "short", timeStyle: "short" }
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
