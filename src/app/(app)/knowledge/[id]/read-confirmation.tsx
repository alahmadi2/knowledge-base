"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmRead } from "../actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Locale } from "@/lib/i18n/config";

export function ReadConfirmation({
  dict,
  versionId,
  confirmedAt,
  locale,
}: {
  dict: Dictionary;
  versionId: string;
  confirmedAt: string | null;
  locale: Locale;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (confirmedAt) {
    return (
      <Card className="mt-4 flex items-center gap-2 border-state-success bg-state-success-bg p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-state-success" />
        <p className="text-sm text-state-success">
          {dict.knowledge.confirmedAt}{" "}
          {new Date(confirmedAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </Card>
    );
  }

  const confirm = async () => {
    setBusy(true);
    await confirmRead(versionId);
    router.refresh();
  };

  return (
    <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 border-brand-accent bg-brand-accent/10 p-4">
      <p className="text-sm text-ink">{dict.knowledge.confirmRead}</p>
      <Button onClick={confirm} disabled={busy}>
        <CheckCircle2 className="h-4 w-4" />
        {busy ? dict.common.saving : dict.knowledge.confirmReadButton}
      </Button>
    </Card>
  );
}
