// 디바이스 측정값 처리 (design.md §6.1). 실제 디바이스 API와 시뮬레이터가 함께 쓴다 (ADR-004).
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { Repo } from "@/lib/data/repo";
import { evaluate, type NewMessage } from "@/lib/messages/engine";
import { days, hours } from "@/lib/time";

export const NEXT_INTERVAL_SEC = 600;

export const readingSchema = z.object({
  serial: z.string().min(1).max(40),
  soil_moisture: z.number().int().min(0).max(100),
  temperature: z.number().min(-10).max(60),
  light: z.number().int().min(0).max(100000),
  battery: z.number().int().min(0).max(100).optional(),
});
export type ReadingPayload = z.infer<typeof readingSchema>;

export type ProcessResult =
  | { status: 200; body: { ok: true; next_interval_sec: number }; messages: NewMessage[] }
  | { status: 401 | 404 | 409 | 422; body: { ok: false; error: string }; messages: [] };

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function sameHash(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const fail = (status: 401 | 404 | 409 | 422, error: string): ProcessResult => ({
  status,
  body: { ok: false, error },
  messages: [],
});

export interface ProcessOptions {
  /** 디바이스 토큰 원문. 시뮬레이터(가상 디바이스)는 trusted로 대신한다 */
  token?: string | null;
  trustedVirtual?: boolean;
  measuredAt?: Date;
  ignoreCooldown?: boolean;
  /** 시뮬레이터 전용 — 낮/밤 판정 덮어쓰기 */
  daytimeOverride?: boolean;
}

export async function processReading(repo: Repo, raw: unknown, opts: ProcessOptions): Promise<ProcessResult> {
  const parsed = readingSchema.safeParse(raw);
  if (!parsed.success) return fail(422, "invalid_values");
  const p = parsed.data;

  const device = await repo.findDeviceBySerial(p.serial);
  if (!device) return fail(404, "unknown_device");

  if (opts.trustedVirtual) {
    if (!device.isVirtual) return fail(401, "not_virtual");
  } else if (!opts.token || !sameHash(hashSecret(opts.token), device.tokenHash)) {
    return fail(401, "invalid_token");
  }

  if (!device.ownerId) return fail(409, "not_paired");
  const plant = await repo.findPlantByDevice(device.id);
  if (!plant) return fail(409, "no_plant");
  const species = await repo.getSpecies(plant.speciesId);
  if (!species) return fail(409, "no_species");

  const at = opts.measuredAt ?? new Date();
  const previous = await repo.latestReading(plant.id);
  const [recentMessages, recentCare] = await Promise.all([
    repo.listMessages([plant.id], { since: new Date(at.getTime() - days(1)) }),
    repo.listCareEvents(plant.id, new Date(at.getTime() - hours(3))),
  ]);

  await repo.insertReading({
    deviceId: device.id,
    plantId: plant.id,
    soilMoisture: p.soil_moisture,
    temperature: p.temperature,
    light: p.light,
    measuredAt: at.toISOString(),
  });
  await repo.updateDevice(device.id, { lastSeenAt: at.toISOString(), batteryLevel: p.battery ?? device.batteryLevel });

  const messages = evaluate({
    reading: { soilMoisture: p.soil_moisture, temperature: p.temperature, light: p.light, battery: p.battery, measuredAt: at },
    previous: previous
      ? {
          soilMoisture: previous.soilMoisture,
          temperature: previous.temperature,
          light: previous.light,
          battery: device.batteryLevel,
          measuredAt: new Date(previous.measuredAt),
        }
      : null,
    species,
    plantName: plant.nickname,
    recentMessages,
    recentCare,
    ignoreCooldown: opts.ignoreCooldown,
    daytimeOverride: opts.trustedVirtual ? opts.daytimeOverride : undefined,
  });
  if (messages.length) await repo.insertMessages(plant.id, messages, at);

  return { status: 200, body: { ok: true, next_interval_sec: NEXT_INTERVAL_SEC }, messages };
}
