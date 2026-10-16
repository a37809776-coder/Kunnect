-- 플랜트커넥트 스키마 (design.md §3)

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'participant' check (role in ('participant', 'org_staff')),
  display_name text not null default '',
  organization_id uuid references public.organizations (id),
  created_at timestamptz not null default now()
);

create table public.plant_species (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  art text not null default 'leafy' check (art in ('leafy', 'succulent', 'vine')),
  care_guide text not null default '',
  moisture_min int not null,
  moisture_max int not null,
  temp_min numeric not null,
  temp_max numeric not null,
  light_min int not null,
  light_max int not null
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  serial text not null unique,
  token_hash text not null,
  pairing_code_hash text not null,
  is_virtual boolean not null default false,
  owner_id uuid references public.profiles (id) on delete set null,
  last_seen_at timestamptz,
  battery_level int
);

create table public.plants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  device_id uuid unique references public.devices (id) on delete set null,
  species_id uuid not null references public.plant_species (id),
  nickname text not null,
  created_at timestamptz not null default now()
);

create table public.sensor_readings (
  id bigint generated always as identity primary key,
  device_id uuid not null references public.devices (id) on delete cascade,
  plant_id uuid not null references public.plants (id) on delete cascade,
  soil_moisture int not null check (soil_moisture between 0 and 100),
  temperature numeric not null check (temperature between -10 and 60),
  light int not null check (light between 0 and 100000),
  measured_at timestamptz not null default now()
);
create index sensor_readings_plant_time on public.sensor_readings (plant_id, measured_at desc);

create table public.plant_messages (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  type text not null check (type in ('status', 'cheer', 'org_notice')),
  code text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index plant_messages_plant_time on public.plant_messages (plant_id, created_at desc);

create table public.care_events (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('water', 'move_light', 'check', 'other')),
  created_at timestamptz not null default now()
);
create index care_events_plant_time on public.care_events (plant_id, created_at desc);

create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  care_event_id uuid references public.care_events (id) on delete set null,
  emoji text not null check (emoji in ('😊', '🙂', '😐', '😔', '😣')),
  memo text check (char_length(memo) <= 100),
  created_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  share_care_activity boolean not null default false,
  share_environment boolean not null default false,
  share_mood boolean not null default false,
  agreed_at timestamptz,
  revoked_at timestamptz,
  unique (user_id, organization_id)
);

create table public.org_notices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

-- 가입 시 profiles 자동 생성 (역할은 항상 participant, 스태프 지정은 관리자가 SQL로)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
