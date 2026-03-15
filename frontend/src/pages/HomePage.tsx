import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import MomentDetailSheet from "@/components/MomentDetailSheet";
import GalleryView from "@/components/GalleryView";
import { type MomentSummary } from "@/components/PolaroidCard";
import { apiGet } from "@/api/client";

function formatKoreanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

function formatMonthHeader(dateStr: string): string {
  const [y, m] = dateStr.split("-");
  return `${y}년 ${parseInt(m)}월`;
}

function groupByMonth(moments: MomentSummary[]): [string, MomentSummary[]][] {
  const map = new Map<string, MomentSummary[]>();
  for (const m of moments) {
    const key = m.date.slice(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
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

function ListView({
  moments,
  onSelect,
}: {
  moments: MomentSummary[];
  onSelect: (id: number) => void;
}) {
  const groups = groupByMonth(moments);

  return (
    <div
      className="max-w-2xl md:mx-auto"
      style={{
        height: "calc(100dvh - var(--header-height))",
        overflowY: "auto",
        overscrollBehaviorY: "contain",
      }}
    >
      {/* 세로 축선 + 마커가 스크롤과 함께 흐르도록 relative 컨테이너 */}
      <div className="relative pb-tab">
        {/* 세로 축선 — 콘텐츠 전체 높이에 걸쳐 absolute */}
        <div
          className="absolute top-0 bottom-0 w-px bg-foreground/12 pointer-events-none"
          style={{ left: "24px" }}
        />

        {groups.map(([monthKey, groupMoments], groupIdx) => (
          <div key={monthKey}>
            {/* 월 구분 헤더 */}
            <div
              className="sticky z-10 bg-background/95 backdrop-blur py-2 flex items-center gap-3"
              style={{ top: 0, paddingLeft: "48px", paddingRight: "16px" }}
            >
              <span className="text-xs font-semibold text-muted-foreground">
                {formatMonthHeader(monthKey + "-01")}
              </span>
              <Separator className="flex-1" />
            </div>

            {/* 순간 목록 */}
            <div style={{ paddingLeft: "48px", paddingRight: "16px" }}>
              {groupMoments.map((moment, idx) => (
                <div key={moment.id} className="relative">
                  {/* ▶ 세모 마커 — 행의 세로 중앙, 축선 위에 */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: "14px" }}
                  >
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderTop: "5px solid transparent",
                        borderBottom: "5px solid transparent",
                        borderLeft: "8px solid rgba(0,0,0,0.45)",
                      }}
                    />
                  </div>

                  <button
                    className="w-full flex items-center gap-3 py-3 text-left active:bg-muted/50 transition-colors rounded-lg"
                    style={{ minHeight: 64 }}
                    onClick={() => onSelect(moment.id)}
                  >
                    {/* 썸네일 */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
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

                    {/* 텍스트 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {moment.title || "새로운 순간"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatKoreanDate(moment.date)}
                      </p>
                    </div>

                    {/* 사진 수 */}
                    <Badge variant="secondary" className="flex-shrink-0 text-xs">
                      {moment.photo_count}장
                    </Badge>
                  </button>

                  {idx < groupMoments.length - 1 && (
                    <Separator className="ml-[68px]" />
                  )}
                </div>
              ))}
            </div>

            {groupIdx < groups.length - 1 && <div className="h-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}

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
