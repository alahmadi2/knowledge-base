"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import { sectorSchema, type SectorInput } from "@/schemas/org";
import { saveSector } from "@/app/(app)/admin/organization/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Sector } from "@/types/db";

export function SectorDialog({
  dict,
  sector,
  onClose,
}: {
  dict: Dictionary;
  sector: Sector | null;
  onClose: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SectorInput>({
    resolver: zodResolver(sectorSchema),
    defaultValues: sector
      ? { ...sector }
      : { code: "", name_ar: "", name_en: "", is_active: true },
  });

  const onSubmit = async (data: SectorInput) => {
    setServerError(null);
    const res = await saveSector(data);
    if (res.ok) onClose();
    else setServerError(dict.common.error);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={sector ? dict.org.editSector : dict.org.addSector}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="s-code">{dict.org.fields.code}</Label>
          <Input id="s-code" dir="ltr" {...register("code")} />
          <FormError message={errors.code && dict.common.required} />
        </div>
        <div>
          <Label htmlFor="s-ar">{dict.org.fields.nameAr}</Label>
          <Input id="s-ar" dir="rtl" {...register("name_ar")} />
          <FormError message={errors.name_ar && dict.common.required} />
        </div>
        <div>
          <Label htmlFor="s-en">{dict.org.fields.nameEn}</Label>
          <Input id="s-en" dir="ltr" {...register("name_en")} />
          <FormError message={errors.name_en && dict.common.required} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" {...register("is_active")} className="h-4 w-4 accent-brand" />
          {dict.org.fields.isActive}
        </label>
        {serverError && <FormError message={serverError} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {dict.common.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? dict.common.saving : dict.common.save}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
