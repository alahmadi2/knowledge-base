"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ClarResult = { ok: true; id?: string } | { ok: false };

export async function createClarification(input: {
  itemId: string;
  versionId: string;
  question: string;
  isPrivate: boolean;
}): Promise<ClarResult> {
  const session = await requireUser();
  if (!input.question.trim()) return { ok: false };
  const supabase = await createClient();

  // إسناد تلقائي لمدير قسم المعلومة
  const { data: item } = await supabase
    .from("knowledge_items")
    .select("department_id, departments(manager_id)")
    .eq("id", input.itemId)
    .single();
  const managerId =
    (item?.departments as unknown as { manager_id: string | null } | null)
      ?.manager_id ?? null;

  const { data, error } = await supabase
    .from("clarification_requests")
    .insert({
      knowledge_item_id: input.itemId,
      version_id: input.versionId,
      requested_by: session.profile.id,
      question: input.question.trim(),
      is_private: input.isPrivate,
      assigned_to: managerId,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false };

  // إشعار المكلف بالرد
  if (managerId) {
    const { data: n } = await supabase
      .from("notifications")
      .insert({
        type: "clarification_received",
        priority: "normal",
        title_ar: "طلب توضيح جديد",
        title_en: "New clarification request",
        message_ar: input.question.trim().slice(0, 160),
        message_en: input.question.trim().slice(0, 160),
        link_entity_type: "clarification_request",
        link_entity_id: data.id,
        created_by: session.profile.id,
      })
      .select("id")
      .single();
    if (n)
      await supabase
        .from("notification_recipients")
        .insert({ notification_id: n.id, user_id: managerId });
  }

  revalidatePath("/clarifications");
  return { ok: true, id: data.id };
}

export async function replyClarification(
  requestId: string,
  message: string
): Promise<ClarResult> {
  const session = await requireUser();
  if (!message.trim()) return { ok: false };
  const supabase = await createClient();

  const { error } = await supabase.from("clarification_messages").insert({
    request_id: requestId,
    sender_id: session.profile.id,
    message: message.trim(),
  });
  if (error) return { ok: false };

  // رد المسؤول يحول الحالة إلى «تم الرد» ويشعر صاحب الطلب
  const { data: req } = await supabase
    .from("clarification_requests")
    .select("requested_by, assigned_to, status")
    .eq("id", requestId)
    .single();

  if (req && req.requested_by !== session.profile.id) {
    if (req.status === "new" || req.status === "under_review") {
      await supabase
        .from("clarification_requests")
        .update({ status: "answered" })
        .eq("id", requestId);
    }
    const { data: n } = await supabase
      .from("notifications")
      .insert({
        type: "clarification_answered",
        priority: "normal",
        title_ar: "تم الرد على طلب التوضيح",
        title_en: "Your clarification was answered",
        message_ar: message.trim().slice(0, 160),
        message_en: message.trim().slice(0, 160),
        link_entity_type: "clarification_request",
        link_entity_id: requestId,
        created_by: session.profile.id,
      })
      .select("id")
      .single();
    if (n)
      await supabase
        .from("notification_recipients")
        .insert({ notification_id: n.id, user_id: req.requested_by });
  }

  revalidatePath(`/clarifications/${requestId}`);
  revalidatePath("/clarifications");
  return { ok: true };
}

export async function updateClarificationStatus(
  requestId: string,
  status: "new" | "under_review" | "answered" | "closed"
): Promise<ClarResult> {
  await requireUser();
  const supabase = await createClient();
  // RLS: التحديث للمكلف أو مدير قسم المعلومة أو مدير النظام
  const { error } = await supabase
    .from("clarification_requests")
    .update({ status })
    .eq("id", requestId);
  if (error) return { ok: false };
  revalidatePath(`/clarifications/${requestId}`);
  revalidatePath("/clarifications");
  return { ok: true };
}
