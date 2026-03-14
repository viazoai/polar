import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiGet } from "@/api/client";

interface PhotoInfo {
  id: number;
  thumbnail_gallery: string;
  thumbnail_list: string;
  taken_at: string;
}

interface MomentDetail {
  id: number;
  date: string;
  title: string | null;
  diary: string | null;
  location: string | null;
  photos: PhotoInfo[];
}

interface Props {
  momentId: number | null;
  onClose: () => void;
}

/** resize에도 반응하는 모바일 판단 hook */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function formatKoreanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

function PhotoCarousel({ photos }: { photos: PhotoInfo[] }) {
  const [current, setCurrent] = useState(0);
  const startX = useRef<number | null>(null);

  const prev = useCallback(() => setCurrent((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrent((i) => Math.min(photos.length - 1, i + 1)), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  if (photos.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* 메인 사진 */}
      <div
        className="relative w-full aspect-square bg-muted overflow-hidden rounded-xl select-none"
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const diff = startX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
          startX.current = null;
        }}
      >
        <img
          src={`/api/photos/${photos[current].id}/thumbnail/gallery`}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
        {/* 화살표 (데스크톱) */}
        {current > 0 && (
          <button onClick={prev}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors text-lg">
            ‹
          </button>
        )}
        {current < photos.length - 1 && (
          <button onClick={next}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors text-lg">
            ›
          </button>
        )}
        {photos.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {current + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* 하단 썸네일 스트립 */}
      {photos.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 snap-x">
          {photos.map((p, i) => (
            <button key={p.id} onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden snap-start transition-all ${
                i === current ? "ring-2 ring-primary opacity-100" : "opacity-50"
              }`}>
              <img src={`/api/photos/${p.id}/thumbnail/list`} alt=""
                className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailContent({ moment }: { moment: MomentDetail }) {
  return (
    <div className="flex flex-col gap-5">
      <PhotoCarousel photos={moment.photos} />

      {/* 제목 + 날짜/장소 */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold leading-snug">
          {moment.title || "새로운 순간"}
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatKoreanDate(moment.date)}</span>
          {moment.location && (
            <>
              <span>·</span>
              <span>{moment.location}</span>
            </>
          )}
          <Badge variant="secondary" className="ml-auto text-xs">
            {moment.photos.length}장
          </Badge>
        </div>
      </div>

      {/* 인물 태그 영역 (4단계 AI 연동 후 채워짐) */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">인물</p>
        <p className="text-xs text-muted-foreground/50 italic">
          AI 분석 후 자동으로 태그됩니다
        </p>
      </div>

      <Separator />

      {/* AI 생성 일기 */}
      <div className="flex flex-col gap-1.5 pb-safe">
        <p className="text-xs font-medium text-muted-foreground">이 순간의 이야기</p>
        {moment.diary ? (
          <p className="text-sm leading-relaxed">{moment.diary}</p>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">
            AI가 곧 이 순간의 이야기를 써줄 거예요
          </p>
        )}
      </div>
    </div>
  );
}

/** 아래로 스와이프해서 닫을 수 있는 Sheet 내부 래퍼 */
function SwipeableContent({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const y = useMotionValue(0);

  return (
    <motion.div
      className="h-full flex flex-col"
      style={{ y }}
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={(_, { offset, velocity }) => {
        if (offset.y > 120 || velocity.y > 500) {
          onClose();
        } else {
          // 임계치 미달 — 원위치 스프링 복귀
          animate(y, 0, { type: "spring", stiffness: 500, damping: 35 });
        }
      }}
    >
      {/* 드래그 핸들 바 */}
      <div className="flex justify-center py-3 flex-shrink-0 touch-none">
        <div className="w-10 h-1 rounded-full bg-foreground/20" />
      </div>

      {/* 스크롤 가능한 콘텐츠 영역 — 포인터 이벤트 차단으로 드래그 핸들과 분리 */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </motion.div>
  );
}

export default function MomentDetailSheet({ momentId, onClose }: Props) {
  const [moment, setMoment] = useState<MomentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!momentId) { setMoment(null); return; }
    setLoading(true);
    apiGet<MomentDetail>(`/moments/${momentId}`)
      .then(setMoment)
      .finally(() => setLoading(false));
  }, [momentId]);

  const isOpen = !!momentId;

  const content = loading ? (
    <div className="flex justify-center py-12">
      <p className="text-muted-foreground text-sm">불러오는 중...</p>
    </div>
  ) : moment ? (
    <DetailContent moment={moment} />
  ) : null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        {/* overflow-hidden — 스와이프 드래그가 SheetContent 밖으로 튀지 않도록 */}
        <SheetContent
          side="bottom"
          className="h-[92dvh] rounded-t-2xl p-0 overflow-hidden"
        >
          <SwipeableContent onClose={onClose}>
            {content}
          </SwipeableContent>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {content}
      </DialogContent>
    </Dialog>
  );
}
