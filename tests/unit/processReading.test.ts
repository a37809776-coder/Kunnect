// test.md F1-01 ~ F1-08, SIM-01 ~ SIM-08 (데모 저장소로 실행)
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_DEVICE_TOKEN, demoRepo, resetDemoStore } from "@/lib/data/demo";
import { processReading } from "@/lib/device/processReading";

const ok = { serial: "PC-0001", soil_moisture: 50, temperature: 22, light: 3000, battery: 80 };
// 시드 데이터(현재 시각 기준)보다 뒤의 시각이어야 '최신 측정값'이 된다
const NOON = new Date("2099-01-05T03:00:00Z"); // 서울 12시
const NIGHT = new Date("2099-01-05T13:00:00Z"); // 서울 22시

beforeEach(() => resetDemoStore());

describe("디바이스 API 처리", () => {
  it("F1-01 정상 전송 → 200, 저장, last_seen 갱신", async () => {
    const before = await demoRepo.latestReading("p-monte");
    const res = await processReading(demoRepo, ok, { token: DEMO_DEVICE_TOKEN, measuredAt: NOON });
    expect(res.status).toBe(200);
    const after = await demoRepo.latestReading("p-monte");
    expect(after?.id).not.toBe(before?.id);
    expect((await demoRepo.getDevice("d-1"))?.lastSeenAt).toBe(NOON.toISOString());
  });
  it("F1-02 잘못된 토큰 → 401", async () => {
    expect((await processReading(demoRepo, ok, { token: "nope" })).status).toBe(401);
  });
  it("F1-03 미등록 serial → 404", async () => {
    expect((await processReading(demoRepo, { ...ok, serial: "PC-9999" }, { token: DEMO_DEVICE_TOKEN })).status).toBe(404);
  });
  it("F1-04 페어링 안 된 디바이스 → 409", async () => {
    expect((await processReading(demoRepo, { ...ok, serial: "PC-0009" }, { token: DEMO_DEVICE_TOKEN })).status).toBe(409);
  });
  it("F1-05 범위 밖 값 → 422", async () => {
    expect((await processReading(demoRepo, { ...ok, soil_moisture: 150 }, { token: DEMO_DEVICE_TOKEN })).status).toBe(422);
  });
  it("F1-06 필드 누락 → 422", async () => {
    const { light: _omit, ...rest } = ok;
    expect((await processReading(demoRepo, rest, { token: DEMO_DEVICE_TOKEN })).status).toBe(422);
  });
  it("F1-07 배터리 15 → 배터리 부족 메시지", async () => {
    const res = await processReading(demoRepo, { ...ok, battery: 15 }, { token: DEMO_DEVICE_TOKEN, measuredAt: NOON });
    expect(res.messages.map((m) => m.code)).toContain("LOW_BATTERY");
  });
  it("F1-08 응답에 next_interval_sec", async () => {
    const res = await processReading(demoRepo, ok, { token: DEMO_DEVICE_TOKEN });
    expect(res.body).toMatchObject({ ok: true, next_interval_sec: 600 });
  });
});

describe("시뮬레이터 (가상 디바이스)", () => {
  async function virtualSerial() {
    const plant = (await demoRepo.getPlant("p-monte"))!;
    return (await demoRepo.ensureVirtualDevice(plant)).serial;
  }
  const sim = async (values: Partial<typeof ok>, at = NOON, ignoreCooldown = false) =>
    processReading(demoRepo, { ...ok, serial: await virtualSerial(), ...values }, { trustedVirtual: true, measuredAt: at, ignoreCooldown });

  it("SIM-01 가상 디바이스 자동 생성·연결", async () => {
    await virtualSerial();
    const plant = await demoRepo.getPlant("p-monte");
    expect((await demoRepo.getDevice(plant!.deviceId!))?.isVirtual).toBe(true);
  });
  it("SIM-02 수분 15% → THIRSTY", async () => {
    expect((await sim({ soil_moisture: 15 })).messages.map((m) => m.code)).toContain("THIRSTY");
  });
  it("SIM-03 마른 뒤 물 주기 → THANKS_WATER", async () => {
    await sim({ soil_moisture: 15 });
    expect((await sim({ soil_moisture: 75 })).messages.map((m) => m.code)).toContain("THANKS_WATER");
  });
  it("SIM-04 밤 + 어두움 → TOO_DARK 없음", async () => {
    expect((await sim({ light: 80 }, NIGHT)).messages.map((m) => m.code)).not.toContain("TOO_DARK");
  });
  it("SIM-05 낮 + 어두움 → TOO_DARK", async () => {
    expect((await sim({ light: 80 })).messages.map((m) => m.code)).toContain("TOO_DARK");
  });
  it("SIM-06 같은 값 두 번 → 두 번째는 메시지 없음", async () => {
    await sim({ soil_moisture: 15 });
    expect((await sim({ soil_moisture: 15 })).messages).toEqual([]);
  });
  it("SIM-07 쿨다운 초기화 후 다시 생성", async () => {
    await sim({ soil_moisture: 15 });
    expect((await sim({ soil_moisture: 15 }, NOON, true)).messages.map((m) => m.code)).toContain("THIRSTY");
  });
  it("SIM-08 배터리 12% → 배터리 부족", async () => {
    expect((await sim({ battery: 12 })).messages.map((m) => m.code)).toContain("LOW_BATTERY");
  });
  it("실제 디바이스에는 trustedVirtual로 보낼 수 없음", async () => {
    const res = await processReading(demoRepo, ok, { trustedVirtual: true });
    expect(res.status).toBe(401);
  });
});
