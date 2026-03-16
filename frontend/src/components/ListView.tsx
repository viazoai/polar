import { useRef } from "react";
import { type MomentSummary } from "@/components/PolaroidCard";
import MomentRow from "@/components/MomentRow";
import YearLine from "@/components/YearLine";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface Props {
  moments: MomentSummary[];
  onSelect: (id: number) => void;
  onRefresh?: () => Promise<void>;
}

export default function ListView({ moments, onSelect, onRefresh }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pullY, refreshing } = usePullToRefresh(scrollRef, onRefresh ?? (() => Promise.resolve()));
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


  return (
    <>
      {/* pull-to-refresh 인디케이터 */}
      {(pullY > 0 || refreshing) && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
          style={{ top: `calc(var(--header-height) + ${refreshing ? 16 : pullY * 0.18}px)` }}
        >
          <div className={`w-8 h-8 rounded-full bg-background border shadow-md flex items-center justify-center ${refreshing ? "animate-spin" : ""}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: `rotate(${pullY * 3.5}deg)` }}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </div>
        </div>
      )}

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
