// test.md F5-01 ~ F5-06
import { describe, expect, it } from "vitest";
import { participantStatus, type StatusInput } from "@/lib/status/participantStatus";
import { days, hours } from "@/lib/time";

const now = new Date("2026-10-16T03:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const base: StatusInput = {
  consentValid: true, shareCare: true, shareEnvironment: true,
  lastCareAt: ago(days(1)), joinedAt: ago(days(30)), deviceLastSeenAt: ago(hours(1)), dryFor48h: false, now,
};

describe("기관 상태 판정", () => {
  it("F5-01 7일 내 돌봄 → green", () => expect(participantStatus(base)).toBe("green"));
  it("F5-02 10일 돌봄 없음 → yellow", () => expect(participantStatus({ ...base, lastCareAt: ago(days(10)) })).toBe("yellow"));
  it("F5-03 48시간 건조 → yellow", () => expect(participantStatus({ ...base, dryFor48h: true })).toBe("yellow"));
  it("F5-04 15일 돌봄 없음 → red", () => expect(participantStatus({ ...base, lastCareAt: ago(days(15)) })).toBe("red"));
  it("F5-05 디바이스 72시간 미전송 → red", () =>
    expect(participantStatus({ ...base, deviceLastSeenAt: ago(hours(80)) })).toBe("red"));
  it("F5-06 동의 없음 → none", () => expect(participantStatus({ ...base, consentValid: false })).toBe("none"));
  it("환경 공유를 안 하면 건조·미전송은 판정에 쓰지 않음", () =>
    expect(participantStatus({ ...base, shareEnvironment: false, dryFor48h: true, deviceLastSeenAt: ago(days(5)) })).toBe("green"));
  it("돌봄 기록이 없으면 가입일 기준", () =>
    expect(participantStatus({ ...base, lastCareAt: null, joinedAt: ago(days(3)) })).toBe("green"));
});
