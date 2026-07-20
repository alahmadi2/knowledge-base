"use server";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type WaResult = { ok: true } | { ok: false };

export async function updateWhatsappSettings(input: {
  enabled: boolean;
  provider: "mock" | "cloud_api";
}): Promise<WaResult> {
  const session = await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("system_settings")
    .update({
      value: { enabled: input.enabled, provider: input.provider },
      updated_by: session.profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("key", "whatsapp");
  if (!error) {
    revalidatePath("/admin/whatsapp");
    return { ok: true };
  }
  return { ok: false };
}

export async function saveTemplate(input: {
  id: string;
  body_template: string;
  is_active: boolean;
}): Promise<WaResult> {
  const session = await requireSuperAdmin();
  if (!input.body_template.trim()) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_templates")
    .update({
      body_template: input.body_template,
      is_active: input.is_active,
      updated_by: session.profile.id,
    })
    .eq("id", input.id);
  if (!error) {
    revalidatePath("/admin/whatsapp");
    return { ok: true };
  }
  return { ok: false };
}
