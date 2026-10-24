-- NYL patient pass: also show the designation (if the patient gave one) and use the patient's language
-- for the "Back to WhatsApp" button. Same as in 003, plus designation and language. Run after 017. Safe to run again.
create or replace function get_patient_pass(p_pass_token text)
returns json
language sql stable as $$
  select json_build_object(
    'patient_code',      p.patient_code,
    'pass_token',        p.pass_token,
    'full_name',         p.full_name,
    'dob',               p.dob,
    'gender',            p.gender,
    'city',              p.city,
    'designation',       p.designation,
    'language',          p.language,
    'registering_for',   r.registering_for,
    'guardian_name',     p.guardian_name,
    'guardian_relation', p.guardian_relation,
    'slot_date',         s.slot_date,
    'starts_at',         s.starts_at,
    'issued_at',         r.created_at
  )
  from patients p
  left join lateral (
    select * from registrations x where x.patient_id = p.id order by x.created_at desc limit 1
  ) r on true
  left join registration_slots s on s.id = r.slot_id
  where p.pass_token = p_pass_token;
$$;
revoke all on function get_patient_pass(text) from public, anon, authenticated;
grant execute on function get_patient_pass(text) to service_role;
