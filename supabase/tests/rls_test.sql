-- RLS 테스트 (test.md S-01 ~ S-08 + 추가 케이스)
-- 실행: Supabase SQL 편집기 또는 psql에서 통째로 실행.
-- 마지막에 일부러 예외를 던져 모든 테스트 데이터를 롤백한다.
--   성공 → ERROR: ALL RLS TESTS PASSED (n checks) — rolled back
--   실패 → ERROR: FAIL <테스트 ID>: <설명>
do $$
declare
  org1 uuid; org2 uuid; sp uuid;
  ua uuid := gen_random_uuid();   -- 참여자 A: 돌봄·환경 공유, 마음 비공유
  ub uuid := gen_random_uuid();   -- 참여자 B: 공유 동의 없음
  us uuid := gen_random_uuid();   -- 기관1 스태프
  us2 uuid := gen_random_uuid();  -- 기관2 스태프
  da uuid; db uuid; pa uuid; pb uuid;
  n int; checks int := 0; failed boolean;
begin
  -- ---------- 준비 (postgres 권한) ----------
  insert into public.organizations (name, invite_code) values ('RLS 테스트 기관1', 'RLSTEST1') returning id into org1;
  insert into public.organizations (name, invite_code) values ('RLS 테스트 기관2', 'RLSTEST2') returning id into org2;
  select id into sp from public.plant_species limit 1;

  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (ua, 'authenticated', 'authenticated', 'rls-a@plantconnect.test', '{"display_name":"A"}'),
    (ub, 'authenticated', 'authenticated', 'rls-b@plantconnect.test', '{"display_name":"B"}'),
    (us, 'authenticated', 'authenticated', 'rls-s@plantconnect.test', '{"display_name":"S"}'),
    (us2, 'authenticated', 'authenticated', 'rls-s2@plantconnect.test', '{"display_name":"S2"}');
  -- 트리거가 profiles를 만들었는지
  select count(*) into n from public.profiles where id in (ua, ub, us, us2);
  if n <> 4 then raise exception 'FAIL setup: handle_new_user trigger (% profiles)', n; end if;

  update public.profiles set organization_id = org1 where id in (ua, ub);
  update public.profiles set role = 'org_staff', organization_id = org1 where id = us;
  update public.profiles set role = 'org_staff', organization_id = org2 where id = us2;

  insert into public.devices (serial, token_hash, pairing_code_hash, owner_id) values ('RLS-A', 'x', 'x', ua) returning id into da;
  insert into public.devices (serial, token_hash, pairing_code_hash, owner_id) values ('RLS-B', 'x', 'x', ub) returning id into db;
  insert into public.plants (owner_id, device_id, species_id, nickname) values (ua, da, sp, 'A식물') returning id into pa;
  insert into public.plants (owner_id, device_id, species_id, nickname) values (ub, db, sp, 'B식물') returning id into pb;
  insert into public.sensor_readings (device_id, plant_id, soil_moisture, temperature, light) values (da, pa, 50, 22, 3000), (db, pb, 50, 22, 3000);
  insert into public.care_events (plant_id, user_id, type) values (pa, ua, 'water'), (pb, ub, 'water');
  insert into public.mood_entries (user_id, emoji, memo) values (ua, '🙂', 'A의 메모'), (ub, '😐', 'B의 메모');
  insert into public.consents (user_id, organization_id, share_care_activity, share_environment, share_mood, agreed_at)
    values (ua, org1, true, true, false, now());

  -- ---------- 참여자 A ----------
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- S-01 남의 식물·측정값
  select count(*) into n from public.plants where owner_id = ub;
  if n <> 0 then raise exception 'FAIL S-01: A sees B plants (%)', n; end if;
  select count(*) into n from public.sensor_readings where plant_id = pb;
  if n <> 0 then raise exception 'FAIL S-01: A sees B readings (%)', n; end if;
  select count(*) into n from public.plants where owner_id = ua;
  if n <> 1 then raise exception 'FAIL S-01: A cannot see own plant'; end if;
  checks := checks + 3;

  -- S-02 측정값 직접 insert 불가
  failed := false;
  begin
    insert into public.sensor_readings (device_id, plant_id, soil_moisture, temperature, light) values (da, pa, 10, 20, 100);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL S-02: participant inserted sensor_readings'; end if;
  checks := checks + 1;

  -- S-07 역할 변경 불가
  failed := false;
  begin
    update public.profiles set role = 'org_staff' where id = ua;
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL S-07: participant changed own role'; end if;
  checks := checks + 1;

  -- 추가: 남의 디바이스를 내 식물에 연결 불가
  failed := false;
  begin
    insert into public.plants (owner_id, device_id, species_id, nickname) values (ua, db, sp, '탈취');
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL extra: A attached B device'; end if;
  checks := checks + 1;

  -- 추가: 남의 식물에 돌봄 기록 불가
  failed := false;
  begin
    insert into public.care_events (plant_id, user_id, type) values (pb, ua, 'water');
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL extra: A logged care on B plant'; end if;
  checks := checks + 1;

  -- 추가: 참여자는 기관 현황 RPC 호출 불가
  failed := false;
  begin
    perform * from public.org_participant_status(org1);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL extra: participant called org_participant_status'; end if;
  checks := checks + 1;

  -- ---------- 기관1 스태프 ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- S-03 환경 비공유(B) 측정값 0건, 공유(A)는 보임
  select count(*) into n from public.sensor_readings where plant_id = pb;
  if n <> 0 then raise exception 'FAIL S-03: staff sees B readings (%)', n; end if;
  select count(*) into n from public.sensor_readings where plant_id = pa;
  if n <> 1 then raise exception 'FAIL S-03: staff cannot see A shared readings (%)', n; end if;
  checks := checks + 2;

  -- S-04 마음 비공유(A) 0건
  select count(*) into n from public.mood_entries where user_id in (ua, ub);
  if n <> 0 then raise exception 'FAIL S-04: staff sees unshared moods (%)', n; end if;
  checks := checks + 1;

  -- 돌봄: A만 보임
  select count(*) into n from public.care_events where user_id = ub;
  if n <> 0 then raise exception 'FAIL extra: staff sees B care (%)', n; end if;
  checks := checks + 1;

  -- 현황 RPC: B는 none + 식물 정보 없음
  select count(*) into n from public.org_participant_status(org1) s
    where s.participant_id = ub and s.status = 'none' and s.plant_nickname is null and s.plant_art is null;
  if n <> 1 then raise exception 'FAIL F5-06: B not shown as none without plant info'; end if;
  select count(*) into n from public.org_participant_status(org1) s where s.participant_id = ua and s.status = 'green';
  if n <> 1 then raise exception 'FAIL F5-01: A not green'; end if;
  checks := checks + 2;

  -- F5-08 비동의 참여자에게 안내 불가, F5-07 동의 참여자는 가능
  failed := false;
  begin
    perform public.send_org_notice(ub, '안부');
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL F5-08: notice sent to non-consenting B'; end if;
  perform public.send_org_notice(ua, '요즘 식물은 잘 지내고 있나요?');
  checks := checks + 2;

  -- ---------- 기관2 스태프 ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', us2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- S-05 다른 기관 스태프
  select count(*) into n from public.plants where owner_id in (ua, ub);
  if n <> 0 then raise exception 'FAIL S-05: other org staff sees plants (%)', n; end if;
  select count(*) into n from public.profiles where id in (ua, ub);
  if n <> 0 then raise exception 'FAIL S-05: other org staff sees profiles (%)', n; end if;
  failed := false;
  begin
    perform * from public.org_participant_status(org1);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL S-05: other org staff called org1 status'; end if;
  checks := checks + 3;

  -- ---------- 참여자 A: 안내 수신 확인 후 동의 철회 ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.plant_messages where plant_id = pa and type = 'org_notice';
  if n <> 1 then raise exception 'FAIL F5-07: A did not receive notice message (%)', n; end if;
  update public.consents set revoked_at = now() where user_id = ua;
  checks := checks + 1;

  -- ---------- S-06 철회 직후 기관1 스태프 ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', us, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.sensor_readings where plant_id = pa;
  if n <> 0 then raise exception 'FAIL S-06: staff sees A readings after revoke (%)', n; end if;
  select count(*) into n from public.care_events where user_id = ua;
  if n <> 0 then raise exception 'FAIL S-06: staff sees A care after revoke (%)', n; end if;
  select count(*) into n from public.org_participant_status(org1) s where s.participant_id = ua and s.status = 'none';
  if n <> 1 then raise exception 'FAIL F4-03: A not none after revoke'; end if;
  checks := checks + 3;

  -- ---------- S-08 비로그인 ----------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';

  select count(*) into n from public.plants;
  if n <> 0 then raise exception 'FAIL S-08: anon sees plants (%)', n; end if;
  select count(*) into n from public.profiles;
  if n <> 0 then raise exception 'FAIL S-08: anon sees profiles (%)', n; end if;
  select count(*) into n from public.organizations;
  if n <> 0 then raise exception 'FAIL S-08: anon sees organizations (%)', n; end if;
  failed := false;
  begin
    perform public.join_org('RLSTEST1');
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL S-08: anon called join_org'; end if;
  checks := checks + 4;

  execute 'reset role';
  raise exception 'ALL RLS TESTS PASSED (% checks) — rolled back', checks;
end;
$$;
