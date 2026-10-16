// Supabase 구현. 사용자 동작은 userDb(RLS), 디바이스 처리는 serviceDb로 한다.
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Repo } from "./repo";
import type {
  CareEvent,
  Consent,
  Device,
  MoodEntry,
  ParticipantRow,
  Plant,
  PlantMessage,
  Profile,
  Reading,
  Species,
} from "@/lib/types";
import { hashSecret } from "@/lib/device/processReading";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const toProfile = (r: Row): Profile => ({
  id: r.id, role: r.role, displayName: r.display_name, organizationId: r.organization_id, createdAt: r.created_at,
});
const toSpecies = (r: Row): Species => ({
  id: r.id, name: r.name, art: r.art, careGuide: r.care_guide,
  moistureMin: r.moisture_min, moistureMax: r.moisture_max,
  tempMin: Number(r.temp_min), tempMax: Number(r.temp_max), lightMin: r.light_min, lightMax: r.light_max,
});
const toDevice = (r: Row): Device => ({
  id: r.id, serial: r.serial, tokenHash: r.token_hash, pairingCodeHash: r.pairing_code_hash,
  isVirtual: r.is_virtual, ownerId: r.owner_id, lastSeenAt: r.last_seen_at, batteryLevel: r.battery_level,
});
const toPlant = (r: Row): Plant => ({
  id: r.id, ownerId: r.owner_id, deviceId: r.device_id, speciesId: r.species_id, nickname: r.nickname, createdAt: r.created_at,
});
const toReading = (r: Row): Reading => ({
  id: String(r.id), deviceId: r.device_id, plantId: r.plant_id, soilMoisture: r.soil_moisture,
  temperature: Number(r.temperature), light: r.light, measuredAt: r.measured_at,
});
const toMessage = (r: Row): PlantMessage => ({
  id: r.id, plantId: r.plant_id, type: r.type, code: r.code, body: r.body, isRead: r.is_read, createdAt: r.created_at,
});
const toCare = (r: Row): CareEvent => ({
  id: r.id, plantId: r.plant_id, userId: r.user_id, type: r.type, createdAt: r.created_at,
});
const toMood = (r: Row): MoodEntry => ({
  id: r.id, userId: r.user_id, careEventId: r.care_event_id, emoji: r.emoji, memo: r.memo, createdAt: r.created_at,
});
const toConsent = (r: Row): Consent => ({
  userId: r.user_id, organizationId: r.organization_id, shareCareActivity: r.share_care_activity,
  shareEnvironment: r.share_environment, shareMood: r.share_mood, agreedAt: r.agreed_at, revokedAt: r.revoked_at,
});
const toParticipantRow = (r: Row): ParticipantRow => ({
  participantId: r.participant_id, displayName: r.display_name, status: r.status, lastCareAt: r.last_care_at,
  deviceLastSeenAt: r.device_last_seen_at, shareCareActivity: r.share_care_activity, shareEnvironment: r.share_environment,
  shareMood: r.share_mood, plantNickname: r.plant_nickname, plantArt: r.plant_art,
});

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** 목록 조회 — 에러면 throw, 결과가 없으면 빈 배열 */
function many<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  return check(res) ?? [];
}

export function supabaseRepo(userDb: SupabaseClient, serviceDb: SupabaseClient): Repo {
  const repo: Repo = {
    async getProfile(id) {
      const r = check(await userDb.from("profiles").select("*").eq("id", id).maybeSingle());
      return r ? toProfile(r) : null;
    },
    async getOrganization(id) {
      const r = check(await userDb.from("organizations").select("*").eq("id", id).maybeSingle());
      return r ? { id: r.id, name: r.name, inviteCode: r.invite_code } : null;
    },
    async joinOrganization(_userId, code) {
      const id = check(await userDb.rpc("join_org", { code }));
      const org = await repo.getOrganization(id as string);
      if (!org) throw new Error("invalid_invite_code");
      return org;
    },

    async listSpecies() {
      return many(await userDb.from("plant_species").select("*").order("name")).map(toSpecies);
    },
    async getSpecies(id) {
      const r = check(await serviceDb.from("plant_species").select("*").eq("id", id).maybeSingle());
      return r ? toSpecies(r) : null;
    },

    async findDeviceBySerial(serial) {
      const r = check(await serviceDb.from("devices").select("*").eq("serial", serial.trim().toUpperCase()).maybeSingle());
      return r ? toDevice(r) : null;
    },
    async getDevice(id) {
      const r = check(await userDb.from("devices").select("*").eq("id", id).maybeSingle());
      return r ? toDevice(r) : null;
    },
    async updateDevice(id, patch) {
      check(
        await serviceDb
          .from("devices")
          .update({ last_seen_at: patch.lastSeenAt, battery_level: patch.batteryLevel })
          .eq("id", id),
      );
    },
    async pairDevice(_userId, serial, code) {
      const id = check(await userDb.rpc("pair_device", { p_serial: serial, p_code: code }));
      const d = await repo.getDevice(id as string);
      if (!d) throw new Error("device_not_found");
      return d;
    },
    async ensureVirtualDevice(plant) {
      if (plant.deviceId) {
        const cur = check(await serviceDb.from("devices").select("*").eq("id", plant.deviceId).maybeSingle());
        if (cur?.is_virtual) return toDevice(cur);
      }
      const r = check(
        await serviceDb
          .from("devices")
          .insert({
            serial: `SIM-${plant.id.slice(0, 8).toUpperCase()}`,
            token_hash: hashSecret(randomBytes(32).toString("hex")),
            pairing_code_hash: hashSecret(randomBytes(32).toString("hex")),
            is_virtual: true,
            owner_id: plant.ownerId,
          })
          .select("*")
          .single(),
      );
      check(await serviceDb.from("plants").update({ device_id: r.id }).eq("id", plant.id));
      return toDevice(r);
    },

    async listPlants(ownerId) {
      return many(await userDb.from("plants").select("*").eq("owner_id", ownerId).order("created_at")).map(toPlant);
    },
    async getPlant(id) {
      const r = check(await userDb.from("plants").select("*").eq("id", id).maybeSingle());
      return r ? toPlant(r) : null;
    },
    async findPlantByDevice(deviceId) {
      const r = check(await serviceDb.from("plants").select("*").eq("device_id", deviceId).maybeSingle());
      return r ? toPlant(r) : null;
    },
    async createPlant(input) {
      const r = check(
        await userDb
          .from("plants")
          .insert({ owner_id: input.ownerId, device_id: input.deviceId, species_id: input.speciesId, nickname: input.nickname })
          .select("*")
          .single(),
      );
      return toPlant(r);
    },

    async insertReading(input) {
      const r = check(
        await serviceDb
          .from("sensor_readings")
          .insert({
            device_id: input.deviceId, plant_id: input.plantId, soil_moisture: input.soilMoisture,
            temperature: input.temperature, light: input.light, measured_at: input.measuredAt,
          })
          .select("*")
          .single(),
      );
      return toReading(r);
    },
    async latestReading(plantId) {
      const r = check(
        await serviceDb
          .from("sensor_readings")
          .select("*")
          .eq("plant_id", plantId)
          .order("measured_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
      return r ? toReading(r) : null;
    },
    async listReadings(plantId, since) {
      return many(
        await userDb
          .from("sensor_readings")
          .select("*")
          .eq("plant_id", plantId)
          .gte("measured_at", since.toISOString())
          .order("measured_at"),
      ).map(toReading);
    },

    async listMessages(plantIds, opts = {}) {
      if (!plantIds.length) return [];
      let q = serviceDb.from("plant_messages").select("*").in("plant_id", plantIds).order("created_at", { ascending: false });
      if (opts.since) q = q.gte("created_at", opts.since.toISOString());
      if (opts.limit) q = q.limit(opts.limit);
      return many(await q).map(toMessage);
    },
    async insertMessages(plantId, messages, at) {
      return many(
        await serviceDb
          .from("plant_messages")
          .insert(messages.map((m) => ({ plant_id: plantId, type: m.type, code: m.code, body: m.body, created_at: at.toISOString() })))
          .select("*"),
      ).map(toMessage);
    },
    async markMessagesRead(ids) {
      if (ids.length) check(await userDb.from("plant_messages").update({ is_read: true }).in("id", ids));
    },

    async insertCareEvent({ plantId, userId, type }) {
      const r = check(
        await userDb.from("care_events").insert({ plant_id: plantId, user_id: userId, type }).select("*").single(),
      );
      return toCare(r);
    },
    async listCareEvents(plantId, since) {
      return many(
        await serviceDb
          .from("care_events")
          .select("*")
          .eq("plant_id", plantId)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: false }),
      ).map(toCare);
    },

    async insertMood(input) {
      const r = check(
        await userDb
          .from("mood_entries")
          .insert({ user_id: input.userId, care_event_id: input.careEventId, emoji: input.emoji, memo: input.memo })
          .select("*")
          .single(),
      );
      return toMood(r);
    },

    async getConsent(userId, organizationId) {
      const r = check(
        await userDb.from("consents").select("*").eq("user_id", userId).eq("organization_id", organizationId).maybeSingle(),
      );
      return r ? toConsent(r) : null;
    },
    async saveConsent(c) {
      check(
        await userDb.from("consents").upsert(
          {
            user_id: c.userId, organization_id: c.organizationId, share_care_activity: c.shareCareActivity,
            share_environment: c.shareEnvironment, share_mood: c.shareMood, agreed_at: c.agreedAt, revoked_at: c.revokedAt,
          },
          { onConflict: "user_id,organization_id" },
        ),
      );
    },

    async listParticipantRows(organizationId) {
      return (check(await userDb.rpc("org_participant_status", { p_org: organizationId })) as Row[]).map(toParticipantRow);
    },
    async getParticipantDetail(organizationId, participantId) {
      const rows = await repo.listParticipantRows(organizationId, new Date());
      const row = rows.find((r) => r.participantId === participantId);
      if (!row) return null;
      // RLS가 동의하지 않은 항목을 0건으로 돌려준다
      const recentCare = many(
        await userDb.from("care_events").select("*").eq("user_id", participantId).order("created_at", { ascending: false }).limit(10),
      ).map(toCare);
      const plant = check(
        await userDb.from("plants").select("id").eq("owner_id", participantId).order("created_at").limit(1).maybeSingle(),
      );
      const latest = plant
        ? check(
            await userDb
              .from("sensor_readings")
              .select("*")
              .eq("plant_id", plant.id)
              .order("measured_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          )
        : null;
      const moods = many(
        await userDb.from("mood_entries").select("*").eq("user_id", participantId).order("created_at", { ascending: false }).limit(10),
      ).map(toMood);
      return { row, recentCare, latest: latest ? toReading(latest) : null, moods };
    },
    async sendOrgNotice(_staffId, recipientId, body) {
      check(await userDb.rpc("send_org_notice", { p_recipient: recipientId, p_body: body }));
    },
  };
  return repo;
}
