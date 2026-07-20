"use client";
import { useState } from "react";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { getAttachmentUrl } from "../actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

type Att = {
  id: string;
  original_name: string;
  size_bytes: number | null;
  storage_path: string | null;
  is_link: boolean;
  link_url: string | null;
};

export function AttachmentList({
  dict,
  attachments,
  allowDownload,
}: {
  dict: Dictionary;
  attachments: Att[];
  allowDownload: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const open = async (a: Att) => {
    if (a.is_link && a.link_url) {
      window.open(a.link_url, "_blank", "noopener");
      return;
    }
    if (!a.storage_path) return;
    setBusyId(a.id);
    const res = await getAttachmentUrl(a.storage_path);
    setBusyId(null);
    if (res.ok) window.open(res.url, "_blank", "noopener");
  };

  const fmtSize = (b: number | null) =>
    b == null ? "" : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

  return (
    <ul className="divide-y divide-surface-line">
      {attachments.map((a) => (
        <li key={a.id} className="flex items-center justify-between py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
            <FileText className="h-4 w-4 shrink-0 text-brand-muted" />
            <span className="truncate">{a.original_name}</span>
            <span className="shrink-0 text-xs text-ink-faint">{fmtSize(a.size_bytes)}</span>
          </span>
          {(a.is_link || allowDownload) && (
            <button
              onClick={() => open(a)}
              disabled={busyId === a.id}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-brand-muted hover:bg-surface-page hover:text-brand"
            >
              {busyId === a.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : a.is_link ? (
                <ExternalLink className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {a.is_link ? dict.knowledge.openLink : dict.knowledge.download}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
