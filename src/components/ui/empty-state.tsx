import type { ReactNode } from "react";

export function EmptyState({ icon, message, action }: { icon?: ReactNode; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      {icon && <div className="text-ink-faint">{icon}</div>}
      <p className="text-sm text-ink-soft">{message}</p>
      {action}
    </div>
  );
}
