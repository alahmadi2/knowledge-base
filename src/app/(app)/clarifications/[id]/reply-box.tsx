"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { replyClarification, updateClarificationStatus } from "../actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

const STATUSES = ["new", "under_review", "answered", "closed"] as const;

export function ReplyBox({
  dict,
  requestId,
  status,
  canModerate,
}: {
  dict: Dictionary;
  requestId: string;
  status: string;
  canModerate: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    setBusy(true);
    const res = await replyClarification(requestId, message);
    setBusy(false);
    if (res.ok) {
      setMessage("");
      router.refresh();
    }
  };

  const changeStatus = async (s: (typeof STATUSES)[number]) => {
    setBusy(true);
    await updateClarificationStatus(requestId, s);
    setBusy(false);
    router.refresh();
  };

  return (
    <Card className="space-y-3 p-4">
      {canModerate && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-soft">{dict.clarifications.changeStatus}:</span>
          <Select
            className="h-8 w-auto text-xs"
            value={status}
            disabled={busy}
            onChange={(e) => changeStatus(e.target.value as (typeof STATUSES)[number])}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {dict.clarifications.status[s]}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={dict.clarifications.replyPlaceholder}
          className="flex-1 rounded-md border border-surface-line px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
        />
        <Button disabled={busy || !message.trim()} onClick={send}>
          <SendHorizonal className="h-4 w-4 rtl:-scale-x-100" />
          {dict.clarifications.reply}
        </Button>
      </div>
    </Card>
  );
}
