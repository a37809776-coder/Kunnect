import Link from "next/link";
import type { ReactNode } from "react";
import type { MetricLevel } from "@/lib/messages/engine";
import type { ParticipantStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/status/participantStatus";
import { DropIcon, SunIcon, ThermoIcon } from "./Icons";

/** 레퍼런스의 물방울·온도계·해 배지 */
export function StatBadge({
  kind,
  value,
  level = "ok",
  tone = "onGreen",
}: {
  kind: "moisture" | "temperature" | "light";
  value?: string;
  level?: MetricLevel;
  tone?: "onGreen" | "onWhite";
}) {
  const Icon = kind === "moisture" ? DropIcon : kind === "temperature" ? ThermoIcon : SunIcon;
  const label = kind === "moisture" ? "수분" : kind === "temperature" ? "온도" : "빛";
  const alert = level !== "ok";
  const color =
    tone === "onGreen"
      ? alert
        ? "border-amber text-amber bg-leaf-900/15"
        : "border-cream/70 text-cream"
      : alert
        ? "border-amber text-[#9a6420] bg-amber/10"
        : "border-leaf-300 text-leaf-700";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge border px-2 py-1 text-caption font-semibold ${color}`}
      title={`${label}${alert ? (level === "low" ? " 부족" : " 높음") : ""}`}
    >
      <Icon size={15} />
      {value !== undefined && <span>{value}</span>}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function SpeechBubble({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-[20px] rounded-tl-[6px] bg-cream-soft px-4 py-3 text-body font-medium text-leaf-900 shadow-float ${className}`}
    >
      {children}
    </div>
  );
}

/** 레퍼런스 All/Outdoor/Indoor + 숫자 동그라미 */
export function BigTabs({
  tabs,
  active,
}: {
  tabs: { key: string; label: string; count?: number; href: string }[];
  active: string;
}) {
  return (
    <nav className="no-scrollbar -mx-5 flex gap-6 overflow-x-auto px-5 pt-3" aria-label="필터">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`relative shrink-0 pt-5 text-[20px] font-bold ${on ? "text-leaf-900" : "text-leaf-300"}`}
          >
            {t.count !== undefined && (
              <span
                className={`absolute left-0 top-0 grid h-[22px] min-w-[22px] place-items-center rounded-full px-1 text-[11px] font-bold ${
                  on ? "bg-leaf-900 text-paper" : "bg-leaf-100 text-leaf-700"
                }`}
              >
                {t.count}
              </span>
            )}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function StatusChip({ status }: { status: ParticipantStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-bold"
      style={{
        background: status === "none" ? "var(--color-leaf-100)" : `color-mix(in srgb, ${meta.color} 18%, white)`,
        color: status === "none" ? "var(--color-leaf-700)" : `color-mix(in srgb, ${meta.color} 75%, black)`,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: status === "none" ? "var(--color-leaf-300)" : meta.color }} />
      {meta.label}
    </span>
  );
}

export function SimRibbon() {
  return (
    <div className="bg-amber px-4 py-1.5 text-center text-caption font-bold text-leaf-900">
      시뮬레이터 — 실제 디바이스 없이 측정값을 보내요
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-card bg-leaf-100 px-5 py-6 text-center text-body text-leaf-700">{children}</p>;
}
