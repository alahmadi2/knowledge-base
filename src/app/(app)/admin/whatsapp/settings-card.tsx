"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormError } from "@/components/ui/form-error";
import { saveTemplate, updateWhatsappSettings } from "./actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

export type WaTemplate = {
  id: string;
  code: string;
  name: string;
  language: string;
  event_type: string;
  body_template: string;
  is_active: boolean;
};

export function WaSettingsCard({
  dict,
  settings,
  templates,
}: {
  dict: Dictionary;
  settings: { enabled: boolean; provider: "mock" | "cloud_api" };
  templates: WaTemplate[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [provider, setProvider] = useState(settings.provider);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);
  const [body, setBody] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    const res = await updateWhatsappSettings({ enabled, provider });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  };

  const openTemplate = (t: WaTemplate) => {
    setEditing(t);
    setBody(t.body_template);
    setActive(t.is_active);
    setError(null);
  };

  const saveTpl = async () => {
    if (!editing) return;
    if (!body.trim()) {
      setError(dict.common.required);
      return;
    }
    setSaving(true);
    const res = await saveTemplate({ id: editing.id, body_template: body, is_active: active });
    setSaving(false);
    if (res.ok) {
      setEditing(null);
      router.refresh();
    } else setError(dict.common.error);
  };

  return (
    <>
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink">{dict.whatsapp.settings}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {dict.whatsapp.enabled}
          </label>
          <div>
            <Label htmlFor="wa-provider">{dict.whatsapp.provider}</Label>
            <Select
              id="wa-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as "mock" | "cloud_api")}
            >
              <option value="mock">{dict.whatsapp.providerMock}</option>
              <option value="cloud_api">{dict.whatsapp.providerCloud}</option>
            </Select>
            {provider === "cloud_api" && (
              <p className="mt-1 text-xs text-state-warning">{dict.whatsapp.cloudNeedsEnv}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-state-success">{dict.whatsapp.saved}</span>}
          <Button size="sm" disabled={saving} onClick={saveSettings}>
            {saving ? dict.common.saving : dict.common.save}
          </Button>
        </div>
      </Card>

      <h2 className="mt-8 text-sm font-semibold text-ink">{dict.whatsapp.templates}</h2>
      <Card className="mt-2">
        <ul className="divide-y divide-surface-line">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {t.name}
                  <span className="ms-2 font-mono text-xs text-ink-faint" dir="ltr">
                    {t.language}
                  </span>
                </p>
                <p className="mt-0.5 line-clamp-1 max-w-xl text-xs text-ink-soft" dir="auto">
                  {t.body_template}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!t.is_active && <Badge tone="warning">{dict.common.inactive}</Badge>}
                <Button variant="ghost" size="sm" onClick={() => openTemplate(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {editing && (
        <Dialog open onClose={() => setEditing(null)} title={dict.whatsapp.editTemplate} wide>
          <div className="space-y-4">
            <p className="text-sm font-medium text-ink">
              {editing.name}
              <span className="ms-2 font-mono text-xs text-ink-faint" dir="ltr">
                {editing.code} · {editing.language}
              </span>
            </p>
            <div>
              <Label htmlFor="tpl-body">{dict.whatsapp.templateBody}</Label>
              <textarea
                id="tpl-body"
                rows={8}
                dir={editing.language === "ar" ? "rtl" : "ltr"}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-md border border-surface-line px-3 py-2 font-mono text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
              />
              <p className="mt-1 text-xs text-ink-faint" dir="ltr">
                {dict.whatsapp.templateVarsHint}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              {dict.org.fields.isActive}
            </label>
            {error && <FormError message={error} />}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>
                {dict.common.cancel}
              </Button>
              <Button disabled={saving} onClick={saveTpl}>
                {saving ? dict.common.saving : dict.common.save}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
