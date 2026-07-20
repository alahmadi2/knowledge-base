"use client";
import { useMemo, useState, useTransition } from "react";
import { Building2, CornerDownLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Locale } from "@/lib/i18n/config";
import type { Department, Sector } from "@/types/db";
import { SectorDialog } from "./sector-dialog";
import { DepartmentDialog, type ManagerOption } from "./department-dialog";

export function OrgManager({
  dict,
  locale,
  sectors,
  departments,
  managers,
}: {
  dict: Dictionary;
  locale: Locale;
  sectors: Sector[];
  departments: Department[];
  managers: ManagerOption[];
}) {
  const [selectedSector, setSelectedSector] = useState<string | null>(
    sectors[0]?.id ?? null
  );
  const [sectorDialog, setSectorDialog] = useState<Sector | "new" | null>(null);
  const [deptDialog, setDeptDialog] = useState<Department | "new" | null>(null);
  const [, startTransition] = useTransition();

  const name = (o: { name_ar: string; name_en: string }) =>
    locale === "ar" ? o.name_ar : o.name_en;

  const sectorDepts = useMemo(
    () => departments.filter((d) => d.sector_id === selectedSector),
    [departments, selectedSector]
  );

  // ترتيب هرمي: الوحدات الجذرية ثم أبناؤها
  const tree = useMemo(() => {
    const roots = sectorDepts.filter((d) => !d.parent_department_id);
    const childrenOf = (id: string) =>
      sectorDepts.filter((d) => d.parent_department_id === id);
    const flat: { dept: Department; depth: number }[] = [];
    const walk = (nodes: Department[], depth: number) => {
      for (const n of nodes) {
        flat.push({ dept: n, depth });
        walk(childrenOf(n.id), depth + 1);
      }
    };
    walk(roots, 0);
    return flat;
  }, [sectorDepts]);

  const managerName = (id: string | null) => {
    if (!id) return null;
    const m = managers.find((x) => x.id === id);
    return m ? (locale === "ar" ? m.full_name_ar : m.full_name_en) : null;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* القطاعات */}
      <Card className="self-start">
        <div className="flex items-center justify-between border-b border-surface-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{dict.org.sectors}</h2>
          <Button size="sm" variant="ghost" onClick={() => setSectorDialog("new")}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {sectors.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-8 w-8" />}
            message={dict.org.noSectors}
            action={
              <Button size="sm" onClick={() => setSectorDialog("new")}>
                {dict.org.addSector}
              </Button>
            }
          />
        ) : (
          <ul className="p-2">
            {sectors.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => startTransition(() => setSelectedSector(s.id))}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-md px-3 py-2 text-start text-sm",
                    selectedSector === s.id
                      ? "bg-brand text-white"
                      : "text-ink hover:bg-surface-page"
                  )}
                >
                  <span className="truncate">{name(s)}</span>
                  <span className="flex items-center gap-1.5">
                    {!s.is_active && (
                      <Badge tone="warning">{dict.common.inactive}</Badge>
                    )}
                    <Pencil
                      className={cn(
                        "h-3.5 w-3.5 opacity-0 group-hover:opacity-70",
                        selectedSector === s.id && "text-white"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSectorDialog(s);
                      }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* الوحدات التنظيمية */}
      <Card>
        <div className="flex items-center justify-between border-b border-surface-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{dict.org.unitsOf}</h2>
          <Button
            size="sm"
            variant="secondary"
            disabled={!selectedSector}
            onClick={() => setDeptDialog("new")}
          >
            <Plus className="h-4 w-4" />
            {dict.org.addUnit}
          </Button>
        </div>
        {tree.length === 0 ? (
          <EmptyState message={dict.org.noUnits} />
        ) : (
          <ul className="divide-y divide-surface-line">
            {tree.map(({ dept, depth }) => (
              <li
                key={dept.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-page/50"
              >
                <div
                  className="flex min-w-0 items-center gap-2"
                  style={{ paddingInlineStart: `${depth * 24}px` }}
                >
                  {depth > 0 && (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 -scale-x-100 text-ink-faint rtl:scale-x-100" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {name(dept)}
                      <span className="ms-2 font-mono text-xs text-ink-faint">
                        {dept.code}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {dict.org.levels[dept.level]}
                      {managerName(dept.manager_id) && (
                        <> · {dict.org.fields.manager}: {managerName(dept.manager_id)}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!dept.is_active && (
                    <Badge tone="warning">{dict.common.inactive}</Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDeptDialog(dept)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {sectorDialog && (
        <SectorDialog
          dict={dict}
          sector={sectorDialog === "new" ? null : sectorDialog}
          onClose={() => setSectorDialog(null)}
        />
      )}
      {deptDialog && selectedSector && (
        <DepartmentDialog
          dict={dict}
          locale={locale}
          sectorId={selectedSector}
          department={deptDialog === "new" ? null : deptDialog}
          siblings={sectorDepts}
          managers={managers}
          onClose={() => setDeptDialog(null)}
        />
      )}
    </div>
  );
}
