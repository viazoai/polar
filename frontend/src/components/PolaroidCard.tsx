import { motion } from "framer-motion";

export interface MomentSummary {
  id: number;
  date: string;
  title: string | null;
  photo_count: number;
  representative_photo_id: number | null;
}

const ROTATIONS = [-2.5, 1.8, -1.2, 2.1, -0.8, 1.5, -2.0, 0.9, -1.6, 2.3];

// 뒤에 겹치는 카드의 회전/이동 오프셋 (index 짝수/홀수 교대로 자연스럽게)
const STACK_OFFSETS = [
  [
    { r: 6.0, x: 4, y: 5 },   // 가장 뒤 카드
    { r: -4.0, x: -3, y: 3 }, // 중간 카드
  ],
  [
    { r: -5.5, x: -4, y: 4 },
    { r: 3.5, x: 3, y: 3 },
  ],
  [
    { r: 5.0, x: 3, y: 6 },
    { r: -3.0, x: -4, y: 2 },
  ],
];

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}. ${parseInt(m)}. ${parseInt(d)}`;
}

function PhotoPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#bbb"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    </div>
  );
}

interface Props {
  moment: MomentSummary;
  index: number;
  onClick: () => void;
}

export default function PolaroidCard({ moment, index, onClick }: Props) {
  const rotation = ROTATIONS[index % ROTATIONS.length];
  const stackCount = Math.min(moment.photo_count - 1, 2);
  const offsets = STACK_OFFSETS[index % STACK_OFFSETS.length];

  return (
    <div className="relative w-full cursor-pointer select-none" onClick={onClick}>
      {/* 뒤에 겹치는 카드들 (가장 뒤부터 렌더) */}
      {stackCount >= 2 && (
        <div
          className="absolute inset-0 bg-white"
          style={{
            transform: `rotate(${rotation + offsets[0].r}deg) translate(${offsets[0].x}px, ${offsets[0].y}px)`,
            boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
            zIndex: 1,
          }}
        >
          <div className="p-[10px] pb-0"><div className="aspect-square bg-zinc-100" /></div>
          <div className="px-[10px] pt-3 pb-7" />
        </div>
      )}
      {stackCount >= 1 && (
        <div
          className="absolute inset-0 bg-white"
          style={{
            transform: `rotate(${rotation + offsets[1].r}deg) translate(${offsets[1].x}px, ${offsets[1].y}px)`,
            boxShadow: "0 5px 18px rgba(0,0,0,0.11)",
            zIndex: 2,
          }}
        >
          <div className="p-[10px] pb-0"><div className="aspect-square bg-zinc-100" /></div>
          <div className="px-[10px] pt-3 pb-7" />
        </div>
      )}

      {/* 메인 카드 */}
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="relative bg-white w-full"
        style={{
          rotate: rotation,
          boxShadow: "0 8px 28px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)",
          zIndex: 3,
        }}
      >
        {/* 사진 영역 — 10px 흰 테두리 */}
        <div className="p-[10px] pb-0">
          <div className="aspect-square overflow-hidden">
            {moment.representative_photo_id ? (
              <img
                src={`/api/photos/${moment.representative_photo_id}/thumbnail/gallery`}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <PhotoPlaceholder />
            )}
          </div>
        </div>

        {/* 캡션 영역 */}
        <div className="px-[10px] pt-3 pb-7 text-center">
          <p className="text-sm font-medium leading-snug text-zinc-700 line-clamp-2">
            {moment.title || "새로운 순간"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {formatShortDate(moment.date)}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
