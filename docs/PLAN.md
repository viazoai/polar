# Polar 개발 계획서

> 최종 수정: 2026-03-14

---

## 1단계: 환경 구축 및 뼈대 ✅ 완료

### 완료 항목

- [x] Docker Compose 설정 (polar-api:3201, polar-web:3200)
- [x] FastAPI 프로젝트 구조 (routers / services / models)
- [x] SQLite 연결 + WAL 모드 + 5개 테이블 DDL
- [x] React (Vite 7) + TypeScript + shadcn/ui + Tailwind CSS v4
- [x] 사진 업로드 API (POST /api/photos/upload)
  - EXIF 추출 (DateTimeOriginal 폴백 체인)
  - HEIC 지원 (pillow-heif)
  - 썸네일 2종 자동 생성 (gallery 800px, list 200px, WebP)
  - UUID 파일명, 연/월 디렉토리 구조
- [x] EXIF 없는 경우 422 응답 → 프론트에서 날짜 입력 유도
- [x] 날짜 기반 자동 순간(Moment) 생성/그룹핑
- [x] 순간 목록/상세 API (GET /api/moments, /api/moments/{id})
- [x] 프론트엔드: 홈페이지 (순간 카드 목록) + 업로드 페이지

### 현재 구조

```
backend/
├── main.py, config.py, database.py
├── models/schemas.py
├── routers/photos.py, moments.py
└── services/photo_service.py, moment_service.py

frontend/src/
├── App.tsx (React Router)
├── api/client.ts
├── components/ui/ (shadcn: button, card, dialog, calendar, popover, progress, sonner, badge)
└── pages/HomePage.tsx, UploadPage.tsx
```

---

## 2단계: 모바일 우선 리스트 뷰 & 상세 보기 ✅ 완료

> 목표: 모바일에서 실제로 쓸 수 있는 수준의 UI 완성

### 2-1. 모바일 레이아웃 시스템

- [x] 하단 탭 바(Bottom Navigation) 구현 — `md:hidden`, 중앙 FAB 업로드 버튼
- [x] 데스크톱: 상단 헤더 네비게이션 (md 이상에서만 업로드 버튼 표시)
- [x] `<meta name="viewport" content="viewport-fit=cover">` 및 `<meta name="theme-color">` 설정
- [x] safe-area 대응 (`pb-safe`, `pb-tab` 유틸리티, html/body `overflow-x: hidden`)
- [x] `--header-height` CSS 변수로 sticky 오프셋 관리
- [x] `useIsMobile()` hook — resize 이벤트 대응

### 2-2. 리스트 뷰 (Timeline) 개선

- [x] 월별 sticky 구분 헤더 ("2026년 3월")
- [x] 썸네일 56px + 제목 + 날짜 + 사진 수 Badge
- [x] 터치 타겟 최소 64px 높이
- [x] 항목 간 Separator
- [ ] 페이지네이션 — 데이터 적어 미구현, 5단계에서 필요 시 추가
- [ ] Pull-to-refresh — 5단계에서 추가

### 2-3. 상세 보기 모달

- [x] **모바일**: 하단에서 올라오는 전체화면 Sheet (`h-[92dvh]`)
- [x] **데스크톱**: 중앙 Dialog, ESC 닫기, 키보드 화살표 탐색
- [x] 좌우 스와이프로 사진 탐색 (터치 40px 임계치)
- [x] 하단 썸네일 스트립 (2장 이상일 때)
- [x] AI 제목/일기 플레이스홀더 표시
- [x] 인물 태그 영역 (빈 상태, 4단계 AI 연동 후 채워짐)
- [x] 장소 정보 표시 영역
- [x] 아래로 스와이프 닫기 — `SwipeableContent` 래퍼, Framer Motion drag + spring 복귀

### 2-4. 업로드 페이지 모바일 개선

- [x] 갤러리 / 카메라 촬영 버튼 분리 (`capture="environment"`)
- [x] 파일별 상태 표시 + Progress 바
- [x] 업로드 완료 후 홈으로 자동 이동 (날짜 미입력 건 없을 때)

---

## 3단계: 갤러리 뷰 & 폴라로이드 UI + PWA ✅ 완료

> 목표: Polar의 핵심 정체성인 폴라로이드 갤러리 + PWA로 앱처럼 제공

### 3-1. 폴라로이드 카드 디자인

- [x] 커스텀 PolaroidCard 컴포넌트 (`src/components/PolaroidCard.tsx`)
  - 하얀 테두리(10px) + 하단 넓은 여백(28px) — 폴라로이드 느낌
  - 미세한 기울기 (`rotate(±0.8~2.5deg)`), index 기반 10가지 값 순환
  - 그림자 효과 (box-shadow: 0 8px 28px)
  - 하단 캡션: 기본 sans-serif 폰트 (Geist Variable)
- [x] 카드 탭 시 상세 보기 Sheet/Dialog 열기 (`whileTap` scale 0.97 피드백)

### 3-2. 갤러리 뷰 (scroll-snap)

- [x] `GalleryView.tsx` — 세로 scroll-snap 전체 화면
  - `scroll-snap-type: y mandatory`, 슬라이드 `scroll-snap-align: center`
  - **슬라이드 높이: `(100dvh - header) * 0.6`** → 위아래 각 20%씩 인접 카드 노출 (카드 높이 기준 1/3 간격)
  - **첫/마지막 카드 정중앙**: `paddingTop = paddingBottom = (100dvh - header) * 0.2` 적용
  - 최대 너비 260px, 우측 `pr-14`로 줄자 스크롤바 영역 확보
- [x] Framer Motion `whileInView` 스케일 애니메이션 (0.9→1.0, opacity 0.55→1.0)
- [x] **줄자 스크롤바 (`TimelineRuler`)** — 화면 우측 24px 이격, 화면 1/4~3/4 구간
  - 세로 축선 (우측 경계 1px)
  - 연도 눈금: 10px 긴 선 + `'24` 형식 라벨
  - 월 눈금: 7px 선 + 월 숫자, **6월은 11px + font-medium 강조**
  - 현재 위치 인디케이터: 수평 선 + 삼각형 마커 (스크롤 추적)
  - 클릭/터치 드래그 → 해당 시점으로 smooth scroll 이동

### 3-3. 뷰 전환

- [x] 헤더 우측 리스트/갤러리 토글 버튼 (커스텀 SVG 아이콘, 활성 상태 반전)
- [x] URL search param 관리: 파라미터 없음 = 갤러리(기본), `?view=list` = 리스트
- [x] Framer Motion `AnimatePresence` fade 전환 (duration 0.15s)

### 3-4. PWA 설정

- [x] `vite-plugin-pwa@1.2.0` 설치 및 설정
- [x] `manifest.webmanifest` 자동 생성
  - name: "Polar — 가족 추억 기록소", short_name: "Polar"
  - display: "standalone", orientation: "portrait", start_url: "/"
- [x] Service Worker (generateSW 모드, 빌드 시 자동 생성)
  - 정적 자산 (JS, CSS, SVG, woff2): precache (Cache First)
  - 썸네일 (`/api/photos/*/thumbnail/*`): CacheFirst, 30일 만료, 최대 500개
  - 순간 API (`/api/moments*`): NetworkFirst, 5s timeout, 1일 캐시
- [x] 오프라인 폴백 페이지 (`public/offline.html`)
- [x] iOS 메타 태그: apple-mobile-web-app-capable/status-bar-style/title
- [x] apple-touch-icon.svg 생성 및 index.html 링크
- [ ] "홈 화면에 추가" 안내 배너 — 5단계에서 추가 예정

### 현재 구조 추가분

```
frontend/
├── public/
│   ├── icon.svg             # PWA 아이콘
│   ├── apple-touch-icon.svg # iOS 홈 화면 아이콘
│   └── offline.html         # 오프라인 폴백
└── src/components/
    ├── PolaroidCard.tsx      # 폴라로이드 카드
    └── GalleryView.tsx       # scroll-snap 갤러리 + TimelineRuler
```

### 검증

- 모바일에서 갤러리 뷰 스크롤 스냅 + 폴라로이드 카드 + 줄자 스크롤바 동작 확인
- 첫/마지막 카드가 정중앙에서 시작/끝나는지 확인
- PWA: `npm run build` 후 Chrome DevTools > Application 탭에서 manifest, SW 확인
- 홈 화면 추가 후 standalone 모드 동작 확인
- 오프라인 모드에서 이전 조회 순간/썸네일 표시 확인

---

## 4단계: AI 연동

> 목표: GPT-4o Vision으로 사진에 생명 불어넣기

### 4-1. AI 서비스 구현 (백엔드)

- [ ] `backend/services/ai_service.py` 생성
- [ ] OpenAI API 클라이언트 설정 (`.env`의 `OPENAI_API_KEY`)
- [ ] 사진 분석 함수: 이미지 → GPT-4o Vision
  - 입력: 사진 바이트 (리사이즈하여 API 비용 절감, max 1024px)
  - 출력: { title: string, diary: string, people: string[] }
  - 프롬프트: 한국어, 감성적 톤, 가족 사진 컨텍스트
- [ ] 인물 식별 함수: 사진 + 참조 사진들 → GPT-4o Vision
  - 참조 사진과 비교하여 인물 이름 + confidence 반환
- [ ] API 호출 실패 시 재시도 로직 (최대 2회)
- [ ] 비용 추적: 각 호출의 토큰 사용량 로깅

### 4-2. 업로드 파이프라인에 AI 통합

- [ ] 사진 업로드 시 AI 처리 플로우:
  1. 파일 저장 + 썸네일 생성 (기존, 즉시 응답)
  2. AI 분석은 백그라운드 처리 (FastAPI BackgroundTasks)
  3. AI 완료 시 moments 테이블의 title/diary 업데이트
- [ ] AI 처리 상태 필드 추가 (photos 테이블: `ai_status` = pending/done/failed)
- [ ] 프론트엔드: AI 처리 중 표시 (로딩 스피너 또는 "AI가 분석 중..." 텍스트)
- [ ] AI 처리 완료 시 자동 새로고침 또는 폴링

### 4-3. 인물 참조 시스템

- [ ] 관리자 페이지: 가족 구성원 관리
  - 구성원 추가/수정/삭제
  - 참조 사진 등록 (1~3장)
- [ ] API: POST/PUT /api/family, GET /api/family
- [ ] 참조 사진 저장: `data/references/{member_id}/`

### 4-4. AI 결과 표시 및 수정

- [ ] 상세 보기에서 AI 생성 제목/일기 표시 (플레이스홀더 → 실제 데이터)
- [ ] 인물 태그 Badge 표시 (confidence에 따른 시각적 구분)
- [ ] 제목/일기 수동 편집 기능
- [ ] 인물 태그 수동 수정 (확인/삭제/추가)
- [ ] AI 재생성 버튼 (비용 안내 후 확인)

### 검증

- 사진 업로드 → AI 제목/일기 자동 생성 확인
- 인물 참조 사진 등록 → 인물 식별 정확도 확인
- AI 실패 시 fallback ("새로운 순간" 플레이스홀더 유지) 확인
- 수동 편집 후 저장/반영 확인

---

## 5단계: 완성도 및 부가 기능

> 목표: 프로덕션 수준의 완성도 + 배포

### 5-1. 필터링

- [ ] 인물별 필터: 특정 가족 구성원이 태그된 순간만 표시
  - 모바일: 하단 시트(Sheet)에서 필터 선택
  - 데스크톱: Popover 또는 사이드 패널
- [ ] 날짜별 필터: 연/월 단위
  - 모바일: 하단 시트에서 연/월 선택기
  - 데스크톱: Calendar Popover
- [ ] 갤러리 뷰 + 리스트 뷰 모두에서 동작
- [ ] 필터 상태 URL 파라미터에 반영 (공유 가능)

### 5-2. 순간 수동 편집

- [ ] 대표 사진 변경 (사진 목록에서 선택)
- [ ] 순간 분리: 하나의 순간에서 특정 사진들을 새 순간으로 분리
- [ ] 순간 병합: 두 순간을 하나로 합치기
- [ ] 날짜 수정
- [ ] 제목/일기 수동 편집
- [ ] API: PATCH /api/moments/{id}, POST /merge, POST /split

### 5-3. 폴라로이드 다운로드

- [ ] 서버 사이드 이미지 합성 (Pillow)
  - 사진 + 하얀 테두리 + 하단 텍스트(제목/날짜)
  - 필기체 한국어 폰트 (나눔손글씨 등)
  - 출력: 1080px 너비 PNG
- [ ] API: GET /api/photos/{id}/polaroid
- [ ] 프론트엔드: 다운로드 버튼 (상세 보기에서)
- [ ] 모바일: Web Share API로 바로 공유 옵션

### 5-4. 사용자 인증

- [ ] 간단한 로그인 시스템 (ID/비밀번호)
- [ ] JWT 토큰 기반 인증 (httpOnly 쿠키 또는 localStorage)
- [ ] API: POST /api/auth/login, /logout, GET /api/auth/me
- [ ] 로그인 페이지 (shadcn Card + Form)
- [ ] 관리자: 사용자 계정 생성/관리
- [ ] 미인증 상태에서 모든 페이지 접근 차단 → 로그인 리다이렉트

### 5-5. 배포

- [ ] 프로덕션 Docker Compose 구성
  - 프론트엔드: Vite build → nginx로 정적 파일 서빙
  - nginx에서 /api → FastAPI 프록시
  - 단일 컨테이너 또는 2-컨테이너 구성
- [ ] 환경변수 분리 (.env.production)
- [ ] SQLite 백업 스크립트 (cron으로 정기 백업)
- [ ] Cloudflare Tunnel 설정
  - HTTPS 자동 (PWA 필수 조건)
  - 커스텀 도메인 연결
- [ ] 프론트엔드 최적화
  - 코드 스플리팅 (React.lazy)
  - 이미지 lazy loading
  - Lighthouse 성능 점수 확인

### 검증

- 전체 E2E 플로우: 로그인 → 업로드 → AI 분석 → 갤러리/리스트 탐색 → 필터 → 폴라로이드 다운로드
- 모바일(iPhone, Android) 실기기 테스트
- PWA standalone 모드에서 전체 기능 동작
- 오프라인 → 온라인 전환 시 데이터 동기화
- N100 미니PC에서 성능 테스트 (동시 접속 3~5명)
