-- NYL reception scanner: daily check-in and seat.
--   * One check-in per patient per day (the first scan of the day checks them in)
--   * Reception types the seat after the scan; a seat can't be given to two people on the same day
--   * Every scan is logged in the existing scan_events table
-- Run after 001, 002 and 003. Safe to run again.

create table if not exists daily_attendance (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references patients(id) on delete cascade,
  centre_id       smallint not null default 1 references centres(id),
  visit_date      date not null default (now() at time zone 'Asia/Kolkata')::date,
  seat            text,
  checked_in_at   timestamptz not null default now(),
  checked_in_by   uuid references staff_users(id),
  seat_set_at     timestamptz,
  seat_set_by     uuid references staff_users(id),
  unique (patient_id, visit_date)
);
create unique index if not exists daily_attendance_seat_key
  on daily_attendance (centre_id, visit_date, upper(seat)) where seat is not null;
create index if not exists daily_attendance_day_idx on daily_attendance (centre_id, visit_date);
alter table daily_attendance enable row level security;

-- Patient summary shown to reception after a scan
create or replace function _checkin_card(p_patient uuid, p_att uuid)
returns json language sql stable as $$
  select json_build_object(
    'attendance_id',     a.id,
    'seat',              a.seat,
    'checked_in_at',     a.checked_in_at,
    'patient_code',      p.patient_code,
    'full_name',         p.full_name,
    'dob',               p.dob,
    'gender',            p.gender,
    'city',              p.city,
    'guardian_name',     p.guardian_name,
    'guardian_relation', p.guardian_relation,
    'visit_count',       (select count(*) from daily_attendance d where d.patient_id = p.id),
    'registration_day',  s.slot_date,
    'payment_method',    g.payment_method,
    'payment_status',    g.payment_status,
    'amount_due',        case when g.patient_count > 0 then g.amount_due / g.patient_count end
  )
  from patients p
  join daily_attendance a on a.id = p_att
  left join lateral (select * from registrations x where x.patient_id = p.id order by x.created_at desc limit 1) r on true
  left join registration_slots s on s.id = r.slot_id
  left join registration_groups g on g.id = r.group_id
  where p.id = p_patient;
$$;

-- Scan a pass (or type a patient ID). Returns
--   { result: 'checked_in' | 'already' | 'not_found', patient: {...} }
create or replace function staff_check_in(p_code text, p_staff uuid, p_station text default null)
returns json
language plpgsql as $$
declare
  v_code    text := btrim(coalesce(p_code, ''));
  v_patient patients%rowtype;
  v_att     daily_attendance%rowtype;
  v_today   date := (now() at time zone 'Asia/Kolkata')::date;
  v_result  text;
begin
  -- Accept the pass QR ("NYLPASS:<token>"), an old pass link (".../p/<token>"),
  -- a bare token, or a patient ID typed by hand ("NYL1042")
  v_code := regexp_replace(v_code, '^NYLPASS:', '', 'i');
  v_code := regexp_replace(v_code, '^.*/p/([a-f0-9]{32}).*$', '\1');

  select * into v_patient from patients
   where pass_token = lower(v_code) or upper(patient_code) = upper(v_code)
   limit 1;

  if not found then
    insert into scan_events (qr_token, result, station_id, scanned_by)
    values (left(coalesce(p_code, ''), 200), 'not_found', p_station, p_staff);
    return json_build_object('result', 'not_found');
  end if;

  insert into daily_attendance (patient_id, centre_id, visit_date, checked_in_by)
  values (v_patient.id, coalesce(v_patient.centre_id, 1), v_today, p_staff)
  on conflict (patient_id, visit_date) do nothing
  returning * into v_att;

  if v_att.id is null then
    select * into v_att from daily_attendance where patient_id = v_patient.id and visit_date = v_today;
    v_result := 'already';
  else
    v_result := 'checked_in';
  end if;

  insert into scan_events (qr_token, result, station_id, scanned_by)
  values (v_patient.pass_token, v_result, p_station, p_staff);

  return json_build_object('result', v_result, 'patient', _checkin_card(v_patient.id, v_att.id));
end;
$$;

-- Save or change the seat for today's check-in. Raises SEAT_TAKEN or NOT_FOUND.
create or replace function staff_set_seat(p_attendance uuid, p_seat text, p_staff uuid)
returns json
language plpgsql as $$
declare
  v_att  daily_attendance%rowtype;
  v_seat text := nullif(upper(btrim(coalesce(p_seat, ''))), '');
begin
  begin
    update daily_attendance
       set seat = v_seat, seat_set_at = now(), seat_set_by = p_staff
     where id = p_attendance
    returning * into v_att;
  exception when unique_violation then
    raise exception 'SEAT_TAKEN';
  end;
  if v_att.id is null then raise exception 'NOT_FOUND'; end if;
  return _checkin_card(v_att.patient_id, v_att.id);
end;
$$;

-- Today's check-ins for the scanner screen, newest first
create or replace function staff_today_checkins(p_centre integer default 1)
returns json
language sql stable as $$
  select coalesce(json_agg(x order by x.checked_in_at desc), '[]'::json)
  from (
    select a.id as attendance_id, a.seat, a.checked_in_at, p.patient_code, p.full_name
      from daily_attendance a join patients p on p.id = a.patient_id
     where a.centre_id = p_centre and a.visit_date = (now() at time zone 'Asia/Kolkata')::date
  ) x;
$$;

revoke all on function _checkin_card(uuid, uuid) from public, anon, authenticated;
revoke all on function staff_check_in(text, uuid, text) from public, anon, authenticated;
revoke all on function staff_set_seat(uuid, text, uuid) from public, anon, authenticated;
revoke all on function staff_today_checkins(integer) from public, anon, authenticated;
grant execute on function _checkin_card(uuid, uuid) to service_role;
grant execute on function staff_check_in(text, uuid, text) to service_role;
grant execute on function staff_set_seat(uuid, text, uuid) to service_role;
grant execute on function staff_today_checkins(integer) to service_role;
