"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: "invalid" | "disabled" | "unconfirmed" | "config" } | null;

export async function signIn(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "invalid" };

  const supabase = await createClient();
  let data, error;
  try {
    ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
  } catch {
    // فشل الاتصال نفسه (رابط/مفتاح خاطئ) — ليس خطأ بيانات دخول
    return { error: "config" };
  }
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("email not confirmed")) return { error: "unconfirmed" };
    if (error.status === 400 || msg.includes("invalid login credentials"))
      return { error: "invalid" };
    // 401 مفتاح API غير صالح، أخطاء الشبكة، إلخ
    return { error: "config" };
  }
  if (!data?.user) return { error: "invalid" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", data.user.id)
    .single();

  if (profile?.account_status !== "active") {
    await supabase.auth.signOut();
    return { error: "disabled" };
  }

  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
