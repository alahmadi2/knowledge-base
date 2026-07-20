"use client";
import { useMemo, useState } from "react";
import { Plus, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Locale } from "@/lib/i18n/config";
import type { Department, Profile, RoleCode } from "@/types/db";
import { UserDialog } from "./user-dialog";

export type UserRow = {
  profile: Profile;
  roles: { code: RoleCode; department_id: string | null }[];
};

const roleTone: Record<RoleCode, "accent" | "info" | "success" | "neutral"> = {
  super_admin: "accent",
  department_manager: "info",
  content_contributor: "success",
  employee: "neutral",
};

export function UsersManager({
  dict,
  locale,
  rows,
  departments,
}: {
  dict: Dictionary;
  locale: Locale;
  rows: UserRow[];
  departments: Department[];
}) {
  const [dialog, setDialog] = useState<UserRow | "new" | null>(null);
  const [query, setQuery] = useState("");

  const name = (o: { name_ar?: string; name_en?: string; full_name_ar?: string; full_name_en?: string }) =>
    locale === "ar" ? (o.name_ar ?? o.full_name_ar ?? "") : (o.name_en ?? o.full_name_en ?? "");

  const deptName = (id: string | null) => {
    const d = departments.find((x) => x.id === id);
    return d ? name(d) : dict.common.none;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.profile.full_name_ar.toLowerCase().includes(q) ||
        r.profile.full_name_en.toLowerCase().includes(q) ||
        r.profile.email.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-surface-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.common.search}
            className="ps-9"
          />
        </div>
        <Button onClick={() => setDialog("new")}>
          <Plus className="h-4 w-4" />
          {dict.users.addUser}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<UserRound className="h-8 w-8" />} message={dict.users.noUsers} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>{dict.users.table.name}</TH>
              <TH>{dict.users.table.email}</TH>
              <TH>{dict.users.table.department}</TH>
              <TH>{dict.users.table.roles}</TH>
              <TH>{dict.users.table.status}</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((row) => (
              <TR
                key={row.profile.id}
                className="cursor-pointer"
                onClick={() => setDialog(row)}
              >
                <TD className="font-medium">{name(row.profile)}</TD>
                <TD dir="ltr" className="text-ink-soft">{row.profile.email}</TD>
                <TD>{deptName(row.profile.department_id)}</TD>
                <TD>
                  <span className="flex flex-wrap gap-1">
                    {row.roles.map((r) => (
                      <Badge key={r.code} tone={roleTone[r.code]}>
                        {dict.users.roleNames[r.code]}
                      </Badge>
                    ))}
                  </span>
                </TD>
                <TD>
                  {row.profile.account_status === "active" ? (
                    <Badge tone="success">{dict.common.active}</Badge>
                  ) : (
                    <Badge tone="danger">{dict.common.disabled}</Badge>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {dialog && (
        <UserDialog
          dict={dict}
          locale={locale}
          departments={departments}
          user={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
        />
      )}
    </Card>
  );
}
