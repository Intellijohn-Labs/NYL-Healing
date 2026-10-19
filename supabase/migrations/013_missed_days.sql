-- NYL registration: a patient who missed their registered day can't register again online until the NYL team clears it
-- (by phone or when the patient visits).
--   * missed = the registration day has passed, the patient never checked in on that day or later, and nobody cleared it
--   * same patient = same WhatsApp number + same name (ignoring case and spaces) + same date of birth
-- Run after 001 to 012. Safe to run again.

alter table registrations add column if not exists missed_cleared_at timestamptz;
alter table registrations add column if not exists missed_cleared_by uuid references staff_users(id);
alter table registrations add column if not exists missed_note text;

create or replace function norm_name(t text) returns text language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g'));
$$;

-- Missed, not-yet-cleared registrations of one patient (latest first)
create or replace function patient_missed_days(p_patient uuid)
returns table (registration_id uuid, slot_date date)
language sql stable as $$
  select r.id, s.slot_date
    from registrations r
    join registration_slots s on s.id = r.slot_id
   where r.patient_id = p_patient
     and r.status in ('booked', 'no_show')
     and r.missed_cleared_at is null
     and s.slot_date < (now() at time zone 'Asia/Kolkata')::date
     and not exists (select 1 from daily_attendance a where a.patient_id = r.patient_id and a.visit_date >= s.slot_date)
   order by s.slot_date desc;
$$;

-- The latest missed day for someone registering through this link with this name and date of birth (null if none)
create or replace function missed_day_for(p_wa_phone text, p_name text, p_dob date)
returns date language sql stable as $$
  select max(m.slot_date)
    from patients p
    cross join lateral patient_missed_days(p.id) m
   where p.wa_phone = p_wa_phone and norm_name(p.full_name) = norm_name(p_name) and p.dob = p_dob;
$$;

-- For the form's early check, when the patient's details are entered
create or replace function check_missed_day(p_token text, p_name text, p_dob date)
returns date language sql stable as $$
  select missed_day_for(l.wa_phone, p_name, p_dob) from registration_links l where l.token = p_token and l.expires_at > now();
$$;

-- Registration: refuse a patient with a missed, uncleared day. Wraps the existing register_group (012).
-- Raises MISSED_DAY|<patient number from 1>|<YYYY-MM-DD>.
create or replace function register_group_checked(
  p_token          text,
  p_slot_id        uuid,
  p_payment_method text,
  p_fee            integer,
  p_language       lang_code,
  p_patients       jsonb
) returns json
language plpgsql as $$
declare
  v_phone text;
  v_p     jsonb;
  v_i     integer := 0;
  v_dob   date;
  v_day   date;
begin
  select wa_phone into v_phone from registration_links where token = p_token;
  if v_phone is not null and jsonb_typeof(p_patients) = 'array' then
    for v_p in select * from jsonb_array_elements(p_patients) loop
      v_i := v_i + 1;
      begin v_dob := (v_p->>'dob')::date; exception when others then v_dob := null; end;
      if v_dob is not null then
        v_day := missed_day_for(v_phone, v_p->>'full_name', v_dob);
        if v_day is not null then
          raise exception 'MISSED_DAY|%|%', v_i, v_day;
        end if;
      end if;
    end loop;
  end if;
  return register_group(p_token, p_slot_id, p_payment_method, p_fee, p_language, p_patients);
end;
$$;

-- Staff: allow the patient to register again (clears all their missed days), with an optional note
create or replace function staff_clear_missed(p_code text, p_staff uuid, p_note text)
returns integer language plpgsql as $$
declare v_pid uuid; n integer;
begin
  select id into v_pid from patients where upper(patient_code) = upper(btrim(coalesce(p_code, '')));
  if v_pid is null then raise exception 'NOT_FOUND'; end if;
  with u as (
    update registrations r set missed_cleared_at = now(), missed_cleared_by = p_staff,
           missed_note = nullif(btrim(coalesce(p_note, '')), ''), status = case when r.status = 'booked' then 'no_show' else r.status end
     where r.id in (select registration_id from patient_missed_days(v_pid))
    returning r.id
  )
  select count(*) into n from u;
  if n > 0 then
    insert into action_log (patient_id, module, action, actor_type, actor_id, details)
    values (v_pid, 'intake', 'missed_day_cleared', 'staff', p_staff::text,
            jsonb_build_object('registrations', n, 'note', nullif(btrim(coalesce(p_note, '')), '')));
  end if;
  return n;
end;
$$;

-- Patient details: as in 009, plus missed / cleared information on each registration
create or replace function staff_patient_detail(p_code text)
returns json
language sql stable as $$
  select json_build_object(
    'patient_code', p.patient_code, 'full_name', p.full_name, 'dob', p.dob, 'gender', p.gender, 'city', p.city,
    'designation', p.designation,
    'wa_phone', p.wa_phone, 'language', p.language, 'source_channel', p.source_channel, 'created_at', p.created_at,
    'guardian_name', p.guardian_name, 'guardian_relation', p.guardian_relation, 'guardian_phone', p.guardian_phone,
    'pass_token', p.pass_token,
    'missed_open', (select count(*) from patient_missed_days(p.id)),
    'health', (select json_build_object('health_concerns', h.health_concerns, 'diseases', h.diseases, 'diseases_other', h.diseases_other,
                                        'current_medicines', h.current_medicines, 'other_notes', h.other_notes)
                 from patient_health h where h.patient_id = p.id),
    'registrations', coalesce((select json_agg(json_build_object(
                       'slot_date', s.slot_date, 'starts_at', s.starts_at, 'registering_for', r.registering_for, 'status', r.status,
                       'group_id', g.id, 'group_size', g.patient_count, 'payment_method', g.payment_method,
                       'payment_status', g.payment_status, 'amount_due', g.amount_due, 'paid_at', g.paid_at,
                       'missed', exists (select 1 from patient_missed_days(p.id) m where m.registration_id = r.id),
                       'missed_cleared_at', r.missed_cleared_at,
                       'missed_cleared_by', (select name from staff_users su where su.id = r.missed_cleared_by),
                       'missed_note', r.missed_note) order by r.created_at desc)
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

revoke all on function register_group_checked(text, uuid, text, integer, lang_code, jsonb) from public, anon, authenticated;
revoke all on function check_missed_day(text, text, date) from public, anon, authenticated;
revoke all on function staff_clear_missed(text, uuid, text) from public, anon, authenticated;
revoke all on function staff_patient_detail(text) from public, anon, authenticated;
grant execute on function register_group_checked(text, uuid, text, integer, lang_code, jsonb) to service_role;
grant execute on function check_missed_day(text, text, date) to service_role;
grant execute on function staff_clear_missed(text, uuid, text) to service_role;
grant execute on function staff_patient_detail(text) to service_role;

-- Patient search (as in 009), plus whether the patient has a missed, uncleared day
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
           (select max(visit_date) from daily_attendance d where d.patient_id = p.id) as last_visit,
           exists (select 1 from patient_missed_days(p.id)) as missed
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
revoke all on function staff_search_patients(text, text) from public, anon, authenticated;
grant execute on function staff_search_patients(text, text) to service_role;
