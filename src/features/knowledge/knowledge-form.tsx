"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormError } from "@/components/ui/form-error";
import { knowledgeDraftSchema, type KnowledgeDraftInput } from "@/schemas/knowledge";
import {
  createKnowledgeDraft,
  updateKnowledgeDraft,
} from "@/app/(app)/contribute/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Locale } from "@/lib/i18n/config";

export type Option = { id: string; name_ar: string; name_en: string };
export type UserOption = { id: string; full_name_ar: string; full_name_en: string; email: string };

type FormValues = Omit<KnowledgeDraftInput, "tags" | "category_id" | "expiry_date"> & {
  tags_text: string;
  category_id: string;
  expiry_date: string;
};

const CONFIDENTIALITY = [
  "all_employees", "specific_department", "multiple_departments",
  "managers_only", "specific_users", "confidential", "top_secret",
] as const;
const AUDIENCE = [
  "all_employees", "sector", "administration", "department",
  "multiple_departments", "roles", "specific_users",
] as const;

export function KnowledgeForm({
  dict,
  locale,
  versionId,
  defaults,
  departments,
  sectors,
  types,
  categories,
  roles,
  users,
}: {
  dict: Dictionary;
  locale: Locale;
  versionId?: string;
  defaults?: Partial<KnowledgeDraftInput>;
  departments: Option[];
  sectors: Option[];
  types: Option[];
  categories: Option[];
  roles: Option[];
  users: UserOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const name = (o: { name_ar: string; name_en: string }) =>
    locale === "ar" ? o.name_ar : o.name_en;
  const uname = (u: UserOption) =>
    locale === "ar" ? u.full_name_ar : u.full_name_en;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      department_id: defaults?.department_id ?? departments[0]?.id ?? "",
      type_id: defaults?.type_id ?? types[0]?.id ?? "",
      category_id: defaults?.category_id ?? "",
      title_ar: defaults?.title_ar ?? "",
      title_en: defaults?.title_en ?? "",
      summary_ar: defaults?.summary_ar ?? "",
      summary_en: defaults?.summary_en ?? "",
      content_ar: defaults?.content_ar ?? "",
      content_en: defaults?.content_en ?? "",
      tags_text: (defaults?.tags ?? []).join("، "),
      importance: defaults?.importance ?? "normal",
      confidentiality: defaults?.confidentiality ?? "all_employees",
      audience: defaults?.audience ?? "all_employees",
      target_department_ids: defaults?.target_department_ids ?? [],
      target_sector_ids: defaults?.target_sector_ids ?? [],
      target_role_ids: defaults?.target_role_ids ?? [],
      target_user_ids: defaults?.target_user_ids ?? [],
      display_duration_days: defaults?.display_duration_days ?? 5,
      expiry_date: defaults?.expiry_date ?? "",
      requires_read_confirmation: defaults?.requires_read_confirmation ?? false,
      send_in_app_notification: defaults?.send_in_app_notification ?? true,
      send_whatsapp: defaults?.send_whatsapp ?? false,
      allow_download: defaults?.allow_download ?? true,
      allow_print: defaults?.allow_print ?? true,
    },
  });

  const audience = watch("audience");
  const confidentiality = watch("confidentiality");
  const needsDeptTargets = ["administration", "department", "multiple_departments"].includes(audience);
  const needsSectorTargets = audience === "sector";
  const needsRoleTargets = audience === "roles";
  const needsUserTargets =
    audience === "specific_users" ||
    confidentiality === "specific_users" ||
    confidentiality === "top_secret";

  const onSubmit = async (v: FormValues) => {
    setServerError(null);
    const payload: KnowledgeDraftInput = {
      ...v,
      category_id: v.category_id || null,
      expiry_date: v.expiry_date || null,
      tags: v.tags_text
        .split(/[،,]/)
        .map((t) => t.trim())
        .filter(Boolean),
    } as KnowledgeDraftInput;

    const parsed = knowledgeDraftSchema.safeParse(payload);
    if (!parsed.success) {
      setServerError(dict.common.required);
      return;
    }
    const res = versionId
      ? await updateKnowledgeDraft(versionId, parsed.data)
      : await createKnowledgeDraft(parsed.data);
    if (res.ok) {
      router.push(`/contribute/${res.versionId ?? versionId}/edit?saved=1`);
      router.refresh();
    } else {
      setServerError(dict.common.error);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </Card>
  );

  const CheckGrid = ({
    field,
    options,
    getLabel,
  }: {
    field: "target_department_ids" | "target_sector_ids" | "target_role_ids" | "target_user_ids";
    options: { id: string }[];
    getLabel: (o: never) => string;
  }) => (
    <div className="grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto rounded-md border border-surface-line p-3 sm:grid-cols-2">
      {options.map((o) => (
        <label key={o.id} className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            value={o.id}
            className="h-4 w-4 accent-brand"
            {...register(field)}
          />
          {getLabel(o as never)}
        </label>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Section title={dict.contribute.sections.basics}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="k-dept">{dict.contribute.fields.department}</Label>
            <Select id="k-dept" disabled={!!versionId} {...register("department_id")}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{name(d)}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="k-type">{dict.contribute.fields.type}</Label>
            <Select id="k-type" disabled={!!versionId} {...register("type_id")}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{name(t)}</option>
              ))}
            </Select>
          </div>
          {categories.length > 0 && (
            <div>
              <Label htmlFor="k-cat">{dict.contribute.fields.category}</Label>
              <Select id="k-cat" disabled={!!versionId} {...register("category_id")}>
                <option value="">{dict.common.none}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{name(c)}</option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </Section>

      <Section title={dict.contribute.sections.content}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="k-tar">{dict.contribute.fields.titleAr}</Label>
            <Input id="k-tar" dir="rtl" {...register("title_ar", { required: true, minLength: 3 })} />
            <FormError message={errors.title_ar && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="k-ten">{dict.contribute.fields.titleEn}</Label>
            <Input id="k-ten" dir="ltr" {...register("title_en", { required: true, minLength: 3 })} />
            <FormError message={errors.title_en && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="k-sar">{dict.contribute.fields.summaryAr}</Label>
            <textarea
              id="k-sar" dir="rtl" rows={2}
              className="w-full rounded-md border border-surface-line px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
              {...register("summary_ar", { required: true, minLength: 3 })}
            />
            <FormError message={errors.summary_ar && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="k-sen">{dict.contribute.fields.summaryEn}</Label>
            <textarea
              id="k-sen" dir="ltr" rows={2}
              className="w-full rounded-md border border-surface-line px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
              {...register("summary_en", { required: true, minLength: 3 })}
            />
            <FormError message={errors.summary_en && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="k-car">{dict.contribute.fields.contentAr}</Label>
            <textarea
              id="k-car" dir="rtl" rows={8}
              className="w-full rounded-md border border-surface-line px-3 py-2 text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
              {...register("content_ar", { required: true, minLength: 3 })}
            />
            <FormError message={errors.content_ar && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="k-cen">{dict.contribute.fields.contentEn}</Label>
            <textarea
              id="k-cen" dir="ltr" rows={8}
              className="w-full rounded-md border border-surface-line px-3 py-2 text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-accent"
              {...register("content_en", { required: true, minLength: 3 })}
            />
            <FormError message={errors.content_en && dict.common.required} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="k-tags">{dict.contribute.fields.tags}</Label>
            <Input id="k-tags" {...register("tags_text")} />
            <p className="mt-1 text-xs text-ink-faint">{dict.contribute.fields.tagsHint}</p>
          </div>
        </div>
      </Section>

      <Section title={dict.contribute.sections.classification}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="k-imp">{dict.contribute.fields.importance}</Label>
            <Select id="k-imp" {...register("importance")}>
              <option value="normal">{dict.knowledge.importance.normal}</option>
              <option value="important">{dict.knowledge.importance.important}</option>
              <option value="urgent">{dict.knowledge.importance.urgent}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="k-conf">{dict.contribute.fields.confidentiality}</Label>
            <Select id="k-conf" {...register("confidentiality")}>
              {CONFIDENTIALITY.map((c) => (
                <option key={c} value={c}>{dict.contribute.confidentiality[c]}</option>
              ))}
            </Select>
          </div>
        </div>
      </Section>

      <Section title={dict.contribute.sections.audience}>
        <div className="space-y-4">
          <div className="max-w-sm">
            <Label htmlFor="k-aud">{dict.contribute.fields.audience}</Label>
            <Select id="k-aud" {...register("audience")}>
              {AUDIENCE.map((a) => (
                <option key={a} value={a}>{dict.contribute.audience[a]}</option>
              ))}
            </Select>
          </div>
          {needsSectorTargets && (
            <div>
              <Label>{dict.contribute.fields.targetSectors}</Label>
              <CheckGrid field="target_sector_ids" options={sectors}
                getLabel={(o) => name(o as Option)} />
              <FormError message={errors.target_sector_ids && dict.common.required} />
            </div>
          )}
          {needsDeptTargets && (
            <div>
              <Label>{dict.contribute.fields.targetDepartments}</Label>
              <CheckGrid field="target_department_ids" options={departments}
                getLabel={(o) => name(o as Option)} />
              <FormError message={errors.target_department_ids && dict.common.required} />
            </div>
          )}
          {needsRoleTargets && (
            <div>
              <Label>{dict.contribute.fields.targetRoles}</Label>
              <CheckGrid field="target_role_ids" options={roles}
                getLabel={(o) => name(o as Option)} />
              <FormError message={errors.target_role_ids && dict.common.required} />
            </div>
          )}
          {needsUserTargets && (
            <div>
              <Label>{dict.contribute.fields.targetUsers}</Label>
              <CheckGrid field="target_user_ids" options={users}
                getLabel={(o) => `${uname(o as UserOption)} — ${(o as UserOption).email}`} />
              <FormError message={errors.target_user_ids && dict.common.required} />
            </div>
          )}
        </div>
      </Section>

      <Section title={dict.contribute.sections.publishing}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="k-days">{dict.contribute.fields.displayDays}</Label>
            <Input id="k-days" type="number" min={1} max={10}
              {...register("display_duration_days")} />
            <FormError message={errors.display_duration_days && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="k-exp">{dict.contribute.fields.expiryDate}</Label>
            <Input id="k-exp" type="date" {...register("expiry_date")} />
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {([
            ["requires_read_confirmation", dict.contribute.fields.requiresConfirmation],
            ["send_in_app_notification", dict.contribute.fields.sendInApp],
            ["send_whatsapp", dict.contribute.fields.sendWhatsapp],
            ["allow_download", dict.contribute.fields.allowDownload],
            ["allow_print", dict.contribute.fields.allowPrint],
          ] as const).map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="h-4 w-4 accent-brand" {...register(field)} />
              {label}
            </label>
          ))}
        </div>
      </Section>

      {serverError && <FormError message={serverError} />}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? dict.common.saving : dict.contribute.saveDraft}
        </Button>
      </div>
    </form>
  );
}
