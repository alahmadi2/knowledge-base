import Link from "next/link";
import { Bell, LogOut, Languages } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import { switchLocale } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { SessionUser } from "@/types/db";

export function Header({
  session,
  dict,
  locale,
  unreadCount,
}: {
  session: SessionUser;
  dict: Dictionary;
  locale: Locale;
  unreadCount: number;
}) {
  const name =
    locale === "ar" ? session.profile.full_name_ar : session.profile.full_name_en;
  const other: Locale = locale === "ar" ? "en" : "ar";

  return (
    <header className="flex h-14 items-center justify-between border-b border-surface-line bg-white px-4 md:px-6">
      <div className="text-sm font-medium text-ink">{name}</div>
      <div className="flex items-center gap-1">
        <Link
          href="/notifications"
          aria-label={dict.notifications.bell}
          className="relative rounded-md p-2 text-ink-soft hover:bg-surface-page hover:text-ink"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-brand">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <form action={switchLocale.bind(null, other)}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-surface-page hover:text-ink"
          >
            <Languages className="h-4 w-4" />
            {dict.common.language}
          </button>
        </form>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-state-danger-bg hover:text-state-danger"
          >
            <LogOut className="h-4 w-4" />
            {dict.auth.signOut}
          </button>
        </form>
      </div>
    </header>
  );
}
