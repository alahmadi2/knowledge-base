"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { submitForApproval } from "@/app/(app)/contribute/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

export function SubmitBar({ dict, versionId }: { dict: Dictionary; versionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await submitForApproval(versionId);
    setBusy(false);
    if (res.ok) router.push("/contribute");
    else setError(dict.common.error);
  };

  return (
    <Card className="flex items-center justify-between p-4">
      <p className="text-sm text-ink-soft">{dict.contribute.submitApproval}</p>
      <div className="flex items-center gap-3">
        {error && <FormError message={error} />}
        <Button onClick={submit} disabled={busy}>
          <SendHorizonal className="h-4 w-4 rtl:-scale-x-100" />
          {busy ? dict.common.saving : dict.contribute.submitApproval}
        </Button>
      </div>
    </Card>
  );
}
