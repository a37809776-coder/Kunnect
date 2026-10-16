# CLAUDE.md — 플랜트커넥트 (가칭)

> KU:NNECT (고려대학교 세종캠퍼스) · 원예테라피 사후관리용 식물 교감형 화분 디바이스 + 동의 기반 사후관리 앱
> 참여자·기관 모두 **모바일 앱(PWA)만** 만든다. 웹(데스크톱) 화면 없음. 앱 안에 하드웨어 시뮬레이터 포함 (ADR-004).
> 이 파일은 매 요청마다 가장 먼저 읽는 프로젝트 앵커다.

---

## 매 요청 복기 순서

작업 전에 아래 순서로 관련 문서를 확인한다. 문서와 다른 방향으로 구현해야 하면 **먼저 묻는다.**

1. **brd.md** — 무엇을, 누구를 위해 (MVP 5개 기능, 범위 밖)
2. **cps.md** — 왜 (문제 P1~P5, 솔루션 원칙)
3. **design.md** — 어떻게 (데이터 모델, RLS, 메시지 엔진, API, 화면)
4. **plan.md** — 지금 어느 Phase인가
5. **todo.md** — 다음 작업, 완료 체크
6. **test.md** — 이 작업의 테스트 ID

보조: **design-system.md**(디자인 토큰·시안) · **stack.md**(버전·명령어) · **adr.md**(설계 결정) · **log.md**(개발 기록)

---

## 기술 스택

- 디바이스: ESP32 + 토양 수분·온도·조도 센서, Arduino(C++) 펌웨어 → `firmware/`
- 웹: Next.js (App Router) + TypeScript + Tailwind CSS → `app/`, `lib/`
- DB·인증: Supabase (Postgres + Auth + RLS) → `supabase/migrations/`
- 배포: Vercel
- 테스트: Vitest(단위), Playwright(E2E), Supabase 로컬(RLS)

상세 버전·명령어는 stack.md.

---

## 코딩 원칙

1. **테스트 먼저.** test.md의 해당 ID를 테스트 코드로 옮긴 뒤 구현한다. 특히 메시지 엔진(F2)과 RLS(S-*)는 테스트 없이 머지하지 않는다.
2. **메시지 엔진은 순수 함수.** `lib/messages/engine.ts`는 DB에 접근하지 않는다. 입력(측정값·기준값·최근 메시지·시각) → 출력(생성할 메시지 목록).
3. **문구는 `lib/messages/copy.ts`에만.** 컴포넌트·엔진에 문구를 하드코딩하지 않는다.
4. **권한은 RLS로.** 클라이언트 코드에서 권한을 거르지 않는다. 기관 조회는 consent를 강제하는 뷰/RPC로만.
5. **서비스 롤 키는 서버에서만.** 디바이스 API·서버 액션 외에는 쓰지 않는다.
6. **시간은 Asia/Seoul 기준.** 낮 시간·하루 판정 모두.
7. **모바일 퍼스트.** 참여자 화면은 375px 기준으로 먼저 만든다.
8. 작업을 끝내면 todo.md 체크 → 다음 작업을 알려준다.

---

## 확인 후 진행 (먼저 물어볼 것)

- DB 스키마 변경 (테이블·컬럼 추가/삭제, RLS 정책 변경)
- consent 관련 로직 변경 (기관이 볼 수 있는 범위가 달라지는 모든 것)
- 메시지 규칙·쿨다운·일일 제한 수치 변경
- 새 외부 라이브러리·외부 API 추가
- brd §7 범위 밖 기능에 손대는 것
- 디바이스 API 요청/응답 형식 변경 (펌웨어도 바뀌어야 함)

---

## 절대 금지

- ❌ 정신건강 진단·우울 점수·증상 판정·강제 설문 기능 (비임상 원칙)
- ❌ "우울", "증상", "치료", "진단", "점수" 같은 임상 표현을 사용자 문구에 쓰기
- ❌ 참여자를 평가·비난하는 문구 ("또 잊으셨네요")
- ❌ 동의하지 않은 데이터를 기관에 노출 (마음 기록은 기본 비공개)
- ❌ 마음 기록을 필수로 만들기 (건너뛰기 항상 제공)
- ❌ 서비스 롤 키·디바이스 토큰 원문을 클라이언트·로그·커밋에 노출
- ❌ RLS 끄기, `using (true)` 정책
- ❌ 테스트 없이 메시지 엔진·RLS 변경 머지

---

## 자주 쓰는 패턴

**디바이스 측정값 처리 흐름**
```
POST /api/device/readings
→ 토큰 검증 → 값 범위 검증(422) → sensor_readings insert
→ devices.last_seen_at 갱신 → engine.evaluate(...) → plant_messages insert
```

**메시지 엔진 시그니처 (예시)**
```ts
evaluate(input: {
  reading: Reading; species: Species; plantName: string;
  recentMessages: Message[]; now: Date;
}): NewMessage[]
```

**개발 중 측정값 주입**
```
npx tsx scripts/inject-reading.ts --serial PC-0001 --moisture 20
```

**프롬프트 예시**
- 구현: "plan.md Phase 1의 3번을 구현해줘. test.md F2 테스트 먼저 쓰고, 끝나면 todo.md 업데이트하고 다음 작업 알려줘."
- 보완: "brd.md를 바탕으로 design.md 데이터 모델을 보완해줘."
- 막힘: "현재 [문제]야. design.md 원칙을 지키면서 해결법 3가지 제안해줘."

---

## 개발 로그

- 의미 있는 결정은 adr.md에, 하루 작업 기록은 log.md에 남긴다.
- 현재 Phase: **Phase 0~3 소프트웨어 1차 완료**, Supabase 연결·E2E·HW 남음 — todo.md 참고
- 환경변수가 없으면 데모 모드(`lib/data/demo.ts`)로 실행된다. 데이터 접근은 항상 `lib/data/repo.ts` 인터페이스를 거친다.
- 원격 DB(`kunnect-green's Project`)에 마이그레이션 1~4·시드 적용 완료, RLS 테스트 통과 (design.md §3.2, ADR-005). 스키마는 새 마이그레이션 파일로만 바꾸고, 정책을 바꾸면 `supabase/tests/rls_test.sql`을 다시 실행한다.
