// 식물 메시지 문구는 여기에만 둔다 (CLAUDE.md 코딩 원칙 3).
// 비임상 원칙: 진단·치료·점수 표현 금지, 참여자를 평가하지 않는다.

export type MessageCode =
  | "THIRSTY"
  | "TOO_WET"
  | "TOO_DARK"
  | "TOO_COLD"
  | "TOO_HOT"
  | "LOW_BATTERY"
  | "THANKS_WATER"
  | "CHEER_DAILY";

type CopyFn = (name: string) => string;

export const MESSAGE_COPY: Record<MessageCode, CopyFn> = {
  THIRSTY: (n) => `${n}: 목말라요… 물 한 잔 부탁해요 💧`,
  TOO_WET: (n) => `${n}: 발이 너무 축축해요. 물은 조금 쉬어도 돼요`,
  TOO_DARK: (n) => `${n}: 햇빛이 그리워요. 창가로 옮겨줄래요?`,
  TOO_COLD: (n) => `${n}: 조금 추워요 🥶 따뜻한 곳으로 가고 싶어요`,
  TOO_HOT: (n) => `${n}: 너무 더워요. 바람이 통하는 곳이면 좋겠어요`,
  LOW_BATTERY: (n) => `${n}: 제 옆 친구(디바이스)의 배터리가 부족해요 🔋`,
  THANKS_WATER: (n) => `${n}: 시원해요! 고마워요 ♡`,
  CHEER_DAILY: (n) => `${n}: 오늘도 잘하고 있어요♡`,
};

/** 상태가 모두 괜찮을 때 홈 말풍선 기본 문구 */
export const idleCopy = (n: string) => `${n}: 오늘은 기분이 좋아요 🌿`;
export const waitingCopy = "아직 식물 소식을 기다리고 있어요";
export const disconnectedCopy = "연결이 끊긴 것 같아요. 디바이스 전원과 Wi-Fi를 확인해 주세요";

/** 금칙어 — 테스트(F2-13)와 기관 안내 입력 검증에 쓴다 */
export const FORBIDDEN_WORDS = ["우울", "증상", "치료", "진단", "점수"];

export const NOTICE_TEMPLATES = [
  "요즘 식물은 잘 지내고 있나요? 궁금해서 안부 전해요 🌱",
  "물 주기가 헷갈리면 언제든 편하게 물어봐 주세요.",
  "다음 원예 모임 소식이 곧 올라와요. 함께해요!",
];
