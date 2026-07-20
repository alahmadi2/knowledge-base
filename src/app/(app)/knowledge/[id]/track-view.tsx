"use client";
import { useEffect, useRef } from "react";
import { trackView } from "../actions";

// تسجيل المشاهدة مرة واحدة عند فتح الصفحة — منفصل تماماً عن تأكيد القراءة
export function TrackView({ versionId }: { versionId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackView(versionId);
  }, [versionId]);
  return null;
}
