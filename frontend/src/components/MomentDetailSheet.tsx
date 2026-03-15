import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, apiDelete, apiPostFormData } from "@/api/client";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatKoreanDate } from "@/lib/dateUtils";

interface PhotoInfo {
  id: number;
  thumbnail_gallery: string;
  thumbnail_list: string;
  taken_at: string;
}

interface PersonTag {
  family_member_id: number;
  name: string;
  confidence: string;
  is_confirmed: boolean;
}

interface FamilyMember {
  id: number;
  name: string;
  reference_photos: string[];
}

interface MomentDetail {
  id: number;
  date: string;
  title: string | null;
  diary: string | null;
  location: string | null;
  ai_status: string;
  content_source: string | null; // null | 'ai' | 'manual'
  representative_photo_id: number | null;
  people: PersonTag[];
  photos: PhotoInfo[];
}

interface Props {
  momentId: number | null;
  onClose: () => void;
  onDeleted?: (id: number) => void;
  onUpdated?: (detail: MomentDetail) => void;
}

// ─── 사진 캐러셀 ──────────────────────────────────────────────────────────────

function PhotoCarousel({
  photos: rawPhotos,
  representativeId,
  onSetRepresentative,
  onDeletePhoto,
  onPhotoFilesSelected,
}: {
  photos: PhotoInfo[];
  representativeId?: number | null;
  onSetRepresentative?: (photoId: number) => void;
  onDeletePhoto?: (photoId: number) => void;
  onPhotoFilesSelected?: (files: FileList) => void;
}) {
  // 대표 사진을 맨 앞으로 정렬
  const photos = [...rawPhotos].sort((a, b) => {
    if (a.id === representativeId) return -1;
    if (b.id === representativeId) return 1;
    return 0;
  });

  const [current, setCurrent] = useState(0);
  const startX = useRef<number | null>(null);
  const dragX = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const isDragging = useRef(false);
  const isCurrentRepresentative = photos[current]?.id === representativeId;

  const prev = useCallback(() => {
    setCurrent((i) => (i > 0 ? i - 1 : i));
  }, []);
  const next = useCallback(() => {
    setCurrent((i) => (i < photos.length - 1 ? i + 1 : i));
  }, [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  // 사진 삭제 후 인덱스 보정
  useEffect(() => {
    if (current >= photos.length && photos.length > 0) {
      setCurrent(photos.length - 1);
    }
  }, [photos.length, current]);

  if (photos.length === 0) return null;

  // translateX(%)는 스트립 자신의 너비 기준 → 컨테이너 1칸 = 100/N %
  const stripX = -(current * 100 / photos.length);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative w-full aspect-square bg-muted overflow-hidden rounded-xl select-none"
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
          dragX.current = 0;
          isDragging.current = true;
        }}
        onTouchMove={(e) => {
          if (!isDragging.current || startX.current === null) return;
          const dx = e.touches[0].clientX - startX.current;
          // 첫/마지막에서 저항감
          const bounded = current === 0 && dx > 0 ? dx * 0.3
            : current === photos.length - 1 && dx < 0 ? dx * 0.3
            : dx;
          dragX.current = bounded;
          setDragOffset(bounded);
        }}
        onTouchEnd={() => {
          isDragging.current = false;
          const threshold = 50;
          if (dragX.current < -threshold) next();
          else if (dragX.current > threshold) prev();
          setDragOffset(0);
          startX.current = null;
        }}
      >
        {/* 사진 스트립 — 모든 사진을 가로로 나열하고 translate로 이동 */}
        <motion.div
          className="absolute inset-0 flex"
          style={{ width: `${photos.length * 100}%` }}
          animate={{ x: `calc(${stripX}% + ${dragOffset}px)` }}
          transition={dragOffset !== 0
            ? { duration: 0 }
            : { type: "spring", stiffness: 400, damping: 40, mass: 0.8 }
          }
        >
          {photos.map((p) => (
            <div key={p.id} className="relative h-full" style={{ width: `${100 / photos.length}%` }}>
              <img
                src={`/api/photos/${p.id}/thumbnail/gallery`}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </motion.div>
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
        {/* 하단 오버레이: 좌측 페이지, 우측 버튼 */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 pb-2">
          {photos.length > 1 ? (
            <div className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
              {current + 1} / {photos.length}
            </div>
          ) : <div />}
          <div className="flex gap-1">
            {photos.length > 1 && onSetRepresentative && !isCurrentRepresentative && (
              <button
                onClick={() => onSetRepresentative(photos[current].id)}
                className="bg-black/50 text-white text-xs px-2 py-0.5 rounded-full hover:bg-black/70 transition-colors"
              >
                대표사진 지정
              </button>
            )}
            {onDeletePhoto && (
              <button
                onClick={() => onDeletePhoto(photos[current].id)}
                className="bg-red-500/80 text-white text-xs px-2 py-0.5 rounded-full hover:bg-red-500 transition-colors"
              >
                사진 삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 썸네일 목록 + 추가 버튼 */}
      {(photos.length > 1 || onPhotoFilesSelected) && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 snap-x">
          {photos.map((p, i) => (
            <button key={p.id} onClick={() => setCurrent(i)}
              className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden snap-start transition-all ${
                i === current ? "border-2 border-primary opacity-100" : "border-2 border-transparent opacity-50"
              }`}>
              <img src={`/api/photos/${p.id}/thumbnail/list`} alt="" className="w-full h-full object-cover" />
              {p.id === representativeId && (
                <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-black rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                </span>
              )}
            </button>
          ))}
          {onPhotoFilesSelected && (
            <label className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/40 text-muted-foreground/60 hover:border-muted-foreground/60 hover:text-muted-foreground transition-colors snap-start flex items-center justify-center cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif"
                multiple
                className="sr-only"
                onChange={(e) => { if (e.target.files) { onPhotoFilesSelected(e.target.files); e.target.value = ""; } }}
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="M5 12h14" />
              </svg>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI 재생성 아이콘 (편집 모드 전용) ───────────────────────────────────────

function AiRegenIcon({ onClick, isPending }: { onClick: () => void; isPending?: boolean }) {
  return (
    <button
      onClick={isPending ? undefined : onClick}
      title="AI로 자동 작성"
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md flex-shrink-0 transition-colors ${
        isPending
          ? "text-blue-500 animate-pulse cursor-default"
          : "text-muted-foreground/60 hover:text-blue-500"
      }`}
    >
      {/* Gemini 스타일: 큰 별 + 우측 하단 작은 별 */}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 2C10 2 11.2 7.2 16 10C11.2 12.8 10 18 10 18C10 18 8.8 12.8 4 10C8.8 7.2 10 2 10 2Z" />
        <path d="M19 13C19 13 19.7 15.8 22 17C19.7 18.2 19 21 19 21C19 21 18.3 18.2 16 17C18.3 15.8 19 13 19 13Z" />
      </svg>
      <span className="text-xs">{isPending ? "AI 작성중.." : "AI 작성하기"}</span>
    </button>
  );
}

// ─── 상세 콘텐츠 ──────────────────────────────────────────────────────────────

function DetailContent({
  moment,
  familyMembers,
  onMomentChange,
  onClose,
  onDeleted,
}: {
  moment: MomentDetail;
  familyMembers: FamilyMember[];
  onMomentChange: (m: MomentDetail) => void;
  onClose: () => void;
  onDeleted?: (id: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(moment.title ?? "");
  const [editDiary, setEditDiary] = useState(moment.diary ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const actionBarRef = useRef<HTMLDivElement>(null);

  // 편집 중 로컬 보류 상태 (저장 전까지 서버 미반영)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const [pendingRepresentativeId, setPendingRepresentativeId] = useState<number | null | undefined>(undefined);
  const [pendingAddedPhotos, setPendingAddedPhotos] = useState<PhotoInfo[]>([]);

  const isPending = moment.ai_status === "pending";

  // 편집 중 보이는 사진 목록 (삭제 보류분 숨김 + 추가 보류분 포함)
  const visiblePhotos = isEditing
    ? [...moment.photos.filter((p) => !pendingDeleteIds.has(p.id)), ...pendingAddedPhotos]
    : moment.photos;
  const effectiveRepresentativeId = isEditing && pendingRepresentativeId !== undefined
    ? pendingRepresentativeId
    : moment.representative_photo_id;

  const startEdit = () => {
    setEditTitle(moment.title ?? "");
    setEditDiary(moment.diary ?? "");
    setPendingDeleteIds(new Set());
    setPendingRepresentativeId(undefined);
    setPendingAddedPhotos([]);
    setIsEditing(true);
  };

  // 변경사항 여부 판별
  const hasChanges = () => {
    if ((editTitle.trim() || null) !== (moment.title ?? null)) return true;
    if ((editDiary.trim() || null) !== (moment.diary ?? null)) return true;
    if (pendingDeleteIds.size > 0) return true;
    if (pendingRepresentativeId !== undefined) return true;
    if (pendingAddedPhotos.length > 0) return true;
    return false;
  };

  // 편집 모드 진입 시 키보드가 올라와도 저장 버튼이 보이도록 스크롤
  useEffect(() => {
    if (!isEditing) return;

    const scrollToActionBar = () => {
      actionBarRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    const timer = setTimeout(scrollToActionBar, 400);

    const vv = window.visualViewport;
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(scrollToActionBar, 100);
    };
    vv?.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      clearTimeout(resizeTimer);
      vv?.removeEventListener("resize", handleResize);
    };
  }, [isEditing]);

  const cancelEdit = () => {
    if (hasChanges()) {
      setShowCancelDialog(true);
    } else {
      confirmCancel();
    }
  };

  const confirmCancel = () => {
    // 추가된 사진은 서버에 이미 업로드됨 → 삭제 처리
    for (const photo of pendingAddedPhotos) {
      apiDelete(`/photos/${photo.id}`).catch(() => {});
    }
    setPendingDeleteIds(new Set());
    setPendingRepresentativeId(undefined);
    setPendingAddedPhotos([]);
    setEditTitle(moment.title ?? "");
    setEditDiary(moment.diary ?? "");
    setShowCancelDialog(false);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    setIsSaving(true);
    try {
      // 1) 사진 삭제 실행
      for (const photoId of pendingDeleteIds) {
        await apiDelete(`/photos/${photoId}`);
      }
      // 2) 대표사진 변경 실행
      if (pendingRepresentativeId !== undefined && pendingRepresentativeId !== null) {
        await apiPatch(`/photos/${pendingRepresentativeId}/set-representative`, {});
      }
      // 3) 텍스트 저장
      await apiPatch(`/moments/${moment.id}`, {
        title: editTitle.trim() || null,
        diary: editDiary.trim() || null,
      });
      // 서버에서 최신 상태 가져와서 반영
      const updated = await apiGet<MomentDetail>(`/moments/${moment.id}`);
      onMomentChange(updated);
      setPendingDeleteIds(new Set());
      setPendingRepresentativeId(undefined);
      setPendingAddedPhotos([]);
      setIsEditing(false);
    } catch {
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegen = async () => {
    try {
      await apiPost(`/moments/${moment.id}/regenerate-ai`);
      onMomentChange({ ...moment, ai_status: "pending", title: null, diary: null, content_source: null });
      setEditTitle("");
      setEditDiary("");
    } catch {
      toast.error("AI 재분석 요청에 실패했습니다");
    }
  };

  // AI 분석 완료 시 편집 필드를 새 결과로 동기화 (편집 모드 유지)
  useEffect(() => {
    if (isEditing && moment.ai_status === "done" && moment.content_source === "ai") {
      setEditTitle(moment.title ?? "");
      setEditDiary(moment.diary ?? "");
    }
  }, [moment.ai_status, moment.content_source, moment.title, moment.diary, isEditing]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiDelete(`/moments/${moment.id}`);
      toast.success("순간이 삭제되었습니다");
      setShowDeleteDialog(false);
      onDeleted?.(moment.id);
      onClose();
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemovePerson = async (memberId: number) => {
    try {
      await apiDelete(`/moments/${moment.id}/people/${memberId}`);
      onMomentChange({ ...moment, people: moment.people.filter((p) => p.family_member_id !== memberId) });
    } catch {
      toast.error("인물 태그 삭제에 실패했습니다");
    }
  };

  const handleAddPerson = async (memberId: number) => {
    try {
      const tag = await apiPost<PersonTag>(`/moments/${moment.id}/people`, { family_member_id: memberId });
      onMomentChange({ ...moment, people: [...moment.people, tag] });
    } catch {
      toast.error("인물 태그 추가에 실패했습니다");
    }
  };

  // 로컬 보류: 대표사진 지정
  const handleSetRepresentative = (photoId: number) => {
    setPendingRepresentativeId(photoId);
    toast.success("대표 사진으로 지정됩니다 (저장 시 반영)");
  };

  // 로컬 보류: 사진 삭제
  const handleDeletePhoto = (photoId: number) => {
    const remaining = visiblePhotos.filter((p) => p.id !== photoId);
    if (remaining.length === 0) {
      toast.error("마지막 사진은 삭제할 수 없습니다");
      return;
    }
    // 추가 보류 목록에 있으면 바로 서버 삭제 + 목록에서 제거
    if (pendingAddedPhotos.some((p) => p.id === photoId)) {
      apiDelete(`/photos/${photoId}`).catch(() => {});
      setPendingAddedPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } else {
      setPendingDeleteIds((prev) => new Set(prev).add(photoId));
    }
  };

  const handlePhotoFilesSelected = async (fileList: FileList) => {
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taken_at", moment.date);
      formData.append("moment_id", String(moment.id));
      try {
        const res = await apiPostFormData<{
          id: number; moment_id: number; thumbnail_gallery: string; thumbnail_list: string; taken_at: string;
        }>("/photos/upload", formData);
        const newPhoto: PhotoInfo = {
          id: res.id,
          thumbnail_gallery: res.thumbnail_gallery,
          thumbnail_list: res.thumbnail_list,
          taken_at: res.taken_at,
        };
        setPendingAddedPhotos((prev) => [...prev, newPhoto]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        toast.error(`업로드 실패: ${msg}`);
      }
    }
  };

  const taggedIds = new Set(moment.people.map((p) => p.family_member_id));
  const untaggedMembers = familyMembers.filter((m) => !taggedIds.has(m.id));

  return (
    <div className="flex flex-col gap-5">
      <PhotoCarousel
        photos={visiblePhotos}
        representativeId={effectiveRepresentativeId}
        onSetRepresentative={isEditing ? handleSetRepresentative : undefined}
        onDeletePhoto={isEditing ? handleDeletePhoto : undefined}
        onPhotoFilesSelected={isEditing ? handlePhotoFilesSelected : undefined}
      />

      {/* 제목 + 날짜 */}
      <div className="flex flex-col gap-1.5">
        {isEditing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder={isPending ? "" : "제목을 입력하세요"}
            readOnly={isPending}
            className={`text-base font-semibold border-b outline-none py-0.5 w-full ${
              isPending
                ? "bg-muted animate-pulse text-transparent border-transparent rounded-md"
                : "bg-transparent border-input"
            }`}
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold leading-snug min-w-0">
              {moment.title || "새로운 순간"}
            </h2>
            <Badge variant="secondary" className="text-xs flex-shrink-0 inline-flex items-center gap-0.5">
              {moment.content_source === "ai" && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 2C10 2 11.2 7.2 16 10C11.2 12.8 10 18 10 18C10 18 8.8 12.8 4 10C8.8 7.2 10 2 10 2Z" />
                  <path d="M19 13C19 13 19.7 15.8 22 17C19.7 18.2 19 21 19 21C19 21 18.3 18.2 16 17C18.3 15.8 19 13 19 13Z" />
                </svg>
              )}
              {moment.content_source === "ai"
                ? "AI 작성"
                : moment.content_source === "manual"
                ? "직접 수정"
                : "미입력"}
            </Badge>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatKoreanDate(moment.date)}</span>
          {moment.location && <><span>·</span><span>{moment.location}</span></>}
        </div>
      </div>

      {/* 인물 태그 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">인물</p>
        <div className="flex flex-wrap gap-1.5">
          {moment.people.map((p) => (
            <Badge
              key={p.family_member_id}
              variant={p.confidence === "high" ? "default" : "secondary"}
              className="text-xs pr-1"
            >
              {p.name}
              {p.confidence === "low" && <span className="opacity-60">?</span>}
              <button onClick={() => handleRemovePerson(p.family_member_id)} className="ml-1 opacity-60 hover:opacity-100">×</button>
            </Badge>
          ))}
          {untaggedMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => handleAddPerson(m.id)}
              className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
            >
              + {m.name}
            </button>
          ))}
          {moment.people.length === 0 && untaggedMembers.length === 0 && (
            <p className="text-xs text-muted-foreground/50 italic">
              {familyMembers.length === 0 ? "가족 구성원을 등록하면 AI가 자동으로 태그합니다" : "AI 분석 후 자동으로 태그됩니다"}
            </p>
          )}
        </div>
      </div>

      {/* AI 일기 + 하단 액션 바 */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">이 순간의 이야기</p>
            {isEditing && (
              <AiRegenIcon onClick={handleRegen} isPending={isPending} />
            )}
          </div>

          {isEditing ? (
            <textarea
              value={editDiary}
              onChange={(e) => setEditDiary(e.target.value)}
              placeholder={isPending ? "" : "이 순간의 이야기를 입력하세요"}
              readOnly={isPending}
              rows={4}
              className={`text-sm leading-relaxed rounded-md p-2 outline-none resize-none w-full ${
                isPending
                  ? "bg-muted animate-pulse text-transparent border-transparent"
                  : "bg-transparent border border-input"
              }`}
            />
          ) : (
            moment.diary ? (
              <p className="text-sm leading-relaxed">{moment.diary}</p>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">
                AI가 곧 이 순간의 이야기를 써줄 거예요
              </p>
            )
          )}
        </div>

        {/* 하단 액션 바 */}
        <div ref={actionBarRef} className="flex items-center justify-between pb-safe">
          {isEditing ? (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              삭제
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving}>취소</Button>
                <Button size="sm" onClick={saveEdit} disabled={isSaving}>
                  {isSaving ? "저장 중..." : "저장"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={onClose}>닫기</Button>
                <Button size="sm" onClick={startEdit}>편집</Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-xs">
          <div className="flex flex-col gap-4 pt-2">
            <p className="font-medium text-sm">이 순간을 삭제하시겠습니까?</p>
            <p className="text-sm text-muted-foreground">
              사진 {moment.photos.length}장과 AI가 작성한 내용이 모두 영구 삭제됩니다. 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>취소</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 취소 확인 다이얼로그 */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-xs">
          <div className="flex flex-col gap-4 pt-2">
            <p className="font-medium text-sm">변경사항을 취소하시겠습니까?</p>
            <p className="text-sm text-muted-foreground">
              저장하지 않은 변경사항이 모두 사라집니다.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowCancelDialog(false)}>계속 편집</Button>
              <Button variant="destructive" size="sm" onClick={confirmCancel}>변경 취소</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 스와이프 닫기 래퍼 ───────────────────────────────────────────────────────

function SwipeableContent({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const y = useMotionValue(0);
  return (
    <motion.div
      className="h-full flex flex-col"
      style={{ y }}
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={(_, { offset, velocity }) => {
        if (offset.y > 120 || velocity.y > 500) onClose();
        else animate(y, 0, { type: "spring", stiffness: 500, damping: 35 });
      }}
    >
      <div className="flex justify-center py-3 flex-shrink-0 touch-none">
        <div className="w-10 h-1 rounded-full bg-foreground/20" />
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4" onPointerDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </motion.div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function MomentDetailSheet({ momentId, onClose, onDeleted, onUpdated }: Props) {
  const [moment, setMoment] = useState<MomentDetail | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMomentChange = useCallback((updated: MomentDetail) => {
    setMoment(updated);
    onUpdated?.(updated);
  }, [onUpdated]);

  const fetchMoment = useCallback((id: number) => {
    return apiGet<MomentDetail>(`/moments/${id}`).then(handleMomentChange);
  }, [handleMomentChange]);

  useEffect(() => {
    if (!momentId) { setMoment(null); return; }
    setLoading(true);
    Promise.all([
      apiGet<MomentDetail>(`/moments/${momentId}`).then(setMoment),
      apiGet<FamilyMember[]>("/family").then(setFamilyMembers),
    ]).finally(() => setLoading(false));
  }, [momentId]);

  useEffect(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (momentId && moment?.ai_status === "pending") {
      pollingRef.current = setInterval(() => fetchMoment(momentId), 5000);
    }
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [momentId, moment?.ai_status, fetchMoment]);

  const isOpen = !!momentId;

  const content = loading ? (
    <div className="flex justify-center py-12">
      <p className="text-muted-foreground text-sm">불러오는 중...</p>
    </div>
  ) : moment ? (
    <DetailContent
      moment={moment}
      familyMembers={familyMembers}
      onMomentChange={handleMomentChange}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  ) : null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[92dvh] rounded-t-2xl p-0 overflow-hidden" showCloseButton={false}>
          <SwipeableContent onClose={onClose}>{content}</SwipeableContent>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden" showCloseButton={false}>
        {content}
      </DialogContent>
    </Dialog>
  );
}
