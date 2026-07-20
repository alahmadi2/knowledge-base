import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// عميل بصلاحيات Service Role — للاستخدام داخل Server Actions المحمية فقط
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
