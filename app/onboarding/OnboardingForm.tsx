"use client";

import { useActionState, useState } from "react";
import { completeOnboarding } from "@/app/actions";
import PlantArt from "@/components/PlantArt";
import type { PlantArtKind } from "@/lib/types";
import ShareToggle from "@/components/ShareToggle";

const field =
  "mt-1 w-full rounded-button border border-leaf-100 bg-leaf-50 px-4 py-3 text-body outline-none focus:border-leaf-500";

export default function OnboardingForm({ species }: { species: { id: string; name: string; art: PlantArtKind }[] }) {
  const [state, action, pending] = useActionState(completeOnboarding, null);
  const [speciesId, setSpeciesId] = useState(species[0]?.id ?? "");

  return (
    <form action={action} className="space-y-7">
      <fieldset className="space-y-3">
        <legend className="text-heading font-bold text-leaf-900">1. 기관과 디바이스 연결</legend>
        <label className="block">
          <span className="text-caption font-semibold text-leaf-700">기관 초대코드</span>
          <input name="inviteCode" required autoCapitalize="characters" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-caption font-semibold text-leaf-700">디바이스 번호</span>
            <input name="serial" required placeholder="PC-0000" autoCapitalize="characters" className={field} />
          </label>
          <label className="block">
            <span className="text-caption font-semibold text-leaf-700">페어링 코드</span>
            <input name="pairingCode" required inputMode="numeric" className={field} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-heading font-bold text-leaf-900">2. 어떤 식물인가요?</legend>
        <input type="hidden" name="speciesId" value={speciesId} />
        <div className="mt-3 grid grid-cols-3 gap-3" role="radiogroup">
          {species.map((s) => {
            const on = s.id === speciesId;
            return (
              <button
                type="button"
                key={s.id}
                role="radio"
                aria-checked={on}
                onClick={() => setSpeciesId(s.id)}
                className={`flex flex-col items-center rounded-card py-3 text-caption font-bold transition ${
                  on ? "bg-leaf-500 text-cream" : "bg-leaf-50 text-leaf-700"
                }`}
              >
                <PlantArt kind={s.art} size={64} />
                <span className="mt-1">{s.name}</span>
              </button>
            );
          })}
        </div>
        <label className="mt-4 block">
          <span className="text-caption font-semibold text-leaf-700">식물 이름 (식물이 이 이름으로 말을 걸어요)</span>
          <input name="nickname" required maxLength={12} placeholder="예: 몬테" className={field} />
        </label>
      </fieldset>

      <fieldset>
        <legend className="text-heading font-bold text-leaf-900">3. 기관과 무엇을 나눌까요?</legend>
        <p className="mt-1 text-caption text-leaf-700">언제든 설정에서 바꾸거나 철회할 수 있어요. 마음 기록은 기본으로 나누지 않아요.</p>
        <div className="mt-3 space-y-2">
          <ShareToggle name="shareCare" label="돌봄 활동" hint="물 준 기록과 돌봄이 이어지는지 여부" defaultChecked />
          <ShareToggle name="shareEnvironment" label="재배 환경" hint="수분·온도·빛 측정값" defaultChecked />
          <ShareToggle name="shareMood" label="마음 기록" hint="내가 남긴 이모지와 메모" />
        </div>
      </fieldset>

      {state && !state.ok && (
        <p role="alert" className="rounded-button bg-clay/10 px-4 py-3 text-caption font-semibold text-clay">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="w-full rounded-button bg-leaf-500 py-4 text-heading font-bold text-cream disabled:opacity-60">
        {pending ? "연결하는 중…" : "시작하기"}
      </button>
    </form>
  );
}
