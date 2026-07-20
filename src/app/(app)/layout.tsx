import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Sidebar, type NavItem } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireUser();
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const supabase = await createClient();
  const { count: unreadCount } = await supabase
    .from("notification_recipients")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.profile.id)
    .eq("is_read", false);

  // القائمة ديناميكية حسب الدور — لا عناصر لوحدات غير منفذة
  const items: NavItem[] = [
    { href: "/dashboard", key: "dashboard" },
    { href: "/knowledge", key: "knowledge" },
    { href: "/clarifications", key: "clarifications" },
  ];
  if (session.isContributor) {
    items.push({ href: "/contribute", key: "contribute" });
  }
  if (session.isManager) {
    items.push({ href: "/approvals", key: "approvals" });
    items.push({ href: "/reports", key: "reports" });
  }
  if (session.isSuperAdmin) {
    items.push(
      { href: "/admin/overview", key: "overview", section: "administration" },
      { href: "/admin/organization", key: "organization", section: "administration" },
      { href: "/admin/users", key: "users", section: "administration" },
      { href: "/admin/whatsapp", key: "whatsapp", section: "administration" }
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 md:block">
        <Sidebar items={items} dict={dict} appName={dict.app.name} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header session={session} dict={dict} locale={locale} unreadCount={unreadCount ?? 0} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
