import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MomentDetailSheet from "@/components/MomentDetailSheet";
import GalleryView from "@/components/GalleryView";
import ListView from "@/components/ListView";
import { type MomentSummary } from "@/components/PolaroidCard";
import { apiGet } from "@/api/client";

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

export default function HomePage() {
  const [moments, setMoments] = useState<MomentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const view = (searchParams.get("view") as "list" | "gallery") ?? "gallery";

  useEffect(() => {
    apiGet<MomentSummary[]>("/moments")
      .then(setMoments)
      .catch(() => toast.error("데이터를 불러오지 못했습니다"))
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
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none max-w-lg mx-auto px-4 pt-4">
                <h1 className="text-2xl font-semibold">Moments</h1>
              </div>
              <GalleryView moments={moments} onSelect={setSelectedId} />
            </div>
          ) : (
            <>
              <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
                <h1 className="text-2xl font-semibold">Timeline</h1>
              </div>
              <ListView moments={moments} onSelect={setSelectedId} />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <MomentDetailSheet
        momentId={selectedId}
        onClose={() => setSelectedId(null)}
        onDeleted={(id) => {
          setMoments((prev) => prev.filter((m) => m.id !== id));
          setSelectedId(null);
        }}
        onUpdated={(detail) => {
          setMoments((prev) =>
            prev.map((m) =>
              m.id === detail.id
                ? {
                    ...m,
                    title: detail.title,
                    representative_photo_id: detail.representative_photo_id,
                    photo_count: detail.photos.length,
                    ai_status: detail.ai_status,
                  }
                : m
            )
          );
        }}
      />
    </>
  );
}
