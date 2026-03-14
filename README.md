# Polar

> **우리 가족의 따뜻한 순간 기록소** — 단순한 저장이 아닌, AI가 읽어주는 우리 가족의 추억 연대기

## 서비스 개요

가족 사진을 업로드하면 GPT-4o Vision이 자동으로 감성 제목과 일기를 생성하고, 폴라로이드 감성의 타임라인으로 탐색하는 가족 추억 기록 서비스.

## 핵심 기능

- **갤러리 뷰**: 폴라로이드 카드 + scroll-snap 몰입형 UI
- **리스트 뷰 (Timeline)**: 날짜별 인덱스 형태의 빠른 탐색
- **AI 자동 캡셔닝**: 사진 업로드 시 GPT-4o가 제목/일기/인물 태그 즉시 생성
- **순간(Moment)**: 같은 날짜 사진을 자동 그룹핑, 수동 수정 가능
- **폴라로이드 다운로드**: AI 텍스트 + 사진을 합성한 이미지 저장

## 기술 스택

| 계층 | 기술 |
|---|---|
| Frontend | React + Vite + TypeScript |
| 스타일링 | Tailwind CSS + shadcn/ui + Framer Motion |
| Backend | FastAPI (Python) |
| Database | SQLite (WAL 모드) |
| AI | OpenAI GPT-4o Vision API |
| 이미지 처리 | Pillow + pillow-heif |
| 배포 | Docker Compose → N100 미니PC |
| 외부 접속 | Cloudflare Tunnel |

## 주요 설계 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 순간 그룹핑 | 날짜 단위 자동 + 수동 수정 | 단순하면서도 유연한 구조 |
| 얼굴 인식 | GPT-4o Vision에 위임 | N100에서 face_recognition CPU 부하 회피, 서버 의존성 최소화 |
| 프론트엔드 | React (Vite) | 생태계, AI 코드 생성 품질, 커뮤니티 지원 최대 |
| UI 라이브러리 | shadcn/ui + Tailwind CSS + Framer Motion | 기능적 UI는 shadcn/ui로 통일, 폴라로이드 갤러리는 커스텀 구현 |
| EXIF 없는 사진 | 사용자 직접 날짜 입력 | 정확한 타임라인 보장 |
| API 비용 관리 | 업로드 즉시 생성 + 결과 캐싱 | UX 우선, 재생성 방지로 비용 통제 |
| SQLite 동시성 | WAL 모드 | 가족 규모(5~10명)에서 충분한 동시성 |

## 프로젝트 구조

```
docs/
└── PRD.md          # 상세 기획 및 기술 명세
```

## 개발 로드맵

1. **환경 구축 및 뼈대** — Docker, FastAPI, React 초기 세팅 + 업로드/EXIF/썸네일
2. **리스트 뷰** — 타임라인 UI + 상세 모달
3. **갤러리 뷰** — 폴라로이드 디자인 + 뷰 전환 + 반응형
4. **AI 연동** — GPT-4o 제목/일기/인물 식별
5. **완성도** — 필터링, 순간 편집, 폴라로이드 다운로드, 인증, 배포
