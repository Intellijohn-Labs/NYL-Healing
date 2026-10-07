-- NYL receptionist app, part 2:
--   * hall seats (so reception picks from real, free seats)
--   * marking the registration fee as paid
--   * bookings for a registration day, patient search and details
--   * managing registration days
-- Run after 001 to 004. Safe to run again.

-- ---------- Hall seats ----------
create table if not exists hall_seats (
  id          bigserial primary key,
  centre_id   smallint not null default 1 references centres(id),
  label       text not null,          -- e.g. B-14
  row_label   text not null,          -- e.g. B
  sort_order  integer not null,
  active      boolean not null default true
);
create unique index if not exists hall_seats_label_key on hall_seats (centre_id, upper(label));
alter table hall_seats enable row level security;

-- Set the hall layout: rows and seats per row, e.g.
--   select set_hall_layout(1, array['A','B','C','D','E','F','G','H','I','J'], 10);   -- A-1 ... J-10
-- Seats no longer in the layout are switched off (not deleted), so past records stay readable.
create or replace function set_hall_layout(p_centre integer, p_rows text[], p_per_row integer)
returns integer
language plpgsql as $$
declare
  r text; n integer; i integer := 0;
begin
  if p_per_row < 1 or p_per_row > 200 or coalesce(array_length(p_rows, 1), 0) = 0 then
    raise exception 'INVALID_LAYOUT';
  end if;
  update hall_seats set active = false where centre_id = p_centre;
  foreach r in array p_rows loop
    for n in 1..p_per_row loop
      i := i + 1;
      insert into hall_seats (centre_id, label, row_label, sort_order, active)
      values (p_centre, upper(btrim(r)) || '-' || n, upper(btrim(r)), i, true)
      on conflict (centre_id, upper(label))
      do update set row_label = excluded.row_label, sort_order = excluded.sort_order, active = true;
    end loop;
  end loop;
  return i;
end;
$$;

-- Free seats today, in hall order
create or replace function staff_free_seats(p_centre integer default 1)
returns json
language sql stable as $$
  select coalesce(json_agg(json_build_object('label', s.label, 'row', s.row_label) order by s.sort_order), '[]'::json)
  from hall_seats s
  where s.centre_id = p_centre and s.active
    and not exists (
      select 1 from daily_attendance a
       where a.centre_id = s.centre_id
         and a.visit_date = (now() at time zone 'Asia/Kolkata')::date
         and upper(a.seat) = upper(s.label));
$$;

-- Seat saving now also checks the seat exists, once a hall layout has been set
create or replace function staff_set_seat(p_attendance uuid, p_seat text, p_staff uuid)
returns json
language plpgsql as $$
declare
  v_att  daily_attendance%rowtype;
  v_seat text := nullif(upper(btrim(coalesce(p_seat, ''))), '');
  v_centre smallint;
begin
  select centre_id into v_centre from daily_attendance where id = p_attendance;
  if v_centre is null then raise exception 'NOT_FOUND'; end if;
  if v_seat is not null
     and exists (select 1 from hall_seats where centre_id = v_centre and active)
     and not exists (select 1 from hall_seats where centre_id = v_centre and active and upper(label) = v_seat) then
    raise exception 'NOT_A_SEAT';
  end if;
  begin
    update daily_attendance
       set seat = v_seat, seat_set_at = now(), seat_set_by = p_staff
     where id = p_attendance
    returning * into v_att;
  exception when unique_violation then
    raise exception 'SEAT_TAKEN';
  end;
  return _checkin_card(v_att.patient_id, v_att.id);
end;
$$;

-- ---------- Payments ----------
alter table registration_groups add column if not exists paid_at timestamptz;
alter table registration_groups add column if not exists paid_by uuid references staff_users(id);

create or replace function staff_mark_paid(p_group uuid, p_staff uuid)
returns json
language plpgsql as $$
declare v registration_groups%rowtype;
begin
  update registration_groups
     set payment_status = 'paid', paid_at = now(), paid_by = p_staff
   where id = p_group and payment_status = 'pending'
  returning * into v;
  if v.id is null then
    select * into v from registration_groups where id = p_group;
    if v.id is null then raise exception 'NOT_FOUND'; end if;
  end if;
  return json_build_object('group_id', v.id, 'payment_status', v.payment_status, 'amount_due', v.amount_due, 'paid_at', v.paid_at);
end;
$$;

-- The scanner card now also carries the family group, so reception can mark the fee paid from it
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
    'group_id',          g.id,
    'group_size',        g.patient_count,
    'payment_method',    g.payment_method,
    'payment_status',    g.payment_status,
    'amount_due',        g.amount_due
  )
  from patients p
  join daily_attendance a on a.id = p_att
  left join lateral (select * from registrations x where x.patient_id = p.id order by x.created_at desc limit 1) r on true
  left join registration_slots s on s.id = r.slot_id
  left join registration_groups g on g.id = r.group_id
  where p.id = p_patient;
$$;

-- ---------- Today ----------
create or replace function staff_today_summary(p_centre integer default 1)
returns json
language sql stable as $$
  with today as (select (now() at time zone 'Asia/Kolkata')::date as d)
  select json_build_object(
    'date',            (select d from today),
    'checked_in',      (select count(*) from daily_attendance a, today where a.centre_id = p_centre and a.visit_date = today.d),
    'with_seat',       (select count(*) from daily_attendance a, today where a.centre_id = p_centre and a.visit_date = today.d and a.seat is not null),
    'seats_total',     (select count(*) from hall_seats where centre_id = p_centre and active),
    'registrations',   (select count(*) from registrations r join registration_slots s on s.id = r.slot_id, today
                         where s.centre_id = p_centre and s.slot_date = today.d and r.status = 'booked'),
    'fees_pending',    (select coalesce(sum(g.amount_due), 0) from registration_groups g join registration_slots s on s.id = g.slot_id, today
                         where s.centre_id = p_centre and s.slot_date = today.d and g.payment_status = 'pending' and g.payment_method = 'offline'),
    'checkins',        (select coalesce(json_agg(x order by x.checked_in_at desc), '[]'::json) from (
                          select a.id as attendance_id, a.seat, a.checked_in_at, p.patient_code, p.full_name,
                                 g.payment_status, g.payment_method, (s.slot_date = today.d) as registration_today
                            from daily_attendance a
                            join patients p on p.id = a.patient_id
                            cross join today
                            left join lateral (select * from registrations x where x.patient_id = p.id order by x.created_at desc limit 1) r on true
                            left join registration_slots s on s.id = r.slot_id
                            left join registration_groups g on g.id = r.group_id
                           where a.centre_id = p_centre and a.visit_date = today.d) x)
  );
$$;

-- ---------- Bookings for a registration day ----------
create or replace function staff_day_bookings(p_date date, p_centre integer default 1)
returns json
language sql stable as $$
  select json_build_object(
    'slot', (select json_build_object('id', s.id, 'slot_date', s.slot_date, 'starts_at', s.starts_at, 'capacity', s.capacity, 'status', s.status)
               from registration_slots s where s.centre_id = p_centre and s.slot_date = p_date),
    'groups', coalesce((
      select json_agg(gx order by gx.created_at) from (
        select g.id as group_id, g.created_at, g.patient_count, g.payment_method, g.payment_status, g.amount_due, g.paid_at,
               (select json_agg(json_build_object(
                   'patient_code', p.patient_code, 'full_name', p.full_name, 'dob', p.dob, 'gender', p.gender,
                   'city', p.city, 'wa_phone', p.wa_phone, 'registering_for', r.registering_for,
                   'guardian_name', p.guardian_name, 'guardian_phone', p.guardian_phone,
                   'checked_in', a.id is not null, 'seat', a.seat) order by p.patient_code)
                  from registrations r
                  join patients p on p.id = r.patient_id
                  left join daily_attendance a on a.patient_id = p.id and a.visit_date = p_date
                 where r.group_id = g.id and r.status = 'booked') as patients
          from registration_groups g
          join registration_slots s on s.id = g.slot_id
         where s.centre_id = p_centre and s.slot_date = p_date
      ) gx), '[]'::json)
  );
$$;

-- ---------- Patient search and details ----------
create or replace function staff_search_patients(p_q text)
returns json
language sql stable as $$
  with q as (select btrim(coalesce(p_q, '')) as t, regexp_replace(coalesce(p_q, ''), '\D', '', 'g') as digits)
  select coalesce(json_agg(x), '[]'::json) from (
    select p.patient_code, p.full_name, p.dob, p.gender, p.city, p.wa_phone,
           (select max(visit_date) from daily_attendance d where d.patient_id = p.id) as last_visit
      from patients p, q
     where length(q.t) >= 2 and (
            upper(p.patient_code) = upper(q.t)
         or p.full_name ilike '%' || q.t || '%'
         or (length(q.digits) >= 4 and (regexp_replace(coalesce(p.wa_phone, ''), '\D', '', 'g') like '%' || q.digits || '%'
                                     or regexp_replace(coalesce(p.guardian_phone, ''), '\D', '', 'g') like '%' || q.digits || '%')))
     order by (upper(p.patient_code) = upper(q.t)) desc, p.full_name
     limit 30
  ) x;
$$;

create or replace function staff_patient_detail(p_code text)
returns json
language sql stable as $$
  select json_build_object(
    'patient_code', p.patient_code, 'full_name', p.full_name, 'dob', p.dob, 'gender', p.gender, 'city', p.city,
    'wa_phone', p.wa_phone, 'language', p.language, 'source_channel', p.source_channel, 'created_at', p.created_at,
    'guardian_name', p.guardian_name, 'guardian_relation', p.guardian_relation, 'guardian_phone', p.guardian_phone,
    'pass_token', p.pass_token,
    'health', (select json_build_object('health_concerns', h.health_concerns, 'current_medicines', h.current_medicines, 'other_notes', h.other_notes)
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

-- ---------- Registration days ----------
create or replace function staff_list_slots(p_centre integer default 1)
returns json
language sql stable as $$
  select coalesce(json_agg(x order by x.slot_date), '[]'::json) from (
    select s.id, s.slot_date, s.starts_at, s.capacity, s.status, s.note,
           (select count(*) from registrations r where r.slot_id = s.id and r.status = 'booked') as booked
      from registration_slots s
     where s.centre_id = p_centre
       and s.slot_date >= (now() at time zone 'Asia/Kolkata')::date - 30
  ) x;
$$;

-- Add (p_id null) or change a registration day. Raises DUPLICATE_DAY, BELOW_BOOKED, PAST_DAY, INVALID_INPUT.
create or replace function staff_save_slot(p_id uuid, p_date date, p_time time, p_capacity integer, p_status text, p_centre integer default 1)
returns json
language plpgsql as $$
declare v registration_slots%rowtype; v_booked integer;
begin
  if p_capacity is null or p_capacity < 1 or p_capacity > 2000
     or coalesce(p_status, '') not in ('open', 'closed', 'cancelled') then
    raise exception 'INVALID_INPUT';
  end if;
  if p_id is null then
    if p_date is null or p_date < (now() at time zone 'Asia/Kolkata')::date then raise exception 'PAST_DAY'; end if;
    begin
      insert into registration_slots (centre_id, slot_date, starts_at, capacity, status)
      values (p_centre, p_date, p_time, p_capacity, p_status) returning * into v;
    exception when unique_violation then
      raise exception 'DUPLICATE_DAY';
    end;
  else
    select count(*) into v_booked from registrations where slot_id = p_id and status = 'booked';
    if p_capacity < v_booked then raise exception 'BELOW_BOOKED'; end if;
    update registration_slots set starts_at = p_time, capacity = p_capacity, status = p_status
     where id = p_id returning * into v;
    if v.id is null then raise exception 'INVALID_INPUT'; end if;
  end if;
  return row_to_json(v);
end;
$$;

-- Only the server may call these
do $$
declare f text;
begin
  foreach f in array array[
    'set_hall_layout(integer, text[], integer)', 'staff_free_seats(integer)', 'staff_set_seat(uuid, text, uuid)',
    'staff_mark_paid(uuid, uuid)', '_checkin_card(uuid, uuid)', 'staff_today_summary(integer)',
    'staff_day_bookings(date, integer)', 'staff_search_patients(text)', 'staff_patient_detail(text)',
    'staff_list_slots(integer)', 'staff_save_slot(uuid, date, time, integer, text, integer)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
