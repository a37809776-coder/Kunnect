-- RPC (design.md §5, §6.2). 판정 규칙은 lib/status/participantStatus.ts와 같아야 한다.

create extension if not exists pgcrypto with schema extensions;

-- 초대코드로 기관 참여
create function public.join_org(code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  select id into org from public.organizations where invite_code = upper(trim(code));
  if org is null then raise exception 'invalid_invite_code'; end if;
  update public.profiles set organization_id = org where id = auth.uid() and role = 'participant';
  return org;
end;
$$;

-- 디바이스 페어링
create function public.pair_device(p_serial text, p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare d public.devices;
begin
  select * into d from public.devices where serial = upper(trim(p_serial));
  if d.id is null then raise exception 'device_not_found'; end if;
  if d.pairing_code_hash <> encode(extensions.digest(trim(p_code), 'sha256'), 'hex') then
    raise exception 'invalid_pairing_code';
  end if;
  if d.owner_id is not null and d.owner_id <> auth.uid() then raise exception 'device_taken'; end if;
  update public.devices set owner_id = auth.uid() where id = d.id;
  return d.id;
end;
$$;

-- 기관 안내 발송: org_notices + 참여자 식물 메시지
create function public.send_org_notice(p_recipient uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; notice_id uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.role <> 'org_staff' or not public.staff_can_see(p_recipient, 'care') then
    raise exception 'not_allowed';
  end if;
  insert into public.org_notices (organization_id, sender_id, recipient_id, body)
  values (me.organization_id, me.id, p_recipient, p_body)
  returning id into notice_id;
  insert into public.plant_messages (plant_id, type, code, body)
  select p.id, 'org_notice', 'ORG_NOTICE', p_body
  from public.plants p where p.owner_id = p_recipient
  order by p.created_at limit 1;
  return notice_id;
end;
$$;

-- 기관 사후관리 현황 (동의 항목만 노출)
create function public.org_participant_status(p_org uuid)
returns table (
  participant_id uuid,
  display_name text,
  status text,
  last_care_at timestamptz,
  device_last_seen_at timestamptz,
  share_care_activity boolean,
  share_environment boolean,
  share_mood boolean,
  plant_nickname text,
  plant_art text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff_of(p_org) then raise exception 'not_allowed'; end if;

  return query
  with base as (
    select
      pr.id as pid,
      pr.display_name as pname,
      pr.created_at as joined_at,
      (c.agreed_at is not null and c.revoked_at is null) as valid,
      coalesce(c.share_care_activity, false) as s_care,
      coalesce(c.share_environment, false) as s_env,
      coalesce(c.share_mood, false) as s_mood,
      pl.id as plant_id,
      pl.nickname as nick,
      sp.art as art,
      sp.moisture_min as mmin,
      d.last_seen_at as seen,
      (select max(ce.created_at) from public.care_events ce where ce.user_id = pr.id) as last_care
    from public.profiles pr
    left join public.consents c on c.user_id = pr.id and c.organization_id = p_org
    left join lateral (
      select * from public.plants p where p.owner_id = pr.id order by p.created_at limit 1
    ) pl on true
    left join public.plant_species sp on sp.id = pl.species_id
    left join public.devices d on d.id = pl.device_id
    where pr.organization_id = p_org and pr.role = 'participant'
  ), judged as (
    select b.*,
      exists (select 1 from public.sensor_readings r
              where r.plant_id = b.plant_id and r.measured_at > now() - interval '48 hours')
      and not exists (select 1 from public.sensor_readings r
              where r.plant_id = b.plant_id and r.measured_at > now() - interval '48 hours'
                and r.soil_moisture >= b.mmin) as dry48
    from base b
  )
  select
    j.pid,
    j.pname,
    case
      when not j.valid or not j.s_care then 'none'
      when coalesce(j.last_care, j.joined_at) < now() - interval '14 days'
        or (j.s_env and j.seen is not null and j.seen < now() - interval '72 hours') then 'red'
      when coalesce(j.last_care, j.joined_at) < now() - interval '7 days'
        or (j.s_env and j.dry48) then 'yellow'
      else 'green'
    end,
    case when j.valid and j.s_care then j.last_care end,
    case when j.valid and j.s_env then j.seen end,
    j.valid and j.s_care,
    j.valid and j.s_env,
    j.valid and j.s_mood,
    case when j.valid and (j.s_care or j.s_env) then j.nick end,
    case when j.valid and (j.s_care or j.s_env) then j.art end
  from judged j
  order by j.pname;
end;
$$;

-- 기본 PUBLIC 실행 권한을 걷고 로그인 사용자에게만 연다
revoke execute on function public.join_org, public.pair_device, public.send_org_notice, public.org_participant_status
  from public, anon;
grant execute on function public.join_org, public.pair_device, public.send_org_notice, public.org_participant_status
  to authenticated;
