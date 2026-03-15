import { BrowserRouter, Routes, Route, Link, useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import HomePage from "@/pages/HomePage";
import UploadPage from "@/pages/UploadPage";
import FamilyPage from "@/pages/FamilyPage";
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

function FamilyIcon({ active, size = 22 }: { active: boolean; size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

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
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}

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
        <Link
          to="/"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
            isMoments ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <GridIcon active={isMoments} />
          <span className="text-[10px]">Moments</span>
        </Link>

        <Link
          to="/?view=list"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
            isTimeline ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <TimelineIcon active={isTimeline} />
          <span className="text-[10px]">Timeline</span>
        </Link>

        <Link
          to="/family"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
            isFamily ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <FamilyIcon active={isFamily} />
          <span className="text-[10px]">Family</span>
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
  const isFamily = location.pathname === "/family";
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view") ?? "gallery";

  const isMoments = isHome && view !== "list";
  const isTimeline = isHome && view === "list";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3 flex items-center justify-between">
      {/* 좌측: 로고 */}
      <Link to="/" className="text-lg font-semibold tracking-tight min-w-0 shrink-0">
        Polar
      </Link>

      {/* 중앙: 3개 탭 — 데스크톱 전용 */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className="hidden md:flex items-center gap-0.5 rounded-lg border p-0.5">
          {[
            { to: "/", label: "Moments", active: isMoments, icon: <GridIcon active={isMoments} /> },
            { to: "/?view=list", label: "Timeline", active: isTimeline, icon: <ListIcon active={isTimeline} /> },
            { to: "/family", label: "Family", active: isFamily, icon: <FamilyIcon active={isFamily} size={18} /> },
          ].map(({ to, label, active, icon }) => (
            <Link
              key={label}
              to={to}
              className={cn(
                "relative h-7 px-2.5 flex items-center gap-1.5 rounded-md text-xs transition-colors z-0",
                active ? "text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="header-tab-pill"
                  className="absolute inset-0 rounded-md bg-foreground -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              {icon}
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* 우측: 여백 균형용 */}
      <div className="shrink-0 w-[72px]" />
    </header>
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
            <Route path="/family" element={<FamilyPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <MobileFab />
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
