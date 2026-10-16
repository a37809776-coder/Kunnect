import Link from "next/link";
import type { ReactNode } from "react";
import PlantArt from "./PlantArt";
import { SpeechBubble, StatBadge } from "./ui";
import type { PlantView } from "@/lib/view/plantView";
import { relativeKo } from "@/lib/time";

/** 레퍼런스 왼쪽 화면 상단 — 그린 패널 + 큰 탑뷰 식물 + 크림 대형 타이포 + 말풍선 */
export default function PlantHero({
  view,
  topRight,
  title = "플랜트커넥트",
  compact = false,
}: {
  view: PlantView;
  topRight?: ReactNode;
  title?: string;
  compact?: boolean;
}) {
  const { plant, species, latest, levels } = view;
  return (
    <section className="relative overflow-hidden rounded-bl-panel bg-leaf-500 px-5 pb-7 pt-5 text-cream">
      <PlantArt
        kind={species.art}
        size={compact ? 210 : 250}
        thirsty={view.thirsty}
        label={`${plant.nickname} (${species.name})`}
        className={`pointer-events-none absolute -right-14 ${compact ? "-top-6" : "top-2"}`}
      />
      <header className="relative flex items-center justify-between">
        <p className="text-heading font-bold text-cream/90">{title}</p>
        {topRight}
      </header>
      <div className={`relative ${compact ? "mt-16" : "mt-24"}`}>
        <p className="text-caption font-semibold text-leaf-50/75">{species.name}</p>
        <h1 className="text-display font-extrabold leading-none text-cream">
          <Link href={`/plant/${plant.id}`}>{plant.nickname}</Link>
        </h1>
        <SpeechBubble className="mt-4 max-w-[78%]">
          <p>{view.bubble}</p>
          {view.bubbleAt && !view.disconnected && (
            <p className="mt-1 text-caption text-leaf-700/70">{relativeKo(view.bubbleAt)}</p>
          )}
        </SpeechBubble>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="현재 환경">
          <StatBadge kind="moisture" value={latest ? `${latest.soilMoisture}%` : "–"} level={levels.moisture} />
          <StatBadge kind="temperature" value={latest ? `${latest.temperature}℃` : "–"} level={levels.temperature} />
          <StatBadge kind="light" value={latest ? `${latest.light.toLocaleString()}lx` : "–"} level={levels.light} />
        </div>
      </div>
    </section>
  );
}
