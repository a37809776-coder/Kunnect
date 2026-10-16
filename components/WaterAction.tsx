"use client";

import { useState, useTransition } from "react";
import { recordWater } from "@/app/actions";
import { DropIcon } from "./Icons";
import MoodSheet from "./MoodSheet";

const SKIP_KEY = "pc_mood_skipped";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

function skippedToday() {
  try {
    return localStorage.getItem(SKIP_KEY) === today();
  } catch {
    return false;
  }
}

/** 흰색 정사각 액션 버튼(레퍼런스 + 버튼) — [물 줬어요] → 오늘의 마음 제안 */
export default function WaterAction({ plantId, plantName }: { plantId: string; plantName: string }) {
  const [pending, start] = useTransition();
  const [careEventId, setCareEventId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const onClick = () =>
    start(async () => {
      const res = await recordWater(plantId);
      if (!res.ok || !res.data) return;
      if (res.data.duplicate) {
        setToast("방금 기록했어요 💧");
      } else {
        setToast(`${plantName}에게 물을 줬어요 💧`);
        if (!skippedToday()) setCareEventId(res.data.careEventId);
      }
      setTimeout(() => setToast(null), 2200);
    });

  return (
    <>
      <button
        onClick={onClick}
        disabled={pending}
        aria-label="물 줬어요"
        className="grid h-16 w-16 shrink-0 place-items-center rounded-button bg-paper text-leaf-700 shadow-float transition active:scale-95 disabled:opacity-60"
      >
        <span className="flex flex-col items-center">
          <DropIcon size={24} />
          <span className="mt-0.5 text-[10px] font-bold">물 줬어요</span>
        </span>
      </button>
      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-28 z-40 mx-auto w-fit rounded-full bg-leaf-900 px-4 py-2 text-caption font-semibold text-cream">
          {toast}
        </div>
      )}
      {careEventId && (
        <MoodSheet
          careEventId={careEventId}
          onClose={(skipped) => {
            if (skipped) {
              try {
                localStorage.setItem(SKIP_KEY, today());
              } catch {}
            }
            setCareEventId(null);
          }}
        />
      )}
    </>
  );
}
