import { BrowserRouter, Routes, Route, Link, useLocation, useSearchParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import HomePage from "@/pages/HomePage";
import UploadPage from "@/pages/UploadPage";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2"
        fill={active ? "white" : "none"}
        stroke={active ? "none" : "currentColor"} strokeWidth="1.8" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
        stroke={active ? "white" : "currentColor"} strokeWidth="1.8" />
    </svg>
  );
}

function BottomNav() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t pb-safe">
      <div className="flex h-16">
        {/* 홈 탭 */}
        <Link
          to="/"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
            isHome ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <HomeIcon active={isHome} />
          <span className="text-[10px]">순간</span>
        </Link>

        {/* 업로드 중앙 FAB */}
        <div className="flex-1 flex items-center justify-center">
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

        {/* 빈 공간 (향후 설정 탭) */}
        <div className="flex-1" />
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
  const isUpload = location.pathname === "/upload";
  const isHome = location.pathname === "/";
  const [searchParams, setSearchParams] = useSearchParams();
  // 기본값: gallery (파라미터 없음 = gallery)
  const view = searchParams.get("view") ?? "gallery";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        Polar
      </Link>

      <div className="flex items-center gap-2">
        {/* 뷰 토글 — 홈 페이지에서만 표시 */}
        {isHome && (
          <div className="flex items-center gap-0.5 rounded-lg border p-0.5">
            <button
              onClick={() => setSearchParams({ view: "list" })}
              className={cn(
                "w-8 h-7 flex items-center justify-center rounded-md transition-colors",
                view === "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="리스트 뷰"
            >
              <ListIcon active={view === "list"} />
            </button>
            <button
              onClick={() => setSearchParams({})}
              className={cn(
                "w-8 h-7 flex items-center justify-center rounded-md transition-colors",
                view !== "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="갤러리 뷰"
            >
              <GridIcon active={view !== "list"} />
            </button>
          </div>
        )}

        {/* 데스크톱 업로드 버튼 */}
        {!isUpload && (
          <Link
            to="/upload"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden md:inline-flex")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="mr-1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            업로드
          </Link>
        )}
      </div>
    </header>
  );
}

function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </main>
      <BottomNav />
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
