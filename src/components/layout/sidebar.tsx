"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardCheck, FileBarChart2, Gauge, LayoutDashboard, MessageCircleQuestion, MessagesSquare, Network, PenSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

// عناصر القائمة تُبنى ديناميكياً حسب الدور — تُمرر من الخادم
export type NavItem = { href: string; key: "dashboard" | "knowledge" | "contribute" | "approvals" | "reports" | "clarifications" | "overview" | "organization" | "users" | "whatsapp"; section?: "administration" };

const icons = {
  dashboard: LayoutDashboard,
  knowledge: BookOpen,
  contribute: PenSquare,
  approvals: ClipboardCheck,
  reports: FileBarChart2,
  clarifications: MessageCircleQuestion,
  overview: Gauge,
  organization: Network,
  users: Users,
  whatsapp: MessagesSquare,
} as const;

export function Sidebar({
  items,
  dict,
  appName,
}: {
  items: NavItem[];
  dict: Dictionary;
  appName: string;
}) {
  const pathname = usePathname();
  const main = items.filter((i) => !i.section);
  const admin = items.filter((i) => i.section === "administration");

  const renderItem = (item: NavItem) => {
    const Icon = icons[item.key];
    const active = pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          active
            ? "bg-white/10 font-medium text-white"
            : "text-brand-accent/80 hover:bg-white/5 hover:text-white"
        )}
      >
        {/* مؤشر العنصر النشط — خط بنفسجي رفيع */}
        <span
          className={cn(
            "absolute inset-y-1 start-0 w-0.5 rounded-full bg-brand-accent transition-opacity",
            active ? "opacity-100" : "opacity-0"
          )}
        />
        <Icon className="h-4 w-4 shrink-0" />
        {dict.nav[item.key]}
      </Link>
    );
  };

  return (
    <nav className="flex h-full flex-col bg-brand">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[11px] font-medium tracking-wide text-brand-accent/70">
          {dict.app.company}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-white">{appName}</p>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {main.map(renderItem)}
        {admin.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-brand-accent/50">
              {dict.nav.administration}
            </p>
            {admin.map(renderItem)}
          </>
        )}
      </div>
    </nav>
  );
}
