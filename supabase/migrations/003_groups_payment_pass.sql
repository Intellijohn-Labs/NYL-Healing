-- NYL web registration, part 3:
--   * several patients in one registration (a family), booked together for one day
--   * payment choice (pay at reception / online), stored per group
--   * a permanent, unguessable pass token per patient for the daily attendance QR code
-- Run after 001 and 002. Safe to run again.

-- 1. Pass token: the QR code on the patient pass holds this, never the patient ID.
--    Existing patients get their own random token too.
alter table patients
  add column if not exists pass_token text not null default encode(gen_random_bytes(16), 'hex');
create unique index if not exists patients_pass_token_key on patients (pass_token);

-- 2. One row per form submission (1 to 5 patients)
create table if not exists registration_groups (
  id              uuid primary key default gen_random_uuid(),
  link_token      text references registration_links(token) on delete set null,
  slot_id         uuid not null references registration_slots(id),
  patient_count   integer not null check (patient_count between 1 and 5),
  payment_method  text not null check (payment_method in ('offline', 'online')),
  payment_status  text not null default 'pending' check (payment_status in ('pending', 'paid', 'waived', 'refunded')),
  amount_due      integer not null check (amount_due >= 0),   -- rupees
  created_at      timestamptz not null default now()
);
alter table registration_groups enable row level security;

alter table registrations add column if not exists group_id uuid references registration_groups(id) on delete set null;
create index if not exists registrations_group_idx on registrations (group_id);

-- 3. Register 1 to 5 patients for one day in a single transaction.
--    p_patients is a JSON array; each item has:
--      registering_for, full_name, dob (YYYY-MM-DD), gender, city,
--      guardian_name, guardian_relation, guardian_phone, guardian_consent (bool),
--      health_concerns, current_medicines, other_notes
--    Raises LINK_INVALID, SLOT_CLOSED, SLOT_FULL, GUARDIAN_REQUIRED or INVALID_INPUT.
create or replace function register_group(
  p_token          text,
  p_slot_id        uuid,
  p_payment_method text,
  p_fee            integer,
  p_language       lang_code,
  p_patients       jsonb
) returns json
language plpgsql as $$
declare
  v_link    registration_links%rowtype;
  v_slot    registration_slots%rowtype;
  v_count   integer;
  v_booked  integer;
  v_group   uuid;
  v_p       jsonb;
  v_dob     date;
  v_minor   boolean;
  v_patient patients%rowtype;
  v_out     jsonb := '[]'::jsonb;
begin
  select * into v_link from registration_links where token = p_token for update;
  if not found or v_link.expires_at < now() then
    raise exception 'LINK_INVALID';
  end if;

  if jsonb_typeof(p_patients) <> 'array' then raise exception 'INVALID_INPUT'; end if;
  v_count := jsonb_array_length(p_patients);
  if v_count < 1 or v_count > 5
     or p_payment_method not in ('offline', 'online')
     or p_fee is null or p_fee < 0 then
    raise exception 'INVALID_INPUT';
  end if;

  -- Check every patient before saving anything
  for v_p in select * from jsonb_array_elements(p_patients) loop
    begin
      v_dob := (v_p->>'dob')::date;
    exception when others then
      raise exception 'INVALID_INPUT';
    end;
    if coalesce(btrim(v_p->>'full_name'), '') = '' or coalesce(btrim(v_p->>'health_concerns'), '') = ''
       or coalesce(btrim(v_p->>'city'), '') = ''
       or v_dob is null or v_dob > current_date or v_dob < date '1900-01-01'
       or coalesce(v_p->>'gender', '') not in ('male', 'female', 'other')
       or coalesce(v_p->>'registering_for', '') not in ('self', 'child', 'parent', 'spouse', 'other') then
      raise exception 'INVALID_INPUT';
    end if;
    v_minor := v_dob > (current_date - interval '18 years');
    if v_minor and (
         coalesce(btrim(v_p->>'guardian_name'), '') = ''
      or coalesce(btrim(v_p->>'guardian_relation'), '') = ''
      or length(regexp_replace(coalesce(v_p->>'guardian_phone', ''), '\D', '', 'g')) < 10
      or coalesce((v_p->>'guardian_consent')::boolean, false) = false) then
      raise exception 'GUARDIAN_REQUIRED';
    end if;
  end loop;

  -- Lock the day so two families can't take the same last places
  select * into v_slot from registration_slots where id = p_slot_id for update;
  if not found or v_slot.status <> 'open'
     or v_slot.slot_date < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'SLOT_CLOSED';
  end if;
  select count(*) into v_booked from registrations where slot_id = v_slot.id and status = 'booked';
  if v_booked + v_count > v_slot.capacity then
    raise exception 'SLOT_FULL';
  end if;

  insert into registration_groups (link_token, slot_id, patient_count, payment_method, amount_due)
  values (v_link.token, v_slot.id, v_count, p_payment_method, p_fee * v_count)
  returning id into v_group;

  for v_p in select * from jsonb_array_elements(p_patients) loop
    v_dob := (v_p->>'dob')::date;
    v_minor := v_dob > (current_date - interval '18 years');

    insert into patients (wa_phone, full_name, dob, gender, language, centre_id, city,
                          guardian_name, guardian_relation, guardian_phone, guardian_consent_at, source_channel)
    values (v_link.wa_phone, btrim(v_p->>'full_name'), v_dob, v_p->>'gender', p_language, v_slot.centre_id,
            btrim(v_p->>'city'),
            case when v_minor then btrim(v_p->>'guardian_name') end,
            case when v_minor then btrim(v_p->>'guardian_relation') end,
            case when v_minor then btrim(v_p->>'guardian_phone') end,
            case when v_minor then now() end,
            'web')
    returning * into v_patient;

    insert into patient_health (patient_id, health_concerns, current_medicines, other_notes, consent_at)
    values (v_patient.id, btrim(v_p->>'health_concerns'),
            nullif(btrim(v_p->>'current_medicines'), ''), nullif(btrim(v_p->>'other_notes'), ''), now());

    insert into registrations (patient_id, slot_id, link_token, registering_for, group_id)
    values (v_patient.id, v_slot.id, v_link.token, v_p->>'registering_for', v_group);

    v_out := v_out || jsonb_build_object(
      'patient_code',      v_patient.patient_code,
      'pass_token',        v_patient.pass_token,
      'full_name',         v_patient.full_name,
      'dob',               v_patient.dob,
      'gender',            v_patient.gender,
      'city',              v_patient.city,
      'registering_for',   v_p->>'registering_for',
      'guardian_name',     v_patient.guardian_name,
      'guardian_relation', v_patient.guardian_relation
    );
  end loop;

  update registration_links set last_used_at = now() where token = v_link.token;

  return json_build_object(
    'slot_date',      v_slot.slot_date,
    'starts_at',      v_slot.starts_at,
    'issued_at',      now(),
    'payment_method', p_payment_method,
    'amount_due',     p_fee * v_count,
    'patients',       v_out
  );
end;
$$;

-- 4. Everything the pass page needs, looked up by the pass token
create or replace function get_patient_pass(p_pass_token text)
returns json
language sql stable as $$
  select json_build_object(
    'patient_code',      p.patient_code,
    'pass_token',        p.pass_token,
    'full_name',         p.full_name,
    'dob',               p.dob,
    'gender',            p.gender,
    'city',              p.city,
    'registering_for',   r.registering_for,
    'guardian_name',     p.guardian_name,
    'guardian_relation', p.guardian_relation,
    'slot_date',         s.slot_date,
    'starts_at',         s.starts_at,
    'issued_at',         r.created_at
  )
  from patients p
  left join lateral (
    select * from registrations x where x.patient_id = p.id order by x.created_at desc limit 1
  ) r on true
  left join registration_slots s on s.id = r.slot_id
  where p.pass_token = p_pass_token;
$$;

revoke all on function register_group(text, uuid, text, integer, lang_code, jsonb) from public, anon, authenticated;
revoke all on function get_patient_pass(text) from public, anon, authenticated;
grant execute on function register_group(text, uuid, text, integer, lang_code, jsonb) to service_role;
grant execute on function get_patient_pass(text) to service_role;
