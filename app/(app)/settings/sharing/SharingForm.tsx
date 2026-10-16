"use client";

import { useState, useTransition } from "react";
import { updateSharing } from "@/app/actions";
import ShareToggle from "@/components/ShareToggle";
import { withJosa } from "@/lib/ko";

type Share = { shareCare: boolean; shareEnvironment: boolean; shareMood: boolean };

export default function SharingForm({ orgName, initial }: { orgName: string; initial: Share }) {
  const [share, setShare] = useState(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  const save = (next: Share, note = "저장했어요") => {
    setShare(next);
    start(async () => {
      const res = await updateSharing(next);
      setSaved(res.ok ? note : res.error);
      setTimeout(() => setSaved(null), 2000);
    });
  };
  const nothing = !share.shareCare && !share.shareEnvironment && !share.shareMood;

  const preview = [
    share.shareCare && "물 준 기록과 마지막 돌봄 날짜, 돌봄이 이어지는지 여부",
    share.shareEnvironment && "수분·온도·빛 측정값과 디바이스 연결 상태",
    share.shareMood && "내가 남긴 오늘의 마음(이모지·메모)",
  ].filter(Boolean) as string[];

  return (
    <div>
      <div className="space-y-2">
        <ShareToggle label="돌봄 활동" hint="물 준 기록과 돌봄이 이어지는지 여부" checked={share.shareCare} disabled={pending}
          onChange={(v) => save({ ...share, shareCare: v })} />
        <ShareToggle label="재배 환경" hint="수분·온도·빛 측정값" checked={share.shareEnvironment} disabled={pending}
          onChange={(v) => save({ ...share, shareEnvironment: v })} />
        <ShareToggle label="마음 기록" hint="내가 남긴 이모지와 메모" checked={share.shareMood} disabled={pending}
          onChange={(v) => save({ ...share, shareMood: v })} />
      </div>
      <p role="status" className="mt-2 h-5 text-caption font-semibold text-leaf-700">{saved}</p>

      <div className="mt-4 rounded-card bg-cream-soft px-5 py-5">
        <h2 className="text-body font-bold text-leaf-900">{withJosa(orgName, "이", "가")} 보게 될 내용</h2>
        {nothing ? (
          <p className="mt-2 text-body text-leaf-700">아무것도 나누지 않아요. 기관 화면에는 이름만 보여요.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body text-leaf-900">
            {preview.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {!share.shareCare && !nothing && (
          <p className="mt-2 text-caption text-leaf-700">돌봄 활동을 나누지 않으면 기관 안부 메시지도 받지 않아요.</p>
        )}
      </div>

      {!nothing && (
        <button
          onClick={() => save({ shareCare: false, shareEnvironment: false, shareMood: false }, "공유 동의를 철회했어요")}
          disabled={pending}
          className="mt-4 w-full py-3 text-body font-semibold text-clay underline underline-offset-4"
        >
          공유 동의 전부 철회하기
        </button>
      )}
    </div>
  );
}
