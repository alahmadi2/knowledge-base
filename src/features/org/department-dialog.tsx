"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormError } from "@/components/ui/form-error";
import { departmentSchema, type DepartmentInput } from "@/schemas/org";
import { saveDepartment } from "@/app/(app)/admin/organization/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Locale } from "@/lib/i18n/config";
import type { Department } from "@/types/db";

export type ManagerOption = {
  id: string;
  full_name_ar: string;
  full_name_en: string;
  email: string;
};

export function DepartmentDialog({
  dict,
  locale,
  sectorId,
  department,
  siblings,
  managers,
  onClose,
}: {
  dict: Dictionary;
  locale: Locale;
  sectorId: string;
  department: Department | null;
  siblings: Department[];
  managers: ManagerOption[];
  onClose: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
    defaultValues: department
      ? {
          ...department,
          parent_department_id: department.parent_department_id ?? null,
          manager_id: department.manager_id ?? null,
        }
      : {
          sector_id: sectorId,
          parent_department_id: null,
          level: "department",
          code: "",
          name_ar: "",
          name_en: "",
          manager_id: null,
          is_active: true,
        },
  });

  const level = watch("level");
  const parentCandidates = siblings.filter(
    (d) => d.id !== department?.id && d.level !== "sub_department"
  );

  const onSubmit = async (data: DepartmentInput) => {
    setServerError(null);
    const res = await saveDepartment({
      ...data,
      sector_id: sectorId,
      parent_department_id: data.parent_department_id || null,
      manager_id: data.manager_id || null,
    });
    if (res.ok) onClose();
    else setServerError(dict.common.error);
  };

  const name = (o: { name_ar: string; name_en: string }) =>
    locale === "ar" ? o.name_ar : o.name_en;
  const managerName = (m: ManagerOption) =>
    locale === "ar" ? m.full_name_ar : m.full_name_en;

  return (
    <Dialog
      open
      onClose={onClose}
      title={department ? dict.org.editUnit : dict.org.addUnit}
      wide
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="d-code">{dict.org.fields.code}</Label>
            <Input id="d-code" dir="ltr" {...register("code")} />
            <FormError message={errors.code && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="d-level">{dict.org.fields.level}</Label>
            <Select id="d-level" {...register("level")}>
              <option value="administration">{dict.org.levels.administration}</option>
              <option value="department">{dict.org.levels.department}</option>
              <option value="sub_department">{dict.org.levels.sub_department}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="d-ar">{dict.org.fields.nameAr}</Label>
            <Input id="d-ar" dir="rtl" {...register("name_ar")} />
            <FormError message={errors.name_ar && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="d-en">{dict.org.fields.nameEn}</Label>
            <Input id="d-en" dir="ltr" {...register("name_en")} />
            <FormError message={errors.name_en && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="d-parent">{dict.org.fields.parent}</Label>
            <Select
              id="d-parent"
              disabled={level === "administration"}
              {...register("parent_department_id", {
                setValueAs: (v) => (v === "" ? null : v),
              })}
            >
              <option value="">{dict.org.noParent}</option>
              {parentCandidates.map((d) => (
                <option key={d.id} value={d.id}>
                  {name(d)}
                </option>
              ))}
            </Select>
            <FormError
              message={errors.parent_department_id && dict.common.required}
            />
          </div>
          <div>
            <Label htmlFor="d-manager">{dict.org.fields.manager}</Label>
            <Select
              id="d-manager"
              {...register("manager_id", {
                setValueAs: (v) => (v === "" ? null : v),
              })}
            >
              <option value="">{dict.org.noManager}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {managerName(m)} — {m.email}
                </option>
              ))}
            </Select>
          </div>
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
