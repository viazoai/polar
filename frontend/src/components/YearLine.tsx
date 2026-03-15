import { memo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  year: number;
  sticky?: boolean;
}

/** 연도 구분선 — 연한 얇은 가로선 + 세로선 위 중앙 정렬된 연도 라벨 */
function YearLine({ year, sticky }: Props) {
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
        className="absolute z-10 bg-background px-2 text-xs font-semibold text-muted-foreground tabular-nums"
        style={{ top: "50%", left: "41.25px", transform: "translate(-50%, -50%)" }}
      >
        {year}
      </span>
    </div>
  );
}

export default memo(YearLine);
