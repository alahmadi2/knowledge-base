import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  requested_at: string;
  sla_due_at: string | null;
  status: string;
  resubmission_count: number;
  decided_at: string | null;
  knowledge_versions: {
    title_ar: string;
    title_en: string;
    version_label: string;
    importance: string;
  } | null;
  requester: { full_name_ar: string; full_name_en: string } | null;
};

export default async function ApprovalsPage() {
  const session = await requireUser();
  if (!session.isManager) redirect("/dashboard");
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const select = `id, requested_at, sla_due_at, status, resubmission_count, decided_at,
    knowledge_versions(title_ar, title_en, version_label, importance),
    requester:profiles!approval_requests_requested_by_fkey(full_name_ar, full_name_en)`;

  const [{ data: pending }, { data: decided }] = await Promise.all([
    supabase
      .from("approval_requests")
      .select(select)
      .eq("status", "pending")
      .order("requested_at", { ascending: true }),
    supabase
      .from("approval_requests")
      .select(select)
      .neq("status", "pending")
      .order("decided_at", { ascending: false })
      .limit(20),
  ]);

  const name = (o: { full_name_ar: string; full_name_en: string } | null) =>
    o ? (locale === "ar" ? o.full_name_ar : o.full_name_en) : dict.common.none;
  const title = (v: Row["knowledge_versions"]) =>
    v ? (locale === "ar" ? v.title_ar : v.title_en) : dict.common.none;
  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : dict.common.none;

  const overdue = (d: string | null) => !!d && new Date(d).getTime() < Date.now();

  const statusTone = (s: string) =>
    s === "approved" ? "success" : s === "rejected" ? "danger" : "warning";
  const statusLabel = (s: string) =>
    s === "approved"
      ? dict.approvals.approved
      : s === "rejected"
        ? dict.approvals.rejectedDone
        : dict.approvals.returned;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold text-ink">{dict.approvals.title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{dict.approvals.subtitle}</p>

      <h2 className="mt-6 text-sm font-semibold text-ink">{dict.approvals.pending}</h2>
      <Card className="mt-2">
        {(pending ?? []).length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-8 w-8" />}
            message={dict.approvals.noPending}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{dict.contribute.table.title}</TH>
                <TH>{dict.approvals.requestedBy}</TH>
                <TH>{dict.approvals.requestedAt}</TH>
                <TH>{dict.approvals.slaDue}</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {(pending as unknown as Row[]).map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">
                    {title(r.knowledge_versions)}
                    <span className="ms-2 font-mono text-xs text-ink-faint" dir="ltr">
                      v{r.knowledge_versions?.version_label}
                    </span>
                    {r.knowledge_versions?.importance === "urgent" && (
                      <Badge tone="danger" className="ms-2">{dict.knowledge.badges.urgent}</Badge>
                    )}
                    {r.resubmission_count > 0 && (
                      <Badge tone="info" className="ms-2">
                        {dict.approvals.resubmission} #{r.resubmission_count}
                      </Badge>
                    )}
                  </TD>
                  <TD>{name(r.requester)}</TD>
                  <TD className="text-xs text-ink-soft">{fmt(r.requested_at)}</TD>
                  <TD className="text-xs">
                    <span className={overdue(r.sla_due_at) ? "font-medium text-state-danger" : "text-ink-soft"}>
                      {fmt(r.sla_due_at)}
                    </span>
                  </TD>
                  <TD>
                    <Link
                      href={`/approvals/${r.id}`}
                      className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-soft"
                    >
                      {dict.approvals.review}
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {(decided ?? []).length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-ink">{dict.approvals.decided}</h2>
          <Card className="mt-2">
            <Table>
              <TBody>
                {(decided as unknown as Row[]).map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">{title(r.knowledge_versions)}</TD>
                    <TD>{name(r.requester)}</TD>
                    <TD className="text-xs text-ink-soft">{fmt(r.decided_at)}</TD>
                    <TD>
                      <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
