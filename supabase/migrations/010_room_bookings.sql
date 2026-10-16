-- NYL rooms, step 3: bookings for the hotels set up in Rooms settings (008).
--   * hotel_bookings: one booking = one room of a room type for a stay (check_out is the morning they leave)
--   * the database refuses two active bookings on the same room for overlapping nights
--   * unpaid holds expire after the hotel's hold time
--   * price, advance and policy are saved with the booking, so later price changes don't affect it
-- The older empty `room_bookings` / `rooms` tables from the first design are not used or changed.
-- Run after 001 to 009. Safe to run again.

create extension if not exists btree_gist;

create sequence if not exists hotel_booking_seq start 1001;

create table if not exists hotel_bookings (
  id               uuid primary key default gen_random_uuid(),
  booking_code     text not null unique default ('RM-' || nextval('hotel_booking_seq')),
  hotel_id         uuid not null references hotels(id),
  room_type_id     uuid not null references room_types(id),
  room_id          uuid references hotel_rooms(id),          -- assigned now or at check-in
  patient_id       uuid references patients(id),
  guest_name       text not null,
  guest_phone      text,
  guests           integer not null default 1 check (guests between 1 and 20),
  check_in         date not null,
  check_out        date not null,                            -- the day they leave
  nights           integer generated always as (check_out - check_in) stored,
  price_per_night  integer not null,                         -- saved at booking time
  extra_per_night  integer not null default 0,               -- extra-guest charge per night, saved at booking time
  total            integer not null,
  advance_due      integer not null default 0,
  advance_paid     integer not null default 0,
  balance_paid     integer not null default 0,
  status           text not null default 'held'
                   check (status in ('held', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired')),
  hold_until       timestamptz,
  source           text not null default 'staff' check (source in ('staff', 'web', 'whatsapp')),
  notes            text,
  cancel_reason    text,
  created_by       uuid references staff_users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  checked_in_at    timestamptz,
  checked_out_at   timestamptz,
  check (check_out > check_in),
  -- One room can't have two active bookings for the same night
  constraint hotel_bookings_no_overlap exclude using gist (
    room_id with =, daterange(check_in, check_out) with &&
  ) where (room_id is not null and status in ('held', 'confirmed', 'checked_in'))
);
create index if not exists hotel_bookings_dates_idx on hotel_bookings (hotel_id, check_in, check_out);
create index if not exists hotel_bookings_type_idx on hotel_bookings (room_type_id, check_in, check_out);
create index if not exists hotel_bookings_status_idx on hotel_bookings (status);
alter table hotel_bookings enable row level security;

-- Unpaid holds past their time become 'expired' (called at the start of every booking function)
create or replace function hotel_expire_holds()
returns integer language plpgsql as $$
declare n integer;
begin
  with x as (
    update hotel_bookings set status = 'expired', updated_at = now()
     where status = 'held' and hold_until is not null and hold_until < now()
    returning id, hotel_id, booking_code
  ), l as (
    insert into action_log (module, action, actor_type, actor_id, details)
    select 'room', 'booking_expired', 'system', 'hold-timer', jsonb_build_object('booking_id', x.id, 'booking_code', x.booking_code) from x
    returning 1
  )
  select count(*) into n from l;
  return n;
end;
$$;

-- Free rooms of a type for every night from p_from to p_to - 1
create or replace function hotel_type_free(p_type uuid, p_from date, p_to date, p_ignore uuid default null)
returns table (night date, free integer) language sql stable as $$
  select d::date as night,
         (select count(*) from hotel_rooms r
           where r.room_type_id = p_type and r.active
             and not exists (select 1 from room_blocks b where b.room_id = r.id and d::date between b.start_date and b.end_date))
       - (select count(*) from hotel_bookings k
           where k.room_type_id = p_type and k.status in ('held', 'confirmed', 'checked_in')
             and (k.id is distinct from p_ignore)
             and d::date >= k.check_in and d::date < k.check_out)::integer as free
    from generate_series(p_from, p_to - 1, interval '1 day') d;
$$;

-- Price for a stay, using the hotel's rules (long-stay price, extra guests, advance)
create or replace function hotel_quote(p_type uuid, p_check_in date, p_check_out date, p_guests integer)
returns json language sql stable as $$
  with t as (select * from room_types where id = p_type),
       h as (select hh.* from hotels hh join t on t.hotel_id = hh.id),
       n as (select (p_check_out - p_check_in) as nights),
       p as (
         select case when t.long_stay_nights is not null and n.nights >= t.long_stay_nights then t.long_stay_price else t.price_per_night end as per_night,
                greatest(0, coalesce(p_guests, 1) - t.base_guests) * t.extra_guest_price as extra,
                n.nights
           from t, n),
       tot as (select p.*, (p.per_night + p.extra) * p.nights as total from p)
  select json_build_object(
    'nights', tot.nights, 'price_per_night', tot.per_night, 'extra_per_night', tot.extra, 'total', tot.total,
    'advance_due', case h.advance_type
                     when 'fixed'   then least(h.advance_value, tot.total)
                     when 'percent' then round(tot.total * h.advance_value / 100.0)::int
                     else least(h.advance_value, tot.nights) * (tot.per_night + tot.extra) end,
    'hold_hours', h.hold_hours, 'max_guests', (select max_guests from t))
  from tot, h;
$$;

-- Create a booking (staff: phone or walk-in). Raises NOT_FREE, INVALID_INPUT, TOO_MANY_GUESTS, ROOM_NOT_FREE.
create or replace function hotel_create_booking(p jsonb, p_staff uuid)
returns json language plpgsql as $$
declare
  v_type   room_types%rowtype;
  v_in     date;
  v_out    date;
  v_guests integer;
  v_q      json;
  v_paid   integer := greatest(0, coalesce((p->>'advance_paid')::int, 0));
  v_pat    uuid;
  v_room   uuid := nullif(p->>'room_id', '')::uuid;
  v_b      hotel_bookings%rowtype;
begin
  perform hotel_expire_holds();
  select * into v_type from room_types where id = (p->>'room_type_id')::uuid and active;
  begin
    v_in := (p->>'check_in')::date; v_out := (p->>'check_out')::date; v_guests := coalesce((p->>'guests')::int, 1);
  exception when others then raise exception 'INVALID_INPUT'; end;
  if v_type.id is null or v_in is null or v_out is null or v_out <= v_in or v_out - v_in > 365
     or coalesce(btrim(p->>'guest_name'), '') = '' or v_guests < 1 then
    raise exception 'INVALID_INPUT';
  end if;
  if v_in < (now() at time zone 'Asia/Kolkata')::date then raise exception 'PAST_DATE'; end if;
  if v_guests > v_type.max_guests then raise exception 'TOO_MANY_GUESTS'; end if;

  -- One booking at a time per room type, so two staff can't take the last room together
  perform pg_advisory_xact_lock(hashtext(v_type.id::text));
  if exists (select 1 from hotel_type_free(v_type.id, v_in, v_out) f where f.free < 1) then
    raise exception 'NOT_FREE';
  end if;

  v_q := hotel_quote(v_type.id, v_in, v_out, v_guests);
  if nullif(btrim(coalesce(p->>'patient_code', '')), '') is not null then
    select id into v_pat from patients where upper(patient_code) = upper(btrim(p->>'patient_code'));
  end if;
  if v_room is not null and not exists (select 1 from hotel_rooms where id = v_room and room_type_id = v_type.id and active) then
    raise exception 'INVALID_INPUT';
  end if;

  begin
    insert into hotel_bookings (hotel_id, room_type_id, room_id, patient_id, guest_name, guest_phone, guests, check_in, check_out,
                                price_per_night, extra_per_night, total, advance_due, advance_paid, status, hold_until, source, notes, created_by)
    values (v_type.hotel_id, v_type.id, v_room, v_pat, btrim(p->>'guest_name'), nullif(btrim(coalesce(p->>'guest_phone', '')), ''), v_guests,
            v_in, v_out, (v_q->>'price_per_night')::int, (v_q->>'extra_per_night')::int, (v_q->>'total')::int, (v_q->>'advance_due')::int,
            v_paid,
            case when v_paid >= (v_q->>'advance_due')::int then 'confirmed' else 'held' end,
            case when v_paid >= (v_q->>'advance_due')::int then null else now() + make_interval(hours => (v_q->>'hold_hours')::int) end,
            'staff', nullif(btrim(coalesce(p->>'notes', '')), ''), p_staff)
    returning * into v_b;
  exception when exclusion_violation then raise exception 'ROOM_NOT_FREE';
  end;

  insert into action_log (patient_id, module, action, actor_type, actor_id, details)
  values (v_pat, 'room', 'booking_created', 'staff', p_staff::text,
          jsonb_build_object('booking_id', v_b.id, 'booking_code', v_b.booking_code, 'check_in', v_in, 'check_out', v_out,
                             'room_type', v_type.name, 'total', v_b.total, 'advance_paid', v_paid, 'status', v_b.status));
  return row_to_json(v_b);
end;
$$;

-- Actions on a booking. p_action: advance | assign | check_in | check_out | cancel | note
-- Raises NOT_FOUND, WRONG_STATUS, ROOM_NOT_FREE, NEED_ROOM, INVALID_INPUT.
create or replace function hotel_booking_action(p_id uuid, p_action text, p jsonb, p_staff uuid)
returns json language plpgsql as $$
declare
  v_b    hotel_bookings%rowtype;
  v_amt  integer := greatest(0, coalesce((p->>'amount')::int, 0));
  v_room uuid := nullif(coalesce(p->>'room_id', ''), '')::uuid;
  v_old  text;
begin
  perform hotel_expire_holds();
  select * into v_b from hotel_bookings where id = p_id for update;
  if v_b.id is null then raise exception 'NOT_FOUND'; end if;
  v_old := v_b.status;

  if p_action = 'advance' then
    if v_b.status not in ('held', 'confirmed', 'expired') or v_amt < 1 then raise exception 'WRONG_STATUS'; end if;
    if v_b.status = 'expired' then
      -- a late payment for an expired hold: only if the room type is still free
      if exists (select 1 from hotel_type_free(v_b.room_type_id, v_b.check_in, v_b.check_out, v_b.id) f where f.free < 1) then
        raise exception 'NOT_FREE';
      end if;
    end if;
    update hotel_bookings set advance_paid = advance_paid + v_amt,
           status = case when advance_paid + v_amt >= advance_due then 'confirmed' else 'held' end,
           hold_until = case when advance_paid + v_amt >= advance_due then null
                             else coalesce(hold_until, now() + interval '24 hours') end,
           updated_at = now()
     where id = p_id returning * into v_b;

  elsif p_action = 'assign' then
    if v_b.status not in ('held', 'confirmed', 'checked_in') then raise exception 'WRONG_STATUS'; end if;
    if v_room is not null and not exists (select 1 from hotel_rooms where id = v_room and room_type_id = v_b.room_type_id and active) then
      raise exception 'INVALID_INPUT';
    end if;
    if v_room is not null and exists (select 1 from room_blocks rb where rb.room_id = v_room
                                        and daterange(rb.start_date, rb.end_date, '[]') && daterange(v_b.check_in, v_b.check_out)) then
      raise exception 'ROOM_BLOCKED';
    end if;
    begin
      update hotel_bookings set room_id = v_room, updated_at = now() where id = p_id returning * into v_b;
    exception when exclusion_violation then raise exception 'ROOM_NOT_FREE';
    end;

  elsif p_action = 'check_in' then
    if v_b.status not in ('held', 'confirmed') then raise exception 'WRONG_STATUS'; end if;
    if v_b.room_id is null and v_room is null then raise exception 'NEED_ROOM'; end if;
    begin
      update hotel_bookings set status = 'checked_in', checked_in_at = now(), hold_until = null,
             room_id = coalesce(v_room, room_id),
             balance_paid = balance_paid + v_amt, updated_at = now()
       where id = p_id returning * into v_b;
    exception when exclusion_violation then raise exception 'ROOM_NOT_FREE';
    end;

  elsif p_action = 'check_out' then
    if v_b.status <> 'checked_in' then raise exception 'WRONG_STATUS'; end if;
    update hotel_bookings set status = 'checked_out', checked_out_at = now(),
           balance_paid = balance_paid + v_amt, updated_at = now()
     where id = p_id returning * into v_b;

  elsif p_action = 'cancel' then
    if v_b.status not in ('held', 'confirmed', 'expired') then raise exception 'WRONG_STATUS'; end if;
    update hotel_bookings set status = 'cancelled', cancel_reason = nullif(btrim(coalesce(p->>'reason', '')), ''), updated_at = now()
     where id = p_id returning * into v_b;

  elsif p_action = 'payment' then
    -- any other money received (e.g. part of the balance before check-out)
    if v_b.status not in ('confirmed', 'checked_in', 'checked_out') or v_amt < 1 then raise exception 'WRONG_STATUS'; end if;
    update hotel_bookings set balance_paid = balance_paid + v_amt, updated_at = now() where id = p_id returning * into v_b;

  elsif p_action = 'note' then
    update hotel_bookings set notes = nullif(btrim(coalesce(p->>'notes', '')), ''), updated_at = now() where id = p_id returning * into v_b;

  else
    raise exception 'INVALID_INPUT';
  end if;

  insert into action_log (patient_id, module, action, actor_type, actor_id, details)
  values (v_b.patient_id, 'room', 'booking_' || p_action, 'staff', p_staff::text,
          jsonb_build_object('booking_id', v_b.id, 'booking_code', v_b.booking_code, 'old_status', v_old, 'new_status', v_b.status,
                             'amount', nullif(v_amt, 0), 'room_id', v_b.room_id, 'reason', p->>'reason'));
  return row_to_json(v_b);
end;
$$;

-- One booking with everything the details screen needs
create or replace function hotel_booking_detail(p_id uuid)
returns json language sql stable as $$
  select json_build_object(
    'booking', row_to_json(b), 'hotel_name', h.name, 'type_name', t.name, 'room_label', r.label,
    'patient_code', p.patient_code,
    'balance_due', greatest(0, b.total - b.advance_paid - b.balance_paid),
    'free_rooms', coalesce((
      select json_agg(json_build_object('id', x.id, 'label', x.label) order by x.sort_order, x.label)
        from hotel_rooms x
       where x.room_type_id = b.room_type_id and x.active
         and not exists (select 1 from hotel_bookings o where o.room_id = x.id and o.id <> b.id
                           and o.status in ('held', 'confirmed', 'checked_in')
                           and daterange(o.check_in, o.check_out) && daterange(b.check_in, b.check_out))
         and not exists (select 1 from room_blocks rb where rb.room_id = x.id
                           and daterange(rb.start_date, rb.end_date, '[]') && daterange(b.check_in, b.check_out))), '[]'::json),
    'history', coalesce((
      select json_agg(json_build_object('at', a.created_at, 'action', a.action, 'by', coalesce(s.name, a.actor_id), 'details', a.details) order by a.id desc)
        from action_log a left join staff_users s on s.id::text = a.actor_id
       where a.module = 'room' and a.details->>'booking_id' = b.id::text), '[]'::json)
  )
  from hotel_bookings b
  join hotels h on h.id = b.hotel_id
  join room_types t on t.id = b.room_type_id
  left join hotel_rooms r on r.id = b.room_id
  left join patients p on p.id = b.patient_id
  where b.id = p_id;
$$;

-- Today's dashboard for one hotel
create or replace function hotel_dashboard(p_hotel uuid)
returns json language plpgsql as $$
declare v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  perform hotel_expire_holds();
  return (
    with bk as (
      select b.*, t.name as type_name, r.label as room_label
        from hotel_bookings b join room_types t on t.id = b.room_type_id left join hotel_rooms r on r.id = b.room_id
       where b.hotel_id = p_hotel
    ),
    row_of as (select id, booking_code, guest_name, guest_phone, guests, check_in, check_out, nights, type_name, room_label, status, total,
                      advance_due, advance_paid, balance_paid, greatest(0, total - advance_paid - balance_paid) as balance_due, hold_until from bk)
    select json_build_object(
      'today', v_today,
      'rooms_total', (select count(*) from hotel_rooms where hotel_id = p_hotel and active),
      'occupied', (select count(*) from bk where status = 'checked_in'),
      'booked_tonight', (select count(*) from bk where status in ('held', 'confirmed', 'checked_in') and v_today >= check_in and v_today < check_out),
      'blocked_tonight', (select count(*) from room_blocks rb join hotel_rooms r on r.id = rb.room_id
                           where r.hotel_id = p_hotel and r.active and v_today between rb.start_date and rb.end_date),
      'arrivals', coalesce((select json_agg(row_of order by row_of.guest_name) from row_of where check_in = v_today and status in ('held', 'confirmed')), '[]'),
      'departures', coalesce((select json_agg(row_of order by row_of.room_label nulls last) from row_of where check_out <= v_today and status = 'checked_in'), '[]'),
      'in_house', coalesce((select json_agg(row_of order by row_of.room_label nulls last) from row_of where status = 'checked_in' and check_out > v_today), '[]'),
      'holds', coalesce((select json_agg(row_of order by row_of.hold_until) from row_of where status = 'held'), '[]'),
      -- money taken today: advances when booking, later advances, balance at check-in / check-out, other payments
      'money_today', (select coalesce(sum(coalesce((a.details->>'amount')::int, (a.details->>'advance_paid')::int, 0)), 0)
                        from action_log a
                        join hotel_bookings b on b.id::text = a.details->>'booking_id'
                       where a.module = 'room' and b.hotel_id = p_hotel
                         and (a.details ? 'amount' or a.details ? 'advance_paid')
                         and (a.created_at at time zone 'Asia/Kolkata')::date = v_today),
      'free_by_type', coalesce((select json_agg(json_build_object('type', t.name, 'free', f.free) order by t.sort_order, t.name)
                                  from room_types t cross join lateral hotel_type_free(t.id, v_today, v_today + 1) f
                                 where t.hotel_id = p_hotel and t.active), '[]')
    )
  );
end;
$$;

-- Calendar: rooms, and bookings / blocks overlapping the window
create or replace function hotel_calendar(p_hotel uuid, p_from date, p_days integer)
returns json language plpgsql as $$
declare v_to date := p_from + least(greatest(p_days, 1), 31);
begin
  perform hotel_expire_holds();
  return json_build_object(
    'from', p_from, 'to', v_to,
    'types', coalesce((select json_agg(json_build_object('id', t.id, 'name', t.name,
               'free', (select json_agg(f.free order by f.night) from hotel_type_free(t.id, p_from, v_to) f)) order by t.sort_order, t.name)
             from room_types t where t.hotel_id = p_hotel and t.active), '[]'),
    'rooms', coalesce((select json_agg(json_build_object('id', r.id, 'label', r.label, 'type_id', r.room_type_id, 'type', t.name) order by t.sort_order, t.name, r.sort_order, r.label)
             from hotel_rooms r join room_types t on t.id = r.room_type_id where r.hotel_id = p_hotel and r.active), '[]'),
    'bookings', coalesce((select json_agg(json_build_object('id', b.id, 'code', b.booking_code, 'guest', b.guest_name, 'room_id', b.room_id,
               'type_id', b.room_type_id, 'check_in', b.check_in, 'check_out', b.check_out, 'status', b.status))
             from hotel_bookings b where b.hotel_id = p_hotel and b.status in ('held', 'confirmed', 'checked_in', 'checked_out')
               and b.check_in < v_to and b.check_out > p_from), '[]'),
    'blocks', coalesce((select json_agg(json_build_object('room_id', rb.room_id, 'start', rb.start_date, 'end', rb.end_date, 'reason', rb.reason))
             from room_blocks rb join hotel_rooms r on r.id = rb.room_id
            where r.hotel_id = p_hotel and rb.start_date < v_to and rb.end_date >= p_from), '[]')
  );
end;
$$;

-- Bookings list with filters
create or replace function hotel_bookings_list(p_hotel uuid, p_status text, p_from date, p_to date, p_q text)
returns json language plpgsql as $$
begin
  perform hotel_expire_holds();
  return (
    select coalesce(json_agg(x order by x.check_in desc, x.booking_code desc), '[]') from (
      select b.id, b.booking_code, b.guest_name, b.guest_phone, b.guests, b.check_in, b.check_out, b.nights, b.status,
             b.total, b.advance_due, b.advance_paid, b.balance_paid, greatest(0, b.total - b.advance_paid - b.balance_paid) as balance_due,
             b.hold_until, t.name as type_name, r.label as room_label, p.patient_code
        from hotel_bookings b
        join room_types t on t.id = b.room_type_id
        left join hotel_rooms r on r.id = b.room_id
        left join patients p on p.id = b.patient_id
       where b.hotel_id = p_hotel
         and (nullif(p_status, '') is null or b.status = p_status
              or (p_status = 'active' and b.status in ('held', 'confirmed', 'checked_in')))
         and (p_from is null or b.check_out > p_from)
         and (p_to is null or b.check_in <= p_to)
         and (nullif(btrim(coalesce(p_q, '')), '') is null
              or b.guest_name ilike '%' || btrim(p_q) || '%'
              or upper(b.booking_code) = upper(btrim(p_q))
              or upper(coalesce(p.patient_code, '')) = upper(btrim(p_q))
              or (length(regexp_replace(p_q, '\D', '', 'g')) >= 4
                  and regexp_replace(coalesce(b.guest_phone, ''), '\D', '', 'g') like '%' || regexp_replace(p_q, '\D', '', 'g') || '%'))
       limit 300
    ) x
  );
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'hotel_expire_holds()', 'hotel_type_free(uuid, date, date, uuid)', 'hotel_quote(uuid, date, date, integer)',
    'hotel_create_booking(jsonb, uuid)', 'hotel_booking_action(uuid, text, jsonb, uuid)', 'hotel_booking_detail(uuid)',
    'hotel_dashboard(uuid)', 'hotel_calendar(uuid, date, integer)', 'hotel_bookings_list(uuid, text, date, date, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
grant usage on sequence hotel_booking_seq to service_role;
