import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import HomePage from "@/pages/HomePage";
import UploadPage from "@/pages/UploadPage";
import FamilyPage from "@/pages/FamilyPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ErrorBoundary from "@/components/ErrorBoundary";
import FilterPanel from "@/components/FilterPanel";
import { useAuth } from "@/hooks/useAuth";
import { useFilterParams } from "@/hooks/useFilterParams";
import { apiGet, apiPost, apiDelete } from "@/api/client";
import { toast } from "sonner";


// ─── 아이콘 ───────────────────────────────────────────────────────────────────

function TimelineIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="3" cy="12" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="3" cy="18" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FamilyIcon({ active, size = 22 }: { active: boolean; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="9" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" /><rect x="14" y="15" width="7" height="6" rx="1" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}


// ─── 프로필 팝오버 ─────────────────────────────────────────────────────────────

interface PendingUser {
  id: number;
  name: string;
  login_id: string;
  created_at: string;
}

function ProfilePopover({ user }: {
  user: { id: number; name: string; login_id: string; is_admin: boolean } | null;
}) {
  const [open, setOpen] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownTop, setDropdownTop] = useState(0);

  useEffect(() => {
    if (open && user?.is_admin) {
      setLoadingUsers(true);
      apiGet<PendingUser[]>("/auth/pending-users")
        .then(setPendingUsers)
        .catch(() => {})
        .finally(() => setLoadingUsers(false));
    }
  }, [open, user?.is_admin]);

  useEffect(() => {
    if (!open) return;
    // 헤더의 실제 하단 위치를 측정
    const header = document.querySelector("header");
    if (header) {
      setDropdownTop(header.getBoundingClientRect().bottom);
    }
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = async () => {
    try {
      await apiPost("/auth/logout");
    } catch {
      // 실패해도 로그아웃 처리
    }
    // 쿠키 만료 처리 (백엔드 실패 대비)
    document.cookie = "polar_token=; Max-Age=0; path=/";
    window.location.href = "/login";
  };

  const handleApprove = async (userId: number) => {
    try {
      await apiPost(`/auth/users/${userId}/approve`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("승인되었습니다");
    } catch {
      toast.error("승인에 실패했습니다");
    }
  };

  const handleReject = async (userId: number) => {
    try {
      await apiDelete(`/auth/users/${userId}`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("거절되었습니다");
    } catch {
      toast.error("거절에 실패했습니다");
    }
  };

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed right-0 z-50 w-72 bg-popover border border-t-0 rounded-b-xl shadow-lg text-sm text-popover-foreground overflow-hidden"
      style={{ top: `${dropdownTop}px` }}
    >
      {/* 프로필 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center text-base font-semibold shrink-0">
          {user?.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">@{user?.login_id}</p>
        </div>
        {user?.is_admin && (
          <span className="text-[10px] bg-foreground text-background px-1.5 py-0.5 rounded-full shrink-0">관리자</span>
        )}
      </div>

      {/* 관리자: 가입 승인 대기 */}
      {user?.is_admin && (
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            가입 승인 대기
            {pendingUsers.length > 0 && (
              <span className="ml-1.5 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded-full">{pendingUsers.length}</span>
            )}
          </p>
          {loadingUsers ? (
            <p className="text-xs text-muted-foreground">불러오는 중...</p>
          ) : pendingUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground">대기 중인 신청 없음</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {pendingUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                  <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center text-xs font-semibold shrink-0">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{u.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">@{u.login_id}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleApprove(u.id)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-foreground text-background hover:opacity-80 transition-opacity">
                      승인
                    </button>
                    <button onClick={() => handleReject(u.id)}
                      className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors">
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 로그아웃 */}
      <div className="px-4 py-3">
        <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
          로그아웃
        </Button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">
          {user?.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="hidden md:block text-sm font-medium max-w-[80px] truncate">{user?.name}</span>
      </button>
      {dropdown}
    </div>
  );
}


// ─── 필터 FAB ─────────────────────────────────────────────────────────────────

function FilterFab() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [filterOpen, setFilterOpen] = useState(false);
  const { activeCount } = useFilterParams();

  if (!isHome) return null;

  return (
    <>
      {/* 모바일: + 버튼 위, 동일한 w-13 h-13 크기 + 간격 16px */}
      <button
        onClick={() => setFilterOpen(true)}
        className="md:hidden fixed z-50 w-13 h-13 rounded-full bg-background text-foreground flex items-center justify-center shadow-lg border active:scale-95 transition-transform"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom) + 16px + 52px + 10px)", right: "16px" }}
      >
        <SearchIcon />
        {activeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foreground text-background rounded-full text-[9px] flex items-center justify-center font-medium">
            {activeCount}
          </span>
        )}
      </button>

      {/* 데스크톱: 업로드 FAB 위, 동일한 w-14 h-14 크기 + 간격 16px */}
      <button
        onClick={() => setFilterOpen(true)}
        className="hidden md:flex fixed z-50 w-14 h-14 rounded-full bg-background text-foreground items-center justify-center shadow-lg border hover:opacity-90 active:scale-95 transition-transform"
        style={{ bottom: "calc(24px + 56px + 10px)", right: "24px" }}
      >
        <SearchIcon />
        {activeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foreground text-background rounded-full text-[9px] flex items-center justify-center font-medium">
            {activeCount}
          </span>
        )}
      </button>

      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} />
    </>
  );
}


// ─── FAB ──────────────────────────────────────────────────────────────────────

function MobileFab() {
  const location = useLocation();
  if (location.pathname === "/upload" || location.pathname === "/family") return null;
  return (
    <Link
      to="/upload"
      className="md:hidden fixed z-50 w-13 h-13 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom) + 16px)", right: "16px" }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}

function DesktopFab() {
  const location = useLocation();
  if (location.pathname === "/upload" || location.pathname === "/family") return null;
  return (
    <Link
      to="/upload"
      className="hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-foreground text-background items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-transform"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}


// ─── 하단 탭 바 ───────────────────────────────────────────────────────────────

function BottomNav() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isHome = location.pathname === "/";
  const view = searchParams.get("view") ?? "gallery";

  const isMoments = isHome && view !== "list";
  const isTimeline = isHome && view === "list";
  const isFamily = location.pathname === "/family";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t pb-safe">
      <div className="flex h-16 items-center">
        <Link to="/" className={cn("flex-1 flex flex-col items-center justify-center gap-1 transition-colors", isMoments ? "text-foreground" : "text-muted-foreground")}>
          <GridIcon active={isMoments} />
          <span className="text-[10px]">Moments</span>
        </Link>
        <Link to="/?view=list" className={cn("flex-1 flex flex-col items-center justify-center gap-1 transition-colors", isTimeline ? "text-foreground" : "text-muted-foreground")}>
          <TimelineIcon active={isTimeline} />
          <span className="text-[10px]">Timeline</span>
        </Link>
        <Link to="/family" className={cn("flex-1 flex flex-col items-center justify-center gap-1 transition-colors", isFamily ? "text-foreground" : "text-muted-foreground")}>
          <FamilyIcon active={isFamily} />
          <span className="text-[10px]">Family</span>
        </Link>
      </div>
    </nav>
  );
}


// ─── 헤더 ─────────────────────────────────────────────────────────────────────

function Header({ user }: { user: { id: number; name: string; login_id: string; is_admin: boolean } | null }) {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isFamily = location.pathname === "/family";
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view") ?? "gallery";

  const isMoments = isHome && view !== "list";
  const isTimeline = isHome && view === "list";

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 flex items-center justify-between">
        {/* 좌측: 로고 */}
        <Link to="/" className="text-lg font-semibold tracking-tight min-w-0 shrink-0">
          Polar
        </Link>

        {/* 중앙: 데스크톱 탭 */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="hidden md:flex items-center gap-0.5 rounded-lg border p-0.5">
            {[
              { to: "/", label: "Moments", active: isMoments, icon: <GridIcon active={isMoments} /> },
              { to: "/?view=list", label: "Timeline", active: isTimeline, icon: <ListIcon active={isTimeline} /> },
              { to: "/family", label: "Family", active: isFamily, icon: <FamilyIcon active={isFamily} size={18} /> },
            ].map(({ to, label, active, icon }) => (
              <Link key={label} to={to}
                className={cn("relative h-7 px-2.5 flex items-center gap-1.5 rounded-md text-xs transition-colors z-0",
                  active ? "text-background" : "text-muted-foreground hover:text-foreground")}>
                {active && (
                  <motion.span layoutId="header-tab-pill"
                    className="absolute inset-0 rounded-md bg-foreground -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }} />
                )}
                {icon}{label}
              </Link>
            ))}
          </div>
        </div>

        {/* 우측: 프로필 팝오버 */}
        <ProfilePopover user={user} />
      </header>
    </>
  );
}


// ─── 보호 레이아웃 ─────────────────────────────────────────────────────────────

function ProtectedLayout() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <main>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/family" element={<FamilyPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <MobileFab />
      <FilterFab />
      <BottomNav />
      <DesktopFab />
    </div>
  );
}


// ─── 앱 루트 ──────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
