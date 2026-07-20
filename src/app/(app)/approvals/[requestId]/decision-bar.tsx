"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormError } from "@/components/ui/form-error";
import { decideApproval } from "../actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

export function DecisionBar({
  dict,
  requestId,
  isOwnContent,
  defaultDays,
  defaultImportance,
}: {
  dict: Dictionary;
  requestId: string;
  isOwnContent: boolean;
  defaultDays: number;
  defaultImportance: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [days, setDays] = useState(defaultDays);
  const [importance, setImportance] = useState(defaultImportance);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "approve" | "return" | "reject") => {
    setError(null);
    if ((decision === "return" || decision === "reject") && !note.trim()) {
      setError(dict.approvals.noteRequired);
      return;
    }
    setBusy(decision);
    const res = await decideApproval({
      requestId,
      decision,
      note: note.trim() || undefined,
      overrides:
        decision === "approve"
          ? { display_duration_days: days, importance }
          : undefined,
    });
    setBusy(null);
    if (res.ok) {
      router.push("/approvals");
      router.refresh();
    } else {
      setError(
        res.error === "own_content" ? dict.approvals.ownContent : dict.common.error
      );
    }
  };

  return (
    <Card className="space-y-4 border-brand-accent p-5">
      <h2 className="text-sm font-semibold text-ink">{dict.approvals.decision}</h2>

      {isOwnContent && (
        <p className="rounded-md bg-state-warning-bg px-3 py-2 text-sm text-state-warning">
          {dict.approvals.ownContent}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ov-days">{dict.contribute.fields.displayDays}</Label>
          <Input
            id="ov-days"
            type="number"
            min={1}
            max={10}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="ov-imp">{dict.contribute.fields.importance}</Label>
          <Select
            id="ov-imp"
            value={importance}
            onChange={(e) => setImportance(e.target.value)}
          >
            <option value="normal">{dict.knowledge.importance.normal}</option>
            <option value="important">{dict.knowledge.importance.important}</option>
            <option value="urgent">{dict.knowledge.importance.urgent}</option>
          </Select>
        </div>
      </div>
      <p className="text-xs text-ink-faint">{dict.approvals.overridesTitle}</p>

      <div>
        <Label htmlFor="dec-note">{dict.approvals.notePlaceholder}</Label>
        <textarea
          id="dec-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-surface-line px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
        />
        <p className="mt-1 text-xs text-ink-faint">{dict.approvals.noteRequired}</p>
      </div>

      {error && <FormError message={error} />}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          disabled={!!busy}
          onClick={() => decide("return")}
        >
          <RotateCcw className="h-4 w-4" />
          {busy === "return" ? dict.common.saving : dict.approvals.returnRevision}
        </Button>
        <Button variant="danger" disabled={!!busy} onClick={() => decide("reject")}>
          <XCircle className="h-4 w-4" />
          {busy === "reject" ? dict.common.saving : dict.approvals.reject}
        </Button>
        <Button
          disabled={!!busy || isOwnContent}
          onClick={() => decide("approve")}
        >
          <CheckCircle2 className="h-4 w-4" />
          {busy === "approve" ? dict.common.saving : dict.approvals.approvePublish}
        </Button>
      </div>
    </Card>
  );
}
