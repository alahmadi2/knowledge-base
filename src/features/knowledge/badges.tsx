import { Badge } from "@/components/ui/badge";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

// شارات «جديد | محدث | عاجل» — تظهر خلال مدة العرض المحددة من المضيف
export function KnowledgeBadges({
  dict,
  importance,
  isFirstVersion,
  publishedAt,
  displayDays,
}: {
  dict: Dictionary;
  importance: string;
  isFirstVersion: boolean;
  publishedAt: string | null;
  displayDays: number;
}) {
  const withinWindow =
    publishedAt && displayDays > 0
      ? Date.now() - new Date(publishedAt).getTime() < displayDays * 86400_000
      : false;

  return (
    <>
      {importance === "urgent" && <Badge tone="danger">{dict.knowledge.badges.urgent}</Badge>}
      {withinWindow && isFirstVersion && <Badge tone="accent">{dict.knowledge.badges.new}</Badge>}
      {withinWindow && !isFirstVersion && <Badge tone="info">{dict.knowledge.badges.updated}</Badge>}
    </>
  );
}
