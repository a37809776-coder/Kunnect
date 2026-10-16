# 플랜트커넥트 (가칭) — KU:NNECT

원예테라피 프로그램이 끝난 뒤에도 참여자가 식물과 마음돌봄을 이어가도록 돕는 **화분 센서 디바이스 + 모바일 앱**(참여자용·기관용).

- 문서: [CLAUDE.md](CLAUDE.md) → brd · cps · design · plan · todo · test · [design-system.md](design-system.md)
- 앱: Next.js(App Router) PWA, 모바일 전용 (웹 데스크톱 화면 없음)
- 하드웨어 시뮬레이터: 앱 안 `/simulator`에서 센서값을 바꿔 보내면 식물 상태·메시지가 바로 바뀐다

## 실행

```bash
npm install
npm run dev
```

http://localhost:3000 — `.env.local`이 없으면 **데모 모드**(메모리 데이터)로 실행되고, 로그인 화면에서 데모 계정을 고른다.

| 데모 계정 | 확인할 것 |
|---|---|
| 하늘 | 홈·식물 상세·메시지·시뮬레이터·공유 설정 |
| 새싹 | 온보딩 (초대코드 GREEN2026 · 디바이스 PC-0009 · 페어링 코드 123456) |
| 그린테라피 담당자 | 기관 사후관리 현황·참여자 상세·안부 보내기 |

## Supabase 연결

Supabase 프로젝트 `Kunnect_Roh`(ref `mjnmzlggjkkxrhylbvac`)에 마이그레이션 1~4와 시드가 이미 적용돼 있다 (ADR-006).

1. `.env.example`을 `.env.local`로 복사하고 URL·anon 키·service_role 키를 넣는다 (service_role 키가 비어 있으면 데모 모드)
2. 로그인은 이메일·비밀번호 방식 (ADR-007). 대시보드 Authentication → Sign In / Providers의 "Confirm email"이 켜져 있으면 가입 후 확인 메일을 눌러야 하므로, URL Configuration에 `http://localhost:3000/auth/callback`을 추가한다
3. 기관 스태프는 가입 후 SQL로 지정: `update profiles set role = 'org_staff', organization_id = '<기관 id>' where id = '<user id>';`
4. 디바이스 등록은 `supabase/seed.sql` 하단 주석 참고 (토큰·페어링 코드는 해시로만 저장)
5. RLS 확인: `supabase/tests/rls_test.sql` 실행

## 테스트

```bash
npm test
```

```bash
npm run inject -- --serial PC-0001 --moisture 20
```
