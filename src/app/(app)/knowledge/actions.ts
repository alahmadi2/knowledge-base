"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function trackView(versionId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("track_view", { p_version_id: versionId });
}

export async function confirmRead(versionId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_read", {
    p_version_id: versionId,
  });
  revalidatePath(`/knowledge`);
  return { ok: !error };
}

export async function getAttachmentUrl(storagePath: string) {
  await requireUser();
  const supabase = await createClient();
  // سياسة Storage RLS تتحقق من can_view_version قبل إنشاء الرابط
  const { data, error } = await supabase.storage
    .from("knowledge-attachments")
    .createSignedUrl(storagePath, 60 * 10);
  if (error || !data) return { ok: false as const };
  return { ok: true as const, url: data.signedUrl };
}

export async function setArchived(itemId: string, archived: boolean) {
  const session = await requireUser();
  const supabase = await createClient();
  // RLS: التحديث مسموح لمدير قسم المعلومة أو مدير النظام فقط
  const { error, data } = await supabase
    .from("knowledge_items")
    .update({
      is_archived: archived,
      archived_at: archived ? new Date().toISOString() : null,
      archived_by: archived ? session.profile.id : null,
      updated_by: session.profile.id,
    })
    .eq("id", itemId)
    .select("id")
    .single();
  if (error || !data) return { ok: false as const };
  revalidatePath("/knowledge");
  revalidatePath(`/knowledge/${itemId}`);
  return { ok: true as const };
}
