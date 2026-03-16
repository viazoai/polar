# CLAUDE.md

Claude Code가 Polar 프로젝트에서 작업할 때 참고하는 가이드입니다.

---

## 프로젝트 개요

**Polar** — 가족 사진 추억 기록 서비스. 사진을 업로드하면 GPT-4o Vision이 자동으로 감성 제목/일기를 생성하고, 폴라로이드 감성 타임라인으로 탐색한다.

- **모바일 우선(Mobile-First)** 설계. 모든 UI는 375px 기준으로 먼저 구현
- **PWA 완료** — vite-plugin-pwa 1.2, Service Worker, 오프라인 폴백
- N100 미니PC 홈랩 Docker 배포, Cloudflare Tunnel → `polar.zoai.uk`

상세 기획: `docs/PRD.md` | 단계별 계획: `docs/PLAN.md`

---

## 앱 실행

```bash
# Docker로 실행 (권장)
cd /home/zoai/Projects/Polar
docker compose up -d

# 프론트엔드:  http://localhost:3200  (외부: polar.zoai.uk)
# 백엔드 API:  http://localhost:3201  (Swagger: /docs)
```

---

## 아키텍처

```
frontend/   React + Vite 7 + TypeScript
            shadcn/ui + Tailwind CSS v4 + Framer Motion
            포트 3200 (컨테이너 내부 5173)

backend/    FastAPI (Python 3.11)
            포트 3201 (컨테이너 내부 8000)
            SQLite WAL 모드 → data/polar.db

data/       gitignored, Docker 볼륨 마운트
├── polar.db
├── originals/YYYY/MM/{uuid}.ext
├── thumbnails/gallery/{uuid}.webp  (800px)
├── thumbnails/list/{uuid}.webp     (200px)
└── references/{member_id}/         (AI 인물 참조 사진)
```

---

## 프론트엔드 주요 규칙

### 레이아웃
- **모바일**: 하단 탭 바 (`md:hidden`), 콘텐츠에 `pb-tab` 클래스 적용
- **데스크톱**: 상단 헤더 네비게이션, `pb-tab`은 md+ 에서 자동으로 0이 됨
- 헤더 높이는 CSS 변수 `--header-height: 53px`로 관리 (sticky 오프셋 등에 사용)
- `overflow-x: hidden`은 html/body에 전역 적용되어 있음

### shadcn/ui 버전 주의
이 프로젝트는 `@base-ui/react` 기반의 최신 shadcn/ui를 사용한다.
**`asChild` prop이 없다.** Link를 버튼처럼 쓸 때는 `buttonVariants()`를 사용:
```tsx
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

<Link to="/upload" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
  업로드
</Link>
```

### 미디어 쿼리 / 반응형
- JS에서 모바일 판단 시 `window.innerWidth` 한 번만 읽으면 안 됨 → `useIsMobile()` hook 사용
  (`src/hooks/useIsMobile.ts`)
- CSS는 Tailwind `md:` (768px) 브레이크포인트 사용

### 날짜 포맷
날짜 관련 함수는 반드시 `src/lib/dateUtils.ts`에서 임포트한다. 컴포넌트 내 인라인 정의 금지.
- `formatTimelineDate(dateStr)` — 타임라인 리스트용: `"3. 15 (일)"`
- `formatCardDate(dateStr)` — 폴라로이드 카드용: `"2026. 03. 15 (일)"`
- `formatKoreanDate(dateStr)` — 상세 보기용: `"2026년 3월 15일"`

### safe-area (노치/홈 인디케이터)
- `pb-safe`: `env(safe-area-inset-bottom)` 패딩
- `pb-tab`: 하단 탭(64px) + safe-area 패딩, 모든 스크롤 페이지에 적용

### CSS 변수
- `--header-height: 53px` — sticky 오프셋 계산에 사용
- `--bottom-nav-height: calc(64px + env(safe-area-inset-bottom))` — 모바일 탭 바 높이 (md+는 0px)

### 갤러리 뷰 구조 (GalleryView.tsx)
- 기본 뷰: 갤러리 (URL 파라미터 없음 = gallery, `?view=list` = 리스트)
- 슬라이드 높이: 420px 고정, 패딩으로 첫/마지막 카드 정중앙 정렬
- `scroll-snap-type: y mandatory` + `scroll-snap-align: center`
- `scrollPaddingBottom: var(--bottom-nav-height)` — 모바일 탭 바로 인한 중앙 오프셋 보정
- PC 마우스 드래그 스크롤: `useGalleryDragScroll()` 훅 (`src/hooks/useGalleryDragScroll.ts`)
  - Pointer Events API, scroll-snap 임시 해제 후 관성(decel 0.96) 적용, velocity < 0.3 시 snap 복원
- Framer Motion `viewport.amount: 0.85` — 모바일 다중 활성화 방지
- **줄자 스크롤바**: `TimelineRuler` 컴포넌트 (`src/components/TimelineRuler.tsx`)
  - 화면 우측 24px 이격, 20%~80% 구간
  - `buildVisualSequence()`: 연도라벨+월눈금을 하나의 등간격 시퀀스로 구성
  - `currentMonthFraction()`: 인접 항목 간 선형 보간으로 인디케이터 부드럽게 이동
  - 눈금 스타일: 연도 `'24` 형식(10px 선), 월 숫자(5px 선), 6월 강조(8px + font-medium)
  - `buildMonthFracMap()`, `buildRulerMarks()` 도 이 파일에서 export

### 타임라인 뷰 구조 (ListView.tsx)
- 세로 축선: left 40px, width 2.5px, rgba(0,0,0,0.10)
- 연도 시퀀스: 데이터 있는 연도만, 해당 연도 순간들이 연도라벨 **위**에 배치
- **`YearLine` 컴포넌트** (`src/components/YearLine.tsx`): `data-year-line={year}` 속성, `React.memo` 적용
  - 얇은 가로선(left 40px~right 27px) + 연도 라벨(세로선과 중앙 정렬)
- **`MomentRow` 컴포넌트** (`src/components/MomentRow.tsx`): `React.memo` 적용
  - 동그라미(bg-background + border 2.5px rgba(0,0,0,0.10)) + 점선 연결 + 썸네일 + 날짜우선/타이틀
- **하단 고정 연도 바**: `bottom: var(--bottom-nav-height)`, bg-background, height 36px
  - `IntersectionObserver` 기반 연도 감지 (root = 스크롤 컨테이너, threshold 0)
  - `AnimatePresence` fade 전환으로 연도 변경 시 부드럽게 표시

### Sheet 스와이프 닫기 (SwipeableContent)
- `MomentDetailSheet.tsx`의 `SwipeableContent` 내부 컴포넌트 패턴 사용
- Framer Motion `drag="y"` + `dragConstraints={{ top: 0 }}`
- 드래그 핸들 영역만 drag 활성화, 콘텐츠 스크롤 영역은 `onPointerDown stopPropagation`으로 분리
- 120px 초과 또는 velocity 500+ → 닫힘, 미달 → `animate(y, 0, spring)` 복귀

### Error Boundary
- `src/components/ErrorBoundary.tsx` — `App.tsx`의 `<main>` 영역을 감싸고 있음
- 컴포넌트 크래시 시 "페이지를 새로고침해주세요" 메시지 표시

---

## 백엔드 주요 규칙

- ORM 없이 `sqlite3` 직접 사용
- **DB 커넥션**: `database.py`의 `db_connection()` context manager 사용. `get_db()` 직접 호출 금지
  ```python
  from database import db_connection
  with db_connection() as db:
      rows = db.execute(...).fetchall()
  ```
- **트랜잭션**: `find_or_create_moment()`는 commit하지 않음. router에서 `db.commit()` 담당
- 모든 라우터는 `/api` prefix로 등록
- 사진 업로드 시 EXIF 없으면 HTTP 422 반환 → 프론트에서 날짜 입력 유도
- 업로드 크기 제한: `config.py`의 `MAX_UPLOAD_SIZE` (50MB)
- 썸네일 크기: `config.py`의 `THUMBNAIL_GALLERY_SIZE` (800px), `THUMBNAIL_LIST_SIZE` (200px)
- HEIC 지원: `pillow_heif.register_heif_opener()` 모듈 레벨 등록
- Pillow EXIF: `img.getexif()` + `exif.get_ifd(0x8825)` 공개 API 사용 (`_getexif()` 사용 금지)
- CORS: `main.py`에서 `localhost:3200`, `polar.zoai.uk` 허용

### AI 서비스 (ai_service.py)
- `OPENAI_API_KEY`: `config.py`에서 `os.getenv` 로드, `docker-compose.yml`에서 `.env` 통해 주입
- `analyze_photo(image_bytes)` → `{"title": str, "diary": str} | None` — GPT-4o Vision, max 1024px 리사이즈, 재시도 3회
- `identify_people(image_bytes, family_members)` → `[{"family_member_id", "name", "confidence"}]`
  - 참조 사진 포함하여 GPT-4o에 전달 (구성원당 최대 2장)
- 토큰 사용량은 `logger.info`로 기록
- API 키 없으면 분석 건너뜀 (graceful fallback)

### AI 처리 흐름
- 업로드 시 대표 사진으로 설정된 경우(`UPDATE ... WHERE representative_photo_id IS NULL` rowcount > 0)에만 `BackgroundTasks`로 AI 예약
- `moments.ai_status`: `pending` → `done` | `failed`
- 백그라운드 함수: `_run_ai_analysis(moment_id, photo_id, file_path)` in `routers/photos.py`
- 순서: 제목/일기 생성 → family_members 조회 → 인물 식별 → photo_people INSERT

---

## 개발 진행 상황

| 단계 | 상태 | 내용 |
|---|---|---|
| 1단계 | ✅ 완료 | Docker 환경, FastAPI, React+shadcn/ui, 업로드/EXIF/썸네일, 순간 그룹핑 |
| 2단계 | ✅ 완료 | 모바일 하단 탭 바, 리스트 뷰(월별 그룹), 상세 Sheet/Dialog, 스와이프 닫기 |
| 3단계 | ✅ 완료 | 폴라로이드 갤러리(PolaroidCard+GalleryView), 줄자 스크롤바, PWA |
| 리팩토링 | ✅ 완료 | 백엔드 안정성·프론트 컴포넌트 분리·성능 개선 (Phase 1~3) |
| 4단계 | ✅ 완료 | GPT-4o Vision AI 연동, 가족 관리 페이지, 제목/일기/인물 수동 편집, 대표 사진 변경, AI 재생성 |
| 5단계 | ⏳ 진행중 | 필터링(미구현), 순간 편집 일부(날짜 수정·분리/병합 미구현), 폴라로이드 다운로드(미구현), 인증(미구현), 배포(개발용 Docker만 완료) |

상세 태스크: `docs/PLAN.md`

---

## 주요 파일 위치

| 파일 | 역할 |
|---|---|
| `frontend/src/App.tsx` | 라우터, 헤더(뷰 토글), 하단 탭 바, ErrorBoundary 적용 |
| `frontend/src/pages/HomePage.tsx` | 뷰 상태 관리, ListView / GalleryView 분기 |
| `frontend/src/pages/UploadPage.tsx` | 사진 업로드 (갤러리/카메라) |
| `frontend/src/components/ListView.tsx` | 타임라인 리스트 뷰 (연도별 그룹, IntersectionObserver 연도 추적) |
| `frontend/src/components/MomentRow.tsx` | 순간 행 컴포넌트 (React.memo) |
| `frontend/src/components/YearLine.tsx` | 연도 구분선 컴포넌트 (React.memo) |
| `frontend/src/components/GalleryView.tsx` | scroll-snap 갤러리 컨테이너 |
| `frontend/src/components/TimelineRuler.tsx` | 줄자 스크롤바 + 눈금 계산 함수 |
| `frontend/src/components/MomentDetailSheet.tsx` | 상세 보기 + SwipeableContent(스와이프 닫기) |
| `frontend/src/components/PolaroidCard.tsx` | 폴라로이드 카드 + MomentSummary 타입 export |
| `frontend/src/components/ErrorBoundary.tsx` | 앱 크래시 방지 Error Boundary |
| `frontend/src/hooks/useIsMobile.ts` | 모바일 판단 훅 (resize 이벤트 대응) |
| `frontend/src/hooks/useGalleryDragScroll.ts` | 갤러리 PC 마우스 관성 드래그 훅 |
| `frontend/src/lib/dateUtils.ts` | 날짜 포맷 함수 (formatTimelineDate, formatCardDate, formatKoreanDate) |
| `frontend/src/api/client.ts` | API fetch 래퍼 |
| `backend/main.py` | FastAPI 앱 엔트리, CORS 미들웨어 |
| `backend/config.py` | 경로 상수, 업로드/썸네일 크기 설정 |
| `backend/database.py` | SQLite 연결, db_connection() context manager, 테이블 DDL |
| `backend/routers/photos.py` | 사진 업로드/서빙 API + BackgroundTasks AI 예약 |
| `backend/routers/moments.py` | 순간 목록/상세 API (ai_status, people 포함) |
| `backend/routers/family.py` | 가족 구성원 CRUD + 참조 사진 관리 API |
| `backend/services/photo_service.py` | EXIF 추출(getexif), 썸네일 생성 |
| `backend/services/moment_service.py` | 날짜 기반 순간 생성/조회 |
| `backend/services/ai_service.py` | GPT-4o Vision: 제목/일기 생성, 인물 식별 |
