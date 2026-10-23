-- NYL reception: collections report. Registration fees paid at reception (offline class), by day and by staff.
-- Uses what "Mark paid" already saves: registration_groups.paid_at, paid_by, amount_due.
-- Run after 016. Safe to run again.

create index if not exists registration_groups_paid_idx on registration_groups (paid_at) where payment_status = 'paid';

-- Every registration fee marked paid between two days (India time), newest first
create or replace function staff_collections(p_from date, p_to date)
returns json language sql stable as $$
  select coalesce(json_agg(x order by x.paid_at desc), '[]'::json) from (
    select g.id as group_id,
           g.paid_at,
           (g.paid_at at time zone 'Asia/Kolkata')::date as paid_day,
           g.amount_due as amount,
           g.patient_count,
           s.slot_date,
           coalesce(su.name, 'Unknown') as paid_by,
           (select string_agg(p.full_name || ' (' || p.patient_code || ')', ', ' order by p.full_name)
              from registrations r join patients p on p.id = r.patient_id where r.group_id = g.id) as patients,
           (select l.wa_phone from registration_links l where l.token = g.link_token) as wa_phone
      from registration_groups g
      left join registration_slots s on s.id = g.slot_id
      left join staff_users su on su.id = g.paid_by
     where g.payment_status = 'paid' and g.paid_at is not null
       and (g.paid_at at time zone 'Asia/Kolkata')::date between p_from and p_to
     limit 5000
  ) x;
$$;
revoke all on function staff_collections(date, date) from public, anon, authenticated;
grant execute on function staff_collections(date, date) to service_role;
