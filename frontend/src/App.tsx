import { BrowserRouter, Routes, Route, Link, useLocation, useSearchParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import HomePage from "@/pages/HomePage";
import UploadPage from "@/pages/UploadPage";
import ErrorBoundary from "@/components/ErrorBoundary";


function TimelineIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="3" cy="12" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="3" cy="18" r="1.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BottomNav() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isHome = location.pathname === "/";
  const view = searchParams.get("view") ?? "gallery";

  const isMemory = isHome && view !== "list";
  const isTimeline = isHome && view === "list";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t pb-safe">
      <div className="flex h-16 items-center">
        {/* 순간 탭 — 남은 공간 절반의 중앙 */}
        <Link
          to="/"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
            isMemory ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <GridIcon active={isMemory} />
          <span className="text-[10px]">순간</span>
        </Link>

        {/* 업로드 중앙 FAB — 고정 너비 */}
        <div className="w-20 flex items-center justify-center flex-none">
          <Link
            to="/upload"
            className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>

        {/* 타임라인 탭 — 남은 공간 절반의 중앙 */}
        <Link
          to="/?view=list"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
            isTimeline ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <TimelineIcon active={isTimeline} />
          <span className="text-[10px]">타임라인</span>
        </Link>
      </div>
    </nav>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
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
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="9" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" />
      <rect x="14" y="15" width="7" height="6" rx="1" />
    </svg>
  );
}

function Header() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [searchParams, setSearchParams] = useSearchParams();
  // 기본값: gallery (파라미터 없음 = gallery)
  const view = searchParams.get("view") ?? "gallery";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 flex items-center justify-between">
      {/* 좌측: 로고 */}
      <Link to="/" className="text-lg font-semibold tracking-tight min-w-0 shrink-0">
        Polar
      </Link>

      {/* 중앙: 뷰 토글 — 홈 페이지, 데스크톱 전용 */}
      <div className="absolute left-1/2 -translate-x-1/2">
        {isHome && (
          <div className="hidden md:flex items-center gap-0.5 rounded-lg border p-0.5">
            <button
              onClick={() => setSearchParams({})}
              className={cn(
                "h-7 px-2.5 flex items-center gap-1.5 rounded-md transition-colors text-xs",
                view !== "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="순간 (갤러리 뷰)"
            >
              <GridIcon active={view !== "list"} />
              순간
            </button>
            <button
              onClick={() => setSearchParams({ view: "list" })}
              className={cn(
                "h-7 px-2.5 flex items-center gap-1.5 rounded-md transition-colors text-xs",
                view === "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="타임라인 (리스트 뷰)"
            >
              <ListIcon active={view === "list"} />
              타임라인
            </button>
          </div>
        )}
      </div>

      {/* 우측: 여백 균형용 */}
      <div className="shrink-0 w-[72px] hidden md:block" />
    </header>
  );
}

function DesktopFab() {
  const location = useLocation();
  if (location.pathname === "/upload") return null;
  return (
    <Link
      to="/upload"
      className="hidden md:flex fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-foreground text-background items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-transform"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/upload" element={<UploadPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <BottomNav />
      <DesktopFab />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
