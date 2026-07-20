import { requireSuperAdmin } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { WaSettingsCard, type WaTemplate } from "./settings-card";
import { MessagesSquare } from "lucide-react";

export const dynamic = "force-dynamic";

type MsgRow = {
  id: string;
  phone: string;
  status: string;
  attempts: number;
  error_message: string | null;
  queued_at: string;
  sent_at: string | null;
  profiles: { full_name_ar: string; full_name_en: string } | null;
};

const statusTone: Record<string, "neutral" | "info" | "success" | "warning" | "danger" | "accent"> = {
  queued: "neutral",
  sending: "info",
  sent: "accent",
  delivered: "success",
  read: "success",
  failed: "danger",
  cancelled: "warning",
};

function maskPhone(p: string) {
  return p.length > 6 ? `${p.slice(0, 5)}•••${p.slice(-3)}` : p;
}

export default async function WhatsappAdminPage() {
  await requireSuperAdmin();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const [{ data: settingsRow }, { data: templates }, { data: messages }, counts] =
    await Promise.all([
      supabase.from("system_settings").select("value").eq("key", "whatsapp").single(),
      supabase.from("whatsapp_templates").select("*").order("event_type").order("language"),
      supabase
        .from("whatsapp_messages")
        .select("id, phone, status, attempts, error_message, queued_at, sent_at, profiles(full_name_ar, full_name_en)")
        .order("queued_at", { ascending: false })
        .limit(50),
      Promise.all(
        (["queued", "sent", "delivered", "read", "failed"] as const).map((s) =>
          supabase
            .from("whatsapp_messages")
            .select("id", { count: "exact", head: true })
            .eq("status", s)
            .then((r) => [s, r.count ?? 0] as const)
        )
      ),
    ]);

  const settings = (settingsRow?.value ?? { enabled: false, provider: "mock" }) as {
    enabled: boolean;
    provider: "mock" | "cloud_api";
  };
  const rows = (messages ?? []) as unknown as MsgRow[];
  const statMap = Object.fromEntries(counts);

  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : dict.common.none;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold text-ink">{dict.whatsapp.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{dict.whatsapp.subtitle}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["queued", "sent", "delivered", "read", "failed"] as const).map((s) => (
          <Card key={s} className="p-3 text-center">
            <p className="text-xs text-ink-soft">{dict.whatsapp.stats[s]}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${s === "failed" && statMap[s] > 0 ? "text-state-danger" : "text-ink"}`}>
              {statMap[s]}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <WaSettingsCard
          dict={dict}
          settings={settings}
          templates={(templates ?? []) as WaTemplate[]}
        />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">{dict.whatsapp.log}</h2>
      <Card className="mt-2">
        {rows.length === 0 ? (
          <EmptyState
            icon={<MessagesSquare className="h-8 w-8" />}
            message={dict.whatsapp.logEmpty}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{dict.whatsapp.table.user}</TH>
                <TH>{dict.whatsapp.table.phone}</TH>
                <TH>{dict.whatsapp.table.status}</TH>
                <TH>{dict.whatsapp.table.attempts}</TH>
                <TH>{dict.whatsapp.table.queuedAt}</TH>
                <TH>{dict.whatsapp.table.sentAt}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium">
                    {m.profiles
                      ? locale === "ar"
                        ? m.profiles.full_name_ar
                        : m.profiles.full_name_en
                      : dict.common.none}
                  </TD>
                  <TD dir="ltr" className="font-mono text-xs">{maskPhone(m.phone)}</TD>
                  <TD>
                    <Badge tone={statusTone[m.status] ?? "neutral"}>
                      {dict.whatsapp.status[m.status as keyof typeof dict.whatsapp.status] ?? m.status}
                    </Badge>
                    {m.error_message && (
                      <p className="mt-1 max-w-56 truncate text-xs text-state-danger" title={m.error_message}>
                        {m.error_message}
                      </p>
                    )}
                  </TD>
                  <TD className="tabular-nums">{m.attempts}</TD>
                  <TD className="text-xs text-ink-soft">{fmt(m.queued_at)}</TD>
                  <TD className="text-xs text-ink-soft">{fmt(m.sent_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
