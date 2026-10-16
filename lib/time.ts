export const TIME_ZONE = "Asia/Seoul";

const HOUR = 60 * 60 * 1000;
export const hours = (n: number) => n * HOUR;
export const days = (n: number) => n * 24 * HOUR;

/** 서울 기준 시(0~23) */
export function seoulHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(date),
  );
}

/** 서울 기준 날짜 키 (YYYY-MM-DD) — '하루' 판정용 */
export function seoulDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

/** 낮 시간(09~17시) — TOO_DARK 판정 */
export function isDaytime(date: Date): boolean {
  const h = seoulHour(date);
  return h >= 9 && h < 17;
}

export function relativeKo(iso: string | null, now = new Date()): string {
  if (!iso) return "기록 없음";
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < hours(1)) return `${Math.max(1, Math.round(diff / 60000))}분 전`;
  if (diff < days(1)) return `${Math.round(diff / HOUR)}시간 전`;
  return `${Math.round(diff / days(1))}일 전`;
}
