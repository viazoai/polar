import { useEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/api/client";
import { useIsMobile } from "@/hooks/useIsMobile";
import { type FilterParams, useFilterParams } from "@/hooks/useFilterParams";

interface FamilyMember {
  id: number;
  name: string;
}

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
}

function FilterContent({
  familyMembers,
  filter,
  onApply,
  onClose,
}: {
  familyMembers: FamilyMember[];
  filter: FilterParams;
  onApply: (f: Partial<FilterParams>) => void;
  onClose: () => void;
}) {
  const [localQ, setLocalQ] = useState(filter.q);
  const [localPeople, setLocalPeople] = useState<number[]>(filter.people);
  const [localYear, setLocalYear] = useState<number | null>(filter.year);
  const [localMonth, setLocalMonth] = useState<number | null>(filter.month);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const togglePerson = (id: number) => {
    setLocalPeople((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    onApply({ people: localPeople, year: localYear, month: localMonth, q: localQ });
    onClose();
  };

  const handleClear = () => {
    setLocalPeople([]);
    setLocalYear(null);
    setLocalMonth(null);
    setLocalQ("");
  };

  return (
    <div className="flex flex-col gap-6 px-4 pt-0.5 pb-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">필터</h2>
        <button onClick={handleClear} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          초기화
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">검색</p>
        <input
          type="text"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          placeholder="제목 또는 내용으로 검색"
          className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      {familyMembers.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">인물</p>
          <div className="flex flex-wrap gap-1.5">
            {familyMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => togglePerson(m.id)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  localPeople.includes(m.id)
                    ? "bg-foreground text-background border-foreground"
                    : "border-input text-foreground hover:border-foreground"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">연도</p>
        <div className="flex flex-wrap gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setLocalYear(localYear === y ? null : y)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                localYear === y
                  ? "bg-foreground text-background border-foreground"
                  : "border-input text-foreground hover:border-foreground"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {localYear && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">월</p>
          <div className="flex flex-wrap gap-1.5">
            {months.map((m) => (
              <button
                key={m}
                onClick={() => setLocalMonth(localMonth === m ? null : m)}
                className={`text-sm w-10 py-1 rounded-full border transition-colors ${
                  localMonth === m
                    ? "bg-foreground text-background border-foreground"
                    : "border-input text-foreground hover:border-foreground"
                }`}
              >
                {m}월
              </button>
            ))}
          </div>
        </div>
      )}

      <Button onClick={handleApply} className="mt-2">
        적용
      </Button>
    </div>
  );
}

function SwipeableFilterContent({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-0 pb-4" onPointerDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </motion.div>
  );
}

export default function FilterPanel({ open, onClose }: FilterPanelProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const { people, year, month, q, setFilter } = useFilterParams();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      apiGet<FamilyMember[]>("/family")
        .then(setFamilyMembers)
        .catch(() => {});
    }
  }, [open]);

  const content = (
    <FilterContent
      familyMembers={familyMembers}
      filter={{ people, year, month, q }}
      onApply={setFilter}
      onClose={onClose}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 overflow-hidden" showCloseButton={false}>
          <SwipeableFilterContent onClose={onClose}>
            {content}
          </SwipeableFilterContent>
        </SheetContent>
      </Sheet>
    );
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4" onClick={onClose}>
      <div
        className="bg-background border rounded-xl shadow-lg w-72 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}

export function FilterBadge() {
  const { activeCount } = useFilterParams();
  if (!activeCount) return null;
  return (
    <Badge variant="default" className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[10px]">
      {activeCount}
    </Badge>
  );
}
