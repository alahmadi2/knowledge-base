"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { knowledgeDraftSchema } from "@/schemas/knowledge";

export type ActionResult =
  | { ok: true; versionId?: string }
  | { ok: false; error: string };

async function replaceTargets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  versionId: string,
  d: {
    target_department_ids: string[];
    target_sector_ids: string[];
    target_role_ids: string[];
    target_user_ids: string[];
  }
) {
  await Promise.all([
    supabase.from("knowledge_target_departments").delete().eq("version_id", versionId),
    supabase.from("knowledge_target_sectors").delete().eq("version_id", versionId),
    supabase.from("knowledge_target_roles").delete().eq("version_id", versionId),
    supabase.from("knowledge_target_users").delete().eq("version_id", versionId),
  ]);
  const ops = [];
  if (d.target_department_ids.length)
    ops.push(supabase.from("knowledge_target_departments").insert(
      d.target_department_ids.map((id) => ({ version_id: versionId, department_id: id }))));
  if (d.target_sector_ids.length)
    ops.push(supabase.from("knowledge_target_sectors").insert(
      d.target_sector_ids.map((id) => ({ version_id: versionId, sector_id: id }))));
  if (d.target_role_ids.length)
    ops.push(supabase.from("knowledge_target_roles").insert(
      d.target_role_ids.map((id) => ({ version_id: versionId, role_id: id }))));
  if (d.target_user_ids.length)
    ops.push(supabase.from("knowledge_target_users").insert(
      d.target_user_ids.map((id) => ({ version_id: versionId, user_id: id }))));
  await Promise.all(ops);
}

export async function createKnowledgeDraft(input: unknown): Promise<ActionResult> {
  const session = await requireUser();
  if (!session.isContributor) return { ok: false, error: "not_authorized" };
  const parsed = knowledgeDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: dept } = await supabase
    .from("departments")
    .select("sector_id")
    .eq("id", d.department_id)
    .single();
  if (!dept) return { ok: false, error: "db" };

  const { data: item, error: itemErr } = await supabase
    .from("knowledge_items")
    .insert({
      sector_id: dept.sector_id,
      department_id: d.department_id,
      type_id: d.type_id,
      category_id: d.category_id,
      created_by: session.profile.id,
    })
    .select("id")
    .single();
  if (itemErr || !item) return { ok: false, error: "db" };

  const { data: version, error: verErr } = await supabase
    .from("knowledge_versions")
    .insert({
      knowledge_item_id: item.id,
      title_ar: d.title_ar,
      title_en: d.title_en,
      summary_ar: d.summary_ar,
      summary_en: d.summary_en,
      content_ar: d.content_ar,
      content_en: d.content_en,
      tags: d.tags,
      importance: d.importance,
      confidentiality: d.confidentiality,
      audience: d.audience,
      display_duration_days: d.display_duration_days,
      expiry_date: d.expiry_date,
      requires_read_confirmation: d.requires_read_confirmation,
      send_in_app_notification: d.send_in_app_notification,
      send_whatsapp: d.send_whatsapp,
      allow_download: d.allow_download,
      allow_print: d.allow_print,
      created_by: session.profile.id,
    })
    .select("id")
    .single();
  if (verErr || !version) return { ok: false, error: "db" };

  await replaceTargets(supabase, version.id, d);
  revalidatePath("/contribute");
  return { ok: true, versionId: version.id };
}

export async function updateKnowledgeDraft(
  versionId: string,
  input: unknown
): Promise<ActionResult> {
  const session = await requireUser();
  const parsed = knowledgeDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const d = parsed.data;
  const supabase = await createClient();

  // RLS يسمح بالتعديل فقط لمنشئ المسودة/المعادة للتعديل
  const { error, data } = await supabase
    .from("knowledge_versions")
    .update({
      title_ar: d.title_ar,
      title_en: d.title_en,
      summary_ar: d.summary_ar,
      summary_en: d.summary_en,
      content_ar: d.content_ar,
      content_en: d.content_en,
      tags: d.tags,
      importance: d.importance,
      confidentiality: d.confidentiality,
      audience: d.audience,
      display_duration_days: d.display_duration_days,
      expiry_date: d.expiry_date,
      requires_read_confirmation: d.requires_read_confirmation,
      send_in_app_notification: d.send_in_app_notification,
      send_whatsapp: d.send_whatsapp,
      allow_download: d.allow_download,
      allow_print: d.allow_print,
      updated_by: session.profile.id,
    })
    .eq("id", versionId)
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "db" };

  await replaceTargets(supabase, versionId, d);
  revalidatePath("/contribute");
  revalidatePath(`/contribute/${versionId}/edit`);
  return { ok: true, versionId };
}

export async function submitForApproval(versionId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_for_approval", {
    p_version_id: versionId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contribute");
  return { ok: true };
}

export async function registerAttachment(input: {
  version_id: string;
  original_name: string;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
}): Promise<ActionResult> {
  const session = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("knowledge_attachments").insert({
    ...input,
    is_link: false,
    uploaded_by: session.profile.id,
  });
  if (error) return { ok: false, error: "db" };
  revalidatePath(`/contribute/${input.version_id}/edit`);
  return { ok: true };
}

export async function removeAttachment(
  attachmentId: string,
  versionId: string
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: att } = await supabase
    .from("knowledge_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .single();
  const { error } = await supabase
    .from("knowledge_attachments")
    .delete()
    .eq("id", attachmentId);
  if (error) return { ok: false, error: "db" };
  if (att?.storage_path) {
    await supabase.storage.from("knowledge-attachments").remove([att.storage_path]);
  }
  revalidatePath(`/contribute/${versionId}/edit`);
  return { ok: true };
}

export async function createNewVersion(input: {
  itemId: string;
  updateType: "minor" | "major";
  reason: string;
  changeSummary: string;
}): Promise<ActionResult> {
  const session = await requireUser();
  if (!session.isContributor) return { ok: false, error: "not_authorized" };
  if (!input.reason.trim() || !input.changeSummary.trim())
    return { ok: false, error: "validation" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_new_version", {
    p_item_id: input.itemId,
    p_update_type: input.updateType,
    p_update_reason: input.reason.trim(),
    p_change_summary: input.changeSummary.trim(),
  });
  if (error || !data) return { ok: false, error: error?.message ?? "db" };
  revalidatePath("/contribute");
  return { ok: true, versionId: data as string };
}
