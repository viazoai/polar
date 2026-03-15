import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type MomentSummary } from "@/components/PolaroidCard";
import MomentRow from "@/components/MomentRow";
import YearLine from "@/components/YearLine";

interface Props {
  moments: MomentSummary[];
  onSelect: (id: number) => void;
}

export default function ListView({ moments, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const newestYear = parseInt(moments[0].date.slice(0, 4));

  // 연도별 moments 맵
  const yearMap = new Map<number, MomentSummary[]>();
  for (const m of moments) {
    const y = parseInt(m.date.slice(0, 4));
    if (!yearMap.has(y)) yearMap.set(y, []);
    yearMap.get(y)!.push(m);
  }

  // 데이터가 있는 연도만 (내림차순)
  const allYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

  // 현재 연도 추적 (스크롤 기반)
  const [currentYear, setCurrentYear] = useState(String(newestYear));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const findHiddenYear = () => {
      const bottomEdge = el.getBoundingClientRect().bottom;
      const yearLines = el.querySelectorAll("[data-year-line]");
      let hidden = "";
      for (const line of yearLines) {
        const rect = (line as HTMLElement).getBoundingClientRect();
        if (rect.top >= bottomEdge) {
          hidden = (line as HTMLElement).dataset.yearLine!;
          break;
        }
      }
      if (!hidden && yearLines.length > 0) {
        hidden = (yearLines[yearLines.length - 1] as HTMLElement).dataset.yearLine!;
      }
      if (hidden) setCurrentYear(hidden);
    };
    requestAnimationFrame(findHiddenYear);
    el.addEventListener("scroll", findHiddenYear, { passive: true });
    return () => el.removeEventListener("scroll", findHiddenYear);
  }, [moments]);

  return (
    <>
      {/* 현재 연도 바 — 하단 탭 바로 위, 흰색 배경으로 콘텐츠 가림 */}
      <div
        className="fixed z-30 pointer-events-none left-0 right-0 bg-background"
        style={{ bottom: "var(--bottom-nav-height)", height: "36px" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentYear}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="relative h-full"
          >
            {/* 가로선 */}
            <div
              className="absolute h-px"
              style={{ top: "50%", left: "40px", right: "27px", backgroundColor: "rgba(0,0,0,0.08)" }}
            />
            {/* 연도 라벨 */}
            <span
              className="absolute z-10 bg-background px-1 text-xs font-semibold text-muted-foreground tabular-nums"
              style={{ top: "50%", left: "41.25px", transform: "translate(-50%, -50%)" }}
            >
              {currentYear}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        ref={scrollRef}
        style={{
          height: "calc(100dvh - var(--header-height))",
          overflowY: "auto",
          overscrollBehaviorY: "contain",
        }}
      >
        <div className="relative max-w-2xl md:mx-auto pb-tab">
          {/* 세로 축선 */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: "40px", width: "2.5px", backgroundColor: "rgba(0,0,0,0.10)" }}
          />

          {/* 연도별 시퀀스: 데이터 → 연도 라벨 (갤러리 패턴) */}
          {allYears.map((year) => {
            const yearMoments = yearMap.get(year);
            return (
              <div key={year}>
                {yearMoments?.map((moment) => (
                  <MomentRow key={moment.id} moment={moment} onSelect={onSelect} />
                ))}
                <YearLine year={year} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
