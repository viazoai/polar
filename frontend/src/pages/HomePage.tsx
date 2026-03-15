import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MomentDetailSheet from "@/components/MomentDetailSheet";
import GalleryView from "@/components/GalleryView";
import { type MomentSummary } from "@/components/PolaroidCard";
import { apiGet } from "@/api/client";

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}월 ${parseInt(d)}일`;
}

function groupByYear(moments: MomentSummary[]): [number, MomentSummary[]][] {
  const map = new Map<number, MomentSummary[]>();
  for (const m of moments) {
    const y = parseInt(m.date.slice(0, 4));
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(m);
  }
  return Array.from(map.entries());
}

function PhotoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

// ─── 타임라인 구성 요소 ──────────────────────────────────────────────────────

/** 연도 구분선 — 연한 얇은 가로선 + 세로선 위 중앙 정렬된 연도 라벨 */
function YearLine({ year, sticky }: { year: number; sticky?: boolean }) {
  return (
    <div
      data-year-line={year}
      className={cn("relative h-9 bg-background", sticky && "sticky top-0 z-20")}
    >
      {/* 얇고 연한 가로선 — 세로선(40px) 오른쪽만 */}
      <div
        className="absolute h-px"
        style={{ top: "50%", left: "40px", right: "27px", backgroundColor: "rgba(0,0,0,0.08)" }}
      />
      {/* 연도 라벨 — 세로선(center 41.25px) 중앙 정렬, 배경으로 가로선 마스킹 */}
      <span
        className="absolute z-10 bg-background px-1 text-xs font-semibold text-muted-foreground tabular-nums"
        style={{ top: "50%", left: "41.25px", transform: "translate(-50%, -50%)" }}
      >
        {year}
      </span>
    </div>
  );
}

/** 순간 행 — 동그라미 마커 + 연결선 + 썸네일 + 정보 */
function MomentRow({
  moment,
  onSelect,
}: {
  moment: MomentSummary;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="relative">
      {/* ● 동그라미 마커 — 세로선(40px) 중앙 정렬 */}
      <div
        className="absolute top-1/2 -translate-y-1/2 z-10"
        style={{ left: "37px" }}
      >
        <div
          className="w-2 h-2 rounded-full bg-background"
          style={{ border: "2.5px solid rgba(0,0,0,0.10)" }}
        />
      </div>

      {/* 연결선 — 점선, 동그라미에서 썸네일까지 */}
      <div
        className="absolute top-1/2"
        style={{
          left: "46px",
          width: "22px",
          height: "1px",
          backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.10) 2px, transparent 2px)",
          backgroundSize: "5px 1px",
        }}
      />

      <button
        className="w-full flex items-center gap-3 py-2.5 text-left active:bg-muted/50 transition-colors"
        style={{ paddingLeft: "72px", paddingRight: "27px", minHeight: 64 }}
        onClick={() => onSelect(moment.id)}
      >
        {/* 썸네일 */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
          {moment.representative_photo_id ? (
            <img
              src={`/api/photos/${moment.representative_photo_id}/thumbnail/list`}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <PhotoIcon />
          )}
        </div>

        {/* 정보: 일자 먼저, 타이틀 아래 */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {formatShortDate(moment.date)}
          </p>
          <p className="text-sm font-medium truncate mt-0.5">
            {moment.title || "새로운 순간"}
          </p>
        </div>

        {/* 사진 수 */}
        <Badge variant="secondary" className="flex-shrink-0 text-xs">
          {moment.photo_count}장
        </Badge>
      </button>
    </div>
  );
}

// ─── 리스트 뷰 ──────────────────────────────────────────────────────────────

function ListView({
  moments,
  onSelect,
}: {
  moments: MomentSummary[];
  onSelect: (id: number) => void;
}) {
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
        style={{
          bottom: "var(--bottom-nav-height)",
          height: "36px",
        }}
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
                {/* 해당 연도의 순간들 (연도 라벨 위에 배치) */}
                {yearMoments?.map((moment) => (
                  <MomentRow key={moment.id} moment={moment} onSelect={onSelect} />
                ))}
                {/* 연도 구분선 */}
                <YearLine year={year} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── 홈 페이지 ──────────────────────────────────────────────────────────────

export default function HomePage() {
  const [moments, setMoments] = useState<MomentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const view = (searchParams.get("view") as "list" | "gallery") ?? "gallery";

  useEffect(() => {
    apiGet<MomentSummary[]>("/moments")
      .then(setMoments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <PhotoIcon />
        </div>
        <p className="text-muted-foreground text-center text-sm">
          아직 기록된 순간이 없습니다
        </p>
        <Link to="/upload" className={cn(buttonVariants())}>
          첫 번째 사진 업로드하기
        </Link>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {view === "gallery" ? (
            <GalleryView moments={moments} onSelect={setSelectedId} />
          ) : (
            <ListView moments={moments} onSelect={setSelectedId} />
          )}
        </motion.div>
      </AnimatePresence>

      <MomentDetailSheet
        momentId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
