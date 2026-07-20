"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { createClarification } from "@/app/(app)/clarifications/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

export function ClarificationButton({
  dict,
  itemId,
  versionId,
}: {
  dict: Dictionary;
  itemId: string;
  versionId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!question.trim()) {
      setError(dict.common.required);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createClarification({ itemId, versionId, question, isPrivate });
    setBusy(false);
    if (res.ok && res.id) router.push(`/clarifications/${res.id}`);
    else setError(dict.common.error);
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <MessageCircleQuestion className="h-4 w-4" />
        {dict.clarifications.ask}
      </Button>
      {open && (
        <Dialog open onClose={() => setOpen(false)} title={dict.clarifications.ask}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cl-q">{dict.clarifications.question}</Label>
              <textarea
                id="cl-q"
                rows={4}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded-md border border-surface-line px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              {dict.clarifications.isPrivate}
            </label>
            {error && <FormError message={error} />}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                {dict.common.cancel}
              </Button>
              <Button disabled={busy} onClick={submit}>
                {busy ? dict.common.saving : dict.clarifications.submit}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
