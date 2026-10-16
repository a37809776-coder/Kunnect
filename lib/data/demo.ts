// 데모 모드 저장소 — Supabase 환경변수가 없을 때 쓰는 메모리 데이터.
// 서버 프로세스가 살아 있는 동안만 유지된다 (재시작 시 시드로 초기화).
import { randomUUID } from "node:crypto";
import type { Repo } from "./repo";
import type {
  CareEvent,
  Consent,
  Device,
  MoodEntry,
  Organization,
  ParticipantRow,
  Plant,
  PlantMessage,
  Profile,
  Reading,
  Species,
} from "@/lib/types";
import { hashSecret } from "@/lib/device/processReading";
import { participantStatus } from "@/lib/status/participantStatus";
import { days, hours } from "@/lib/time";

interface Store {
  organizations: Organization[];
  profiles: Profile[];
  species: Species[];
  devices: Device[];
  plants: Plant[];
  readings: Reading[];
  messages: PlantMessage[];
  care: CareEvent[];
  moods: MoodEntry[];
  consents: Consent[];
  notices: { id: string; organizationId: string; senderId: string; recipientId: string; body: string; createdAt: string }[];
}

/** 데모 디바이스 자격 정보 — 데모 전용, 실제 운영 값 아님 */
export const DEMO_DEVICE_TOKEN = "demo-device-token";
export const DEMO_PAIRING_CODE = "123456";

export const DEMO_ACCOUNTS = [
  { id: "u-haneul", label: "하늘", hint: "참여자 · 식물 2개" },
  { id: "u-saessak", label: "새싹", hint: "참여자 · 처음 시작 (온보딩)" },
  { id: "u-staff", label: "그린테라피 담당자", hint: "기관 스태프" },
] as const;

const iso = (d: Date) => d.toISOString();

function seed(): Store {
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms);
  const org: Organization = { id: "org-green", name: "(주)그린테라피", inviteCode: "GREEN2026" };

  const species: Species[] = [
    { id: "sp-monstera", name: "몬스테라", art: "leafy", careGuide: "겉흙이 2~3cm 마르면 흠뻑 물을 주세요. 직사광선보다 밝은 간접광을 좋아해요.", moistureMin: 35, moistureMax: 70, tempMin: 16, tempMax: 30, lightMin: 1000, lightMax: 10000 },
    { id: "sp-echeveria", name: "에케베리아", art: "succulent", careGuide: "흙이 완전히 마른 뒤 물을 주세요. 햇빛을 많이 받을수록 단단하게 자라요.", moistureMin: 10, moistureMax: 40, tempMin: 10, tempMax: 32, lightMin: 3000, lightMax: 30000 },
    { id: "sp-pothos", name: "스킨답서스", art: "vine", careGuide: "겉흙이 마르면 물을 주세요. 어두운 곳에서도 잘 버티지만 밝은 곳에서 더 싱그러워요.", moistureMin: 30, moistureMax: 70, tempMin: 15, tempMax: 30, lightMin: 500, lightMax: 8000 },
  ];

  const person = (id: string, name: string, joinedDaysAgo: number, role: Profile["role"] = "participant"): Profile => ({
    id, role, displayName: name, organizationId: org.id, createdAt: iso(ago(days(joinedDaysAgo))),
  });
  const profiles: Profile[] = [
    person("u-haneul", "하늘", 30),
    person("u-saessak", "새싹", 0),
    person("u-doyun", "도윤", 40),
    person("u-seoyeon", "서연", 35),
    person("u-minjae", "민재", 45),
    person("u-jiwoo", "지우", 28),
    person("u-staff", "그린테라피 담당자", 90, "org_staff"),
  ];
  profiles.find((p) => p.id === "u-saessak")!.organizationId = null;

  const device = (id: string, serial: string, ownerId: string | null, seenAgo: number | null, battery: number | null): Device => ({
    id, serial, tokenHash: hashSecret(DEMO_DEVICE_TOKEN), pairingCodeHash: hashSecret(DEMO_PAIRING_CODE),
    isVirtual: false, ownerId, lastSeenAt: seenAgo === null ? null : iso(ago(seenAgo)), batteryLevel: battery,
  });
  const devices: Device[] = [
    device("d-1", "PC-0001", "u-haneul", hours(0.2), 82),
    device("d-2", "PC-0002", "u-haneul", hours(0.2), 64),
    device("d-3", "PC-0003", "u-doyun", hours(0.3), 90),
    device("d-4", "PC-0004", "u-seoyeon", hours(0.5), 55),
    device("d-5", "PC-0005", "u-minjae", days(4), 3),
    device("d-6", "PC-0006", "u-jiwoo", hours(1), 70),
    device("d-9", "PC-0009", null, null, null),
  ];

  const plant = (id: string, ownerId: string, deviceId: string, speciesId: string, nickname: string, createdDaysAgo: number): Plant => ({
    id, ownerId, deviceId, speciesId, nickname, createdAt: iso(ago(days(createdDaysAgo))),
  });
  const plants: Plant[] = [
    plant("p-monte", "u-haneul", "d-1", "sp-monstera", "몬테", 30),
    plant("p-choroki", "u-haneul", "d-2", "sp-echeveria", "초록이", 20),
    plant("p-doyun", "u-doyun", "d-3", "sp-pothos", "스키니", 40),
    plant("p-seoyeon", "u-seoyeon", "d-4", "sp-monstera", "몬몬", 35),
    plant("p-minjae", "u-minjae", "d-5", "sp-echeveria", "다육이", 45),
    plant("p-jiwoo", "u-jiwoo", "d-6", "sp-pothos", "포스", 28),
  ];

  // 최근 7일, 1시간 간격 측정값 — 낮/밤 조도, 서서히 마르는 흙
  const readings: Reading[] = [];
  let seq = 0;
  const series = (p: Plant, startMoisture: number, dryPerHour: number, wateredEveryH: number, stopAgo = 0) => {
    for (let h = 7 * 24; h >= 0; h--) {
      const t = ago(hours(h));
      if (now - t.getTime() < stopAgo) continue;
      const sinceWater = (7 * 24 - h) % wateredEveryH;
      const hourOfDay = (t.getUTCHours() + 9) % 24;
      const daylight = hourOfDay >= 7 && hourOfDay <= 18 ? Math.sin(((hourOfDay - 7) / 11) * Math.PI) : 0;
      readings.push({
        id: `r-${++seq}`, deviceId: p.deviceId!, plantId: p.id,
        soilMoisture: Math.max(5, Math.round(startMoisture - sinceWater * dryPerHour)),
        temperature: Math.round((20 + daylight * 4 + Math.sin(h) * 0.5) * 10) / 10,
        light: Math.round(80 + daylight * 6500),
        measuredAt: iso(t),
      });
    }
  };
  series(plants[0], 68, 0.35, 96);
  series(plants[1], 38, 0.12, 200);
  series(plants[2], 62, 0.3, 90);
  series(plants[3], 40, 0.2, 400); // 서연: 계속 마름
  series(plants[4], 30, 0.1, 400, days(4)); // 민재: 4일 전부터 끊김
  series(plants[5], 55, 0.2, 100);

  const msg = (plantId: string, type: PlantMessage["type"], code: string, body: string, agoMs: number, isRead = true): PlantMessage => ({
    id: randomUUID(), plantId, type, code, body, isRead, createdAt: iso(ago(agoMs)),
  });
  const messages: PlantMessage[] = [
    msg("p-monte", "status", "THANKS_WATER", "몬테: 시원해요! 고마워요 ♡", days(3)),
    msg("p-monte", "cheer", "CHEER_DAILY", "몬테: 오늘도 잘하고 있어요♡", days(1)),
    msg("p-monte", "org_notice", "ORG_NOTICE", "요즘 식물은 잘 지내고 있나요? 궁금해서 안부 전해요 🌱", hours(20)),
    msg("p-monte", "cheer", "CHEER_DAILY", "몬테: 오늘도 잘하고 있어요♡", hours(2), false),
    msg("p-choroki", "cheer", "CHEER_DAILY", "초록이: 오늘도 잘하고 있어요♡", hours(5)),
  ];

  const care = (plantId: string, userId: string, agoMs: number): CareEvent => ({
    id: randomUUID(), plantId, userId, type: "water", createdAt: iso(ago(agoMs)),
  });
  const careEvents: CareEvent[] = [
    care("p-monte", "u-haneul", days(3)),
    care("p-monte", "u-haneul", days(1)),
    care("p-doyun", "u-doyun", days(2)),
    care("p-seoyeon", "u-seoyeon", days(10)),
    care("p-minjae", "u-minjae", days(16)),
    care("p-jiwoo", "u-jiwoo", days(1)),
  ];

  const consent = (userId: string, c: boolean, e: boolean, m: boolean, agreed = true): Consent => ({
    userId, organizationId: org.id, shareCareActivity: c, shareEnvironment: e, shareMood: m,
    agreedAt: agreed ? iso(ago(days(20))) : null, revokedAt: null,
  });
  const consents: Consent[] = [
    consent("u-haneul", true, true, false),
    consent("u-doyun", true, true, true),
    consent("u-seoyeon", true, true, false),
    consent("u-minjae", true, true, false),
    consent("u-jiwoo", false, false, false, false),
  ];

  const moods: MoodEntry[] = [
    { id: randomUUID(), userId: "u-doyun", careEventId: careEvents[2].id, emoji: "🙂", memo: "새 잎이 나왔다!", createdAt: careEvents[2].createdAt },
  ];

  return { organizations: [org], profiles, species, devices, plants, readings, messages, care: careEvents, moods, consents, notices: [] };
}

const g = globalThis as unknown as { __plantconnectDemo?: Store };
function store(): Store {
  g.__plantconnectDemo ??= seed();
  return g.__plantconnectDemo;
}

export function resetDemoStore() {
  g.__plantconnectDemo = seed();
}

const byTimeDesc = <T extends { createdAt?: string; measuredAt?: string }>(a: T, b: T) =>
  (b.createdAt ?? b.measuredAt ?? "").localeCompare(a.createdAt ?? a.measuredAt ?? "");

export const demoRepo: Repo = {
  async getProfile(id) {
    return store().profiles.find((p) => p.id === id) ?? null;
  },
  async getOrganization(id) {
    return store().organizations.find((o) => o.id === id) ?? null;
  },
  async joinOrganization(userId, code) {
    const s = store();
    const org = s.organizations.find((o) => o.inviteCode === code.trim().toUpperCase());
    if (!org) throw new Error("invalid_invite_code");
    const me = s.profiles.find((p) => p.id === userId)!;
    me.organizationId = org.id;
    return org;
  },

  async listSpecies() {
    return store().species;
  },
  async getSpecies(id) {
    return store().species.find((s) => s.id === id) ?? null;
  },

  async findDeviceBySerial(serial) {
    return store().devices.find((d) => d.serial === serial.trim().toUpperCase()) ?? null;
  },
  async getDevice(id) {
    return store().devices.find((d) => d.id === id) ?? null;
  },
  async updateDevice(id, patch) {
    const d = store().devices.find((x) => x.id === id);
    if (d) Object.assign(d, patch);
  },
  async pairDevice(userId, serial, code) {
    const d = await this.findDeviceBySerial(serial);
    if (!d) throw new Error("device_not_found");
    if (d.pairingCodeHash !== hashSecret(code.trim())) throw new Error("invalid_pairing_code");
    if (d.ownerId && d.ownerId !== userId) throw new Error("device_taken");
    d.ownerId = userId;
    return d;
  },
  async ensureVirtualDevice(plant) {
    const s = store();
    const current = plant.deviceId ? s.devices.find((d) => d.id === plant.deviceId) : undefined;
    if (current?.isVirtual) return current;
    const d: Device = {
      id: randomUUID(), serial: `SIM-${plant.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`, tokenHash: "", pairingCodeHash: "",
      isVirtual: true, ownerId: plant.ownerId, lastSeenAt: null, batteryLevel: null,
    };
    s.devices.push(d);
    s.plants.find((p) => p.id === plant.id)!.deviceId = d.id;
    return d;
  },

  async listPlants(ownerId) {
    return store().plants.filter((p) => p.ownerId === ownerId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async getPlant(id) {
    return store().plants.find((p) => p.id === id) ?? null;
  },
  async findPlantByDevice(deviceId) {
    return store().plants.find((p) => p.deviceId === deviceId) ?? null;
  },
  async createPlant(input) {
    const p: Plant = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
    store().plants.push(p);
    return p;
  },

  async insertReading(input) {
    const r: Reading = { id: randomUUID(), ...input };
    store().readings.push(r);
    return r;
  },
  async latestReading(plantId) {
    return store().readings.filter((r) => r.plantId === plantId).sort(byTimeDesc)[0] ?? null;
  },
  async listReadings(plantId, since) {
    return store()
      .readings.filter((r) => r.plantId === plantId && new Date(r.measuredAt) >= since)
      .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  },

  async listMessages(plantIds, opts = {}) {
    const list = store()
      .messages.filter((m) => plantIds.includes(m.plantId) && (!opts.since || new Date(m.createdAt) >= opts.since))
      .sort(byTimeDesc);
    return opts.limit ? list.slice(0, opts.limit) : list;
  },
  async insertMessages(plantId, messages, at) {
    const created = messages.map<PlantMessage>((m) => ({
      id: randomUUID(), plantId, type: m.type, code: m.code, body: m.body, isRead: false, createdAt: at.toISOString(),
    }));
    store().messages.push(...created);
    return created;
  },
  async markMessagesRead(ids) {
    for (const m of store().messages) if (ids.includes(m.id)) m.isRead = true;
  },

  async insertCareEvent({ plantId, userId, type, at }) {
    const e: CareEvent = { id: randomUUID(), plantId, userId, type, createdAt: (at ?? new Date()).toISOString() };
    store().care.push(e);
    return e;
  },
  async listCareEvents(plantId, since) {
    return store().care.filter((c) => c.plantId === plantId && new Date(c.createdAt) >= since).sort(byTimeDesc);
  },

  async insertMood(input) {
    const m: MoodEntry = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
    store().moods.push(m);
    return m;
  },

  async getConsent(userId, organizationId) {
    return store().consents.find((c) => c.userId === userId && c.organizationId === organizationId) ?? null;
  },
  async saveConsent(consent) {
    const s = store();
    const i = s.consents.findIndex((c) => c.userId === consent.userId && c.organizationId === consent.organizationId);
    if (i >= 0) s.consents[i] = consent;
    else s.consents.push(consent);
  },

  async listParticipantRows(organizationId, now) {
    const s = store();
    return s.profiles
      .filter((p) => p.organizationId === organizationId && p.role === "participant")
      .map((p) => buildRow(s, p, organizationId, now))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
  },
  async getParticipantDetail(organizationId, participantId) {
    const s = store();
    const p = s.profiles.find((x) => x.id === participantId && x.organizationId === organizationId && x.role === "participant");
    if (!p) return null;
    const row = buildRow(s, p, organizationId, new Date());
    const plant = s.plants.find((x) => x.ownerId === p.id);
    return {
      row,
      recentCare: row.shareCareActivity ? s.care.filter((c) => c.userId === p.id).sort(byTimeDesc).slice(0, 10) : [],
      latest: row.shareEnvironment && plant ? await demoRepo.latestReading(plant.id) : null,
      moods: row.shareMood ? s.moods.filter((m) => m.userId === p.id).sort(byTimeDesc).slice(0, 10) : [],
    };
  },
  async sendOrgNotice(staffId, recipientId, body) {
    const s = store();
    const staff = s.profiles.find((p) => p.id === staffId);
    if (!staff || staff.role !== "org_staff" || !staff.organizationId) throw new Error("not_allowed");
    const c = s.consents.find((x) => x.userId === recipientId && x.organizationId === staff.organizationId);
    if (!c || !c.agreedAt || c.revokedAt || !c.shareCareActivity) throw new Error("not_allowed");
    const now = new Date().toISOString();
    s.notices.push({ id: randomUUID(), organizationId: staff.organizationId, senderId: staffId, recipientId, body, createdAt: now });
    const plant = s.plants.filter((p) => p.ownerId === recipientId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (plant) s.messages.push({ id: randomUUID(), plantId: plant.id, type: "org_notice", code: "ORG_NOTICE", body, isRead: false, createdAt: now });
  },
};

function buildRow(s: Store, p: Profile, organizationId: string, now: Date): ParticipantRow {
  const c = s.consents.find((x) => x.userId === p.id && x.organizationId === organizationId);
  const valid = !!c && !!c.agreedAt && !c.revokedAt;
  const shareCare = valid && c!.shareCareActivity;
  const shareEnv = valid && c!.shareEnvironment;
  const plant = s.plants.filter((x) => x.ownerId === p.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const species = plant ? s.species.find((x) => x.id === plant.speciesId) : undefined;
  const device = plant?.deviceId ? s.devices.find((d) => d.id === plant.deviceId) : undefined;
  const lastCare = s.care.filter((x) => x.userId === p.id).sort(byTimeDesc)[0]?.createdAt ?? null;
  const recent = plant
    ? s.readings.filter((r) => r.plantId === plant.id && now.getTime() - new Date(r.measuredAt).getTime() <= hours(48))
    : [];
  const dryFor48h = !!species && recent.length > 0 && recent.every((r) => r.soilMoisture < species.moistureMin);
  return {
    participantId: p.id,
    displayName: p.displayName,
    status: participantStatus({
      consentValid: valid, shareCare, shareEnvironment: shareEnv, lastCareAt: lastCare, joinedAt: p.createdAt,
      deviceLastSeenAt: device?.lastSeenAt ?? null, dryFor48h, now,
    }),
    lastCareAt: shareCare ? lastCare : null,
    deviceLastSeenAt: shareEnv ? device?.lastSeenAt ?? null : null,
    shareCareActivity: shareCare,
    shareEnvironment: shareEnv,
    shareMood: valid && c!.shareMood,
    plantNickname: shareCare || shareEnv ? plant?.nickname ?? null : null,
    plantArt: shareCare || shareEnv ? species?.art ?? null : null,
  };
}
