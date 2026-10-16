// test.md F2-01 ~ F2-13
import { describe, expect, it } from "vitest";
import { evaluate, type EngineInput } from "@/lib/messages/engine";
import { FORBIDDEN_WORDS, MESSAGE_COPY } from "@/lib/messages/copy";
import { hours } from "@/lib/time";

const NOON = new Date("2026-10-16T03:00:00Z"); // 서울 12시
const NIGHT = new Date("2026-10-16T13:00:00Z"); // 서울 22시
const species = { moistureMin: 35, moistureMax: 70, tempMin: 16, tempMax: 30, lightMin: 1000, lightMax: 10000 };
const ok = { soilMoisture: 50, temperature: 22, light: 3000, battery: 80 };

function input(over: Partial<EngineInput> & { values?: Partial<typeof ok>; at?: Date; prev?: Partial<typeof ok> | null }): EngineInput {
  const at = over.at ?? NOON;
  return {
    reading: { ...ok, ...over.values, measuredAt: at },
    previous: over.prev === null ? null : { ...ok, ...over.prev, measuredAt: new Date(at.getTime() - hours(1)) },
    species,
    plantName: "몬테",
    recentMessages: over.recentMessages ?? [],
    recentCare: over.recentCare ?? [],
    ignoreCooldown: over.ignoreCooldown,
  };
}
const codes = (i: EngineInput) => evaluate(i).map((m) => m.code);
const sent = (code: string, agoMs: number, at = NOON) => ({
  code, type: "status" as const, createdAt: new Date(at.getTime() - agoMs).toISOString(),
});
const cheerToday = { code: "CHEER_DAILY", type: "cheer" as const, createdAt: new Date(NOON.getTime() - hours(1)).toISOString() };

describe("메시지 엔진", () => {
  it("F2-01 건조하면 THIRSTY, 문구에 식물 이름", () => {
    const out = evaluate(input({ values: { soilMoisture: 20 } }));
    expect(out.map((m) => m.code)).toEqual(["THIRSTY"]);
    expect(out[0].body).toContain("몬테");
  });
  it("F2-02 과습이면 TOO_WET", () => {
    expect(codes(input({ values: { soilMoisture: 90 }, prev: { soilMoisture: 85 } }))).toEqual(["TOO_WET"]);
  });
  it("F2-03 낮에 어두우면 TOO_DARK", () => {
    expect(codes(input({ values: { light: 200 } }))).toEqual(["TOO_DARK"]);
  });
  it("F2-04 밤에는 어두워도 TOO_DARK 없음", () => {
    expect(codes(input({ at: NIGHT, values: { light: 0 }, prev: { light: 0 } }))).not.toContain("TOO_DARK");
  });
  it("F2-05 온도 범위 밖", () => {
    expect(codes(input({ values: { temperature: 8 } }))).toEqual(["TOO_COLD"]);
    expect(codes(input({ values: { temperature: 35 } }))).toEqual(["TOO_HOT"]);
  });
  it("F2-06 모두 정상이고 오늘 응원이 없으면 CHEER_DAILY", () => {
    expect(codes(input({}))).toEqual(["CHEER_DAILY"]);
  });
  it("F2-07 오늘 응원을 이미 보냈으면 없음", () => {
    expect(codes(input({ recentMessages: [cheerToday] }))).toEqual([]);
  });
  it("F2-08 계속 건조 + 6시간 전 발송 → 재발송 안 함", () => {
    expect(
      codes(input({ values: { soilMoisture: 20 }, prev: { soilMoisture: 21 }, recentMessages: [sent("THIRSTY", hours(6))] })),
    ).toEqual([]);
  });
  it("F2-09 계속 건조 + 13시간 전 발송 → 재발송", () => {
    expect(
      codes(input({ values: { soilMoisture: 20 }, prev: { soilMoisture: 21 }, recentMessages: [sent("THIRSTY", hours(13))] })),
    ).toEqual(["THIRSTY"]);
  });
  it("F2-10 정상 복귀 후 다시 건조 → 쿨다운 무시하고 발송", () => {
    expect(
      codes(input({ values: { soilMoisture: 20 }, prev: { soilMoisture: 50 }, recentMessages: [sent("THIRSTY", hours(2))] })),
    ).toEqual(["THIRSTY"]);
  });
  it("F2-11 오늘 3건 보냈으면 추가 없음", () => {
    const three = [sent("TOO_DARK", hours(1)), sent("TOO_COLD", hours(2)), cheerToday];
    expect(codes(input({ values: { soilMoisture: 20 }, prev: { soilMoisture: 50 }, recentMessages: three }))).toEqual([]);
  });
  it("F2-12 물주기 감지 → THANKS_WATER", () => {
    expect(codes(input({ values: { soilMoisture: 60 }, prev: { soilMoisture: 30 }, recentMessages: [cheerToday] }))).toEqual([
      "THANKS_WATER",
    ]);
    // [물 줬어요] 기록이 있으면 작은 상승도 감사
    const care = [{ type: "water" as const, createdAt: new Date(NOON.getTime() - hours(1)).toISOString() }];
    expect(
      codes(input({ values: { soilMoisture: 42 }, prev: { soilMoisture: 36 }, recentCare: care, recentMessages: [cheerToday] })),
    ).toEqual(["THANKS_WATER"]);
  });
  it("F2-13 문구에 금칙어 없음", () => {
    for (const fn of Object.values(MESSAGE_COPY)) {
      const body = fn("몬테");
      for (const w of FORBIDDEN_WORDS) expect(body).not.toContain(w);
    }
  });
  it("배터리 부족", () => {
    expect(codes(input({ values: { battery: 12 }, recentMessages: [cheerToday] }))).toEqual(["LOW_BATTERY"]);
  });
  it("쿨다운 초기화하면 최근 메시지를 무시", () => {
    expect(
      codes(
        input({
          values: { soilMoisture: 20 },
          prev: { soilMoisture: 20 },
          recentMessages: [sent("THIRSTY", hours(1))],
          ignoreCooldown: true,
        }),
      ),
    ).toEqual(["THIRSTY"]);
  });
});
