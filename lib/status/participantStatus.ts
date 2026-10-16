// 기관 화면 상태 판정 (design.md §5). SQL org_participant_status와 같은 규칙.
import type { ParticipantStatus } from "@/lib/types";
import { days, hours } from "@/lib/time";

export interface StatusInput {
  consentValid: boolean;
  shareCare: boolean;
  shareEnvironment: boolean;
  /** 돌봄 기록이 없으면 가입 시각을 기준으로 본다 */
  lastCareAt: string | null;
  joinedAt: string;
  deviceLastSeenAt: string | null;
  /** 최근 48시간 측정값이 있고 전부 건조함 */
  dryFor48h: boolean;
  now: Date;
}

export function participantStatus(i: StatusInput): ParticipantStatus {
  if (!i.consentValid || !i.shareCare) return "none";
  const now = i.now.getTime();
  const sinceCare = now - new Date(i.lastCareAt ?? i.joinedAt).getTime();
  const offline =
    i.shareEnvironment && i.deviceLastSeenAt !== null && now - new Date(i.deviceLastSeenAt).getTime() > hours(72);
  if (sinceCare > days(14) || offline) return "red";
  if (sinceCare > days(7) || (i.shareEnvironment && i.dryFor48h)) return "yellow";
  return "green";
}

export const STATUS_META: Record<ParticipantStatus, { label: string; short: string; color: string }> = {
  green: { label: "돌봄 지속", short: "지속", color: "var(--color-leaf-500)" },
  yellow: { label: "관심 필요", short: "관심", color: "var(--color-amber)" },
  red: { label: "연락 권장", short: "연락", color: "var(--color-clay)" },
  none: { label: "공유 안 함", short: "비공유", color: "var(--color-leaf-100)" },
};
