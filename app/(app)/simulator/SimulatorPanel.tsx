"use client";

import { useState, useTransition, type ComponentType } from "react";
import { simulateReading } from "@/app/actions";
import { BatteryIcon, DropIcon, SunIcon, ThermoIcon } from "@/components/Icons";

type Values = { soilMoisture: number; temperature: number; light: number; battery: number };
type At = "now" | "noon" | "night";

type Ranges = Record<"moisture" | "temperature" | "light", [number, number]>;

// 식물 종의 적정 범위를 기준으로 값을 만든다 (종마다 '마름'·'촉촉함'이 다르다)
const PRESETS: { label: string; emoji: string; patch: (r: Ranges) => Partial<Values>; at?: At }[] = [
  { label: "물 주기", emoji: "💧", patch: (r) => ({ soilMoisture: r.moisture[1] - 5 }) },
  { label: "흙이 마름", emoji: "🏜️", patch: (r) => ({ soilMoisture: Math.max(2, r.moisture[0] - 15) }) },
  { label: "창가 햇빛", emoji: "☀️", patch: (r) => ({ light: Math.round((r.light[0] + r.light[1]) / 2) }), at: "noon" },
  { label: "어두운 방", emoji: "🌑", patch: () => ({ light: 80 }), at: "noon" },
  { label: "추운 밤", emoji: "🥶", patch: (r) => ({ temperature: r.temperature[0] - 6, light: 0 }), at: "night" },
  { label: "배터리 부족", emoji: "🪫", patch: () => ({ battery: 12 }) },
];

const SLIDERS: {
  key: keyof Values;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  icon: ComponentType<{ size?: number }>;
  range?: "moisture" | "temperature" | "light";
}[] = [
  { key: "soilMoisture", label: "토양 수분", unit: "%", min: 0, max: 100, step: 1, icon: DropIcon, range: "moisture" },
  { key: "temperature", label: "온도", unit: "℃", min: -5, max: 45, step: 0.5, icon: ThermoIcon, range: "temperature" },
  { key: "light", label: "조도", unit: "lux", min: 0, max: 20000, step: 50, icon: SunIcon, range: "light" },
  { key: "battery", label: "배터리", unit: "%", min: 0, max: 100, step: 1, icon: BatteryIcon },
];

export default function SimulatorPanel({
  plantId,
  plantName,
  deviceLabel,
  initial,
  ranges,
}: {
  plantId: string;
  plantName: string;
  deviceLabel: string;
  initial: Values;
  ranges: Ranges;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [at, setAt] = useState<At>("now");
  const [resetCooldown, setResetCooldown] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [pending, start] = useTransition();

  const send = (v = values, when = at) =>
    start(async () => {
      const res = await simulateReading({ plantId, ...v, at: when, resetCooldown });
      if (!res.ok) return setResult({ ok: false, lines: [res.error] });
      setResult({
        ok: true,
        lines: res.data?.bodies.length
          ? res.data.bodies
          : ["새 메시지는 없어요 (상태가 같거나 쿨다운·하루 3개 제한 중)"],
      });
    });

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const next = { ...values, ...p.patch(ranges) };
    const when = p.at ?? at;
    setValues(next);
    setAt(when);
    send(next, when);
  };

  return (
    <div className="pb-6">
      <p className="text-caption font-semibold text-leaf-700">{deviceLabel}</p>

      <h2 className="mt-4 text-heading font-bold text-leaf-900">상황 바로 보내기</h2>
      <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            disabled={pending}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-leaf-500 px-4 py-2.5 text-body font-bold text-cream shadow-float disabled:opacity-60"
          >
            <span aria-hidden>{p.emoji}</span>
            {p.label}
          </button>
        ))}
      </div>

      <h2 className="mt-6 text-heading font-bold text-leaf-900">센서 값 직접 조절</h2>
      <div className="mt-2 space-y-3 rounded-card bg-paper px-5 py-5">
        {SLIDERS.map((s) => {
          const Icon = s.icon;
          const v = values[s.key];
          const r = s.range ? ranges[s.range] : null;
          const out = r ? v < r[0] || v > r[1] : s.key === "battery" && v < 20;
          return (
            <label key={s.key} className="block">
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-body font-semibold text-leaf-900">
                  <span className={`grid h-8 w-8 place-items-center rounded-badge border ${out ? "border-amber text-[#9a6420]" : "border-leaf-300 text-leaf-700"}`}>
                    <Icon size={16} />
                  </span>
                  {s.label}
                </span>
                <span className={`text-body font-bold tabular-nums ${out ? "text-[#9a6420]" : "text-leaf-700"}`}>
                  {v.toLocaleString()}
                  {s.unit}
                </span>
              </span>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={v}
                onChange={(e) => setValues({ ...values, [s.key]: Number(e.target.value) })}
                className="mt-1 w-full"
                aria-label={s.label}
              />
              {r && (
                <span className="block text-caption text-leaf-300">
                  {plantName} 적정 {r[0].toLocaleString()}–{r[1].toLocaleString()}
                  {s.unit}
                  {s.key === "light" && " (낮 시간 기준)"}
                </span>
              )}
            </label>
          );
        })}
      </div>

      <h2 className="mt-6 text-heading font-bold text-leaf-900">측정 시간대</h2>
      <div className="mt-2 grid grid-cols-3 rounded-full bg-leaf-100 p-1 text-body font-bold" role="radiogroup">
        {(
          [
            ["now", "지금"],
            ["noon", "낮 12시"],
            ["night", "밤 10시"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="radio"
            aria-checked={at === k}
            onClick={() => setAt(k)}
            className={`rounded-full py-2 ${at === k ? "bg-paper text-leaf-900 shadow" : "text-leaf-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-3 text-body text-leaf-900">
        <input type="checkbox" checked={resetCooldown} onChange={(e) => setResetCooldown(e.target.checked)} className="h-5 w-5 accent-leaf-500" />
        쿨다운 초기화 (같은 메시지도 다시 받기)
      </label>

      <button
        onClick={() => send()}
        disabled={pending}
        className="mt-5 w-full rounded-button bg-leaf-500 py-4 text-heading font-bold text-cream shadow-float disabled:opacity-60"
      >
        {pending ? "보내는 중…" : "측정값 보내기"}
      </button>

      {result && (
        <div
          role="status"
          className={`mt-4 rounded-card px-5 py-4 ${result.ok ? "bg-cream-soft text-leaf-900" : "bg-clay/10 text-clay"}`}
        >
          <p className="text-caption font-bold">{result.ok ? "디바이스 → 서버 처리 결과" : "전송 실패"}</p>
          <ul className="mt-1 space-y-1 text-body">
            {result.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
