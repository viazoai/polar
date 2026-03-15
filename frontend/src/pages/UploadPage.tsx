import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { apiPostFormData } from "@/api/client";

// ─── 타입 ──────────────────────────────────────────────────────────────────

type DateSource = "exif" | "filename" | "manual" | null;

interface UploadFile {
  file: File;
  preview: string;
  /** 서버에서 감지한 날짜 */
  detectedDate: string | null;
  /** 날짜 출처 */
  source: DateSource;
  /** 사용자가 확인/수정한 날짜 */
  confirmedDate: Date | null;
  /** 날짜 감지 중 여부 */
  detecting: boolean;
}

interface UploadResponse {
  id: number;
  moment_id: number;
  taken_at: string;
  has_exif_date: boolean;
}

// ─── 유틸 ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISODate(iso: string): Date {
  return new Date(iso.replace("T", " "));
}

const SOURCE_LABEL: Record<Exclude<DateSource, null>, string> = {
  exif:     "기록일자 기준: 파일 메타데이터",
  filename: "기록일자 기준: 파일명",
  manual:   "기록일자 기준: 직접 입력",
};

const SOURCE_COLOR: Record<Exclude<DateSource, null>, string> = {
  exif:     "text-emerald-600",
  filename: "text-sky-600",
  manual:   "text-violet-600",
};

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [step, setStep] = useState<"select" | "confirm" | "uploading">("select");
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // 파일 추가 → 날짜 감지 요청
  const addFiles = async (fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      detectedDate: null,
      source: null,
      confirmedDate: null,
      detecting: true,
    }));

    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      return updated;
    });

    // 각 파일에 대해 날짜 감지 요청
    const detected = await Promise.all(
      newFiles.map(async (f) => {
        const form = new FormData();
        form.append("file", f.file);
        try {
          const res = await apiPostFormData<{ taken_at: string | null; source: DateSource }>(
            "/photos/detect-date",
            form
          );
          return { taken_at: res.taken_at, source: res.source };
        } catch {
          return { taken_at: null, source: null as DateSource };
        }
      })
    );

    setFiles((prev) => {
      const result = [...prev];
      const startIdx = result.length - newFiles.length;
      detected.forEach((d, i) => {
        const idx = startIdx + i;
        result[idx] = {
          ...result[idx],
          detectedDate: d.taken_at,
          source: d.source,
          confirmedDate: d.taken_at ? parseISODate(d.taken_at) : null,
          detecting: false,
        };
      });
      return result;
    });

    setStep("confirm");
  };

  const updateConfirmedDate = (index: number, date: Date) => {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, confirmedDate: date, source: "manual" } : f
      )
    );
  };

  const handleUpload = async () => {
    setStep("uploading");
    setUploadProgress({ done: 0, total: files.length });

    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const formData = new FormData();
      formData.append("file", f.file);
      if (f.confirmedDate) {
        formData.append("taken_at", formatDate(f.confirmedDate));
      }
      try {
        await apiPostFormData<UploadResponse>("/photos/upload", formData);
        successCount++;
      } catch {
        // 개별 실패는 계속 진행
      }
      setUploadProgress({ done: i + 1, total: files.length });
    }

    if (successCount > 0) {
      toast.success(`${successCount}장의 사진이 업로드되었습니다`);
    }
    if (successCount < files.length) {
      toast.error(`${files.length - successCount}장 업로드에 실패했습니다`);
    }
    setTimeout(() => navigate("/"), 600);
  };

  const missingDateCount = files.filter((f) => !f.confirmedDate).length;

  // ── 선택 단계 ─────────────────────────────────────────────────────────────
  if (step === "select") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 pb-tab space-y-4">
        <h1 className="text-lg font-semibold">사진 업로드</h1>

        <div className="grid grid-cols-2 gap-3">
          <button
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 text-muted-foreground hover:border-foreground/40 hover:text-foreground active:bg-muted/30 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span className="text-xs font-medium">갤러리</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </button>

          <button
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 text-muted-foreground hover:border-foreground/40 hover:text-foreground active:bg-muted/30 transition-colors"
            onClick={() => cameraRef.current?.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <span className="text-xs font-medium">카메라</span>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </button>
        </div>
      </div>
    );
  }

  // ── 업로드 중 ─────────────────────────────────────────────────────────────
  if (step === "uploading") {
    const pct = uploadProgress.total > 0
      ? Math.round((uploadProgress.done / uploadProgress.total) * 100)
      : 0;
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col items-center gap-4 pt-16">
        <p className="text-sm font-medium">업로드 중...</p>
        <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {uploadProgress.done} / {uploadProgress.total}
        </p>
      </div>
    );
  }

  // ── 날짜 확인 단계 ────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-tab space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">날짜 확인</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            사진 {files.length}장 · 업로드 전 날짜를 확인해주세요
          </p>
        </div>
        <button
          onClick={() => { setFiles([]); setStep("select"); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        >
          다시 선택
        </button>
      </div>

      {/* 파일 목록 */}
      <div className="space-y-2">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b last:border-b-0">
            {/* 썸네일 */}
            <img
              src={f.preview}
              alt=""
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-muted"
            />

            {/* 파일명 */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{f.file.name}</p>
            </div>

            {/* 날짜 + 출처 — 오른쪽 정렬 */}
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              {f.detecting ? (
                <p className="text-xs text-muted-foreground animate-pulse">확인 중...</p>
              ) : (
                <>
                  {/* 날짜 선택 버튼 */}
                  <Popover>
                    <PopoverTrigger>
                      <div className={`text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors
                        ${f.confirmedDate
                          ? "border-foreground/20 text-foreground hover:border-foreground/40"
                          : "border-destructive/50 text-destructive hover:border-destructive"
                        }`}>
                        {f.confirmedDate ? formatDate(f.confirmedDate) : "날짜 입력"}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        fromYear={1990}
                        toYear={new Date().getFullYear()}
                        selected={f.confirmedDate ?? undefined}
                        defaultMonth={f.confirmedDate ?? new Date()}
                        onSelect={(date) => {
                          if (date) updateConfirmedDate(i, date);
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* 출처 */}
                  {f.source && (
                    <span className={`text-[10px] ${SOURCE_COLOR[f.source]}`}>
                      {SOURCE_LABEL[f.source]}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 경고 */}
      {missingDateCount > 0 && (
        <p className="text-xs text-destructive">
          날짜가 없는 사진 {missingDateCount}장 — 날짜를 입력해야 업로드됩니다
        </p>
      )}

      {/* 업로드 버튼 */}
      <Button
        onClick={handleUpload}
        disabled={files.some((f) => f.detecting) || missingDateCount > 0}
        className="w-full"
      >
        {files.some((f) => f.detecting)
          ? "날짜 확인 중..."
          : `업로드 (${files.length}장)`}
      </Button>
    </div>
  );
}
