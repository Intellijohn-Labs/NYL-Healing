'use server';

import { db } from '@/lib/supabase';
import { isLang } from '@/lib/i18n';
import { MAX_PATIENTS, ONLINE_PAYMENT_ENABLED, REGISTRATION_FEE } from '@/lib/config';
import { toPass, type RawPass } from '@/lib/pass';
import { normalizePhone } from '@/lib/phone';
import { isDisease } from '@/lib/diseases';
import { ID_MIN_AGE, isIdType } from '@/lib/idDocs';
import type { PassData } from '@/lib/types';

export type PatientInput = {
  registeringFor: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: string;
  city: string;
  designation: string; // optional
  guardianName: string;
  guardianRelation: string; // father | mother | other
  guardianRelationOther: string;
  guardianPhone: string;
  guardianConsent: boolean;
  diseases: string[]; // codes from lib/diseases.ts, at least one
  diseasesOther: string; // needed when "other" is ticked
  healthConcerns: string; // optional now
  idType: string; // required from 15 years (lib/idDocs.ts)
  idPath: string; // the uploaded ID photo, pending/<token>/…
  currentMedicines: string;
  otherNotes: string;
  consent: boolean;
};

export type RegisterInput = {
  token: string;
  language: string;
  slotId: string;
  payment: string; // offline | online
  patients: PatientInput[];
};

export type RegisterError =
  | 'SLOT_FULL'
  | 'SLOT_CLOSED'
  | 'LINK_INVALID'
  | 'GUARDIAN_REQUIRED'
  | 'ID_REQUIRED'
  | 'MISSED_DAY'
  | 'INVALID_INPUT'
  | 'GENERIC';

export type RegisterResult =
  | { ok: true; passes: PassData[]; payment: string; amountDue: number }
  | { ok: false; error: RegisterError; missed?: { index: number; date: string } };

const KNOWN = ['SLOT_FULL', 'SLOT_CLOSED', 'LINK_INVALID', 'GUARDIAN_REQUIRED', 'ID_REQUIRED', 'INVALID_INPUT'] as const;

// Age in whole years today (India time); the ID card is required from 15
function ageToday(dob: string) {
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()).split('-').map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

function relationOf(p: PatientInput) {
  if (p.guardianRelation === 'father' || p.guardianRelation === 'mother') return p.guardianRelation;
  const other = clip(p.guardianRelationOther, 60);
  return p.guardianRelation === 'other' && other ? `other: ${other}` : '';
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const list = Array.isArray(input.patients) ? input.patients : [];
  const paymentOk = input.payment === 'offline' || (input.payment === 'online' && ONLINE_PAYMENT_ENABLED);
  if (
    list.length < 1 ||
    list.length > MAX_PATIENTS ||
    !paymentOk ||
    !/^[0-9a-f-]{36}$/.test(input.slotId) ||
    list.some(
      (p) =>
        !p.consent ||
        !clip(p.fullName, 120) ||
        !clip(p.city, 120) ||
        !Array.isArray(p.diseases) ||
        p.diseases.length === 0 ||
        !p.diseases.every(isDisease) ||
        (p.diseases.includes('other') && !clip(p.diseasesOther, 120)) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(clip(p.dob, 10)) ||
        !['male', 'female', 'other'].includes(p.gender) ||
        !['self', 'child', 'parent', 'spouse', 'other'].includes(p.registeringFor) ||
        (clip(p.guardianPhone, 20) !== '' && !normalizePhone(p.guardianPhone)),
    )
  ) {
    return { ok: false, error: 'INVALID_INPUT' };
  }
  // Identity card for everyone aged 15+: a known type, and a photo uploaded through this same link
  if (
    list.some(
      (p) =>
        ageToday(clip(p.dob, 10)) >= ID_MIN_AGE &&
        (!isIdType(p.idType) || !String(p.idPath ?? '').startsWith(`pending/${input.token}/`)),
    )
  ) {
    return { ok: false, error: 'ID_REQUIRED' };
  }

  const patients = list.map((p) => ({
    registering_for: p.registeringFor,
    full_name: clip(p.fullName, 120),
    dob: clip(p.dob, 10),
    gender: p.gender,
    city: clip(p.city, 120),
    designation: clip(p.designation, 80),
    guardian_name: clip(p.guardianName, 120),
    guardian_relation: relationOf(p),
    guardian_phone: normalizePhone(p.guardianPhone) ?? '',
    guardian_consent: p.guardianConsent === true,
    diseases: [...new Set(p.diseases)],
    diseases_other: p.diseases.includes('other') ? clip(p.diseasesOther, 120) : '',
    health_concerns: clip(p.healthConcerns, 4000),
    current_medicines: clip(p.currentMedicines, 2000),
    other_notes: clip(p.otherNotes, 2000),
    id_type: ageToday(clip(p.dob, 10)) >= ID_MIN_AGE ? p.idType : '',
    id_path: ageToday(clip(p.dob, 10)) >= ID_MIN_AGE ? clip(p.idPath, 200) : '',
  }));

  // register_group_checked refuses a patient who missed a registered day that the NYL team hasn't cleared (migration 013)
  const { data, error } = await db().rpc('register_group_checked', {
    p_token: clip(input.token, 64),
    p_slot_id: input.slotId,
    p_payment_method: input.payment,
    p_fee: REGISTRATION_FEE,
    p_language: isLang(input.language) ? input.language : 'en',
    p_patients: patients,
  });

  if (error) {
    const m = error.message?.match(/MISSED_DAY\|(\d+)\|(\d{4}-\d{2}-\d{2})/);
    if (m) return { ok: false, error: 'MISSED_DAY', missed: { index: Number(m[1]) - 1, date: m[2] } };
    const code = KNOWN.find((k) => error.message?.includes(k));
    if (!code) console.error('register_group failed', error);
    return { ok: false, error: code ?? 'GENERIC' };
  }

  // Passes come back in the same order as the patients were sent, so the designation is matched by position
  const passes = await Promise.all(
    (data.patients as RawPass[]).map((raw, i) =>
      toPass(
        { ...raw, designation: raw.designation ?? (clip(list[i]?.designation ?? '', 80) || null), language: raw.language ?? input.language },
        { slot_date: data.slot_date, starts_at: data.starts_at, issued_at: data.issued_at },
      ),
    ),
  );
  // Send the WhatsApp acknowledgement with each person's patient pass (n8n "NYL - Registration Confirmation").
  // It never blocks or fails the registration.
  try {
    await fetch(process.env.REGISTRATION_DONE_HOOK_URL || 'https://n8n.srv1691210.hstgr.cloud/webhook/nyl-registration-done', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: input.token }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error('registration whatsapp ack', err);
  }
  return { ok: true, passes, payment: data.payment_method, amountDue: data.amount_due };
}

// Early check while filling in a patient: did this person (same number, name and date of birth) miss a registered day
// that hasn't been cleared? Returns the date, or null.
export async function checkMissedDay(token: string, name: string, dob: string): Promise<string | null> {
  if (!/^[a-f0-9]{32,64}$/i.test(token) || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || !name.trim()) return null;
  const { data, error } = await db().rpc('check_missed_day', { p_token: token, p_name: clip(name, 120), p_dob: dob });
  if (error) {
    console.error('check_missed_day', error);
    return null;
  }
  return (data as string | null) ?? null;
}
