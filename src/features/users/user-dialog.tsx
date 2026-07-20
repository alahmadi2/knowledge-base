"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormError } from "@/components/ui/form-error";
import { createUser, updateUser } from "@/app/(app)/admin/users/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Locale } from "@/lib/i18n/config";
import type { AccountStatus, Department, RoleCode } from "@/types/db";
import type { UserRow } from "./users-manager";

const ALL_ROLES: RoleCode[] = [
  "employee",
  "content_contributor",
  "department_manager",
  "super_admin",
];

type FormValues = {
  full_name_ar: string;
  full_name_en: string;
  email: string;
  phone: string;
  employee_number: string;
  department_id: string;
  preferred_language: "ar" | "en";
  password: string;
  roles: RoleCode[];
  manager_department_id: string;
  account_status: AccountStatus;
};

export function UserDialog({
  dict,
  locale,
  departments,
  user,
  onClose,
}: {
  dict: Dictionary;
  locale: Locale;
  departments: Department[];
  user: UserRow | null;
  onClose: () => void;
}) {
  const isEdit = !!user;
  const [serverError, setServerError] = useState<string | null>(null);

  const managerRole = user?.roles.find((r) => r.code === "department_manager");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: user
      ? {
          full_name_ar: user.profile.full_name_ar,
          full_name_en: user.profile.full_name_en,
          email: user.profile.email,
          phone: user.profile.phone ?? "",
          employee_number: user.profile.employee_number ?? "",
          department_id: user.profile.department_id ?? "",
          preferred_language: user.profile.preferred_language,
          password: "",
          roles: user.roles.map((r) => r.code),
          manager_department_id: managerRole?.department_id ?? "",
          account_status: user.profile.account_status,
        }
      : {
          full_name_ar: "",
          full_name_en: "",
          email: "",
          phone: "",
          employee_number: "",
          department_id: "",
          preferred_language: "ar",
          password: "",
          roles: ["employee"],
          manager_department_id: "",
          account_status: "active",
        },
  });

  const roles = watch("roles") ?? [];
  const isManagerSelected = roles.includes("department_manager");
  const name = (d: Department) => (locale === "ar" ? d.name_ar : d.name_en);

  const onSubmit = async (v: FormValues) => {
    setServerError(null);
    const payload = {
      full_name_ar: v.full_name_ar,
      full_name_en: v.full_name_en,
      email: v.email,
      phone: v.phone,
      employee_number: v.employee_number,
      department_id: v.department_id || null,
      preferred_language: v.preferred_language,
      roles: v.roles,
      manager_department_id: v.manager_department_id || null,
    };
    const res = isEdit
      ? await updateUser({
          ...payload,
          id: user!.profile.id,
          account_status: v.account_status,
        })
      : await createUser({ ...payload, password: v.password });

    if (res.ok) onClose();
    else if (res.error === "email_exists") setServerError(dict.users.emailExists);
    else setServerError(dict.common.error);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={isEdit ? dict.users.editUser : dict.users.addUser}
      wide
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="u-ar">{dict.users.fields.fullNameAr}</Label>
            <Input id="u-ar" dir="rtl" {...register("full_name_ar", { required: true, minLength: 2 })} />
            <FormError message={errors.full_name_ar && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="u-en">{dict.users.fields.fullNameEn}</Label>
            <Input id="u-en" dir="ltr" {...register("full_name_en", { required: true, minLength: 2 })} />
            <FormError message={errors.full_name_en && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="u-email">{dict.users.fields.email}</Label>
            <Input
              id="u-email"
              type="email"
              dir="ltr"
              disabled={isEdit}
              {...register("email", { required: true })}
            />
            <FormError message={errors.email && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="u-phone">{dict.users.fields.phone}</Label>
            <Input id="u-phone" dir="ltr" placeholder="+9665xxxxxxxx" {...register("phone", { pattern: /^\+?[0-9]{9,15}$/ })} />
            <FormError message={errors.phone && dict.common.required} />
          </div>
          <div>
            <Label htmlFor="u-emp">{dict.users.fields.employeeNumber}</Label>
            <Input id="u-emp" dir="ltr" {...register("employee_number")} />
          </div>
          <div>
            <Label htmlFor="u-dept">{dict.users.fields.department}</Label>
            <Select id="u-dept" {...register("department_id")}>
              <option value="">{dict.common.none}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {name(d)}
                </option>
              ))}
            </Select>
          </div>
          {!isEdit && (
            <div>
              <Label htmlFor="u-pass">{dict.users.fields.password}</Label>
              <Input id="u-pass" type="password" dir="ltr" {...register("password", { required: true, minLength: 8 })} />
              <p className="mt-1 text-xs text-ink-faint">{dict.users.passwordHint}</p>
              <FormError message={errors.password && dict.common.required} />
            </div>
          )}
          <div>
            <Label htmlFor="u-lang">{dict.users.fields.language}</Label>
            <Select id="u-lang" {...register("preferred_language")}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </Select>
          </div>
          {isEdit && (
            <div>
              <Label htmlFor="u-status">{dict.users.fields.status}</Label>
              <Select id="u-status" {...register("account_status")}>
                <option value="active">{dict.common.active}</option>
                <option value="disabled">{dict.common.disabled}</option>
              </Select>
            </div>
          )}
        </div>

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-ink">
            {dict.users.fields.roles}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {ALL_ROLES.map((code) => (
              <label
                key={code}
                className="flex items-center gap-2 rounded-md border border-surface-line px-3 py-2 text-sm text-ink has-[:checked]:border-brand-accent has-[:checked]:bg-brand-accent/10"
              >
                <input
                  type="checkbox"
                  value={code}
                  className="h-4 w-4 accent-brand"
                  {...register("roles", { required: true })}
                />
                {dict.users.roleNames[code]}
              </label>
            ))}
          </div>
          <FormError message={errors.roles && dict.common.required} />
        </fieldset>

        {isManagerSelected && (
          <div>
            <Label htmlFor="u-mdept">{dict.users.managerScope}</Label>
            <Select
              id="u-mdept"
              {...register("manager_department_id", { required: isManagerSelected })}
            >
              <option value="">{dict.common.none}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {name(d)}
                </option>
              ))}
            </Select>
            <FormError message={errors.manager_department_id && dict.common.required} />
          </div>
        )}

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
