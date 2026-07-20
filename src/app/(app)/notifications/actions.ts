"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markRead(recipientId: string) {
  const session = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("notification_recipients")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", recipientId)
    .eq("user_id", session.profile.id);
  revalidatePath("/notifications");
}

export async function markAllRead() {
  const session = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("notification_recipients")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", session.profile.id)
    .eq("is_read", false);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
