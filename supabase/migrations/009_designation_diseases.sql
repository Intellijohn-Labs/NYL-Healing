-- NYL registration: optional designation, and diseases as multiple choice (same options as NYL's Google Form),
-- so reception can find patients by disease.
-- Run after 001 to 008. Safe to run again.
alter table patients       add column if not exists designation text;
alter table patient_health add column if not exists diseases text[] not null default '{}';
alter table patient_health add column if not exists diseases_other text;
create index if not exists patient_health_diseases_idx on patient_health using gin (diseases);

-- The disease options (codes). The labels in each language live in the app (lib/diseases.ts).
-- To add an option later: add its code here and in lib/diseases.ts.
create or replace function disease_codes()
returns text[] language sql immutable as $$
  select array['heart','kidney','liver','stomach','lungs','cholesterol','bp','diabetes','neck_pain','back_pain',
               'shoulder_pain','stroke','parkinsons','mental','eye','thyroid','cancer','other']::text[];
$$;

-- Registration: same as before, plus designation (optional), diseases (at least one; "other" needs its text),
-- and the free-text health details now optional.
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
  v_dis     text[];
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
      v_dis := array(select jsonb_array_elements_text(coalesce(v_p->'diseases', '[]'::jsonb)));
    exception when others then
      raise exception 'INVALID_INPUT';
    end;
    if coalesce(btrim(v_p->>'full_name'), '') = ''
       or coalesce(btrim(v_p->>'city'), '') = ''
       or v_dob is null or v_dob > current_date or v_dob < date '1900-01-01'
       or coalesce(v_p->>'gender', '') not in ('male', 'female', 'other')
       or coalesce(v_p->>'registering_for', '') not in ('self', 'child', 'parent', 'spouse', 'other')
       -- at least one disease ticked (the older form, without the tick boxes, sends only the written health problems)
       or (cardinality(v_dis) = 0 and coalesce(btrim(v_p->>'health_concerns'), '') = '')
       or not (v_dis <@ disease_codes())
       or ('other' = any(v_dis) and coalesce(btrim(v_p->>'diseases_other'), '') = '') then
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
    v_dis := array(select distinct jsonb_array_elements_text(v_p->'diseases'));

    insert into patients (wa_phone, full_name, dob, gender, language, centre_id, city, designation,
                          guardian_name, guardian_relation, guardian_phone, guardian_consent_at, source_channel)
    values (v_link.wa_phone, btrim(v_p->>'full_name'), v_dob, v_p->>'gender', p_language, v_slot.centre_id,
            btrim(v_p->>'city'), nullif(btrim(coalesce(v_p->>'designation', '')), ''),
            case when v_minor then btrim(v_p->>'guardian_name') end,
            case when v_minor then btrim(v_p->>'guardian_relation') end,
            case when v_minor then btrim(v_p->>'guardian_phone') end,
            case when v_minor then now() end,
            'web')
    returning * into v_patient;

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

-- Patient search: by name / patient ID / phone, and/or by disease
drop function if exists staff_search_patients(text);
create or replace function staff_search_patients(p_q text, p_disease text default null)
returns json
language sql stable as $$
  with q as (
    select btrim(coalesce(p_q, '')) as t,
           regexp_replace(coalesce(p_q, ''), '\D', '', 'g') as digits,
           nullif(btrim(coalesce(p_disease, '')), '') as dis
  )
  select coalesce(json_agg(x), '[]'::json) from (
    select p.patient_code, p.full_name, p.dob, p.gender, p.city, p.wa_phone, p.designation,
           coalesce(h.diseases, '{}') as diseases,
           (select max(visit_date) from daily_attendance d where d.patient_id = p.id) as last_visit
      from patients p
      left join patient_health h on h.patient_id = p.id
      cross join q
     where (length(q.t) >= 2 or q.dis is not null)
       and (q.dis is null or h.diseases @> array[q.dis])
       and (length(q.t) < 2 or
            upper(p.patient_code) = upper(q.t)
         or p.full_name ilike '%' || q.t || '%'
         or (length(q.digits) >= 4 and (regexp_replace(coalesce(p.wa_phone, ''), '\D', '', 'g') like '%' || q.digits || '%'
                                     or regexp_replace(coalesce(p.guardian_phone, ''), '\D', '', 'g') like '%' || q.digits || '%')))
     order by (upper(p.patient_code) = upper(q.t)) desc, p.full_name
     limit 100
  ) x;
$$;

-- Patient details: now also designation and diseases
create or replace function staff_patient_detail(p_code text)
returns json
language sql stable as $$
  select json_build_object(
    'patient_code', p.patient_code, 'full_name', p.full_name, 'dob', p.dob, 'gender', p.gender, 'city', p.city,
    'designation', p.designation,
    'wa_phone', p.wa_phone, 'language', p.language, 'source_channel', p.source_channel, 'created_at', p.created_at,
    'guardian_name', p.guardian_name, 'guardian_relation', p.guardian_relation, 'guardian_phone', p.guardian_phone,
    'pass_token', p.pass_token,
    'health', (select json_build_object('health_concerns', h.health_concerns, 'diseases', h.diseases, 'diseases_other', h.diseases_other,
                                        'current_medicines', h.current_medicines, 'other_notes', h.other_notes)
                 from patient_health h where h.patient_id = p.id),
    'registrations', coalesce((select json_agg(json_build_object(
                       'slot_date', s.slot_date, 'starts_at', s.starts_at, 'registering_for', r.registering_for, 'status', r.status,
                       'group_id', g.id, 'group_size', g.patient_count, 'payment_method', g.payment_method,
                       'payment_status', g.payment_status, 'amount_due', g.amount_due, 'paid_at', g.paid_at) order by r.created_at desc)
                       from registrations r
                       join registration_slots s on s.id = r.slot_id
                       left join registration_groups g on g.id = r.group_id
                      where r.patient_id = p.id), '[]'::json),
    'visits', coalesce((select json_agg(json_build_object('visit_date', a.visit_date, 'seat', a.seat, 'checked_in_at', a.checked_in_at)
                        order by a.visit_date desc) from daily_attendance a where a.patient_id = p.id), '[]'::json)
  )
  from patients p
  where upper(p.patient_code) = upper(btrim(coalesce(p_code, '')));
$$;

revoke all on function register_group(text, uuid, text, integer, lang_code, jsonb) from public, anon, authenticated;
revoke all on function staff_search_patients(text, text) from public, anon, authenticated;
revoke all on function staff_patient_detail(text) from public, anon, authenticated;
grant execute on function register_group(text, uuid, text, integer, lang_code, jsonb) to service_role;
grant execute on function staff_search_patients(text, text) to service_role;
grant execute on function staff_patient_detail(text) to service_role;
grant execute on function disease_codes() to service_role;
