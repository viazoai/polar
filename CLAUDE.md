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
  (`src/components/MomentDetailSheet.tsx` 참고)
- CSS는 Tailwind `md:` (768px) 브레이크포인트 사용

### safe-area (노치/홈 인디케이터)
- `pb-safe`: `env(safe-area-inset-bottom)` 패딩
- `pb-tab`: 하단 탭(64px) + safe-area 패딩, 모든 스크롤 페이지에 적용

### 갤러리 뷰 구조 (GalleryView.tsx)
- 기본 뷰: 갤러리 (URL 파라미터 없음 = gallery, `?view=list` = 리스트)
- 슬라이드 높이: `(100dvh - header) * 0.6` — 위아래 각 20%씩 인접 카드 노출 (카드 높이의 1/3)
- 첫/마지막 카드 정중앙: `paddingTop = paddingBottom = (100dvh - header) * 0.2`
- `scroll-snap-type: y mandatory` + `scroll-snap-align: center`
- 줄자 스크롤바(`TimelineRuler`): 화면 우측 24px 이격, 1/4~3/4 구간, 연도/월 눈금 (6월 강조)

### Sheet 스와이프 닫기 (SwipeableContent)
- `MomentDetailSheet.tsx`의 `SwipeableContent` 래퍼 패턴 사용
- Framer Motion `drag="y"` + `dragConstraints={{ top: 0 }}`
- 드래그 핸들 영역만 drag 활성화, 콘텐츠 스크롤 영역은 `onPointerDown stopPropagation`으로 분리
- 120px 초과 또는 velocity 500+ → 닫힘, 미달 → `animate(y, 0, spring)` 복귀

---

## 백엔드 주요 규칙

- ORM 없이 `sqlite3` 직접 사용 (InAsset 패턴 동일)
- 모든 라우터는 `/api` prefix로 등록
- 사진 업로드 시 EXIF 없으면 HTTP 422 반환 → 프론트에서 날짜 입력 유도
- 썸네일: WebP 형식, gallery(800px) / list(200px) 2종 자동 생성
- HEIC 지원: `pillow_heif.register_heif_opener()` 모듈 레벨 등록

---

## 개발 진행 상황

| 단계 | 상태 | 내용 |
|---|---|---|
| 1단계 | ✅ 완료 | Docker 환경, FastAPI, React+shadcn/ui, 업로드/EXIF/썸네일, 순간 그룹핑 |
| 2단계 | ✅ 완료 | 모바일 하단 탭 바, 리스트 뷰(월별 그룹), 상세 Sheet/Dialog, 스와이프 닫기 |
| 3단계 | ✅ 완료 | 폴라로이드 갤러리(PolaroidCard+GalleryView), 줄자 스크롤바, PWA |
| 4단계 | 🔜 다음 | GPT-4o Vision AI 연동 |
| 5단계 | ⏳ 예정 | 필터링, 순간 편집, 폴라로이드 다운로드, 인증, 배포 |

상세 태스크: `docs/PLAN.md`

---

## 주요 파일 위치

| 파일 | 역할 |
|---|---|
| `frontend/src/App.tsx` | 라우터, 헤더(뷰 토글 포함), 하단 탭 바 |
| `frontend/src/pages/HomePage.tsx` | 뷰 상태 관리, ListView / GalleryView 분기 |
| `frontend/src/pages/UploadPage.tsx` | 사진 업로드 (갤러리/카메라) |
| `frontend/src/components/MomentDetailSheet.tsx` | 상세 보기 + SwipeableContent(스와이프 닫기) |
| `frontend/src/components/PolaroidCard.tsx` | 폴라로이드 카드 (기울기, 그림자, Framer Motion) |
| `frontend/src/components/GalleryView.tsx` | scroll-snap 갤러리 + TimelineRuler(줄자 스크롤바) |
| `frontend/src/api/client.ts` | API fetch 래퍼 |
| `backend/main.py` | FastAPI 앱 엔트리 |
| `backend/database.py` | SQLite 연결, 테이블 DDL |
| `backend/routers/photos.py` | 사진 업로드/서빙 API |
| `backend/routers/moments.py` | 순간 목록/상세 API |
| `backend/services/photo_service.py` | EXIF 추출, 썸네일 생성 |
| `backend/services/moment_service.py` | 날짜 기반 순간 생성/조회 |
