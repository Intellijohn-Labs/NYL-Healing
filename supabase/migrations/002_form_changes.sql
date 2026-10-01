-- NYL web registration, form changes:
--   * "Who are you registering?" is stored on each registration
--   * town or city is required
--   * for patients under 18: parent/guardian phone and an explicit parent/guardian consent are required
-- Run after 001_web_registration.sql. Safe to run again.

alter table registrations
  add column if not exists registering_for text
  check (registering_for in ('self', 'child', 'parent', 'spouse', 'other'));

-- Replace the old function (its parameter list changes)
drop function if exists register_patient(text, uuid, text, date, text, text, text, text, text, text, text, text, lang_code);

create or replace function register_patient(
  p_token              text,
  p_slot_id            uuid,
  p_registering_for    text,
  p_full_name          text,
  p_dob                date,
  p_gender             text,
  p_city               text,
  p_guardian_name      text,
  p_guardian_relation  text,
  p_guardian_phone     text,
  p_guardian_consent   boolean,
  p_health_concerns    text,
  p_current_medicines  text,
  p_other_notes        text,
  p_language           lang_code
) returns json
language plpgsql as $$
declare
  v_link     registration_links%rowtype;
  v_slot     registration_slots%rowtype;
  v_booked   integer;
  v_minor    boolean;
  v_patient  patients%rowtype;
begin
  select * into v_link from registration_links where token = p_token for update;
  if not found or v_link.expires_at < now() then
    raise exception 'LINK_INVALID';
  end if;

  if coalesce(btrim(p_full_name), '') = '' or coalesce(btrim(p_health_concerns), '') = ''
     or coalesce(btrim(p_city), '') = ''
     or p_dob is null or p_dob > current_date or p_dob < date '1900-01-01'
     or p_gender not in ('male', 'female', 'other')
     or p_registering_for is null or p_registering_for not in ('self', 'child', 'parent', 'spouse', 'other') then
    raise exception 'INVALID_INPUT';
  end if;

  -- Lock the day so two people can't take the last place at the same time
  select * into v_slot from registration_slots where id = p_slot_id for update;
  if not found or v_slot.status <> 'open'
     or v_slot.slot_date < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'SLOT_CLOSED';
  end if;

  select count(*) into v_booked from registrations where slot_id = v_slot.id and status = 'booked';
  if v_booked >= v_slot.capacity then
    raise exception 'SLOT_FULL';
  end if;

  v_minor := p_dob > (current_date - interval '18 years');
  if v_minor and (
       coalesce(btrim(p_guardian_name), '') = ''
    or coalesce(btrim(p_guardian_relation), '') = ''
    or length(regexp_replace(coalesce(p_guardian_phone, ''), '\D', '', 'g')) < 10
    or coalesce(p_guardian_consent, false) = false) then
    raise exception 'GUARDIAN_REQUIRED';
  end if;

  insert into patients (wa_phone, full_name, dob, gender, language, centre_id, city,
                        guardian_name, guardian_relation, guardian_phone, guardian_consent_at, source_channel)
  values (v_link.wa_phone, btrim(p_full_name), p_dob, p_gender, p_language, v_slot.centre_id,
          btrim(p_city),
          case when v_minor then btrim(p_guardian_name) end,
          case when v_minor then btrim(p_guardian_relation) end,
          case when v_minor then btrim(p_guardian_phone) end,
          case when v_minor then now() end,
          'web')
  returning * into v_patient;

  insert into patient_health (patient_id, health_concerns, current_medicines, other_notes, consent_at)
  values (v_patient.id, btrim(p_health_concerns),
          nullif(btrim(p_current_medicines), ''), nullif(btrim(p_other_notes), ''), now());

  insert into registrations (patient_id, slot_id, link_token, registering_for)
  values (v_patient.id, v_slot.id, v_link.token, p_registering_for);

  update registration_links set last_used_at = now() where token = v_link.token;

  return json_build_object(
    'patient_code', v_patient.patient_code,
    'slot_date',    v_slot.slot_date,
    'starts_at',    v_slot.starts_at
  );
end;
$$;

revoke all on function register_patient(text, uuid, text, text, date, text, text, text, text, text, boolean, text, text, text, lang_code)
  from public, anon, authenticated;
grant execute on function register_patient(text, uuid, text, text, date, text, text, text, text, text, boolean, text, text, text, lang_code)
  to service_role;
