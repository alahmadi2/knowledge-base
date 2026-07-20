import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { KnowledgeForm } from "@/features/knowledge/knowledge-form";
import { loadFormOptions } from "@/features/knowledge/form-data";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewKnowledgePage() {
  const session = await requireUser();
  if (!session.isContributor) redirect("/dashboard");
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const options = await loadFormOptions(session);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-bold text-ink">{dict.contribute.newTitle}</h1>
      <Card className="mt-3 border-dashed bg-state-info-bg/50 p-3">
        <p className="text-xs text-state-info">{dict.contribute.attachmentsAfterSave}</p>
      </Card>
      <div className="mt-4">
        <KnowledgeForm dict={dict} locale={locale} {...options} />
      </div>
    </div>
  );
}
