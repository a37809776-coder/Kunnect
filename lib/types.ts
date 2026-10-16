export type Role = "participant" | "org_staff";
export type PlantArtKind = "leafy" | "succulent" | "vine";
export type MessageType = "status" | "cheer" | "org_notice";
export type CareType = "water" | "move_light" | "check" | "other";
export type ParticipantStatus = "green" | "yellow" | "red" | "none";
export const MOOD_EMOJIS = ["😊", "🙂", "😐", "😔", "😣"] as const;
export type MoodEmoji = (typeof MOOD_EMOJIS)[number];

export interface Profile {
  id: string;
  role: Role;
  displayName: string;
  organizationId: string | null;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  inviteCode: string;
}

export interface Species {
  id: string;
  name: string;
  art: PlantArtKind;
  careGuide: string;
  moistureMin: number;
  moistureMax: number;
  tempMin: number;
  tempMax: number;
  lightMin: number;
  lightMax: number;
}

export interface Device {
  id: string;
  serial: string;
  tokenHash: string;
  pairingCodeHash: string;
  isVirtual: boolean;
  ownerId: string | null;
  lastSeenAt: string | null;
  batteryLevel: number | null;
}

export interface Plant {
  id: string;
  ownerId: string;
  deviceId: string | null;
  speciesId: string;
  nickname: string;
  createdAt: string;
}

export interface Reading {
  id: string;
  deviceId: string;
  plantId: string;
  soilMoisture: number;
  temperature: number;
  light: number;
  measuredAt: string;
}

export interface PlantMessage {
  id: string;
  plantId: string;
  type: MessageType;
  code: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface CareEvent {
  id: string;
  plantId: string;
  userId: string;
  type: CareType;
  createdAt: string;
}

export interface MoodEntry {
  id: string;
  userId: string;
  careEventId: string | null;
  emoji: MoodEmoji;
  memo: string | null;
  createdAt: string;
}

export interface Consent {
  userId: string;
  organizationId: string;
  shareCareActivity: boolean;
  shareEnvironment: boolean;
  shareMood: boolean;
  agreedAt: string | null;
  revokedAt: string | null;
}

/** 기관 화면용 — 동의하지 않은 항목은 null */
export interface ParticipantRow {
  participantId: string;
  displayName: string;
  status: ParticipantStatus;
  lastCareAt: string | null;
  deviceLastSeenAt: string | null;
  shareCareActivity: boolean;
  shareEnvironment: boolean;
  shareMood: boolean;
  plantNickname: string | null;
  plantArt: PlantArtKind | null;
}

export interface SensorValues {
  soilMoisture: number;
  temperature: number;
  light: number;
  battery?: number | null;
}
