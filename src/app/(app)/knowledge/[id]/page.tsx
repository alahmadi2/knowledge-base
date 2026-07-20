import Link from "next/link";
import { notFound } from "next/navigation";
import { History } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KnowledgeBadges } from "@/features/knowledge/badges";
import { TrackView } from "./track-view";
import { ItemActions } from "@/features/knowledge/item-actions";
import { ClarificationButton } from "@/features/knowledge/clarification-button";
import { ReadConfirmation } from "./read-confirmation";
import { AttachmentList } from "./attachment-list";

export const dynamic = "force-dynamic";

export default async function KnowledgeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;
  const { v: requestedVersion } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("knowledge_items")
    .select(
      `id, reference_number, current_version_id, view_count, department_id, is_archived,
       departments(name_ar, name_en),
       knowledge_types(name_ar, name_en)`
    )
    .eq("id", id)
    .single();
  if (!item) notFound();

  const versionId = requestedVersion ?? item.current_version_id;
  if (!versionId) notFound();

  const { data: version } = await supabase
    .from("knowledge_versions")
    .select("*")
    .eq("id", versionId)
    .eq("knowledge_item_id", id)
    .single();
  if (!version) notFound();

  const [{ data: attachments }, { data: history }, { data: confirmation }] =
    await Promise.all([
      supabase
        .from("knowledge_attachments")
        .select("id, original_name, size_bytes, storage_path, is_link, link_url")
        .eq("version_id", versionId)
        .order("display_order"),
      supabase
        .from("knowledge_versions")
        .select("id, version_label, status, published_at, update_reason, change_summary")
        .eq("knowledge_item_id", id)
        .order("version_major", { ascending: false })
        .order("version_minor", { ascending: false }),
      version.requires_read_confirmation
        ? supabase
            .from("read_confirmations")
            .select("confirmed_at")
            .eq("version_id", versionId)
            .eq("user_id", session.profile.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const dept = item.departments as unknown as { name_ar: string; name_en: string } | null;
  const type = item.knowledge_types as unknown as { name_ar: string; name_en: string } | null;
  const title = locale === "ar" ? version.title_ar : version.title_en;
  const summary = locale === "ar" ? version.summary_ar : version.summary_en;
  const content = locale === "ar" ? version.content_ar : version.content_en;
  const isSuperseded = version.status === "superseded" || version.status === "expired";
  const managesDept = session.isSuperAdmin || session.managedDepartmentIds.includes(item.department_id);
  const canCreateVersion =
    version.status === "published" &&
    (managesDept || (session.isContributor && session.profile.department_id === item.department_id));
  const canArchive = managesDept;
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { dateStyle: "medium" }) : dict.common.none;

  return (
    <div className="mx-auto max-w-3xl">
      <TrackView versionId={versionId} />

      {isSuperseded && (
        <Card className="mb-4 border-state-warning bg-state-warning-bg p-4">
          <p className="text-sm text-state-warning">{dict.knowledge.supersededNote}</p>
          <Link
            href={`/knowledge/${id}`}
            className="mt-1 inline-block text-sm font-medium text-brand underline"
          >
            {dict.knowledge.viewCurrent}
          </Link>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-faint" dir="ltr">
          {item.reference_number}
        </span>
        {type && <Badge tone="neutral">{locale === "ar" ? type.name_ar : type.name_en}</Badge>}
        <KnowledgeBadges
          dict={dict}
          importance={version.importance}
          isFirstVersion={version.is_first_version}
          publishedAt={version.published_at}
          displayDays={version.display_duration_days}
        />
        {isSuperseded && <Badge tone="warning">{dict.knowledge.badges.superseded}</Badge>}
        {item.is_archived && <Badge tone="warning">{dict.archive.archived}</Badge>}
      </div>

      <h1 className="mt-3 text-2xl font-bold leading-relaxed text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {version.status === "published" && (
          <ClarificationButton dict={dict} itemId={item.id} versionId={versionId} />
        )}
        <ItemActions
          dict={dict}
          itemId={item.id}
          isArchived={item.is_archived}
          canCreateVersion={canCreateVersion}
          canArchive={canArchive}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-surface-line bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-ink-faint">{dict.knowledge.version}</p>
          <p className="mt-0.5 font-mono" dir="ltr">v{version.version_label}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">{dict.knowledge.publishedAt}</p>
          <p className="mt-0.5">{fmtDate(version.published_at)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">{dict.knowledge.effectiveFrom}</p>
          <p className="mt-0.5">{fmtDate(version.effective_from)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">{dict.knowledge.department}</p>
          <p className="mt-0.5">{dept ? (locale === "ar" ? dept.name_ar : dept.name_en) : dict.common.none}</p>
        </div>
      </div>

      {!version.is_first_version && (version.update_reason || version.change_summary) && (
        <Card className="mt-4 p-4">
          {version.update_reason && (
            <p className="text-sm">
              <span className="font-medium text-ink">{dict.knowledge.updateReason}:</span>{" "}
              <span className="text-ink-soft">{version.update_reason}</span>
            </p>
          )}
          {version.change_summary && (
            <p className="mt-1 text-sm">
              <span className="font-medium text-ink">{dict.knowledge.changeSummary}:</span>{" "}
              <span className="text-ink-soft">{version.change_summary}</span>
            </p>
          )}
        </Card>
      )}

      <Card className="mt-4 p-6">
        <div
          dir={locale === "ar" ? "rtl" : "ltr"}
          className="whitespace-pre-wrap text-[15px] leading-loose text-ink"
        >
          {content}
        </div>
      </Card>

      {(attachments ?? []).length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            {dict.knowledge.attachments}
          </h2>
          <AttachmentList
            dict={dict}
            attachments={attachments ?? []}
            allowDownload={version.allow_download}
          />
        </Card>
      )}

      {version.requires_read_confirmation && version.status === "published" && (
        <ReadConfirmation
          dict={dict}
          versionId={versionId}
          confirmedAt={(confirmation as { confirmed_at?: string } | null)?.confirmed_at ?? null}
          locale={locale}
        />
      )}

      {(history ?? []).length > 1 && (
        <Card className="mt-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <History className="h-4 w-4 text-brand-muted" />
            {dict.knowledge.versionHistory}
          </h2>
          <ul className="divide-y divide-surface-line">
            {(history ?? []).map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link
                  href={h.id === item.current_version_id ? `/knowledge/${id}` : `/knowledge/${id}?v=${h.id}`}
                  className={h.id === versionId ? "font-semibold text-ink" : "text-brand-muted hover:underline"}
                  dir="ltr"
                >
                  v{h.version_label}
                </Link>
                <span className="flex items-center gap-3">
                  {h.id !== item.current_version_id && item.current_version_id && (
                    <Link
                      href={`/knowledge/${id}/compare?a=${h.id}&b=${item.current_version_id}`}
                      className="text-xs text-brand-muted hover:underline"
                    >
                      {dict.compare.compareWith}
                    </Link>
                  )}
                  <span className="text-xs text-ink-faint">{fmtDate(h.published_at)}</span>
                  <Badge tone={h.status === "published" ? "success" : "neutral"}>
                    {dict.knowledge.status[h.status as keyof typeof dict.knowledge.status]}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
