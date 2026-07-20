"use client";
import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import {
  registerAttachment,
  removeAttachment,
} from "@/app/(app)/contribute/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

export type AttachmentRow = {
  id: string;
  original_name: string;
  size_bytes: number | null;
  storage_path: string | null;
};

const ACCEPTED = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg";
const MAX_MB = 25;

function fileTypeOf(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg"].includes(ext)) return "image";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["xls", "xlsx"].includes(ext)) return "xlsx";
  if (["ppt", "pptx"].includes(ext)) return "pptx";
  if (ext === "pdf") return "pdf";
  return "other";
}

export function AttachmentsPanel({
  dict,
  versionId,
  attachments,
}: {
  dict: Dictionary;
  versionId: string;
  attachments: AttachmentRow[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`${dict.common.error} (> ${MAX_MB}MB)`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^\w.\-\u0600-\u06FF]/g, "_");
      const path = `${versionId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("knowledge-attachments")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;
      const res = await registerAttachment({
        version_id: versionId,
        original_name: file.name,
        file_type: fileTypeOf(file.name),
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        storage_path: path,
      });
      if (!res.ok) throw new Error(res.error);
    } catch {
      setError(dict.common.error);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async (id: string) => {
    setBusy(true);
    await removeAttachment(id, versionId);
    setBusy(false);
  };

  const fmtSize = (b: number | null) =>
    b == null ? "" : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Paperclip className="h-4 w-4 text-brand-muted" />
          {dict.contribute.sections.attachments}
        </h2>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {busy ? dict.contribute.uploading : dict.contribute.uploadFile}
        </Button>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-ink-faint">{dict.common.none}</p>
      ) : (
        <ul className="divide-y divide-surface-line">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                <FileText className="h-4 w-4 shrink-0 text-brand-muted" />
                <span className="truncate">{a.original_name}</span>
                <span className="shrink-0 text-xs text-ink-faint">{fmtSize(a.size_bytes)}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onRemove(a.id)}
                aria-label={dict.contribute.remove}
              >
                <Trash2 className="h-4 w-4 text-state-danger" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <FormError message={error} />}
    </Card>
  );
}
