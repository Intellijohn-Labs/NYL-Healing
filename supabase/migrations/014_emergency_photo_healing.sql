-- NYL Photo Healing: emergency bookings (patient in a critical condition), self-declared in the WhatsApp bot.
--   * same healing sessions as normal, but shown first to the healers
--   * can be booked until the session starts (not only until the photo deadline)
--   * an extra fee, set by staff on the Photo screen (settings.photo_healing.emergency_fee); recorded as due for now
-- Run after 001 to 013. Safe to run again.

alter table distance_bookings add column if not exists is_emergency      boolean not null default false;
alter table distance_bookings add column if not exists emergency_note    text;
alter table distance_bookings add column if not exists emergency_fee     integer;
alter table distance_bookings add column if not exists emergency_fee_status text
  check (emergency_fee_status is null or emergency_fee_status in ('due', 'paid', 'waived'));

-- Default emergency fee: 0 until staff set it on the Photo screen
update settings set value = value || '{"emergency_fee": 0}'::jsonb
 where key = 'photo_healing' and not (value ? 'emergency_fee');

create index if not exists distance_bookings_emergency_idx on distance_bookings (slot_id) where is_emergency;