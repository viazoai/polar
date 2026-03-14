import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import PolaroidCard, { type MomentSummary } from "./PolaroidCard";

// ─── 줄자 스크롤바 ──────────────────────────────────────────────────────────

interface RulerMark {
  fraction: number; // 0~1, 이 눈금이 그려질 세로 위치
  label: string;
  isYear: boolean;
  isHalf: boolean; // 6월 (반년 기준선)
}

/** 연도·월 경계에만 눈금 생성 */
function buildRulerMarks(moments: MomentSummary[]): RulerMark[] {
  const N = moments.length;
  if (N === 0) return [];

  const marks: RulerMark[] = [];
  let prevYear = "";
  let prevMonth = "";

  moments.forEach((m, i) => {
    const year = m.date.slice(0, 4);
    const month = m.date.slice(5, 7);
    const fraction = N > 1 ? i / (N - 1) : 0.5;

    if (year !== prevYear) {
      marks.push({ fraction, label: "'" + year.slice(2), isYear: true, isHalf: false });
      prevYear = year;
      prevMonth = month;
    } else if (month !== prevMonth) {
      const monthNum = parseInt(month);
      marks.push({
        fraction,
        label: String(monthNum),
        isYear: false,
        isHalf: monthNum === 6,
      });
      prevMonth = month;
    }
  });

  return marks;
}

function TimelineRuler({
  moments,
  scrollFraction,
  onSeek,
}: {
  moments: MomentSummary[];
  scrollFraction: number;
  onSeek: (fraction: number) => void;
}) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const marks = buildRulerMarks(moments);

  const getFraction = (clientY: number) => {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  };

  return (
    <div
      ref={rulerRef}
      className="fixed z-40 select-none touch-none"
      style={{
        right: "24px",
        top: "calc(var(--header-height) + (100dvh - var(--header-height)) * 0.25)",
        height: "calc((100dvh - var(--header-height)) * 0.5)",
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

      {/* 상단·하단 고정 눈금 */}
      <div className="absolute right-0 flex items-center" style={{ top: 0 }}>
        <div className="h-px w-1.5 bg-foreground/20" />
      </div>
      <div className="absolute right-0 flex items-center" style={{ bottom: 0 }}>
        <div className="h-px w-1.5 bg-foreground/20" />
      </div>

      {/* 연도·월 눈금 */}
      {marks.map((mark, i) => (
        <div
          key={i}
          className="absolute right-0 flex items-center"
          style={{
            top: `${mark.fraction * 100}%`,
            transform: "translateY(-50%)",
          }}
        >
          {mark.isYear ? (
            <>
              {/* 연도 — 긴 눈금 + 라벨 */}
              <span className="text-[9px] font-semibold text-foreground/55 leading-none mr-1 tabular-nums">
                {mark.label}
              </span>
              <div className="h-px w-[10px] bg-foreground/45" />
            </>
          ) : (
            <>
              {/* 월 — 눈금 + 숫자 (6월은 더 길게) */}
              <span
                className={`leading-none mr-0.5 tabular-nums ${
                  mark.isHalf
                    ? "text-[8px] font-medium text-foreground/50"
                    : "text-[8px] text-foreground/40"
                }`}
              >
                {mark.label}
              </span>
              <div
                className={`h-px ${
                  mark.isHalf ? "w-[11px] bg-foreground/40" : "w-[7px] bg-foreground/25"
                }`}
              />
            </>
          )}
        </div>
      ))}

      {/* 현재 위치 인디케이터 */}
      <div
        className="absolute inset-x-0 pointer-events-none transition-none"
        style={{ top: `${scrollFraction * 100}%`, transform: "translateY(-50%)" }}
      >
        {/* 인디케이터 선 */}
        <div className="h-px w-full bg-foreground/70" />
        {/* 삼각형 마커 */}
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

// ─── 갤러리 뷰 ───────────────────────────────────────────────────────────────

interface Props {
  moments: MomentSummary[];
  onSelect: (id: number) => void;
}

export default function GalleryView({ moments, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollFraction, setScrollFraction] = useState(0);

  // 슬라이드 = 60%, 위아래 패딩 = 20% (첫/마지막 카드 정중앙 정렬)
  const slideHeight = "calc((100dvh - var(--header-height)) * 0.6)";
  const paddingV = "calc((100dvh - var(--header-height)) * 0.2)";

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setScrollFraction(max > 0 ? el.scrollTop / max : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const handleSeek = (fraction: number) => {
    const el = containerRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    el.scrollTo({ top: fraction * max, behavior: "smooth" });
  };

  return (
    <>
      <div
        ref={containerRef}
        style={{
          height: "calc(100dvh - var(--header-height))",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          paddingTop: paddingV,
          paddingBottom: paddingV,
        }}
      >
        {moments.map((moment, i) => (
          <div
            key={moment.id}
            style={{ height: slideHeight, scrollSnapAlign: "center" }}
            className="flex items-center justify-center px-10 pr-14"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0.55 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ amount: 0.65 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-[260px]"
            >
              <PolaroidCard
                moment={moment}
                index={i}
                onClick={() => onSelect(moment.id)}
              />
            </motion.div>
          </div>
        ))}
      </div>

      <TimelineRuler
        moments={moments}
        scrollFraction={scrollFraction}
        onSeek={handleSeek}
      />
    </>
  );
}
