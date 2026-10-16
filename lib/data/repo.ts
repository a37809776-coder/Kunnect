import type {
  CareEvent,
  CareType,
  Consent,
  Device,
  MoodEmoji,
  MoodEntry,
  Organization,
  ParticipantRow,
  Plant,
  PlantMessage,
  Profile,
  Reading,
  Species,
} from "@/lib/types";
import type { NewMessage } from "@/lib/messages/engine";

/**
 * 데이터 접근 인터페이스. 구현은 두 가지:
 * - supabase.ts: 실제 DB (사용자 세션 → RLS 적용 / 서비스 롤 → 디바이스 처리)
 * - demo.ts: 메모리 데이터 (Supabase 환경변수가 없을 때)
 */
export interface Repo {
  getProfile(userId: string): Promise<Profile | null>;
  getOrganization(id: string): Promise<Organization | null>;
  joinOrganization(userId: string, inviteCode: string): Promise<Organization>;

  listSpecies(): Promise<Species[]>;
  getSpecies(id: string): Promise<Species | null>;

  findDeviceBySerial(serial: string): Promise<Device | null>;
  getDevice(id: string): Promise<Device | null>;
  updateDevice(id: string, patch: Partial<Pick<Device, "lastSeenAt" | "batteryLevel">>): Promise<void>;
  pairDevice(userId: string, serial: string, pairingCode: string): Promise<Device>;
  /** 시뮬레이터: 식물에 가상 디바이스를 만들어 연결 (서비스 권한) */
  ensureVirtualDevice(plant: Plant): Promise<Device>;

  listPlants(ownerId: string): Promise<Plant[]>;
  getPlant(id: string): Promise<Plant | null>;
  findPlantByDevice(deviceId: string): Promise<Plant | null>;
  createPlant(input: Pick<Plant, "ownerId" | "deviceId" | "speciesId" | "nickname">): Promise<Plant>;

  insertReading(input: Omit<Reading, "id">): Promise<Reading>;
  latestReading(plantId: string): Promise<Reading | null>;
  listReadings(plantId: string, since: Date): Promise<Reading[]>;

  listMessages(plantIds: string[], opts?: { since?: Date; limit?: number }): Promise<PlantMessage[]>;
  insertMessages(plantId: string, messages: NewMessage[], at: Date): Promise<PlantMessage[]>;
  markMessagesRead(ids: string[]): Promise<void>;

  insertCareEvent(input: { plantId: string; userId: string; type: CareType; at?: Date }): Promise<CareEvent>;
  listCareEvents(plantId: string, since: Date): Promise<CareEvent[]>;

  insertMood(input: { userId: string; careEventId: string | null; emoji: MoodEmoji; memo: string | null }): Promise<MoodEntry>;

  getConsent(userId: string, organizationId: string): Promise<Consent | null>;
  saveConsent(consent: Consent): Promise<void>;

  listParticipantRows(organizationId: string, now: Date): Promise<ParticipantRow[]>;
  /** 기관 상세: 동의 항목만 채워서 돌려준다 */
  getParticipantDetail(
    organizationId: string,
    participantId: string,
  ): Promise<{ row: ParticipantRow; recentCare: CareEvent[]; latest: Reading | null; moods: MoodEntry[] } | null>;
  sendOrgNotice(staffId: string, recipientId: string, body: string): Promise<void>;
}
