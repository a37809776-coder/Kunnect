"use client";

import { useState, useTransition } from "react";
import { saveMood } from "@/app/actions";
import { MOOD_EMOJIS } from "@/lib/types";

const LABELS = ["좋아요", "괜찮아요", "그저 그래요", "조금 지쳤어요", "힘들어요"];

/** 오늘의 마음 — 선택 기록. 건너뛰기를 [남기기]와 같은 크기로 둔다 (CLAUDE.md 금지 항목) */
export default function MoodSheet({ careEventId, onClose }: { careEventId: string; onClose: (skipped: boolean) => void }) {
  const [emoji, setEmoji] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      if (!emoji) return;
      const res = await saveMood({ careEventId, emoji, memo });
      if (res.ok) onClose(false);
    });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-leaf-900/40" role="dialog" aria-modal="true" aria-labelledby="mood-title">
      <div className="w-full max-w-[480px] rounded-t-panel bg-paper px-6 pb-8 pt-6">
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-leaf-100" />
        <h2 id="mood-title" className="text-title font-bold text-leaf-900">
          오늘 마음은 어때요?
        </h2>
        <p className="mt-1 text-body text-leaf-700">남기고 싶을 때만 골라 주세요. 기관에는 내가 허락한 경우에만 보여요.</p>
        <div className="mt-5 flex justify-between" role="radiogroup" aria-label="오늘의 마음">
          {MOOD_EMOJIS.map((e, i) => (
            <button
              key={e}
              role="radio"
              aria-checked={emoji === e}
              aria-label={LABELS[i]}
              onClick={() => setEmoji(e)}
              className={`grid h-14 w-14 place-items-center rounded-full text-[28px] transition ${
                emoji === e ? "bg-cream ring-2 ring-inset ring-leaf-500" : "bg-leaf-50"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <label className="mt-5 block">
          <span className="text-caption font-semibold text-leaf-700">한 줄 메모 (선택)</span>
          <textarea
            value={memo}
            onChange={(ev) => setMemo(ev.target.value.slice(0, 100))}
            rows={2}
            placeholder="오늘 있었던 일을 짧게 남겨도 좋아요"
            className="mt-1 w-full resize-none rounded-button border border-leaf-100 bg-leaf-50 px-4 py-3 text-body outline-none placeholder:text-leaf-300 focus:border-leaf-500"
          />
          <span className="block text-right text-caption text-leaf-300">{memo.length}/100</span>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => onClose(true)} className="rounded-button bg-leaf-100 py-4 text-heading font-bold text-leaf-700">
            건너뛰기
          </button>
          <button
            onClick={submit}
            disabled={!emoji || pending}
            className="rounded-button bg-leaf-500 py-4 text-heading font-bold text-cream disabled:opacity-50"
          >
            남기기
          </button>
        </div>
      </div>
    </div>
  );
}
