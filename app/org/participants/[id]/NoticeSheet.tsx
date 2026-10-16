"use client";

import { useState, useTransition } from "react";
import { sendNotice } from "@/app/actions";
import { SendIcon } from "@/components/Icons";

export default function NoticeSheet({
  recipientId,
  recipientName,
  templates,
}: {
  recipientId: string;
  recipientName: string;
  templates: string[];
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await sendNotice(recipientId, body);
      if (res.ok) {
        setOpen(false);
        setBody("");
        setResult({ ok: true, text: `${recipientName}님의 식물에게 안부를 전했어요` });
      } else {
        setResult({ ok: false, text: res.error });
      }
    });

  return (
    <>
      <button
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-button bg-leaf-500 py-4 text-heading font-bold text-cream shadow-float"
      >
        <SendIcon /> 안부 보내기
      </button>
      {result?.ok && (
        <p role="status" className="text-center text-caption font-semibold text-leaf-700">
          {result.text}
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-leaf-900/40" role="dialog" aria-modal="true" aria-labelledby="notice-title">
          <div className="w-full max-w-[480px] rounded-t-panel bg-paper px-6 pb-8 pt-6">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-leaf-100" />
            <h2 id="notice-title" className="text-title font-bold text-leaf-900">
              {recipientName}님께 안부
            </h2>
            <p className="mt-1 text-caption text-leaf-700">참여자 앱의 식물 메시지로 전달돼요.</p>
            <div className="no-scrollbar -mx-6 mt-4 flex gap-2 overflow-x-auto px-6">
              {templates.map((t) => (
                <button
                  key={t}
                  onClick={() => setBody(t)}
                  className="w-56 shrink-0 rounded-card bg-cream-soft px-4 py-3 text-left text-caption text-leaf-900"
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 300))}
              rows={4}
              placeholder="직접 쓰거나 위 문구를 골라 주세요"
              className="mt-4 w-full resize-none rounded-button border border-leaf-100 bg-leaf-50 px-4 py-3 text-body outline-none focus:border-leaf-500"
            />
            <div className="flex justify-between text-caption">
              <span className="font-semibold text-clay">{result && !result.ok ? result.text : ""}</span>
              <span className="text-leaf-300">{body.length}/300</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => setOpen(false)} className="rounded-button bg-leaf-100 py-4 text-heading font-bold text-leaf-700">
                닫기
              </button>
              <button
                onClick={submit}
                disabled={pending || !body.trim()}
                className="rounded-button bg-leaf-500 py-4 text-heading font-bold text-cream disabled:opacity-50"
              >
                {pending ? "보내는 중…" : "보내기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
