-- RLS (design.md §3.1, adr.md ADR-003)
-- sensor_readings·plant_messages·devices 쓰기는 서비스 롤(디바이스 API·시뮬레이터)만 한다.

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.plant_species enable row level security;
alter table public.devices enable row level security;
alter table public.plants enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.plant_messages enable row level security;
alter table public.care_events enable row level security;
alter table public.mood_entries enable row level security;
alter table public.consents enable row level security;
alter table public.org_notices enable row level security;

-- ---------- 헬퍼 ----------

create function public.is_staff_of(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'org_staff' and organization_id = org
  );
$$;

-- 현재 사용자가 기관 스태프로서 participant의 해당 항목을 볼 수 있는가
create function public.staff_can_see(participant uuid, item text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.consents c
    join public.profiles me on me.id = auth.uid()
    where c.user_id = participant
      and me.role = 'org_staff'
      and c.organization_id = me.organization_id
      and c.agreed_at is not null
      and c.revoked_at is null
      and case item
        when 'care' then c.share_care_activity
        when 'environment' then c.share_environment
        when 'mood' then c.share_mood
        else false
      end
  );
$$;

-- ---------- organizations ----------
create policy "members read own org" on public.organizations for select to authenticated
  using (id = (select organization_id from public.profiles where id = auth.uid()));

-- ---------- profiles ----------
create policy "read own profile" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "staff read org members" on public.profiles for select to authenticated
  using (public.is_staff_of(organization_id));
-- 본인은 이름만 수정 가능 (role·organization_id 변경 불가 — S-07)
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ---------- plant_species ----------
create policy "anyone signed in reads species" on public.plant_species for select to authenticated
  using (true);

-- ---------- devices ----------
create policy "owner reads device" on public.devices for select to authenticated
  using (owner_id = auth.uid());

-- ---------- plants ----------
-- 남의 디바이스를 내 식물에 연결하지 못하도록 device 소유도 확인한다
create policy "owner manages plants" on public.plants for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and (device_id is null or exists (select 1 from public.devices d where d.id = device_id and d.owner_id = auth.uid()))
  );
create policy "staff reads shared plants" on public.plants for select to authenticated
  using (public.staff_can_see(owner_id, 'care') or public.staff_can_see(owner_id, 'environment'));

-- ---------- sensor_readings ----------
create policy "owner reads readings" on public.sensor_readings for select to authenticated
  using (exists (select 1 from public.plants p where p.id = plant_id and p.owner_id = auth.uid()));
create policy "staff reads shared readings" on public.sensor_readings for select to authenticated
  using (exists (
    select 1 from public.plants p
    where p.id = plant_id and public.staff_can_see(p.owner_id, 'environment')
  ));

-- ---------- plant_messages ----------
create policy "owner reads messages" on public.plant_messages for select to authenticated
  using (exists (select 1 from public.plants p where p.id = plant_id and p.owner_id = auth.uid()));
create policy "owner marks read" on public.plant_messages for update to authenticated
  using (exists (select 1 from public.plants p where p.id = plant_id and p.owner_id = auth.uid()));
revoke update on public.plant_messages from authenticated;
grant update (is_read) on public.plant_messages to authenticated;

-- ---------- care_events ----------
create policy "owner manages care" on public.care_events for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.plants p where p.id = plant_id and p.owner_id = auth.uid())
  );
create policy "staff reads shared care" on public.care_events for select to authenticated
  using (public.staff_can_see(user_id, 'care'));

-- ---------- mood_entries ----------
create policy "owner manages mood" on public.mood_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff reads shared mood" on public.mood_entries for select to authenticated
  using (public.staff_can_see(user_id, 'mood'));

-- ---------- consents ----------
create policy "owner manages consent" on public.consents for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff reads org consents" on public.consents for select to authenticated
  using (public.is_staff_of(organization_id));

-- ---------- org_notices ----------
create policy "staff sends notice to consenting participant" on public.org_notices for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_staff_of(organization_id)
    and public.staff_can_see(recipient_id, 'care')
  );
create policy "staff reads org notices" on public.org_notices for select to authenticated
  using (public.is_staff_of(organization_id));
create policy "recipient reads notice" on public.org_notices for select to authenticated
  using (recipient_id = auth.uid());
