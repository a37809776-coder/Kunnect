-- 기본 시드: 기관, 식물 종, 테스트 디바이스
-- 디바이스 토큰·페어링 코드 원문은 여기 적지 않는다. 해시는 아래처럼 만든다:
--   select encode(extensions.digest('<원문>', 'sha256'), 'hex');

insert into public.organizations (name, invite_code) values ('(주)그린테라피', 'GREEN2026');

insert into public.plant_species (name, art, care_guide, moisture_min, moisture_max, temp_min, temp_max, light_min, light_max) values
  ('몬스테라', 'leafy', '겉흙이 2~3cm 마르면 흠뻑 물을 주세요. 직사광선보다 밝은 간접광을 좋아해요.', 35, 70, 16, 30, 1000, 10000),
  ('에케베리아', 'succulent', '흙이 완전히 마른 뒤 물을 주세요. 햇빛을 많이 받을수록 단단하게 자라요.', 10, 40, 10, 32, 3000, 30000),
  ('스킨답서스', 'vine', '겉흙이 마르면 물을 주세요. 어두운 곳에서도 잘 버티지만 밝은 곳에서 더 싱그러워요.', 30, 70, 15, 30, 500, 8000);

-- 개발용 디바이스 (토큰·페어링 코드는 팀 공유 문서에서 확인)
-- insert into public.devices (serial, token_hash, pairing_code_hash) values
--   ('PC-0001', encode(extensions.digest('<device-token>', 'sha256'), 'hex'), encode(extensions.digest('<pairing-code>', 'sha256'), 'hex'));
