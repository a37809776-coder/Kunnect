/** 받침 유무에 따라 조사를 고른다 — 예: withJosa("새순", "이", "가") → "새순이" */
export function withJosa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.charCodeAt(word.length - 1);
  const isHangul = last >= 0xac00 && last <= 0xd7a3;
  const hasBatchim = isHangul && (last - 0xac00) % 28 !== 0;
  return word + (hasBatchim ? withBatchim : withoutBatchim);
}
