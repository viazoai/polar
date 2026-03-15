import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { formatTimelineDate } from "@/lib/dateUtils";
import { type MomentSummary } from "@/components/PolaroidCard";

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

interface Props {
  moment: MomentSummary;
  onSelect: (id: number) => void;
}

/** 순간 행 — 동그라미 마커 + 연결선 + 썸네일 + 정보 */
function MomentRow({ moment, onSelect }: Props) {
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
            {formatTimelineDate(moment.date)}
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

export default memo(MomentRow);
