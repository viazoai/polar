# Polar — Product Requirements Document (PRD)

> **버전:** v1.1
> **작성일:** 2026-03-14
> **상태:** Draft

---

## 1. 개요

**Polar**는 가족 사진을 업로드하면 AI가 자동으로 감성 제목과 일기를 생성해주는 가족 추억 기록 서비스다.
폴라로이드 감성의 UI 위에 GPT-4o Vision 기반의 자동 캡셔닝, 인물 식별, EXIF 기반 타임라인 자동 배치를 결합한다.

N100 미니PC 홈랩에서 Docker로 배포하며, Cloudflare Tunnel을 통해 가족 구성원이 외부에서 접속한다.

---

## 2. 목표 및 비목표

### 목표

- 가족 사진을 시간순으로 탐색할 수 있는 감성적인 웹 인터페이스 제공
- **모바일 우선(Mobile-First) 설계** — 가족 구성원이 스마트폰에서 주로 사용
- **PWA(Progressive Web App)** 로 제공하여 홈 화면 추가, 오프라인 기본 지원, 앱과 유사한 경험 제공
- 사진 업로드 시 GPT-4o가 자동으로 제목/일기/인물 태그를 생성
- 가족 구성원 모두가 업로드하고 감상할 수 있는 멀티유저 환경
- N100 홈랩에서 안정적으로 운영 가능한 경량 아키텍처

### 비목표

- 소셜 미디어형 공유/댓글/좋아요 기능
- 사진 편집 기능
- 외부 클라우드(Google Photos 등) 연동
- 대규모 사용자 지원 (가족 5~10명 내외)

---

## 3. 사용자

| 역할 | 설명 |
|---|---|
| **가족 구성원** | 사진 업로드, 타임라인 탐색, 상세 보기, 폴라로이드 다운로드 |
| **관리자** | 가족 구성원 계정 관리, 인물 참조 사진 등록 |

- 간단한 사용자 관리 시스템 필요 (회원가입/로그인)
- 별도 권한 체계는 불필요 (모든 가족 구성원이 동일 권한)
- 관리자 기능은 별도 페이지 또는 설정에서 처리

---

## 4. 핵심 개념: "순간(Moment)"

사진들의 논리적 그룹 단위. Polar의 모든 화면은 개별 사진이 아닌 **순간**을 기준으로 구성된다.

- **자동 그룹핑:** 같은 날짜(YYYY-MM-DD)에 촬영된 사진들을 하나의 순간으로 묶음
- **수동 수정:** 사용자가 순간을 분리하거나 병합할 수 있음
- **대표 사진:** 순간 내 첫 번째 사진이 기본 대표. 사용자가 변경 가능
- **메타데이터:** 각 순간은 AI 생성 제목, AI 생성 일기, 날짜, 장소, 인물 태그를 가짐

---

## 5. 기능 요구사항

### 5.1 사진 업로드

| 항목 | 상세 |
|---|---|
| **업로드 방식** | 다중 파일 선택 업로드 |
| **지원 포맷** | JPEG, PNG, HEIC |
| **EXIF 추출** | 촬영 날짜, GPS 좌표 자동 파싱 |
| **EXIF 없는 경우** | 업로드 시 사용자가 날짜를 직접 입력 (필수) |
| **썸네일 생성** | 서버에서 업로드 시 자동 생성 (갤러리용, 리스트용 2종) |
| **AI 처리** | 업로드 즉시 GPT-4o Vision 호출하여 제목/일기/인물 태그 생성 |
| **순간 배치** | 촬영 날짜 기준으로 기존 순간에 추가 또는 새 순간 생성 |

### 5.2 메인 화면 — 갤러리 뷰 (*핵심*, 기본 화면)

- 폴라로이드 형태의 대표 사진 카드가 세로로 나열 (**기본 진입 화면**)
- CSS `scroll-snap-type: y mandatory` — 카드가 화면 중앙에 스냅
- 슬라이드 높이 = 화면의 60% → 위아래 인접 카드 20%씩 노출 (카드 높이 기준 1/3 간격)
- 첫 카드·마지막 카드는 스크롤 시 정중앙에 위치
- 카드 디자인: 흰 테두리(10px), 하단 여백, 미세 기울기(±0.8~2.5°), 그림자
- 카드 하단에 AI 생성 제목 + 날짜 표시
- 카드 클릭 시 상세 보기 모달로 이동
- **줄자 스크롤바**: 화면 우측에 시간 기반 눈금 (연도·월 표기, 6월 강조). 탭/드래그로 특정 시점 이동
- 날짜 순으로 정렬 (최신 순간이 최상단)

### 5.3 메인 화면 — 리스트 뷰 (Timeline)

- 날짜별로 정렬된 인덱스 형태 (최신 사진이 최상단)
- 각 항목: 소형 대표 썸네일 + AI 생성 감성 제목 + 날짜
- 빠른 스크롤로 특정 시점 탐색
- 항목 클릭 시 상세 보기 모달로 이동

### 5.4 뷰 모드 전환

- 갤러리 뷰 ↔ 리스트 뷰 토글 버튼
- 전환 시 현재 보고 있던 순간의 위치 유지

### 5.5 상세 보기 (모달)

- 대표 사진 확대 표시 + 부드러운 열림 애니메이션
- AI 생성 일기(Caption) 전문 출력
- 인물 태그 및 장소 정보 표시
- 해당 순간의 나머지 사진들을 하단 슬라이더(캐러셀)로 탐색
- 순간 편집: 대표 사진 변경, 순간 분리/병합, 날짜 수정

### 5.6 AI 엔진

#### GPT-4o Vision

- **짧은 제목** (리스트/갤러리용): 한 줄, 감성적 톤. 예) "햇살 가득한 한강 피크닉"
- **감성 일기** (상세 보기용): 2~3문장, 사진 속 상황을 스토리텔링. 예) "따뜻한 봄 오후, 가족이 돗자리 위에서..."
- **인물 식별**: 등록된 가족 구성원 참조 사진과 비교하여 사진 속 인물 태그
- 모든 텍스트는 **한국어**로 생성

#### 인물 참조 시스템

- 관리자가 가족 구성원별 참조 사진(얼굴이 잘 보이는 사진 1~3장)을 등록
- GPT-4o Vision 호출 시 참조 사진을 함께 전달하여 인물 식별 요청
- 인식 결과는 사용자가 수정 가능

### 5.7 필터링

- **인물별 필터:** 특정 가족 구성원이 태그된 순간만 표시
- **날짜별 필터:** 연/월 단위 필터링
- 갤러리 뷰와 리스트 뷰 모두에서 동작

### 5.8 모바일 우선 설계 & PWA

#### 모바일 우선 원칙

Polar의 주 사용 환경은 스마트폰이다. 모든 UI는 모바일 화면(375px~)을 기준으로 먼저 설계하고, 데스크톱은 확장 대응한다.

| 항목 | 모바일 | 데스크톱 |
|---|---|---|
| **갤러리 뷰** | 전체 화면 세로 스크롤, 카드 1장씩 스냅 | 중앙 정렬, 최대 너비 제한 |
| **리스트 뷰** | 컴팩트 리스트, 터치 친화적 크기(44px+ 터치 영역) | 더 넓은 썸네일, 여백 추가 |
| **상세 모달** | 전체 화면(Sheet), 스와이프로 닫기 | 중앙 모달, ESC로 닫기 |
| **업로드** | 카메라 바로 촬영 지원(`capture="environment"`), 하단 시트 UI | 드래그 앤 드롭 지원 |
| **네비게이션** | 하단 탭 바(Bottom Navigation) | 상단 헤더 또는 사이드바 |
| **필터** | 하단 시트(Sheet)로 펼침 | 사이드 패널 또는 Popover |

#### 터치 인터랙션

- 갤러리 뷰: 세로 스와이프로 순간 탐색 (scroll-snap)
- 상세 보기(Sheet): **아래로 스와이프하여 닫기** — 120px 초과 또는 빠른 플릭 시 닫힘, 미달 시 spring 복귀
- 상세 보기: 좌우 스와이프로 사진 탐색 (40px 임계치)
- 줄자 스크롤바: 터치 드래그로 원하는 연도/월로 이동

#### PWA (Progressive Web App)

| 항목 | 상세 |
|---|---|
| **manifest.json** | 앱 이름 "Polar", 테마 컬러, 아이콘 세트, `display: "standalone"` |
| **Service Worker** | Vite PWA 플러그인(`vite-plugin-pwa`) 사용 |
| **캐싱 전략** | 썸네일/정적 자산은 Cache First, API 응답은 Network First |
| **오프라인** | 이전에 조회한 순간/썸네일은 오프라인에서도 탐색 가능 |
| **홈 화면 추가** | iOS Safari, Android Chrome에서 "홈 화면에 추가" 지원 |
| **상태 표시줄** | `theme-color` 메타 태그로 브라우저 상태 표시줄 색상 통일 |
| **전체 화면** | standalone 모드에서 브라우저 UI 없이 앱처럼 동작 |

#### 반응형 브레이크포인트 (Tailwind CSS)

| 이름 | 최소 너비 | 용도 |
|---|---|---|
| 기본 | 0px | 모바일 (기준) |
| `sm` | 640px | 큰 모바일 / 작은 태블릿 |
| `md` | 768px | 태블릿 |
| `lg` | 1024px | 데스크톱 |

### 5.9 폴라로이드 다운로드

- 사진 + AI 생성 텍스트를 합성한 폴라로이드 스타일 이미지 생성
- 필기체 폰트로 하단에 제목/날짜 렌더링
- PNG 파일로 다운로드

---

## 6. 기술 아키텍처

```
┌─────────────────────────────────┐
│         React (Vite)            │
│    SPA — 브라우저에서 실행        │
└──────────────┬──────────────────┘
               │ REST API (JSON)
┌──────────────▼──────────────────┐
│         FastAPI (Python)        │
│  ┌───────┐ ┌───────┐ ┌───────┐ │
│  │Upload │ │Moment │ │ Auth  │ │
│  │Service│ │Service│ │Service│ │
│  └───┬───┘ └───┬───┘ └───────┘ │
│      │         │                │
│  ┌───▼─────────▼───┐           │
│  │   GPT-4o Vision │           │
│  │   (외부 API)     │           │
│  └─────────────────┘           │
│  ┌─────────────────┐           │
│  │   SQLite DB     │           │
│  └─────────────────┘           │
│  ┌─────────────────┐           │
│  │  파일 시스템      │           │
│  │  (원본+썸네일)    │           │
│  └─────────────────┘           │
└─────────────────────────────────┘
         Docker Container
         N100 Mini PC
```

### 기술 스택

| 계층 | 기술 | 비고 |
|---|---|---|
| Frontend | React + Vite | TypeScript, SPA |
| UI 컴포넌트 | shadcn/ui | 인증, 모달, 필터, 관리 페이지 등 기능적 UI |
| 스타일링 | Tailwind CSS | 유틸리티 기반 CSS (shadcn/ui 기반) |
| 애니메이션 | Framer Motion | 폴라로이드 갤러리/모달 전환 애니메이션 |
| Backend | FastAPI (Python) | REST API |
| Database | SQLite | 파일 기반, 단일 DB 파일 |
| AI | OpenAI GPT-4o Vision API | 제목/일기 생성, 인물 식별 |
| 이미지 처리 | Pillow | 썸네일 생성, 폴라로이드 합성 |
| EXIF | piexif 또는 Pillow EXIF | 메타데이터 추출 |
| 배포 | Docker + Docker Compose | N100 홈랩 |
| PWA | vite-plugin-pwa | Service Worker, manifest, 오프라인 캐싱 |
| 외부 접속 | Cloudflare Tunnel | HTTPS 자동 (PWA 필수 조건) |

### shadcn/ui 컴포넌트 활용 계획

기능적 UI는 shadcn/ui 컴포넌트를 기본으로 사용하여 디자인 비용을 최소화한다.
폴라로이드 갤러리 등 Polar 고유의 감성 UI만 Tailwind + Framer Motion으로 커스텀 구현한다.

| 기능 | shadcn/ui 컴포넌트 |
|---|---|
| 로그인/인증 | Card, Input, Button, Label, Form |
| 상세 보기 모달 | Dialog + Carousel |
| 뷰 전환 (갤러리 ↔ 리스트) | Tabs 또는 Toggle Group |
| 인물별/날짜별 필터 | Select, Popover, Calendar |
| 사진 업로드 | Dialog + Input(file) + Progress |
| 날짜 수동 입력 (EXIF 없을 때) | Calendar + Popover (Date Picker) |
| 순간 편집 메뉴 | DropdownMenu, AlertDialog |
| 가족 구성원 관리 | Table, Avatar, Badge |
| 인물 태그 표시 | Badge, Avatar |
| 알림 (업로드 완료 등) | Sonner (Toast) |
| 네비게이션/레이아웃 | Sidebar, Sheet (모바일) |

**커스텀 구현 대상:** 폴라로이드 카드, 갤러리 scroll-snap, 폴라로이드 다운로드 미리보기

---

## 7. 데이터 모델

### users

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | 표시 이름 |
| login_id | TEXT UNIQUE | 로그인 ID |
| password_hash | TEXT | 해시된 비밀번호 |
| is_admin | BOOLEAN | 관리자 여부 |
| created_at | DATETIME | |

### family_members

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | 가족 구성원 이름 (태그용) |
| reference_photos | JSON | 참조 사진 경로 리스트 |

### moments

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INTEGER PK | |
| date | DATE | 순간의 날짜 |
| title | TEXT | AI 생성 감성 제목 |
| diary | TEXT | AI 생성 감성 일기 |
| location | TEXT | GPS 역지오코딩 결과 (nullable) |
| representative_photo_id | INTEGER FK | 대표 사진 |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### photos

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | INTEGER PK | |
| moment_id | INTEGER FK | 소속 순간 |
| file_path | TEXT | 원본 저장 경로 |
| thumbnail_gallery | TEXT | 갤러리용 썸네일 경로 |
| thumbnail_list | TEXT | 리스트용 썸네일 경로 |
| taken_at | DATETIME | 촬영 일시 (EXIF 또는 수동 입력) |
| gps_lat | REAL | 위도 (nullable) |
| gps_lng | REAL | 경도 (nullable) |
| exif_data | JSON | 원본 EXIF 전체 (nullable) |
| uploaded_by | INTEGER FK | 업로드한 사용자 |
| created_at | DATETIME | |

### photo_people

| 컬럼 | 타입 | 설명 |
|---|---|---|
| photo_id | INTEGER FK | |
| family_member_id | INTEGER FK | |
| confidence | TEXT | AI 확신도 (high/medium/low) |
| is_confirmed | BOOLEAN | 사용자 확인 여부 |

---

## 8. API 엔드포인트 (주요)

### 인증

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 순간 (Moments)

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/moments` | 순간 목록 (필터: 인물, 연/월) |
| GET | `/api/moments/{id}` | 순간 상세 (사진 목록 포함) |
| PATCH | `/api/moments/{id}` | 순간 수정 (제목, 대표사진, 날짜) |
| POST | `/api/moments/{id}/merge` | 순간 병합 |
| POST | `/api/moments/{id}/split` | 순간 분리 |

### 사진 (Photos)

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/photos/upload` | 사진 업로드 (multipart) |
| GET | `/api/photos/{id}/file` | 원본 파일 서빙 |
| GET | `/api/photos/{id}/thumbnail/{size}` | 썸네일 서빙 |
| PATCH | `/api/photos/{id}/people` | 인물 태그 수정 |
| GET | `/api/photos/{id}/polaroid` | 폴라로이드 이미지 생성 및 다운로드 |

### 가족 구성원

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/family` | 가족 구성원 목록 |
| POST | `/api/family` | 구성원 추가 + 참조 사진 등록 |
| PUT | `/api/family/{id}` | 구성원 정보/참조 사진 수정 |

---

## 9. 파일 저장 구조

```
data/
├── polar.db                          # SQLite DB
├── originals/                        # 원본 사진
│   └── 2026/
│       └── 03/
│           └── {uuid}.{ext}
├── thumbnails/
│   ├── gallery/                      # 갤러리용 (큰 썸네일)
│   │   └── {uuid}.webp
│   └── list/                         # 리스트용 (작은 썸네일)
│       └── {uuid}.webp
└── references/                       # 가족 구성원 참조 사진
    └── {family_member_id}/
        └── {n}.jpg
```

- 원본은 연/월 디렉토리로 정리
- 썸네일은 WebP로 변환하여 용량 최적화
- 파일명은 UUID로 충돌 방지

---

## 10. 개발 로드맵

### 1단계: 환경 구축 및 뼈대 ✅ 완료

- Docker Compose 설정 (FastAPI + React dev server)
- FastAPI 프로젝트 초기 구조 + SQLite 연결
- React (Vite) + shadcn/ui 프로젝트 초기 구조
- 사진 업로드 API: 파일 저장, EXIF 추출, 썸네일 생성, DB 기록
- EXIF 없는 경우 날짜 입력 처리
- 날짜 기준 자동 순간 생성/배치

### 2단계: 모바일 우선 리스트 뷰 & 상세 보기 ✅ 완료

- 모바일 하단 탭 바(Bottom Navigation) + 중앙 FAB 업로드 버튼
- 리스트 뷰: 월별 sticky 헤더, 64px 터치 타겟, 썸네일 + Badge
- 상세 보기: 모바일 전체화면 Sheet + 사진 캐러셀 (좌우 스와이프)
- **아래로 스와이프 닫기** (120px 임계치, spring 복귀)
- 데스크톱: 중앙 Dialog, ESC/화살표 키 탐색
- `--header-height` CSS 변수, safe-area, `pb-tab` 유틸리티

### 3단계: 갤러리 뷰 & 폴라로이드 UI + PWA ✅ 완료

- 폴라로이드 카드 (흰 테두리, 기울기, 그림자) + scroll-snap 갤러리
- 인접 카드 1/3 간격 노출, 첫/마지막 카드 정중앙 정렬
- **줄자 스크롤바**: 연도·월 눈금 (데이터가 있는 월만 표기), 탭/드래그 시점 이동
- 갤러리(기본) ↔ 리스트 뷰 전환 (URL 파라미터, fade 애니메이션)
- PWA: manifest, Service Worker (Cache First / Network First), 오프라인 폴백

### 4단계: AI 연동

- GPT-4o Vision 연동: 사진 분석 → 제목/일기 생성
- 가족 구성원 참조 사진 등록 기능
- GPT-4o 기반 인물 식별 + 태그
- 기존 더미 데이터를 AI 생성 데이터로 교체

### 5단계: 완성도 및 부가 기능

- 인물별/날짜별 필터링 (모바일: 하단 시트 필터)
- 순간 수동 편집 (분리, 병합, 대표사진 변경)
- 폴라로이드 이미지 합성 + 다운로드
- 간단한 사용자 인증 (로그인/계정 관리)
- N100 배포 + Cloudflare Tunnel 설정

---

## 11. 제약 사항 및 리스크

| 항목 | 내용 | 대응 |
|---|---|---|
| **GPT API 비용** | 사진당 ~$0.01~0.03, 대량 업로드 시 비용 급증 | 생성된 결과 캐싱, 재생성 방지. 업로드 전 예상 비용 안내 고려 |
| **GPT 인물 식별 정확도** | face_recognition 대비 정확도 불확실 | confidence 필드로 확신도 표시, 사용자 확인 워크플로우 |
| **N100 성능** | 썸네일 생성, 이미지 리사이즈 시 CPU 부하 | 업로드 처리를 순차적으로, 동시 대량 업로드 제한 |
| **SQLite 동시성** | 다수 가족이 동시 업로드 시 write lock | WAL 모드(`PRAGMA journal_mode=WAL`) 활성화. 읽기/쓰기 동시 허용, 쓰기 트랜잭션을 짧게 유지. 가족 규모에서 충분 |
| **HEIC 지원** | Pillow 기본으로 HEIC 미지원 | pillow-heif 패키지 추가 |
