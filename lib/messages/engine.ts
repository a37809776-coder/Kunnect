// 메시지 규칙 엔진 (design.md §4). 순수 함수 — DB에 접근하지 않는다.
import type { CareEvent, MessageType, PlantMessage, SensorValues, Species } from "@/lib/types";
import { hours, isDaytime, seoulDateKey } from "@/lib/time";
import { MESSAGE_COPY, type MessageCode } from "./copy";

export const STATUS_COOLDOWN_MS = hours(12);
export const DAILY_LIMIT = 3;
export const LOW_BATTERY_THRESHOLD = 20;
/** 측정값만으로 물주기를 감지하는 수분 상승폭 */
export const WATERING_JUMP = 15;
/** [물 줬어요] 기록이 있을 때 감사 메시지를 보내는 최소 상승폭 */
export const WATERING_JUMP_WITH_CARE = 5;

export interface EngineInput {
  reading: SensorValues & { measuredAt: Date };
  previous: (SensorValues & { measuredAt: Date }) | null;
  species: Pick<Species, "moistureMin" | "moistureMax" | "tempMin" | "tempMax" | "lightMin" | "lightMax">;
  plantName: string;
  /** 최근 24시간 이상의 메시지 (오늘 하루치를 포함해야 함) */
  recentMessages: Pick<PlantMessage, "code" | "type" | "createdAt">[];
  /** 최근 3시간 돌봄 기록 */
  recentCare: Pick<CareEvent, "type" | "createdAt">[];
  /** 시뮬레이터 '쿨다운 초기화' — 최근 메시지를 무시한다 */
  ignoreCooldown?: boolean;
  /** 시뮬레이터 '낮 12시/밤 10시' — 측정 시각 대신 이 값으로 낮 시간을 판정한다 */
  daytimeOverride?: boolean;
}

export interface NewMessage {
  type: MessageType;
  code: MessageCode;
  body: string;
}

type Condition = (v: SensorValues, s: EngineInput["species"], daytime: boolean) => boolean;

// 우선순위 순서 = 배열 순서
const STATUS_RULES: [MessageCode, Condition][] = [
  ["THIRSTY", (v, s) => v.soilMoisture < s.moistureMin],
  ["TOO_WET", (v, s) => v.soilMoisture > s.moistureMax],
  ["TOO_COLD", (v, s) => v.temperature < s.tempMin],
  ["TOO_HOT", (v, s) => v.temperature > s.tempMax],
  ["TOO_DARK", (v, s, day) => day && v.light < s.lightMin],
  ["LOW_BATTERY", (v) => v.battery != null && v.battery < LOW_BATTERY_THRESHOLD],
];

export function evaluate(input: EngineInput): NewMessage[] {
  const { reading, previous, species, plantName } = input;
  const now = reading.measuredAt;
  const recent = input.ignoreCooldown ? [] : input.recentMessages;
  const today = seoulDateKey(now);
  const sentToday = recent.filter(
    (m) => m.type !== "org_notice" && seoulDateKey(new Date(m.createdAt)) === today,
  );
  let budget = DAILY_LIMIT - sentToday.length;
  const out: NewMessage[] = [];
  const push = (type: MessageType, code: MessageCode) => {
    if (budget <= 0) return;
    out.push({ type, code, body: MESSAGE_COPY[code](plantName) });
    budget -= 1;
  };

  // 물을 받았는가 (THANKS_WATER)
  if (previous) {
    const rise = reading.soilMoisture - previous.soilMoisture;
    const caredRecently = input.recentCare.some(
      (c) => c.type === "water" && now.getTime() - new Date(c.createdAt).getTime() <= hours(3),
    );
    const alreadyThanked = recent.some(
      (m) => m.code === "THANKS_WATER" && now.getTime() - new Date(m.createdAt).getTime() <= hours(3),
    );
    if (!alreadyThanked && (rise >= WATERING_JUMP || (caredRecently && rise >= WATERING_JUMP_WITH_CARE))) {
      push("status", "THANKS_WATER");
    }
  }

  const dayNow = input.daytimeOverride ?? isDaytime(reading.measuredAt);
  const dayPrev = previous ? (input.daytimeOverride ?? isDaytime(previous.measuredAt)) : false;
  const active = STATUS_RULES.filter(([, cond]) => cond(reading, species, dayNow));
  for (const [code, rule] of active) {
    // 직전 측정에서는 정상이었다면 '새로 생긴' 상태 → 쿨다운과 무관하게 알린다 (F2-10)
    const newlyStarted = !previous || !rule(previous, species, dayPrev);
    const last = recent
      .filter((m) => m.code === code)
      .map((m) => new Date(m.createdAt).getTime())
      .sort((a, b) => b - a)[0];
    const inCooldown = last !== undefined && now.getTime() - last < STATUS_COOLDOWN_MS;
    if (newlyStarted || !inCooldown) push("status", code);
  }

  // 모두 괜찮을 때만, 하루 한 번 응원
  const healthy = active.length === 0;
  const cheeredToday = sentToday.some((m) => m.type === "cheer");
  if (healthy && !cheeredToday) push("cheer", "CHEER_DAILY");

  return out;
}

export type MetricLevel = "low" | "ok" | "high";

/** 홈 배지용 지표 판정 */
export function metricLevels(v: SensorValues & { measuredAt: Date }, s: EngineInput["species"]) {
  const level = (x: number, min: number, max: number): MetricLevel => (x < min ? "low" : x > max ? "high" : "ok");
  return {
    moisture: level(v.soilMoisture, s.moistureMin, s.moistureMax),
    temperature: level(v.temperature, s.tempMin, s.tempMax),
    light: isDaytime(v.measuredAt) ? level(v.light, s.lightMin, s.lightMax) : ("ok" as MetricLevel),
  };
}
