"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea } from "recharts";

type Point = { t: string; moisture: number; temperature: number; light: number };

const fmt = (iso: string, range: "24h" | "7d") =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    ...(range === "24h" ? { hour: "numeric" } : { month: "numeric", day: "numeric" }),
  }).format(new Date(iso));

const METRICS = {
  moisture: { label: "수분 (%)", color: "#7fa7c9" },
  temperature: { label: "온도 (℃)", color: "#e0a458" },
  light: { label: "빛 (lux)", color: "#5f8d5e" },
} as const;

/** 환경 수치 그래프 — 지표별 작은 차트 3개 (색 하나 + 적정 범위 띠) */
export default function ReadingsChart({
  points,
  range,
  ranges,
}: {
  points: Point[];
  range: "24h" | "7d";
  ranges: Record<keyof typeof METRICS, [number, number]>;
}) {
  if (points.length === 0) return <p className="py-6 text-center text-body text-leaf-700">이 기간의 측정값이 없어요</p>;
  return (
    <div className="space-y-5">
      {(Object.keys(METRICS) as (keyof typeof METRICS)[]).map((k) => (
        <figure key={k}>
          <figcaption className="mb-1 flex items-center justify-between text-caption font-semibold text-leaf-700">
            <span>{METRICS[k].label}</span>
            <span className="text-leaf-300">
              적정 {ranges[k][0].toLocaleString()}–{ranges[k][1].toLocaleString()}
            </span>
          </figcaption>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <ReferenceArea y1={ranges[k][0]} y2={ranges[k][1]} fill="#e3ebe0" fillOpacity={0.7} />
                <XAxis
                  dataKey="t"
                  tickFormatter={(v) => fmt(v, range)}
                  tick={{ fontSize: 10, fill: "#7c937b" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                />
                <YAxis tick={{ fontSize: 10, fill: "#7c937b" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  labelFormatter={(v) => fmt(String(v), "24h") + "시"}
                  formatter={(v) => [Number(v).toLocaleString(), METRICS[k].label]}
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px -12px rgb(31 51 32 / .4)" }}
                />
                <Line type="monotone" dataKey={k} stroke={METRICS[k].color} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </figure>
      ))}
    </div>
  );
}
