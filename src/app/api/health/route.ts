import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// صفحة تشخيص: تكشف فوراً إن كانت مفاتيح البيئة ناقصة أو تشير لمشروع خاطئ
// افتح /api/health في المتصفح بعد النشر
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const projectRef = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/)?.[1] ?? null;

  let authService = "not_checked";
  let dbMigrations = "not_checked";

  if (url && anon) {
    try {
      const r = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anon },
        cache: "no-store",
      });
      authService = r.ok ? "ok" : `error_${r.status}`;
    } catch {
      authService = "unreachable";
    }
    try {
      // roles جدول مرجعي من Migrations — وجوده يؤكد تنفيذ ALL_MIGRATIONS.sql
      const r = await fetch(`${url}/rest/v1/roles?select=code&limit=1`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        cache: "no-store",
      });
      dbMigrations = r.status === 404 ? "tables_missing" : r.ok ? "ok" : `error_${r.status}`;
    } catch {
      dbMigrations = "unreachable";
    }
  }

  return NextResponse.json({
    checks: {
      NEXT_PUBLIC_SUPABASE_URL: url ? "set" : "MISSING",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? "set" : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: service ? "set" : "MISSING",
      auth_service: authService,
      db_migrations: dbMigrations,
    },
    project_ref: projectRef,
    hint_ar:
      "قارن project_ref أعلاه مع معرف مشروعك في رابط لوحة Supabase (supabase.com/dashboard/project/<المعرف>). إن اختلفا فالتطبيق موصول بمشروع آخر — صحح NEXT_PUBLIC_SUPABASE_URL في Netlify ثم Trigger deploy.",
  });
}
