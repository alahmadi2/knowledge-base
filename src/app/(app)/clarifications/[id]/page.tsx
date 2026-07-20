import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReplyBox } from "./reply-box";

export const dynamic = "force-dynamic";

export default async function ClarificationThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const { data: req } = await supabase
    .from("clarification_requests")
    .select(
      `id, question, status, created_at, requested_by, assigned_to, knowledge_item_id,
       requester:profiles!clarification_requests_requested_by_fkey(full_name_ar, full_name_en),
       version:knowledge_versions(title_ar, title_en)`
    )
    .eq("id", id)
    .single();
  if (!req) notFound();

  const { data: messages } = await supabase
    .from("clarification_messages")
    .select("id, message, created_at, sender_id, profiles(full_name_ar, full_name_en)")
    .eq("request_id", id)
    .order("created_at");

  const canModerate =
    session.isSuperAdmin ||
    req.assigned_to === session.profile.id ||
    session.managedDepartmentIds.length > 0;

  const requester = req.requester as unknown as {
    full_name_ar: string;
    full_name_en: string;
  } | null;
  const version = req.version as unknown as {
    title_ar: string;
    title_en: string;
  } | null;

  const pName = (p: unknown) => {
    const x = p as { full_name_ar: string; full_name_en: string } | null;
    return x ? (locale === "ar" ? x.full_name_ar : x.full_name_en) : dict.common.none;
  };
  const fmt = (d: string) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              req.status === "answered"
                ? "success"
                : req.status === "new"
                  ? "info"
                  : req.status === "under_review"
                    ? "warning"
                    : "neutral"
            }
          >
            {dict.clarifications.status[req.status as keyof typeof dict.clarifications.status]}
          </Badge>
          <Link
            href={`/knowledge/${req.knowledge_item_id}`}
            className="text-sm text-brand-muted hover:underline"
          >
            {version ? (locale === "ar" ? version.title_ar : version.title_en) : ""}
          </Link>
        </div>
        <h1 className="mt-3 text-lg font-bold leading-relaxed text-ink">{req.question}</h1>
        <p className="mt-1 text-xs text-ink-soft">
          {pName(requester)} · {fmt(req.created_at)}
        </p>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          {dict.clarifications.thread}
        </h2>
        {(messages ?? []).length === 0 ? (
          <p className="text-sm text-ink-faint">{dict.common.none}</p>
        ) : (
          <ul className="space-y-3">
            {(messages ?? []).map((m) => {
              const mine = m.sender_id === session.profile.id;
              return (
                <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3.5 py-2.5",
                      mine ? "bg-brand text-white" : "bg-surface-page text-ink"
                    )}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                    <p
                      className={cn(
                        "mt-1 text-[11px]",
                        mine ? "text-brand-accent" : "text-ink-faint"
                      )}
                    >
                      {pName(m.profiles)} · {fmt(m.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ReplyBox
        dict={dict}
        requestId={req.id}
        status={req.status}
        canModerate={canModerate}
      />
    </div>
  );
}
