import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import PolaroidCard, { type MomentSummary } from "./PolaroidCard";
import { TimelineRuler, buildMonthFracMap } from "./TimelineRuler";
import { useGalleryDragScroll } from "@/hooks/useGalleryDragScroll";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface Props {
  moments: MomentSummary[];
  onSelect: (id: number) => void;
  onRefresh?: () => Promise<void>;
}

export default function GalleryView({ moments, onSelect, onRefresh }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollFraction, setScrollFraction] = useState(0);
  const { pullY, refreshing } = usePullToRefresh(containerRef, onRefresh ?? (() => Promise.resolve()));

  // 카드 높이 ≈ 320px, 간격 100px → slideHeight 420px 고정
  const slideHeight = "420px";
  // header 하단 ~ bottom-nav 상단 영역의 정중앙에 카드 배치
  const paddingV = "calc(max(20px, (100dvh - var(--header-height) - var(--bottom-nav-height) - 420px) / 2))";

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

  useGalleryDragScroll(containerRef);

  /** 줄자 클릭 → 가장 가까운 데이터 월의 첫 항목으로 스크롤 */
  const handleSeek = (fraction: number) => {
    const el = containerRef.current;
    if (!el || moments.length === 0) return;

    const monthToFrac = buildMonthFracMap(moments);

    let closestMonth = "";
    let closestDist = Infinity;
    for (const [monthKey, mFrac] of monthToFrac) {
      const dist = Math.abs(mFrac - fraction);
      if (dist < closestDist) {
        closestDist = dist;
        closestMonth = monthKey;
      }
    }

    const itemIdx = moments.findIndex((m) => m.date.slice(0, 7) === closestMonth);
    if (itemIdx === -1) return;

    const itemFraction = moments.length > 1 ? itemIdx / (moments.length - 1) : 0;
    el.scrollTo({ top: itemFraction * (el.scrollHeight - el.clientHeight), behavior: "smooth" });
  };

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
        ref={containerRef}
        style={{
          height: "calc(100dvh - var(--header-height))",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollPaddingBottom: "var(--bottom-nav-height)",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          paddingTop: paddingV,
          paddingBottom: `calc(${paddingV} + var(--bottom-nav-height))`,
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
              viewport={{ amount: 0.85 }}
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

      {createPortal(
        <TimelineRuler
          moments={moments}
          scrollFraction={scrollFraction}
          onSeek={handleSeek}
        />,
        document.body
      )}
    </>
  );
}
