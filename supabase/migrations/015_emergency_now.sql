-- NYL Photo Healing: emergency healing starts within 5 minutes (not in the regular sessions), 24 hours a day.
--   * the patient chooses Emergency in WhatsApp, gives the condition and a photo
--   * an emergency_requests row is created (waiting) and the healers are alerted; healers mark it started, then done
--   * payment is skipped for now; the fee is recorded as due
-- Run after 014. Safe to run again.

create table if not exists emergency_requests (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id),
  wa_phone      text,
  note          text,                         -- the condition, in the patient's words
  fee           integer not null default 0,
  fee_status    text check (fee_status is null or fee_status in ('due', 'paid', 'waived')),
  status        text not null default 'waiting' check (status in ('waiting', 'started', 'done', 'cancelled')),
  created_at    timestamptz not null default now(),
  alerted_at    timestamptz,                  -- when the healers' WhatsApp alert was sent
  started_at    timestamptz,
  started_by    uuid references staff_users(id),
  done_at       timestamptz,
  done_by       uuid references staff_users(id)
);
create index if not exists emergency_requests_open_idx on emergency_requests (created_at) where status in ('waiting', 'started');
alter table emergency_requests enable row level security;

alter table photos add column if not exists emergency_request_id uuid references emergency_requests(id);

-- WhatsApp numbers that get the emergency alert (set on the staff Photo screen)
update settings set value = value || '{"emergency_alert_numbers": []}'::jsonb
 where key = 'photo_healing' and not (value ? 'emergency_alert_numbers');

-- Healers mark an emergency started / done
create or replace function staff_emergency_action(p_id uuid, p_action text, p_staff uuid)
returns json language plpgsql as $$
declare v emergency_requests%rowtype;
begin
  select * into v from emergency_requests where id = p_id for update;
  if v.id is null then raise exception 'NOT_FOUND'; end if;
  if p_action = 'start' and v.status = 'waiting' then
    update emergency_requests set status = 'started', started_at = now(), started_by = p_staff where id = p_id returning * into v;
  elsif p_action = 'done' and v.status in ('waiting', 'started') then
    update emergency_requests set status = 'done', done_at = now(), done_by = p_staff,
           started_at = coalesce(started_at, now()), started_by = coalesce(started_by, p_staff)
     where id = p_id returning * into v;
  else
    return row_to_json(v);
  end if;
  insert into action_log (patient_id, module, action, actor_type, actor_id, details)
  values (v.patient_id, 'distance', 'emergency_' || p_action, 'staff', p_staff::text, jsonb_build_object('request_id', v.id));
  return row_to_json(v);
end;
$$;
revoke all on function staff_emergency_action(uuid, text, uuid) from public, anon, authenticated;
grant execute on function staff_emergency_action(uuid, text, uuid) to service_role;