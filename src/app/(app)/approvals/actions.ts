"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type DecisionResult = { ok: true } | { ok: false; error: string };

export async function decideApproval(input: {
  requestId: string;
  decision: "approve" | "return" | "reject";
  note?: string;
  overrides?: { display_duration_days?: number; importance?: string };
}): Promise<DecisionResult> {
  const session = await requireUser();
  if (!session.isManager) return { ok: false, error: "not_authorized" };

  if (
    (input.decision === "return" || input.decision === "reject") &&
    !input.note?.trim()
  ) {
    return { ok: false, error: "note_required" };
  }

  const supabase = await createClient();
  // القرار يمر حصراً عبر دالة قاعدة البيانات — كل الضمانات مطبقة هناك
  const { error } = await supabase.rpc("decide_approval", {
    p_request_id: input.requestId,
    p_decision: input.decision,
    p_note: input.note?.trim() || null,
    p_overrides: input.overrides ?? null,
  });

  if (error) {
    if (error.message.includes("CANNOT_APPROVE_OWN_CONTENT"))
      return { ok: false, error: "own_content" };
    if (error.message.includes("CANNOT_PUBLISH_OLDER_VERSION"))
      return { ok: false, error: "older_version" };
    return { ok: false, error: "db" };
  }

  revalidatePath("/approvals");
  revalidatePath("/knowledge");
  return { ok: true };
}
