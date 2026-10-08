-- NYL reception: on the Bookings screen, show when a patient came on a different day
-- from their registration day (for example, they came early).
-- Adds 'last_visit' and 'last_seat' (their most recent visit on any day) to each patient.
-- Run after 001 to 006. Safe to run again.

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
                   'checked_in', a.id is not null, 'seat', a.seat,
                   'last_visit', lv.visit_date, 'last_seat', lv.seat) order by p.patient_code)
                  from registrations r
                  join patients p on p.id = r.patient_id
                  left join daily_attendance a on a.patient_id = p.id and a.visit_date = p_date
                  left join lateral (
                    select d.visit_date, d.seat from daily_attendance d
                     where d.patient_id = p.id order by d.visit_date desc limit 1) lv on true
                 where r.group_id = g.id and r.status = 'booked') as patients
          from registration_groups g
          join registration_slots s on s.id = g.slot_id
         where s.centre_id = p_centre and s.slot_date = p_date
      ) gx), '[]'::json)
  );
$$;

revoke all on function staff_day_bookings(date, integer) from public, anon, authenticated;
grant execute on function staff_day_bookings(date, integer) to service_role;
