# stack.md — Tech Stack Reference

> 플랜트커넥트 (가칭)의 고정 스택. 여기 없는 라이브러리를 추가하려면 먼저 팀에 확인하고 adr.md에 남긴다.
> 버전은 프로젝트 생성 시점의 안정 버전으로 고정하고 아래 표에 기록한다.

---

## 1. 웹 (참여자 PWA + 기관 웹)

| 항목 | 선택 | 버전 | 용도 |
|---|---|---|---|
| 런타임 | Node.js | LTS (기록: ___) | |
| 프레임워크 | Next.js (App Router) | ___ | 화면 + API Route + 서버 액션 |
| 언어 | TypeScript (strict) | ___ | |
| 스타일 | Tailwind CSS | ___ | 모바일 퍼스트 |
| DB 클라이언트 | @supabase/supabase-js, @supabase/ssr | ___ | |
| 차트 | Recharts | ___ | 환경 수치 그래프 |
| 검증 | Zod | ___ | 디바이스 API 바디·폼 검증 |
| 단위 테스트 | Vitest | ___ | 엔진·API |
| E2E | Playwright | ___ | 유저플로우 |

## 2. 백엔드 · 인프라

| 항목 | 선택 | 비고 |
|---|---|---|
| DB | Supabase Postgres 17 | `Kunnect_Roh` (ref `mjnmzlggjkkxrhylbvac`, ap-northeast-2, ADR-006). 마이그레이션은 `supabase/migrations/` |
| 인증 | Supabase Auth | 이메일 매직링크. 리디렉션 URL `http://localhost:3000/auth/callback` 대시보드 등록 필요 |
| 권한 | Row Level Security | 테이블 11개 모두 활성화, 정책 21개. 검증: `supabase/tests/rls_test.sql` |

### 2.1 원격 DB 적용 상태 (2026-10-16, ADR-005·006)

| 순서 | 마이그레이션 파일 | 원격 이름 | 내용 |
|---|---|---|---|
| 1 | `20261016000001_schema.sql` | schema | 테이블 11개, 가입 트리거 |
| 2 | `20261016000002_rls.sql` | rls | RLS 정책 21개, 헬퍼 함수 2개 |
| 3 | `20261016000003_functions.sql` | functions | RPC 4개 |
| 4 | `20261016000004_lock_functions.sql` | lock_functions | 함수 실행 권한 정리 |

- 시드 적용 완료: 기관 1곳(초대코드 `GREEN2026`), 식물 종 3개. 디바이스는 해시로 직접 등록 (`seed.sql` 하단 주석).
- RLS 테스트 27개 체크 통과 (롤백, 잔여 데이터 없음).
- 새 스키마 변경은 마이그레이션 파일을 추가하고, 원격에 적용한 뒤 이 표와 design.md §3.2에 한 줄 추가한다.
| 배포 | Vercel | main → 프로덕션, PR → 프리뷰 |
| 로컬 DB | Supabase CLI (`supabase start`) | Docker 필요 |

## 3. 디바이스

| 항목 | 선택 | 비고 |
|---|---|---|
| 보드 | ESP32 DevKit (Wi-Fi) | |
| 토양 수분 | 정전용량식 수분 센서 v1.2 | 저항식은 부식 → 사용 안 함 |
| 온도 | DS18B20 (방수형) 또는 DHT22 | 부품 확정 시 기록 |
| 조도 | BH1750 (I2C) | |
| 전원 | 18650 리튬 배터리 + 충전 모듈 | 데모는 USB 허용 |
| 펌웨어 | Arduino (C++), PlatformIO 권장 | `firmware/` |
| 라이브러리 | WiFiManager, HTTPClient, ArduinoJson, BH1750, OneWire/DallasTemperature | |
| 케이스 | 3D 프린팅 (PLA/PETG) | 센서부 방수 |

## 4. 폴더 구조

```
/
├── CLAUDE.md, brd.md, cps.md, design.md, plan.md, todo.md, test.md, stack.md, adr.md, log.md
├── app/
│   ├── (app)/              # 참여자 앱: /, /plant/[id], /messages, /simulator, /settings/sharing
│   ├── onboarding/
│   ├── org/                # 기관 앱: /org, /org/participants/[id], /org/settings
│   ├── login/, auth/callback/
│   ├── actions.ts          # 서버 액션
│   └── api/device/readings/route.ts
├── components/             # PlantArt, PlantHero, AppShell, ui …
├── lib/
│   ├── data/               # repo.ts(인터페이스), supabase.ts, demo.ts(데모 모드)
│   ├── device/             # processReading.ts — 디바이스 API·시뮬레이터 공용
│   ├── supabase/           # 클라이언트 생성 (user/service)
│   ├── messages/           # engine.ts, copy.ts
│   └── status/             # 기관 상태 판정
├── supabase/
│   ├── migrations/         # 0001 schema · 0002 rls · 0003 functions · 0004 lock_functions
│   ├── tests/rls_test.sql  # RLS 검증 (롤백형)
│   └── seed.sql
├── scripts/inject-reading.ts
├── tests/                  # unit/ (Vitest), e2e/ (예정)
└── firmware/               # ESP32 PlatformIO 프로젝트
```

## 5. 환경변수

| 이름 | 위치 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 클라이언트 | `.env.local`에 입력됨 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트 | anon 키 (JWT), `.env.local`에 입력됨 |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | 디바이스 API·시뮬레이터. `.env.local`에 입력됨. 비어 있으면 데모 모드 |
| `APP_TIMEZONE` | 서버 | `Asia/Seoul` |
| `NEXT_PUBLIC_SITE_URL` | 서버 | 매직링크 리디렉션 기준 주소 (`http://localhost:3000`) |
| `NEXT_PUBLIC_ENABLE_SIMULATOR` | 서버 | `true`면 실제 DB 모드에서도 시뮬레이터 노출 (데모 모드는 항상 노출) |

`.env.local`은 `.gitignore` 대상이다. 서비스 롤 키는 저장소에 커밋하지 않는다 (ADR-005).

펌웨어의 디바이스 토큰은 `firmware/include/secrets.h`에 두고 **커밋하지 않는다** (`.gitignore`).

## 6. 자주 쓰는 명령어

```
npm run dev                 # 로컬 개발
npm run test                # Vitest
npx playwright test         # E2E
supabase start              # 로컬 Supabase
supabase db reset           # 마이그레이션 + 시드 재적용
supabase migration new <이름>
# RLS 검증: supabase/tests/rls_test.sql 을 SQL 편집기에서 실행 → "ALL RLS TESTS PASSED" 에러면 통과
npx tsx scripts/inject-reading.ts --serial PC-0001 --moisture 20
pio run -t upload           # 펌웨어 업로드 (firmware/ 에서)
```
