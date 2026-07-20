import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttachmentList } from "@/app/(app)/knowledge/[id]/attachment-list";
import { DecisionBar } from "./decision-bar";

export const dynamic = "force-dynamic";

export default async function ApprovalReviewPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const session = await requireUser();
  if (!session.isManager) redirect("/dashboard");
  const { requestId } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data: req } = await supabase
    .from("approval_requests")
    .select(
      `id, status, requested_at, sla_due_at, resubmission_count, version_id,
       requester:profiles!approval_requests_requested_by_fkey(id, full_name_ar, full_name_en)`
    )
    .eq("id", requestId)
    .single();
  if (!req) notFound();
  if (req.status !== "pending") redirect("/approvals");

  const { data: v } = await supabase
    .from("knowledge_versions")
    .select("*, knowledge_items(id, reference_number, current_version_id, department_id, departments(name_ar, name_en), knowledge_types(name_ar, name_en))")
    .eq("id", req.version_id)
    .single();
  if (!v) notFound();

  const item = v.knowledge_items as unknown as {
    id: string;
    reference_number: string;
    current_version_id: string | null;
    departments: { name_ar: string; name_en: string } | null;
    knowledge_types: { name_ar: string; name_en: string } | null;
  };

  const [{ data: attachments }, targets] = await Promise.all([
    supabase
      .from("knowledge_attachments")
      .select("id, original_name, size_bytes, storage_path, is_link, link_url")
      .eq("version_id", v.id),
    Promise.all([
      supabase.from("knowledge_target_departments").select("departments(name_ar, name_en)").eq("version_id", v.id),
      supabase.from("knowledge_target_sectors").select("sectors(name_ar, name_en)").eq("version_id", v.id),
      supabase.from("knowledge_target_roles").select("roles(name_ar, name_en)").eq("version_id", v.id),
      supabase.from("knowledge_target_users").select("profiles(full_name_ar, full_name_en)").eq("version_id", v.id),
    ]),
  ]);

  const nm = (o: { name_ar?: string; name_en?: string; full_name_ar?: string; full_name_en?: string } | null) =>
    o ? (locale === "ar" ? (o.name_ar ?? o.full_name_ar ?? "") : (o.name_en ?? o.full_name_en ?? "")) : "";

  const targetNames: string[] = [
    ...(targets[0].data ?? []).map((t) => nm(t.departments as never)),
    ...(targets[1].data ?? []).map((t) => nm(t.sectors as never)),
    ...(targets[2].data ?? []).map((t) => nm(t.roles as never)),
    ...(targets[3].data ?? []).map((t) => nm(t.profiles as never)),
  ].filter(Boolean);

  const requester = req.requester as unknown as {
    id: string; full_name_ar: string; full_name_en: string;
  } | null;
  const isOwnContent = requester?.id === session.profile.id && !session.isSuperAdmin;

  const title = locale === "ar" ? v.title_ar : v.title_en;
  const summary = locale === "ar" ? v.summary_ar : v.summary_en;
  const content = locale === "ar" ? v.content_ar : v.content_en;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink-faint" dir="ltr">{item.reference_number}</span>
        <span className="font-mono text-xs text-ink-faint" dir="ltr">v{v.version_label}</span>
        {item.knowledge_types && <Badge tone="neutral">{nm(item.knowledge_types)}</Badge>}
        {v.importance === "urgent" && <Badge tone="danger">{dict.knowledge.badges.urgent}</Badge>}
        {req.resubmission_count > 0 && (
          <Badge tone="info">{dict.approvals.resubmission} #{req.resubmission_count}</Badge>
        )}
      </div>

      <h1 className="text-2xl font-bold leading-relaxed text-ink">{title}</h1>
      <p className="text-sm leading-relaxed text-ink-soft">{summary}</p>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-surface-line bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-ink-faint">{dict.approvals.requestedBy}</p>
          <p className="mt-0.5">{nm(requester as never)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">{dict.knowledge.department}</p>
          <p className="mt-0.5">{nm(item.departments)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">{dict.contribute.fields.confidentiality}</p>
          <p className="mt-0.5">{dict.contribute.confidentiality[v.confidentiality as keyof typeof dict.contribute.confidentiality]}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">{dict.contribute.fields.audience}</p>
          <p className="mt-0.5">{dict.contribute.audience[v.audience as keyof typeof dict.contribute.audience]}</p>
        </div>
      </div>

      {targetNames.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-ink-soft">{dict.approvals.targetingSummary}</p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {targetNames.map((t, i) => (
              <Badge key={i} tone="neutral">{t}</Badge>
            ))}
          </p>
        </Card>
      )}

      {!v.is_first_version && (
        <Card className="p-4">
          <p className="text-sm">
            <span className="font-medium">{dict.knowledge.updateReason}:</span>{" "}
            <span className="text-ink-soft">{v.update_reason}</span>
          </p>
          <p className="mt-1 text-sm">
            <span className="font-medium">{dict.knowledge.changeSummary}:</span>{" "}
            <span className="text-ink-soft">{v.change_summary}</span>
          </p>
          {item.current_version_id && (
            <p className="mt-2 text-sm">
              <Link
                href={`/knowledge/${item.id}/compare?a=${item.current_version_id}&b=${v.id}`}
                className="font-medium text-brand-muted underline hover:text-brand"
              >
                {dict.compare.title} — {dict.approvals.previousVersion}
              </Link>
            </p>
          )}
        </Card>
      )}

      <Card className="p-6">
        <div
          dir={locale === "ar" ? "rtl" : "ltr"}
          className="whitespace-pre-wrap text-[15px] leading-loose text-ink"
        >
          {content}
        </div>
      </Card>

      {(attachments ?? []).length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">{dict.knowledge.attachments}</h2>
          <AttachmentList dict={dict} attachments={attachments ?? []} allowDownload={true} />
        </Card>
      )}

      <DecisionBar
        dict={dict}
        requestId={req.id}
        isOwnContent={isOwnContent}
        defaultDays={v.display_duration_days}
        defaultImportance={v.importance}
      />
    </div>
  );
}
