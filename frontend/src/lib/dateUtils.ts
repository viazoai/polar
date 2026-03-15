const DAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function getDow(y: string, m: string, d: string): string {
  return DAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];
}

/** 타임라인 리스트용: "3. 15 (일)" — 연도 없음, leading zero 제거 */
export function formatTimelineDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(m)}. ${parseInt(d)} (${getDow(y, m, d)})`;
}

/** 폴라로이드 카드용: "2026. 03. 15 (일)" — 연도 포함 */
export function formatCardDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}. ${m}. ${d} (${getDow(y, m, d)})`;
}

/** 상세 보기용: "2026년 3월 15일" */
export function formatKoreanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}
