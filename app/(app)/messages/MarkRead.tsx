"use client";

import { useEffect } from "react";
import { markAllRead } from "@/app/actions";

/** F3-09: 메시지 목록을 열면 읽음 처리 (안 읽음 점은 이번 화면에서는 그대로 보여준다) */
export default function MarkRead({ plantIds, hasUnread }: { plantIds: string[]; hasUnread: boolean }) {
  useEffect(() => {
    if (hasUnread) void markAllRead(plantIds);
  }, [hasUnread, plantIds]);
  return null;
}
