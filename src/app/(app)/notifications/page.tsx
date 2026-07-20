import Link from "next/link";
import { BellOff, CheckCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { markAllRead } from "./actions";
import { NotificationRow } from "./notification-row";

export const dynamic = "force-dynamic";

type NotifRow = {
  id: string;
  is_read: boolean;
  created_at: string;
  notifications: {
    type: string;
    priority: string;
    title_ar: string;
    title_en: string;
    message_ar: string;
    message_en: string;
    link_entity_type: string | null;
    link_entity_id: string | null;
  } | null;
};

function notifHref(n: NonNullable<NotifRow["notifications"]>): string | null {
  if (!n.link_entity_id) return null;
  switch (n.link_entity_type) {
    case "knowledge_item":
      return `/knowledge/${n.link_entity_id}`;
    case "approval_request":
      return `/approvals/${n.link_entity_id}`;
    case "knowledge_version":
      return `/contribute`;
    default:
      return null;
  }
}

export default async function NotificationsPage() {
  const session = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data } = await supabase
    .from("notification_recipients")
    .select(
      `id, is_read, created_at,
       notifications(type, priority, title_ar, title_en, message_ar, message_en, link_entity_type, link_entity_id)`
    )
    .eq("user_id", session.profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as NotifRow[];
  const hasUnread = rows.some((r) => !r.is_read);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">{dict.notifications.title}</h1>
        {hasUnread && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-brand-muted hover:bg-surface-page hover:text-brand"
            >
              <CheckCheck className="h-4 w-4" />
              {dict.notifications.markAllRead}
            </button>
          </form>
        )}
      </div>

      <Card className="mt-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={<BellOff className="h-8 w-8" />}
            message={dict.notifications.empty}
          />
        ) : (
          <ul className="divide-y divide-surface-line">
            {rows.map((r) => {
              const n = r.notifications;
              if (!n) return null;
              return (
                <NotificationRow
                  key={r.id}
                  recipientId={r.id}
                  isRead={r.is_read}
                  href={notifHref(n)}
                >
                  <div className={cn("flex items-start gap-3 px-4 py-3", !r.is_read && "bg-brand-accent/5")}>
                    <span
                      className={cn(
                        "mt-2 h-2 w-2 shrink-0 rounded-full",
                        r.is_read ? "bg-surface-line" : "bg-brand-accent"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                        {locale === "ar" ? n.title_ar : n.title_en}
                        {n.priority === "urgent" && (
                          <Badge tone="danger">{dict.knowledge.badges.urgent}</Badge>
                        )}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">
                        {locale === "ar" ? n.message_ar : n.message_en}
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        {new Date(r.created_at).toLocaleString(
                          locale === "ar" ? "ar-SA" : "en-GB",
                          { dateStyle: "medium", timeStyle: "short" }
                        )}
                      </p>
                    </div>
                  </div>
                </NotificationRow>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
