import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost, apiPatch, apiDelete, apiPostFormData } from "@/api/client";

interface FamilyMember {
  id: number;
  name: string;
  reference_photos: string[];
}

function ReferencePhotoSlot({
  memberId,
  index,
  hasPhoto,
  onAdd,
  onDelete,
}: {
  memberId: number;
  index: number;
  hasPhoto: boolean;
  onAdd: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (hasPhoto) {
    return (
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        <img
          src={`/api/family/${memberId}/reference-photos/${index}`}
          alt=""
          className="w-full h-full object-cover"
        />
        <button
          onClick={onDelete}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs leading-none hover:bg-black/80"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAdd(file);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/50 hover:border-muted-foreground/60 hover:text-muted-foreground transition-colors flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </>
  );
}

function MemberCard({
  member,
  onUpdated,
  onDeleted,
}: {
  member: FamilyMember;
  onUpdated: (m: FamilyMember) => void;
  onDeleted: () => void;
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(member.name);
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === member.name) {
      setNameInput(member.name);
      setIsEditingName(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await apiPatch<FamilyMember>(`/family/${member.id}`, { name: trimmed });
      onUpdated(updated);
      setIsEditingName(false);
    } catch {
      toast.error("이름 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${member.name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await apiDelete(`/family/${member.id}`);
      onDeleted();
      toast.success(`${member.name} 삭제됨`);
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  const handleAddPhoto = async (file: File) => {
    if (member.reference_photos.length >= 3) {
      toast.error("참조 사진은 최대 3장까지 등록 가능합니다");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    try {
      const updated = await apiPostFormData<FamilyMember>(`/family/${member.id}/reference-photos`, form);
      onUpdated(updated);
    } catch {
      toast.error("사진 업로드에 실패했습니다");
    }
  };

  const handleDeletePhoto = async (index: number) => {
    try {
      const updated = await apiDelete(`/family/${member.id}/reference-photos/${index}`) as unknown as FamilyMember;
      // DELETE returns nothing (204), re-fetch via parent
      onUpdated({ ...member, reference_photos: member.reference_photos.filter((_, i) => i !== index) });
    } catch {
      toast.error("사진 삭제에 실패했습니다");
    }
  };

  return (
    <Card className="p-4 flex flex-col gap-3">
      {/* 이름 행 */}
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") { setNameInput(member.name); setIsEditingName(false); }
              }}
              className="h-8 text-sm flex-1"
              autoFocus
              disabled={saving}
            />
            <Button size="sm" className="h-8 px-2 text-xs" onClick={saveName} disabled={saving}>
              저장
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setNameInput(member.name); setIsEditingName(false); }}>
              취소
            </Button>
          </>
        ) : (
          <>
            <span className="font-medium text-sm flex-1">{member.name}</span>
            <button
              onClick={() => setIsEditingName(true)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="이름 편집"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
              title="구성원 삭제"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* 참조 사진 슬롯 */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">참조 사진 (최대 3장) — AI 인물 식별에 사용</p>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <ReferencePhotoSlot
              key={i}
              memberId={member.id}
              index={i}
              hasPhoto={i < member.reference_photos.length}
              onAdd={handleAddPhoto}
              onDelete={() => handleDeletePhoto(i)}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    apiGet<FamilyMember[]>("/family")
      .then(setMembers)
      .catch(() => toast.error("목록 불러오기에 실패했습니다"))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const created = await apiPost<FamilyMember>("/family", { name: trimmed });
      setMembers((prev) => [...prev, created]);
      setNewName("");
      setAddDialogOpen(false);
      toast.success(`${created.name} 추가됨`);
    } catch {
      toast.error("추가에 실패했습니다");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-tab flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Family</h1>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          + 추가
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">불러오는 중...</p>
      ) : members.length === 0 ? (
        <div className="text-center py-12 flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">등록된 가족 구성원이 없습니다</p>
          <p className="text-xs text-muted-foreground/60">구성원을 추가하면 AI가 사진에서 자동으로 인물을 식별합니다</p>
        </div>
      ) : (
        members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            onUpdated={(updated) =>
              setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
            }
            onDeleted={() => setMembers((prev) => prev.filter((m) => m.id !== member.id))}
          />
        ))
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-xs">
          <div className="flex flex-col gap-4 pt-2">
            <p className="font-medium text-sm">구성원 추가</p>
            <Input
              placeholder="이름 (예: 아빠, 엄마, 아이)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setAddDialogOpen(false); setNewName(""); }}>
                취소
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || adding}>
                추가
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
