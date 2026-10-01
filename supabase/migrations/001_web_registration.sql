-- NYL web registration: registration days, personal links, registrations, health details.
-- Safe to run once on the existing NYL Supabase database. Only adds new objects.

-- 1. Registration days, added by the hospital team (admin page later; SQL for now)
create table if not exists registration_slots (
  id          uuid primary key default gen_random_uuid(),
  centre_id   smallint not null default 1 references centres(id),
  slot_date   date not null,
  starts_at   time,                         -- class start time, e.g. 09:00
  capacity    integer not null check (capacity > 0),
  note        text,
  status      text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  created_at  timestamptz not null default now(),
  unique (centre_id, slot_date)
);

-- 2. Personal registration links, created by the WhatsApp bot (n8n)
--    The link carries the sender's WhatsApp number, so patients never type it.
--    A link can be used several times until it expires (e.g. to register family members).
create table if not exists registration_links (
  token         text primary key default encode(gen_random_bytes(18), 'hex'),
  wa_phone      text not null,
  language      lang_code not null default 'en',
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '72 hours',
  last_used_at  timestamptz
);
create index if not exists registration_links_phone_idx on registration_links (wa_phone);

-- 3. Which patient registered for which day
create table if not exists registrations (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  slot_id     uuid not null references registration_slots(id),
  link_token  text references registration_links(token) on delete set null,
  status      text not null default 'booked' check (status in ('booked', 'attended', 'no_show', 'cancelled')),
  created_at  timestamptz not null default now(),
  unique (patient_id, slot_id)
);
create index if not exists registrations_slot_idx on registrations (slot_id) where status = 'booked';

-- 4. Health details, kept apart from the patients table because they are sensitive
create table if not exists patient_health (
  patient_id         uuid primary key references patients(id) on delete cascade,
  health_concerns    text not null,
  current_medicines  text,
  other_notes        text,
  consent_at         timestamptz not null,
  updated_at         timestamptz not null default now()
);

-- Row level security on, no policies: only the server (service role key) can read or write.
alter table registration_slots  enable row level security;
alter table registration_links  enable row level security;
alter table registrations       enable row level security;
alter table patient_health      enable row level security;

-- Open registration days with places left (India time decides what "today" is)
create or replace function available_registration_slots(p_centre integer default 1)
returns table (id uuid, slot_date date, starts_at time, capacity integer, booked integer, remaining integer)
language sql stable as $$
  select s.id, s.slot_date, s.starts_at, s.capacity,
         count(r.id)::integer as booked,
         greatest(s.capacity - count(r.id), 0)::integer as remaining
    from registration_slots s
    left join registrations r on r.slot_id = s.id and r.status = 'booked'
   where s.centre_id = p_centre
     and s.status = 'open'
     and s.slot_date >= (now() at time zone 'Asia/Kolkata')::date
   group by s.id
   order by s.slot_date
   limit 8;
$$;

-- Save one registration in a single transaction.
-- Raises LINK_INVALID, SLOT_CLOSED, SLOT_FULL, GUARDIAN_REQUIRED or INVALID_INPUT on failure.
create or replace function register_patient(
  p_token             text,
  p_slot_id           uuid,
  p_full_name         text,
  p_dob               date,
  p_gender            text,
  p_city              text,
  p_guardian_name     text,
  p_guardian_relation text,
  p_guardian_phone    text,
  p_health_concerns   text,
  p_current_medicines text,
  p_other_notes       text,
  p_language          lang_code
) returns json
language plpgsql as $$
declare
  v_link     registration_links%rowtype;
  v_slot     registration_slots%rowtype;
  v_booked   integer;
  v_minor    boolean;
  v_patient  patients%rowtype;
begin
  select * into v_link from registration_links where token = p_token for update;
  if not found or v_link.expires_at < now() then
    raise exception 'LINK_INVALID';
  end if;

  if coalesce(btrim(p_full_name), '') = '' or coalesce(btrim(p_health_concerns), '') = ''
     or p_dob is null or p_dob > current_date or p_dob < date '1900-01-01'
     or p_gender not in ('male', 'female', 'other') then
    raise exception 'INVALID_INPUT';
  end if;

  -- Lock the day so two people can't take the last place at the same time
  select * into v_slot from registration_slots where id = p_slot_id for update;
  if not found or v_slot.status <> 'open'
     or v_slot.slot_date < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'SLOT_CLOSED';
  end if;

  select count(*) into v_booked from registrations where slot_id = v_slot.id and status = 'booked';
  if v_booked >= v_slot.capacity then
    raise exception 'SLOT_FULL';
  end if;

  v_minor := p_dob > (current_date - interval '18 years');
  if v_minor and (coalesce(btrim(p_guardian_name), '') = '' or coalesce(btrim(p_guardian_relation), '') = '') then
    raise exception 'GUARDIAN_REQUIRED';
  end if;

  insert into patients (wa_phone, full_name, dob, gender, language, centre_id, city,
                        guardian_name, guardian_relation, guardian_phone, guardian_consent_at, source_channel)
  values (v_link.wa_phone, btrim(p_full_name), p_dob, p_gender, p_language, v_slot.centre_id,
          nullif(btrim(p_city), ''),
          case when v_minor then btrim(p_guardian_name) end,
          case when v_minor then btrim(p_guardian_relation) end,
          case when v_minor then nullif(btrim(p_guardian_phone), '') end,
          case when v_minor then now() end,
          'web')
  returning * into v_patient;

  insert into patient_health (patient_id, health_concerns, current_medicines, other_notes, consent_at)
  values (v_patient.id, btrim(p_health_concerns),
          nullif(btrim(p_current_medicines), ''), nullif(btrim(p_other_notes), ''), now());

  insert into registrations (patient_id, slot_id, link_token)
  values (v_patient.id, v_slot.id, v_link.token);

  update registration_links set last_used_at = now() where token = v_link.token;

  return json_build_object(
    'patient_code', v_patient.patient_code,
    'slot_date',    v_slot.slot_date,
    'starts_at',    v_slot.starts_at
  );
end;
$$;

-- Only the server may call these
revoke all on function available_registration_slots(integer) from public, anon, authenticated;
revoke all on function register_patient(text, uuid, text, date, text, text, text, text, text, text, text, text, lang_code)
  from public, anon, authenticated;
grant execute on function available_registration_slots(integer) to service_role;
grant execute on function register_patient(text, uuid, text, date, text, text, text, text, text, text, text, text, lang_code)
  to service_role;
