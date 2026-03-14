import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiPostFormData } from "@/api/client";

type FileStatus = "pending" | "uploading" | "needs_date" | "done" | "error";

interface UploadFile {
  file: File;
  preview: string;
  status: FileStatus;
  selectedDate?: Date;
  error?: string;
}

interface UploadResponse {
  id: number;
  moment_id: number;
  taken_at: string;
  has_exif_date: boolean;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const statusLabel: Record<FileStatus, string> = {
  pending: "대기중",
  uploading: "업로드중",
  needs_date: "날짜 필요",
  done: "완료",
  error: "실패",
};

const statusVariant: Record<FileStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  uploading: "outline",
  needs_date: "destructive",
  done: "default",
  error: "destructive",
};

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const addFiles = (fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as FileStatus,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const updateFile = (index: number, updates: Partial<UploadFile>) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const uploadSingle = async (index: number, fileItem: UploadFile): Promise<UploadResponse | null> => {
    updateFile(index, { status: "uploading" });

    const formData = new FormData();
    formData.append("file", fileItem.file);
    if (fileItem.selectedDate) {
      formData.append("taken_at", formatDate(fileItem.selectedDate));
    }

    try {
      const res = await apiPostFormData<UploadResponse>("/photos/upload", formData);
      updateFile(index, { status: "done" });
      return res;
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      if (error.status === 422 && !fileItem.selectedDate) {
        updateFile(index, { status: "needs_date" });
      } else {
        updateFile(index, { status: "error", error: error.message });
      }
      return null;
    }
  };

  const handleUpload = async () => {
    setUploading(true);

    const targets = files
      .map((f, i) => ({ file: f, index: i }))
      .filter((x) => x.file.status === "pending" || (x.file.status === "needs_date" && x.file.selectedDate));

    for (const { file, index } of targets) {
      await uploadSingle(index, file);
    }

    setUploading(false);

    // 최신 상태 스냅샷
    setFiles((current) => {
      const doneCount = current.filter((f) => f.status === "done").length;
      const needsDate = current.filter((f) => f.status === "needs_date").length;

      if (doneCount > 0) {
        toast.success(`${doneCount}장의 사진이 업로드되었습니다`);
        if (needsDate === 0) {
          // 모두 완료된 경우 홈으로 이동
          setTimeout(() => navigate("/"), 800);
        }
      }
      if (needsDate > 0) {
        toast.info(`${needsDate}장의 사진에 촬영 날짜를 입력해주세요`);
      }
      return current;
    });
  };

  const completedCount = files.filter((f) => f.status === "done").length;
  const progress = files.length > 0 ? (completedCount / files.length) * 100 : 0;
  const hasPending = files.some((f) => f.status === "pending" || (f.status === "needs_date" && f.selectedDate));

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-tab space-y-4">
      <h1 className="text-lg font-semibold">사진 업로드</h1>

      {/* 업로드 영역 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 갤러리에서 선택 */}
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

        {/* 카메라 촬영 */}
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

      {/* 진행 상태 */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">
            {completedCount} / {files.length} 완료
          </p>
        </div>
      )}

      {/* 파일 목록 */}
      <div className="space-y-2">
        {files.map((f, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="flex items-center gap-3 p-3">
              <img
                src={f.preview}
                alt=""
                className="w-14 h-14 object-cover rounded-md flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate text-muted-foreground">{f.file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={statusVariant[f.status]} className="text-xs">
                    {statusLabel[f.status]}
                  </Badge>
                </div>
              </div>

              {f.status === "needs_date" && (
                <Popover>
                  <PopoverTrigger>
                    <div className="text-xs border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors whitespace-nowrap">
                      {f.selectedDate ? formatDate(f.selectedDate) : "날짜 선택"}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={f.selectedDate}
                      onSelect={(date) => {
                        if (date) updateFile(i, { selectedDate: date });
                      }}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 업로드 버튼 */}
      {files.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={uploading || !hasPending}
          className="w-full"
        >
          {uploading ? "업로드 중..." : "업로드 시작"}
        </Button>
      )}
    </div>
  );
}
