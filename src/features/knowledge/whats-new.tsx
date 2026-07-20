"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Locale } from "@/lib/i18n/config";

export type WhatsNewItem = {
  item_id: string;
  title: string;
  summary: string;
  type_name: string | null;
  importance: string;
  is_first_version: boolean;
  version_label: string;
};

// عرض تفاعلي (Carousel) للمستجدات خلال مدة الظهور المحددة من المضيف
export function WhatsNew({
  dict,
  locale,
  items,
}: {
  dict: Dictionary;
  locale: Locale;
  items: WhatsNewItem[];
}) {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);
  const count = items.length;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count]
  );

  useEffect(() => {
    if (count < 2) return;
    const t = setInterval(() => {
      if (!paused.current) go(1);
    }, 6000);
    return () => clearInterval(t);
  }, [count, go]);

  if (count === 0) return null;
  const it = items[index];
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;

  return (
    <Card
      className="relative overflow-hidden bg-brand p-0 text-white"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-accent">
          <Sparkles className="h-3.5 w-3.5" />
          {dict.whatsNew.title}
        </p>
        {count > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => go(-1)}
              className="rounded-md p-1 text-brand-accent hover:bg-white/10 hover:text-white"
              aria-label="prev"
            >
              <Prev className="h-4 w-4" />
            </button>
            <button
              onClick={() => go(1)}
              className="rounded-md p-1 text-brand-accent hover:bg-white/10 hover:text-white"
              aria-label="next"
            >
              <Next className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <Link href={`/knowledge/${it.item_id}`} className="block px-5 pb-5 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {it.importance === "urgent" && (
            <Badge tone="danger">{dict.knowledge.badges.urgent}</Badge>
          )}
          <Badge tone="accent" className="bg-brand-accent/20 text-brand-accent">
            {it.is_first_version ? dict.knowledge.badges.new : dict.knowledge.badges.updated}
          </Badge>
          {it.type_name && (
            <span className="text-xs text-brand-accent/80">{it.type_name}</span>
          )}
          <span className="ms-auto font-mono text-xs text-brand-accent/60" dir="ltr">
            v{it.version_label}
          </span>
        </div>
        <h3 className="mt-2 text-lg font-bold leading-relaxed">{it.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-brand-accent">
          {it.summary}
        </p>
        <p className="mt-3 text-sm font-medium text-brand-accent underline-offset-4 hover:underline">
          {dict.whatsNew.view} ←
        </p>
      </Link>

      {count > 1 && (
        <div className="flex justify-center gap-1.5 pb-4">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-brand-accent" : "w-1.5 bg-white/25 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
