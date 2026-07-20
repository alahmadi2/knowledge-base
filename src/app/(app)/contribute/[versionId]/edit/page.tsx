import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { KnowledgeForm } from "@/features/knowledge/knowledge-form";
import { loadFormOptions } from "@/features/knowledge/form-data";
import { AttachmentsPanel, type AttachmentRow } from "@/features/knowledge/attachments-panel";
import { SubmitBar } from "./submit-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KnowledgeDraftInput } from "@/schemas/knowledge";

export const dynamic = "force-dynamic";

export default async function EditDraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ versionId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireUser();
  if (!session.isContributor) redirect("/dashboard");
  const { versionId } = await params;
  const { saved } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data: v } = await supabase
    .from("knowledge_versions")
    .select("*, knowledge_items(department_id, type_id, category_id, reference_number)")
    .eq("id", versionId)
    .single();
  if (!v) notFound();

  const editable = v.status === "draft" || v.status === "returned_for_revision";
  if (!editable) redirect(`/knowledge/${v.knowledge_item_id}?v=${v.id}`);

  const item = v.knowledge_items as unknown as {
    department_id: string;
    type_id: string;
    category_id: string | null;
    reference_number: string;
  };

  const [targets, attachments, lastAction, options] = await Promise.all([
    Promise.all([
      supabase.from("knowledge_target_departments").select("department_id").eq("version_id", versionId),
      supabase.from("knowledge_target_sectors").select("sector_id").eq("version_id", versionId),
      supabase.from("knowledge_target_roles").select("role_id").eq("version_id", versionId),
      supabase.from("knowledge_target_users").select("user_id").eq("version_id", versionId),
    ]),
    supabase
      .from("knowledge_attachments")
      .select("id, original_name, size_bytes, storage_path")
      .eq("version_id", versionId)
      .order("created_at"),
    v.status === "returned_for_revision"
      ? supabase
          .from("approval_actions")
          .select("note, approval_requests!inner(version_id)")
          .eq("approval_requests.version_id", versionId)
          .eq("action", "returned_for_revision")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    loadFormOptions(session),
  ]);

  const defaults: Partial<KnowledgeDraftInput> = {
    department_id: item.department_id,
    type_id: item.type_id,
    category_id: item.category_id,
    title_ar: v.title_ar,
    title_en: v.title_en,
    summary_ar: v.summary_ar,
    summary_en: v.summary_en,
    content_ar: v.content_ar,
    content_en: v.content_en,
    tags: v.tags ?? [],
    importance: v.importance,
    confidentiality: v.confidentiality,
    audience: v.audience,
    target_department_ids: (targets[0].data ?? []).map((t) => t.department_id),
    target_sector_ids: (targets[1].data ?? []).map((t) => t.sector_id),
    target_role_ids: (targets[2].data ?? []).map((t) => t.role_id),
    target_user_ids: (targets[3].data ?? []).map((t) => t.user_id),
    display_duration_days: v.display_duration_days,
    expiry_date: v.expiry_date,
    requires_read_confirmation: v.requires_read_confirmation,
    send_in_app_notification: v.send_in_app_notification,
    send_whatsapp: v.send_whatsapp,
    allow_download: v.allow_download,
    allow_print: v.allow_print,
  };

  const returnNote = (lastAction.data as { note?: string } | null)?.note;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink">{dict.contribute.editDraft}</h1>
          <p className="mt-1 font-mono text-xs text-ink-soft" dir="ltr">
            {item.reference_number} · v{v.version_label}
          </p>
        </div>
        <Badge tone={v.status === "returned_for_revision" ? "warning" : "neutral"}>
          {dict.knowledge.status[v.status as keyof typeof dict.knowledge.status]}
        </Badge>
      </div>

      {saved && (
        <Card className="border-state-success bg-state-success-bg p-3">
          <p className="text-sm text-state-success">{dict.contribute.draftSaved}</p>
        </Card>
      )}

      {returnNote && (
        <Card className="border-state-warning bg-state-warning-bg p-4">
          <p className="text-xs font-semibold text-state-warning">
            {dict.contribute.returnNote}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{returnNote}</p>
        </Card>
      )}

      <KnowledgeForm
        dict={dict}
        locale={locale}
        versionId={versionId}
        defaults={defaults}
        {...options}
      />

      <AttachmentsPanel
        dict={dict}
        versionId={versionId}
        attachments={(attachments.data ?? []) as AttachmentRow[]}
      />

      <SubmitBar dict={dict} versionId={versionId} />
    </div>
  );
}
