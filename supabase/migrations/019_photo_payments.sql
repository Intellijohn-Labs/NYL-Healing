-- NYL Photo Healing payments (temporary, before a payment gateway):
--   * normal and emergency photo healing are paid by UPI QR; the patient sends the payment screenshot and the UTR in WhatsApp
--   * staff verify each receipt in the staff app (after checking NYL's bank / UPI app); only then:
--       - a normal booking is confirmed and shown to the healers (moved to the next day if its session has already ended)
--       - an emergency is released to the healers (alarm + WhatsApp alert)
--   * the fee and UPI ID / payee name are set on the staff Photo screen; with no UPI ID or a fee of 0, no payment is asked
-- Run after 018. Safe to run again.

-- Bookings: payment state (existing bookings need no payment)
alter table distance_bookings add column if not exists payment_status text not null default 'not_required';
alter table distance_bookings add column if not exists amount_due integer;
do $$ begin
  alter table distance_bookings add constraint distance_bookings_payment_status_check
    check (payment_status in ('not_required', 'pending', 'submitted', 'verified', 'rejected'));
exception when duplicate_object then null; end $$;

-- Emergencies: may wait for payment before going to the healers
alter table emergency_requests add column if not exists released_at timestamptz;   -- when it went to the healers
alter table emergency_requests drop constraint if exists emergency_requests_status_check;
alter table emergency_requests add constraint emergency_requests_status_check
  check (status in ('awaiting_payment', 'waiting', 'started', 'done', 'cancelled'));

-- Payment receipts sent in WhatsApp
create table if not exists payment_receipts (
  id                   uuid primary key default gen_random_uuid(),
  kind                 text not null check (kind in ('photo', 'emergency')),
  distance_booking_id  uuid references distance_bookings(id),
  emergency_request_id uuid references emergency_requests(id),
  patient_id           uuid not null references patients(id),
  wa_phone             text not null,
  amount               integer not null,
  utr                  text not null check (utr ~ '^[0-9]{12}$'),
  screenshot_path      text,                         -- in the private bucket nyl-photos (receipts/...)
  status               text not null default 'submitted' check (status in ('submitted', 'verified', 'rejected')),
  reject_reason        text,
  created_at           timestamptz not null default now(),
  verified_at          timestamptz,
  verified_by          uuid references staff_users(id),
  notified_at          timestamptz                   -- when the patient was told the result
);
-- The same UPI transaction can't be used twice
create unique index if not exists payment_receipts_utr_once on payment_receipts (utr) where status in ('submitted', 'verified');
create index if not exists payment_receipts_open_idx on payment_receipts (created_at) where status = 'submitted';
alter table payment_receipts enable row level security;

-- UPI details for the QR (set on the staff Photo screen)
update settings set value = value || '{"upi_id": "", "upi_name": "NYL Healing"}'::jsonb
 where key = 'photo_healing' and not (value ? 'upi_id');

-- Staff: receipts to verify (and bookings still waiting for a receipt)
create or replace function staff_payment_list()
returns json language sql stable as $$
  select json_build_object(
    'receipts', coalesce((select json_agg(x order by x.is_emergency desc, x.created_at) from (
      select r.id, r.kind, r.kind = 'emergency' as is_emergency, r.amount, r.utr, r.screenshot_path, r.created_at, r.wa_phone,
             p.full_name, p.patient_code,
             e.note as condition,
             to_char(s.healing_start at time zone 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM') as session
        from payment_receipts r
        join patients p on p.id = r.patient_id
        left join emergency_requests e on e.id = r.emergency_request_id
        left join distance_bookings b on b.id = r.distance_booking_id
        left join distance_slots s on s.id = b.slot_id
       where r.status = 'submitted'
    ) x), '[]'::json),
    'waiting_receipt', (
      (select count(*) from distance_bookings b where b.payment_status in ('pending', 'rejected')
          and b.created_at > now() - interval '3 days')
    + (select count(*) from emergency_requests e where e.status = 'awaiting_payment'
          and not exists (select 1 from payment_receipts r where r.emergency_request_id = e.id and r.status = 'submitted')
          and e.created_at > now() - interval '1 day')
    )
  );
$$;

-- Staff verify: confirm the booking (moving it to the next day if its session has ended) or release the emergency
create or replace function staff_verify_payment(p_id uuid, p_staff uuid)
returns json language plpgsql as $$
declare
  r payment_receipts%rowtype;
  b distance_bookings%rowtype;
  s distance_slots%rowtype;
  v_new uuid;
  v_moved boolean := false;
begin
  select * into r from payment_receipts where id = p_id for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if r.status <> 'submitted' then raise exception 'ALREADY_DONE'; end if;
  update payment_receipts set status = 'verified', verified_at = now(), verified_by = p_staff where id = p_id;

  if r.kind = 'photo' and r.distance_booking_id is not null then
    select * into b from distance_bookings where id = r.distance_booking_id for update;
    select * into s from distance_slots where id = b.slot_id;
    if s.healing_end is not null and s.healing_end < now() then
      -- The session has already ended: same time the next day
      insert into distance_slots (slot_date, slot_no, healing_start, healing_end, capacity, booking_close_at, fee, status)
      values (s.slot_date + 1, s.slot_no, s.healing_start + interval '1 day', s.healing_end + interval '1 day', s.capacity,
              s.booking_close_at + interval '1 day', s.fee, 'open')
      on conflict (slot_date, slot_no) do nothing;
      select id into v_new from distance_slots where slot_date = s.slot_date + 1 and slot_no = s.slot_no;
      update distance_bookings set slot_id = v_new where id = b.id;
      v_moved := true;
    end if;
    update distance_bookings set payment_status = 'verified', status = 'confirmed' where id = b.id;
  elsif r.kind = 'emergency' and r.emergency_request_id is not null then
    update emergency_requests set status = 'waiting', released_at = now(), fee_status = 'paid'
     where id = r.emergency_request_id and status = 'awaiting_payment';
  end if;

  insert into action_log (patient_id, module, action, actor_type, actor_id, details)
  values (r.patient_id, 'distance', 'payment_verified', 'staff', p_staff::text,
          jsonb_build_object('receipt_id', r.id, 'kind', r.kind, 'amount', r.amount, 'utr', r.utr, 'moved_next_day', v_moved));
  return json_build_object('id', r.id, 'kind', r.kind, 'moved', v_moved, 'emergency_request_id', r.emergency_request_id);
end;
$$;

-- Staff reject: the patient is asked to check and send the screenshot again
create or replace function staff_reject_payment(p_id uuid, p_reason text, p_staff uuid)
returns json language plpgsql as $$
declare r payment_receipts%rowtype;
begin
  select * into r from payment_receipts where id = p_id for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if r.status <> 'submitted' then raise exception 'ALREADY_DONE'; end if;
  update payment_receipts set status = 'rejected', reject_reason = nullif(btrim(coalesce(p_reason, '')), ''),
         verified_at = now(), verified_by = p_staff where id = p_id;
  if r.distance_booking_id is not null then
    update distance_bookings set payment_status = 'rejected' where id = r.distance_booking_id;
  end if;
  -- Let the patient send a new screenshot straight away
  insert into conversation_state (wa_phone, flow, step, context)
  values (r.wa_phone, 'photo_healing', 'pay_shot',
          jsonb_build_object('pay_kind', r.kind, 'booking_id', r.distance_booking_id, 'er_id', r.emergency_request_id, 'amount', r.amount))
  on conflict (wa_phone) do update set flow = excluded.flow, step = excluded.step, context = excluded.context;
  insert into action_log (patient_id, module, action, actor_type, actor_id, details)
  values (r.patient_id, 'distance', 'payment_rejected', 'staff', p_staff::text,
          jsonb_build_object('receipt_id', r.id, 'kind', r.kind, 'reason', p_reason));
  return json_build_object('id', r.id, 'kind', r.kind);
end;
$$;

revoke all on function staff_payment_list() from public, anon, authenticated;
revoke all on function staff_verify_payment(uuid, uuid) from public, anon, authenticated;
revoke all on function staff_reject_payment(uuid, text, uuid) from public, anon, authenticated;
grant execute on function staff_payment_list() to service_role;
grant execute on function staff_verify_payment(uuid, uuid) to service_role;
grant execute on function staff_reject_payment(uuid, text, uuid) to service_role;
