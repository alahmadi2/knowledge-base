// أنواع مطابقة لمخطط قاعدة البيانات (المرحلة 0)
export type OrgUnitLevel = "administration" | "department" | "sub_department";
export type AccountStatus = "active" | "disabled";
export type RoleCode = "super_admin" | "department_manager" | "content_contributor" | "employee";

export interface Sector {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  display_order: number;
}

export interface Department {
  id: string;
  sector_id: string;
  parent_department_id: string | null;
  level: OrgUnitLevel;
  code: string;
  name_ar: string;
  name_en: string;
  manager_id: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Profile {
  id: string;
  employee_number: string | null;
  full_name_ar: string;
  full_name_en: string;
  email: string;
  phone: string | null;
  job_title_ar: string | null;
  job_title_en: string | null;
  sector_id: string | null;
  department_id: string | null;
  preferred_language: "ar" | "en";
  account_status: AccountStatus;
  last_login_at: string | null;
}

export interface Role {
  id: string;
  code: RoleCode;
  name_ar: string;
  name_en: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  department_id: string | null;
}

export interface SessionUser {
  profile: Profile;
  roles: RoleCode[];
  managedDepartmentIds: string[];
  isSuperAdmin: boolean;
  isManager: boolean;
  isContributor: boolean;
}
