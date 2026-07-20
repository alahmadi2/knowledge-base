"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { createNewVersion } from "@/app/(app)/contribute/actions";
import { setArchived } from "@/app/(app)/knowledge/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

export function ItemActions({
  dict,
  itemId,
  isArchived,
  canCreateVersion,
  canArchive,
}: {
  dict: Dictionary;
  itemId: string;
  isArchived: boolean;
  canCreateVersion: boolean;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [nvOpen, setNvOpen] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [updateType, setUpdateType] = useState<"minor" | "major">("minor");
  const [reason, setReason] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canCreateVersion && !canArchive) return null;

  const submitNewVersion = async () => {
    if (!reason.trim() || !summary.trim()) {
      setError(dict.common.required);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createNewVersion({
      itemId,
      updateType,
      reason,
      changeSummary: summary,
    });
    setBusy(false);
    if (res.ok && res.versionId) {
      router.push(`/contribute/${res.versionId}/edit`);
    } else {
      setError(dict.common.error);
    }
  };

  const toggleArchive = async () => {
    setBusy(true);
    const res = await setArchived(itemId, !isArchived);
    setBusy(false);
    setArOpen(false);
    if (res.ok) router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {canCreateVersion && !isArchived && (
        <Button variant="secondary" size="sm" onClick={() => setNvOpen(true)}>
          <FilePlus2 className="h-4 w-4" />
          {dict.newVersion.button}
        </Button>
      )}
      {canArchive &&
        (isArchived ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={toggleArchive}>
            <ArchiveRestore className="h-4 w-4" />
            {dict.archive.unarchive}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setArOpen(true)}>
            <Archive className="h-4 w-4" />
            {dict.archive.archive}
          </Button>
        ))}

      {nvOpen && (
        <Dialog open onClose={() => setNvOpen(false)} title={dict.newVersion.title}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nv-type">{dict.newVersion.updateType}</Label>
              <Select
                id="nv-type"
                value={updateType}
                onChange={(e) => setUpdateType(e.target.value as "minor" | "major")}
              >
                <option value="minor">{dict.newVersion.minor}</option>
                <option value="major">{dict.newVersion.major}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="nv-reason">{dict.newVersion.reason}</Label>
              <Input
                id="nv-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nv-summary">{dict.newVersion.changeSummary}</Label>
              <textarea
                id="nv-summary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full rounded-md border border-surface-line px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
              />
            </div>
            {error && <FormError message={error} />}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setNvOpen(false)}>
                {dict.common.cancel}
              </Button>
              <Button disabled={busy} onClick={submitNewVersion}>
                {busy ? dict.common.saving : dict.newVersion.create}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {arOpen && (
        <Dialog open onClose={() => setArOpen(false)} title={dict.archive.confirmTitle}>
          <p className="text-sm leading-relaxed text-ink-soft">
            {dict.archive.confirmMessage}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setArOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button variant="danger" disabled={busy} onClick={toggleArchive}>
              {busy ? dict.common.saving : dict.archive.archive}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
