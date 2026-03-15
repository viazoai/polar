import { useRef } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { type MomentSummary } from "@/components/PolaroidCard";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface RulerMark {
  fraction: number; // 0~1 (0=위/최신, 1=아래/과거)
  label: string;
  isYear: boolean;
  isHalf: boolean; // 6월 강조
}

interface SeqItem {
  isYear: boolean;
  label: string;
  monthKey?: string; // 월 눈금인 경우 "YYYY-MM"
  isHalf: boolean;
}

// ─── 계산 헬퍼 ────────────────────────────────────────────────────────────────

/** 데이터가 있는 고유 월 목록 (newest → oldest) */
function buildMonthOrder(moments: MomentSummary[]): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const m of moments) {
    const key = m.date.slice(0, 7);
    if (!seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  }
  return order;
}

/**
 * 시각 시퀀스 구성: 연도 라벨 + 월 눈금을 모두 등간격으로 배치.
 *
 * 예: '27, 3月, 2月, '26, 11月, '25, 3月, '24, 4月, '23, '22, 12月, 7月, '21, '20, 9月, '19
 *     (17개 항목이 모두 동일 간격)
 */
function buildVisualSequence(moments: MomentSummary[]): SeqItem[] {
  const monthOrder = buildMonthOrder(moments);
  const M = monthOrder.length;
  if (M === 0) return [];

  const newestYear = parseInt(monthOrder[0].slice(0, 4));
  const oldestYear = parseInt(monthOrder[M - 1].slice(0, 4));

  const seq: SeqItem[] = [];

  // 상단 경계: newestYear + 1
  seq.push({ isYear: true, label: "'" + String(newestYear + 1).slice(2), isHalf: false });

  let mi = 0;
  while (mi < M) {
    const currentYear = parseInt(monthOrder[mi].slice(0, 4));

    // 이 연도의 데이터 월 눈금
    while (mi < M && parseInt(monthOrder[mi].slice(0, 4)) === currentYear) {
      const monthNum = parseInt(monthOrder[mi].slice(5, 7));
      seq.push({
        isYear: false,
        label: String(monthNum),
        monthKey: monthOrder[mi],
        isHalf: monthNum === 6,
      });
      mi++;
    }

    // 연도 라벨 (월 눈금 아래)
    seq.push({ isYear: true, label: "'" + String(currentYear).slice(2), isHalf: false });

    // 건너뛴 연도 라벨
    const nextYear = mi < M ? parseInt(monthOrder[mi].slice(0, 4)) : oldestYear;
    for (let y = currentYear - 1; y > nextYear; y--) {
      seq.push({ isYear: true, label: "'" + String(y).slice(2), isHalf: false });
    }
  }

  return seq;
}

/** 월 키 → ruler fraction 매핑 */
export function buildMonthFracMap(moments: MomentSummary[]): Map<string, number> {
  const seq = buildVisualSequence(moments);
  const map = new Map<string, number>();
  const total = seq.length;
  seq.forEach((item, i) => {
    if (item.monthKey) {
      map.set(item.monthKey, total > 1 ? i / (total - 1) : 0.5);
    }
  });
  return map;
}

export function buildRulerMarks(moments: MomentSummary[]): RulerMark[] {
  const seq = buildVisualSequence(moments);
  const total = seq.length;
  return seq.map((item, i) => ({
    fraction: total > 1 ? i / (total - 1) : 0.5,
    label: item.label,
    isYear: item.isYear,
    isHalf: item.isHalf,
  }));
}

/**
 * 선형 보간으로 인디케이터를 부드럽게 이동.
 * 각 moment의 월 fraction 사이를 보간한다.
 */
function currentMonthFraction(moments: MomentSummary[], scrollFraction: number): number {
  if (moments.length === 0) return 0;

  const monthToFrac = buildMonthFracMap(moments);

  if (moments.length === 1) {
    return monthToFrac.get(moments[0].date.slice(0, 7)) ?? 0.5;
  }

  // 인접 항목 사이를 선형 보간 → 끊김 없이 부드럽게 이동
  const exactIdx = scrollFraction * (moments.length - 1);
  const lo = Math.max(0, Math.floor(exactIdx));
  const hi = Math.min(moments.length - 1, lo + 1);
  const t = exactIdx - lo;

  const loFrac = monthToFrac.get(moments[lo].date.slice(0, 7)) ?? 0;
  const hiFrac = monthToFrac.get(moments[hi].date.slice(0, 7)) ?? 0;

  return loFrac * (1 - t) + hiFrac * t;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface Props {
  moments: MomentSummary[];
  scrollFraction: number;
  onSeek: (fraction: number) => void;
}

export function TimelineRuler({ moments, scrollFraction, onSeek }: Props) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const marks = buildRulerMarks(moments);
  const indicatorFraction = currentMonthFraction(moments, scrollFraction);

  const getFraction = (clientY: number) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  };

  // PC: 폴라로이드 중앙(50%)에서 카드 전체 너비(260px) + 줄자 너비(36px)만큼 떨어진 위치
  // 모바일: 화면 우측 24px 고정
  const rightPos = isMobile ? "24px" : "calc(50% - 296px)";

  return (
    <div
      ref={rulerRef}
      className="fixed z-40 select-none touch-none"
      style={{
        right: rightPos,
        top: "calc(var(--header-height) + (100dvh - var(--header-height) - var(--bottom-nav-height)) * 0.2)",
        height: "calc((100dvh - var(--header-height) - var(--bottom-nav-height)) * 0.6)",
        width: "36px",
      }}
      onClick={(e) => onSeek(getFraction(e.clientY))}
      onTouchStart={(e) => {
        e.preventDefault();
        onSeek(getFraction(e.touches[0].clientY));
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        onSeek(getFraction(e.touches[0].clientY));
      }}
    >
      {/* 세로 축선 */}
      <div className="absolute top-0 bottom-0 right-0 w-px bg-foreground/12" />

      {/* 상단·하단 끝점 */}
      <div className="absolute right-0 flex items-center" style={{ top: 0 }}>
        <div className="h-px w-2 bg-foreground/20" />
      </div>
      <div className="absolute right-0 flex items-center" style={{ bottom: 0 }}>
        <div className="h-px w-2 bg-foreground/20" />
      </div>

      {/* 눈금 */}
      {marks.map((mark, i) => (
        <div
          key={i}
          className="absolute right-0 flex items-center"
          style={{ top: `${mark.fraction * 100}%`, transform: "translateY(-50%)" }}
        >
          {mark.isYear ? (
            <>
              <span className="text-[9px] font-semibold text-foreground/55 leading-none mr-1 tabular-nums">
                {mark.label}
              </span>
              <div className="h-px w-[10px] bg-foreground/45" />
            </>
          ) : mark.isHalf ? (
            <>
              <span className="text-[8px] font-medium text-foreground/45 leading-none mr-0.5 tabular-nums">
                {mark.label}
              </span>
              <div className="h-px w-[8px] bg-foreground/30" />
            </>
          ) : (
            <>
              <span className="text-[8px] text-foreground/35 leading-none mr-0.5 tabular-nums">
                {mark.label}
              </span>
              <div className="h-px w-[5px] bg-foreground/18" />
            </>
          )}
        </div>
      ))}

      {/* 현재 위치 인디케이터 (선형 보간) */}
      <div
        className="absolute inset-x-0 pointer-events-none"
        style={{ top: `${indicatorFraction * 100}%`, transform: "translateY(-50%)" }}
      >
        <div className="h-px w-full bg-foreground/70" />
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-[1px]"
          style={{
            width: 0,
            height: 0,
            borderTop: "4px solid transparent",
            borderBottom: "4px solid transparent",
            borderRight: "5px solid rgba(0,0,0,0.65)",
          }}
        />
      </div>
    </div>
  );
}
