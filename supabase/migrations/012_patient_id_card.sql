-- NYL registration: identity card photo for every patient aged 15 or over (front side only).
--   * the photo is in the PRIVATE storage bucket `patient-ids` (never public)
--   * patients.id_card_url = the NYL staff-app link (e.g. https://…/staff/id/NYL1042), which only signed-in reception and owner can open
--   * the photo is deleted 2 days after the registration day, or right after reception taps "ID verified"
--     (the record of the ID type and who verified it is kept)
-- Run after 001 to 011. Safe to run again.

insert into storage.buckets (id, name, public)
values ('patient-ids', 'patient-ids', false)
on conflict (id) do update set public = false;

alter table patients add column if not exists id_type        text;
alter table patients add column if not exists id_doc_path    text;
alter table patients add column if not exists id_card_url    text;
alter table patients add column if not exists id_uploaded_at timestamptz;
alter table patients add column if not exists id_verified_at timestamptz;
alter table patients add column if not exists id_verified_by uuid references staff_users(id);
alter table patients add column if not exists id_deleted_at  timestamptz;
do $$ begin
  alter table patients add constraint patients_id_type_check
    check (id_type is null or id_type in ('aadhaar', 'voter', 'passport', 'driving', 'pan', 'emirates', 'other'));
exception when duplicate_object then null; end $$;

-- The staff app's address, used to build id_card_url. Change it when NYL moves to its own domain.
insert into settings (key, value) values ('site_url', '"https://nyl-healing-esep.vercel.app"'::jsonb)
on conflict (key) do nothing;

-- Registration: as in 009, plus the ID card for patients aged 15+.
-- The ID is required when the form sends id_type (the new form always does); the older form without the ID
-- section is still accepted during the changeover.
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
  v_needs_id boolean;
  v_dis     text[];
  v_patient patients%rowtype;
  v_site    text := coalesce((select value #>> '{}' from settings where key = 'site_url'), 'https://nyl-healing-esep.vercel.app');
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
      v_dis := array(select jsonb_array_elements_text(coalesce(v_p->'diseases', '[]'::jsonb)));
    exception when others then
      raise exception 'INVALID_INPUT';
    end;
    if coalesce(btrim(v_p->>'full_name'), '') = ''
       or coalesce(btrim(v_p->>'city'), '') = ''
       or v_dob is null or v_dob > current_date or v_dob < date '1900-01-01'
       or coalesce(v_p->>'gender', '') not in ('male', 'female', 'other')
       or coalesce(v_p->>'registering_for', '') not in ('self', 'child', 'parent', 'spouse', 'other')
       or (cardinality(v_dis) = 0 and coalesce(btrim(v_p->>'health_concerns'), '') = '')
       or not (v_dis <@ disease_codes())
       or ('other' = any(v_dis) and coalesce(btrim(v_p->>'diseases_other'), '') = '') then
      raise exception 'INVALID_INPUT';
    end if;
    -- Identity card: required from 15 years; the photo must be one uploaded through this registration link
    v_needs_id := v_dob <= (current_date - interval '15 years');
    if v_needs_id and v_p ? 'id_type' and (
         coalesce(v_p->>'id_type', '') not in ('aadhaar', 'voter', 'passport', 'driving', 'pan', 'emirates', 'other')
      or coalesce(v_p->>'id_path', '') not like 'pending/' || v_link.token || '/%') then
      raise exception 'ID_REQUIRED';
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
    v_needs_id := v_dob <= (current_date - interval '15 years') and coalesce(v_p->>'id_path', '') <> '';
    v_dis := array(select distinct jsonb_array_elements_text(coalesce(v_p->'diseases', '[]'::jsonb)));

    insert into patients (wa_phone, full_name, dob, gender, language, centre_id, city, designation,
                          guardian_name, guardian_relation, guardian_phone, guardian_consent_at, source_channel,
                          id_type, id_doc_path, id_uploaded_at)
    values (v_link.wa_phone, btrim(v_p->>'full_name'), v_dob, v_p->>'gender', p_language, v_slot.centre_id,
            btrim(v_p->>'city'), nullif(btrim(coalesce(v_p->>'designation', '')), ''),
            case when v_minor then btrim(v_p->>'guardian_name') end,
            case when v_minor then btrim(v_p->>'guardian_relation') end,
            case when v_minor then btrim(v_p->>'guardian_phone') end,
            case when v_minor then now() end,
            'web',
            case when v_needs_id then v_p->>'id_type' end,
            case when v_needs_id then v_p->>'id_path' end,
            case when v_needs_id then now() end)
    returning * into v_patient;

    -- The link staff use to open the ID photo (only signed-in reception and owner can see it)
    if v_needs_id then
      update patients set id_card_url = rtrim(v_site, '/') || '/staff/id/' || v_patient.patient_code
       where id = v_patient.id;
    end if;

    insert into patient_health (patient_id, health_concerns, diseases, diseases_other, current_medicines, other_notes, consent_at)
    values (v_patient.id, coalesce(btrim(v_p->>'health_concerns'), ''), v_dis,
            case when 'other' = any(v_dis) then btrim(v_p->>'diseases_other') end,
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

-- Reception taps "ID verified": record who and when. The app then deletes the photo file and calls staff_id_deleted.
create or replace function staff_verify_id(p_code text, p_staff uuid)
returns json language plpgsql as $$
declare v patients%rowtype;
begin
  select * into v from patients where upper(patient_code) = upper(btrim(coalesce(p_code, ''))) for update;
  if v.id is null then raise exception 'NOT_FOUND'; end if;
  if v.id_verified_at is null then
    update patients set id_verified_at = now(), id_verified_by = p_staff where id = v.id returning * into v;
    insert into action_log (patient_id, module, action, actor_type, actor_id, details)
    values (v.id, 'intake', 'id_verified', 'staff', p_staff::text, jsonb_build_object('id_type', v.id_type));
  end if;
  return json_build_object('patient_code', v.patient_code, 'id_doc_path', case when v.id_deleted_at is null then v.id_doc_path end);
end;
$$;

-- After the photo file is removed from storage
create or replace function staff_id_deleted(p_code text, p_reason text)
returns void language sql as $$
  with u as (
    update patients set id_deleted_at = now()
     where upper(patient_code) = upper(btrim(coalesce(p_code, ''))) and id_deleted_at is null and id_doc_path is not null
    returning id
  )
  insert into action_log (patient_id, module, action, actor_type, actor_id, details)
  select u.id, 'intake', 'id_photo_deleted', 'system', 'id-cleanup', jsonb_build_object('reason', p_reason) from u;
$$;

-- What the ID page and the patient page show
create or replace function staff_id_card(p_code text)
returns json language sql stable as $$
  select json_build_object(
    'patient_code', p.patient_code, 'full_name', p.full_name, 'dob', p.dob,
    'id_type', p.id_type, 'id_doc_path', p.id_doc_path, 'id_card_url', p.id_card_url,
    'id_uploaded_at', p.id_uploaded_at, 'id_verified_at', p.id_verified_at, 'id_deleted_at', p.id_deleted_at,
    'verified_by', (select name from staff_users s where s.id = p.id_verified_by),
    'needs_id', p.dob is not null and p.dob <= (current_date - interval '15 years'),
    'next_visit', (select min(s.slot_date) from registrations r join registration_slots s on s.id = r.slot_id
                    where r.patient_id = p.id and r.status = 'booked' and s.slot_date >= (now() at time zone 'Asia/Kolkata')::date)
  )
  from patients p
  where upper(p.patient_code) = upper(btrim(coalesce(p_code, '')));
$$;

revoke all on function register_group(text, uuid, text, integer, lang_code, jsonb) from public, anon, authenticated;
revoke all on function staff_verify_id(text, uuid) from public, anon, authenticated;
revoke all on function staff_id_deleted(text, text) from public, anon, authenticated;
revoke all on function staff_id_card(text) from public, anon, authenticated;
grant execute on function register_group(text, uuid, text, integer, lang_code, jsonb) to service_role;
grant execute on function staff_verify_id(text, uuid) to service_role;
grant execute on function staff_id_deleted(text, text) to service_role;
grant execute on function staff_id_card(text) to service_role;
