"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { markRead } from "./actions";

// النقر يحدد الإشعار كمقروء ثم ينتقل للكيان المرتبط
export function NotificationRow({
  recipientId,
  isRead,
  href,
  children,
}: {
  recipientId: string;
  isRead: boolean;
  href: string | null;
  children: ReactNode;
}) {
  const router = useRouter();

  const onClick = async () => {
    if (!isRead) await markRead(recipientId);
    if (href) router.push(href);
    else router.refresh();
  };

  return (
    <li>
      <button onClick={onClick} className="block w-full text-start hover:bg-surface-page/60">
        {children}
      </button>
    </li>
  );
}
