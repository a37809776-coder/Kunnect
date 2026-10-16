# design.md — Application Design

> 입력: cps.md · 플랜트커넥트 (가칭)
> cps의 솔루션을 시스템으로 번역한 문서. 구현 중 구조를 바꿔야 하면 이 문서와 adr.md를 먼저 갱신한다.

---

## 1. 시스템 개요

```
[화분 디바이스 (ESP32 + 센서)]
   │  Wi-Fi, HTTPS POST (10분 간격)
   ▼
[Next.js API Route  /api/device/readings]  ── 디바이스 토큰 검증
   │  insert sensor_readings
   │  → 메시지 규칙 엔진 실행 → insert plant_messages
   ▼
[Supabase (Postgres + Auth + RLS)]
   ▲                         ▲
   │ Supabase JS (RLS)       │ Supabase JS (RLS)
[참여자 앱 (PWA)]           [기관용 사후관리 앱 (PWA)]
        └─ [하드웨어 시뮬레이터] ── 서버 액션 → 디바이스 API와 같은 처리 함수
```

- 디바이스는 **측정·전송만** 한다. 메시지 생성은 서버에서 한다 (규칙 수정 시 펌웨어 재배포 불필요 — adr.md ADR-002).
- 참여자·기관 앱은 하나의 Next.js 모바일 앱(PWA) 안에서 역할(role)로 라우트를 나눈다. **웹(데스크톱) 화면은 만들지 않는다.** 모든 화면은 모바일 폭(최대 480px) 기준.
- 시뮬레이터와 실제 디바이스는 같은 처리 함수(`processReading`)를 거친다 → 시뮬레이터에서 확인한 동작 = 실제 동작 (ADR-004).
- 환경변수에 Supabase가 없으면 **데모 모드**(메모리 데이터 + 계정 선택 로그인)로 실행된다.

---

## 2. 기술 스택 (상세는 stack.md)

| 영역 | 선택 | 비고 |
|---|---|---|
| 디바이스 | ESP32 + 토양 수분(정전용량식) + 온도(DS18B20 또는 DHT22) + 조도(BH1750) | Arduino(C++) 펌웨어 |
| 앱 프레임워크 | Next.js (App Router) + TypeScript | 참여자·기관 모바일 앱 (PWA) |
| UI | Tailwind CSS | 모바일 퍼스트 |
| DB·인증 | Supabase (Postgres, Auth, RLS) | Firebase 대신 Supabase로 확정 (ADR-001) |
| 배포 | Vercel | |
| 차트 | Recharts | 환경 수치 그래프 |

---

## 3. 데이터 모델

```
organizations (기관)
  id uuid PK
  name text                      -- 예: (주)그린테라피
  invite_code text unique        -- 참여자 가입 시 입력하는 초대코드
  created_at timestamptz

profiles (사용자, auth.users 1:1)
  id uuid PK = auth.users.id
  role text check in ('participant','org_staff')
  display_name text
  organization_id uuid FK → organizations   -- 참여자: 참여한 기관 / 스태프: 소속 기관
  created_at timestamptz

plant_species (식물 종 기준값)
  id uuid PK
  name text                       -- 예: 스킨답서스
  art text                        -- 일러스트 종류: leafy / succulent / vine
  care_guide text                 -- 식물 상세의 돌봄 가이드 문구
  moisture_min int, moisture_max int   -- % 
  temp_min numeric, temp_max numeric   -- ℃
  light_min int, light_max int         -- lux

devices
  id uuid PK
  serial text unique              -- 디바이스 고유번호 (페어링용)
  token_hash text                 -- 디바이스 API 토큰 해시 (sha256)
  pairing_code_hash text          -- 디바이스 스티커의 페어링 코드 해시
  is_virtual boolean default false    -- 시뮬레이터 가상 디바이스
  owner_id uuid FK → profiles null    -- 페어링 전 null
  last_seen_at timestamptz
  battery_level int null

plants
  id uuid PK
  owner_id uuid FK → profiles
  device_id uuid FK → devices unique null
  species_id uuid FK → plant_species
  nickname text                   -- 식물 이름 (의인화 메시지에 사용)
  created_at timestamptz

sensor_readings
  id bigint PK
  device_id uuid FK → devices
  plant_id uuid FK → plants
  soil_moisture int               -- 0~100 %
  temperature numeric             -- ℃
  light int                       -- lux
  measured_at timestamptz
  index (plant_id, measured_at desc)

plant_messages (식물이 보낸 메시지)
  id uuid PK
  plant_id uuid FK → plants
  type text check in ('status','cheer','org_notice')
  code text                       -- 규칙 코드, 예: THIRSTY, TOO_DARK, CHEER_MORNING
  body text                       -- 렌더링된 문구
  is_read boolean default false
  created_at timestamptz

care_events (돌봄 반응 = 지속 데이터)
  id uuid PK
  plant_id uuid FK → plants
  user_id uuid FK → profiles
  type text check in ('water','move_light','check','other')
  created_at timestamptz

mood_entries (오늘의 마음, 선택)
  id uuid PK
  user_id uuid FK → profiles
  care_event_id uuid FK → care_events null
  emoji text                      -- 정해진 이모지 세트 중 하나
  memo text null                  -- 최대 100자
  created_at timestamptz

consents (공유 동의)
  id uuid PK
  user_id uuid FK → profiles
  organization_id uuid FK → organizations
  share_care_activity boolean default false   -- 돌봄 지속 여부·이상 징후
  share_environment boolean default false     -- 재배 환경 수치
  share_mood boolean default false            -- 마음 기록 (기본 비공개)
  agreed_at timestamptz null
  revoked_at timestamptz null
  unique (user_id, organization_id)

org_notices (기관 → 참여자 안내)
  id uuid PK
  organization_id uuid FK
  sender_id uuid FK → profiles
  recipient_id uuid FK → profiles
  body text
  created_at timestamptz
  -- 전송 시 plant_messages(type='org_notice')로도 표시
```

### 3.1 RLS 원칙
- 참여자: 본인 소유 `plants`, `sensor_readings`, `plant_messages`, `care_events`, `mood_entries`, `consents`만 읽기/쓰기.
- 기관 스태프: 같은 `organization_id`이며 **유효한 consent가 있는** 참여자에 한해, 동의한 항목만 읽기.
  - `share_care_activity` → `care_events`, 파생 지표(마지막 돌봄일, 이상 징후)
  - `share_environment` → `sensor_readings`
  - `share_mood` → `mood_entries`
  - `revoked_at`이 있으면 즉시 접근 불가.
- 기관 화면은 직접 테이블 대신 **집계 RPC**(`org_participant_status`)를 통해 조회한다. 함수 안에서 consent 조건을 강제하고, 공유하지 않은 참여자는 식물 이름·종류도 비운다.
- `sensor_readings`·`plant_messages`·`devices` 쓰기는 서비스 롤(디바이스 API·시뮬레이터)과 SECURITY DEFINER RPC만 가능.
- `plants`는 내 디바이스만 연결할 수 있다 (`device_id`의 소유자 확인).
- 참여자는 `profiles.display_name`만 수정할 수 있다 (`role`·`organization_id`는 컬럼 권한으로 차단).

### 3.2 원격 DB 적용 상태 (2026-10-16, ADR-005·006)

대상: `Kunnect_Roh` (ref `mjnmzlggjkkxrhylbvac`, ap-northeast-2). 스키마는 `supabase/migrations/` 파일로만 바꾼다. (이전 대상 `kunnect-green's Project`에도 같은 스키마가 있으나 앱은 쓰지 않는다 — ADR-006)

| 항목 | 상태 |
|---|---|
| 마이그레이션 | 4개 적용 — schema · rls · functions · lock_functions (저장소 파일과 1:1) |
| 테이블 | 11개, 모두 RLS 켜짐 |
| RLS 정책 | 21개 |
| 함수 | 7개 — RPC 4 (`join_org`, `pair_device`, `send_org_notice`, `org_participant_status`) + RLS 헬퍼 2 (`is_staff_of`, `staff_can_see`) + 트리거 1 (`handle_new_user`) |
| 함수 실행 권한 | RPC·헬퍼는 `authenticated`만, 트리거 함수는 API 실행 불가 |
| 가입 트리거 | `on_auth_user_created` → `profiles` 자동 생성 (역할 participant) |
| 시드 | 기관 1곳 (`(주)그린테라피`, 초대코드 `GREEN2026`), 식물 종 3개. 디바이스는 시드에 없음 |
| RLS 검증 | `supabase/tests/rls_test.sql` — 27개 체크 통과, 롤백으로 잔여 데이터 없음 |
| 보안 어드바이저 | 남은 경고 6건: 로그인 사용자용 함수(앱 RPC 4 + RLS 헬퍼 2), 모두 의도된 것 |
| 앱 연결 | URL·anon 키·서비스 롤 키 모두 `.env.local`에 있음 → 앱은 실제 DB 모드로 실행. 앱에서의 실제 DB 동작은 아직 미검증 |

---

## 4. 메시지 규칙 엔진 (F2)

새 측정값이 들어오면 서버에서 실행. 순수 함수로 구현해 단위 테스트한다 (`lib/messages/engine.ts`).

| 코드 | 조건 | 예시 문구 (`{name}` = 식물 이름) |
|---|---|---|
| THIRSTY | soil_moisture < species.moisture_min | "{name}: 목말라요… 물 한 잔 부탁해요 💧" |
| TOO_WET | soil_moisture > species.moisture_max | "{name}: 발이 너무 축축해요. 물은 조금 쉬어도 돼요" |
| TOO_DARK | 낮 시간(09~17시) 평균 light < light_min | "{name}: 햇빛이 그리워요. 창가로 옮겨줄래요?" |
| TOO_COLD / TOO_HOT | temperature 범위 밖 | "{name}: 조금 추워요 🥶" |
| THANKS_WATER | care_event(water) 후 수분 상승 감지 | "{name}: 시원해요! 고마워요 ♡" |
| CHEER_DAILY | 하루 1회, 상태 정상일 때 | "{name}: 오늘도 잘하고 있어요♡" |

**중복 방지 규칙**
- 같은 code의 status 메시지는 **12시간 내 재발송하지 않는다.**
- 하루 메시지 최대 3개 (status 우선, cheer는 하루 1개).
- 상태가 정상으로 돌아오면 해당 code의 쿨다운 해제.

**문구 원칙 (비임상)**
- 진단·처방·치료 표현 금지("우울", "증상", "치료", "점수" 등).
- 참여자를 평가하지 않는다 ("또 잊으셨네요" 같은 비난조 금지).
- 문구는 `lib/messages/copy.ts`에 모아 두고 그린테라피 피드백으로 교체 가능하게.

---

## 5. 이상 징후 판정 (F5)

기관 화면에 보여주는 참여자 상태. RPC `org_participant_status`에서 계산하고, 데모 모드는 `lib/status/participantStatus.ts`가 같은 규칙으로 계산한다.

| 상태 | 조건 |
|---|---|
| 🟢 돌봄 지속 | 최근 7일 내 care_event 있음 |
| 🟡 관심 필요 | 최근 7~14일 care_event 없음 **또는** THIRSTY 상태 48시간 이상 지속 |
| 🔴 연락 권장 | 14일 이상 care_event 없음 **또는** 디바이스 72시간 이상 미전송 |
| ⚪ 공유 안 함 | consent 없음/철회 (이름만 표시, 데이터 없음) |

- '이상 징후'는 **식물·활동 상태**를 뜻하며, 참여자의 정신건강 상태를 추정하지 않는다.

---

## 6. API 설계

### 6.1 디바이스 API
```
POST /api/device/readings
Headers: Authorization: Bearer <device_token>
Body: { "serial": "PC-0001", "soil_moisture": 34, "temperature": 22.5, "light": 820, "battery": 87 }
200: { "ok": true, "next_interval_sec": 600 }
401: 토큰 불일치 / 404: 미등록 serial / 409: 페어링 안 된 디바이스 / 422: 값 범위 오류
```
- 값 검증: moisture 0~100, temperature -10~60, light 0~100000. 범위 밖이면 422 (센서 오류로 간주, 저장 안 함).
- 처리: readings insert → devices.last_seen_at 갱신 → 규칙 엔진 실행.

### 6.2 앱 내부 (Supabase 직접 호출 + 서버 액션)
| 동작 | 방식 |
|---|---|
| 기관 참여 | 서버 액션 → RPC `join_org(code)` |
| 디바이스 페어링 | 서버 액션 → RPC `pair_device(serial, code)` — 페어링 코드는 해시로 비교 |
| 식물 등록/수정 | Supabase insert/update (RLS) |
| 최근 환경 수치 조회 | `sensor_readings` select (최근 24h / 7d) |
| 메시지 목록·읽음 처리 | `plant_messages` select/update |
| 돌봄 반응 기록 | `care_events` insert |
| 마음 기록 | `mood_entries` insert (선택) |
| 동의 설정/철회 | `consents` upsert |
| 기관 현황 조회 | RPC `org_participant_status(org_id)` |
| 기관 안내 발송 | 서버 액션 `sendNotice` → RPC `send_org_notice(recipient, body)` — consent 확인 후 `org_notices` + `plant_messages` insert |
| 시뮬레이터 전송 | 서버 액션 `simulateReading(plantId, values, at, resetCooldown)` — 가상 디바이스로 `processReading` 호출 |

---

## 7. UI/UX 구조

### 7.1 원칙
- 모바일 퍼스트, 한 화면 한 목적. 식물이 화면의 주인공 (큰 식물 일러스트 + 말풍선).
- 수치는 보조. 기본은 말풍선, 탭하면 수치·그래프.
- 마음 기록은 **돌봄 반응 직후 1회 가볍게 제안**하고 '건너뛰기'를 같은 크기로 둔다.
- 따뜻한 톤 (그린·크림 계열), 비임상 문구.

### 7.2 참여자 화면 (PWA)
| 경로 | 화면 | 주요 요소 |
|---|---|---|
| `/login` | 로그인 | 이메일 매직링크 (가정) |
| `/onboarding` | 첫 설정 | 기관 선택(초대코드) → 디바이스 페어링(serial+코드) → 식물 종·이름 → 공유 동의 |
| `/` | 홈 (내 식물) | 식물 일러스트, 최신 말풍선, 상태 뱃지 3개(수분·온도·빛), [물 줬어요] 버튼 |
| `/plant/[id]` | 식물 상세 | 24h/7d 그래프, 맞춤 돌봄 가이드 |
| `/messages` | 메시지 목록 | 최근 메시지 (보관함·캘린더는 범위 밖) |
| (모달) | 오늘의 마음 | 이모지 5종 + 메모(선택) + 건너뛰기 |
| `/settings/sharing` | 공유 설정 | 항목별 토글, 동의 철회, 공유 내용 미리보기 |

### 7.3 기관 화면 (모바일 앱)
| 경로 | 화면 | 주요 요소 |
|---|---|---|
| `/org` | 사후관리 현황 | 상태 탭(전체·관심 필요·연락 권장·공유 안 함, 인원 수) + 참여자 카드 목록, 마지막 돌봄일 |
| `/org/participants/[id]` | 참여자 상세 | 동의한 항목만 표시, 안내 보내기 |
| (하단 시트) | 안내 보내기 | 템플릿 선택 + 자유 입력 |

### 7.4 하드웨어 시뮬레이터 `/simulator`
| 요소 | 설명 |
|---|---|
| 대상 식물 선택 | 내 식물 중 하나 (가상 디바이스가 없으면 자동 생성·연결) |
| 미리보기 | 상단에 홈 화면과 같은 식물 + 최신 말풍선 + 배지 — 전송 즉시 갱신 |
| 슬라이더 4개 | 수분 0~100% · 온도 -5~45℃ · 조도 0~20,000 lux · 배터리 0~100% |
| 프리셋 | 물 주기(수분 75%) · 흙이 마름(15%) · 창가 햇빛(8,000 lux) · 어두운 방(80 lux) · 추운 밤(8℃) · 배터리 부족(12%) |
| 측정 시각 | '지금' 또는 낮 12시 / 밤 10시 (낮 시간 판정 확인용) |
| 전송 | [측정값 보내기] → `processReading` 실행 → 결과(저장 여부, 생성된 메시지) 표시 |
| 쿨다운 초기화 | 데모용: 해당 식물의 최근 메시지 쿨다운을 무시하고 다시 평가 |
| 노출 조건 | 데모 모드이거나 `NEXT_PUBLIC_ENABLE_SIMULATOR=true`일 때만 메뉴에 표시 |

---

## 8. 디바이스 설계

- 측정 주기: 10분 (서버 응답 `next_interval_sec`로 조정 가능), 측정 사이 deep sleep.
- Wi-Fi 설정: 최초 부팅 시 AP 모드 + 설정 페이지 (WiFiManager).
- 전송 실패 시: 최대 3회 재시도 후 다음 주기로.
- 배터리 레벨 함께 전송, 20% 미만이면 앱에 "배터리가 부족해요" 메시지.
- 외형: 화분에 꽂는 막대형, 3D 프린팅 케이스, 센서부 방수 처리.
- 디바이스 자체 디스플레이·스피커 없음 — 메시지는 앱으로 전달 (가정, ADR-002).
