'use server';

import { db } from '@/lib/supabase';
import { isLang } from '@/lib/i18n';
import { MAX_PATIENTS, ONLINE_PAYMENT_ENABLED, REGISTRATION_FEE } from '@/lib/config';
import { toPass, type RawPass } from '@/lib/pass';
import type { PassData } from '@/lib/types';

export type PatientInput = {
  registeringFor: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: string;
  city: string;
  guardianName: string;
  guardianRelation: string; // father | mother | other
  guardianRelationOther: string;
  guardianPhone: string;
  guardianConsent: boolean;
  healthConcerns: string;
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

export type RegisterError = 'SLOT_FULL' | 'SLOT_CLOSED' | 'LINK_INVALID' | 'GUARDIAN_REQUIRED' | 'INVALID_INPUT' | 'GENERIC';

export type RegisterResult =
  | { ok: true; passes: PassData[]; payment: string; amountDue: number }
  | { ok: false; error: RegisterError };

const KNOWN = ['SLOT_FULL', 'SLOT_CLOSED', 'LINK_INVALID', 'GUARDIAN_REQUIRED', 'INVALID_INPUT'] as const;

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
        !clip(p.healthConcerns, 4000) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(clip(p.dob, 10)) ||
        !['male', 'female', 'other'].includes(p.gender) ||
        !['self', 'child', 'parent', 'spouse', 'other'].includes(p.registeringFor),
    )
  ) {
    return { ok: false, error: 'INVALID_INPUT' };
  }

  const patients = list.map((p) => ({
    registering_for: p.registeringFor,
    full_name: clip(p.fullName, 120),
    dob: clip(p.dob, 10),
    gender: p.gender,
    city: clip(p.city, 120),
    guardian_name: clip(p.guardianName, 120),
    guardian_relation: relationOf(p),
    guardian_phone: clip(p.guardianPhone, 20),
    guardian_consent: p.guardianConsent === true,
    health_concerns: clip(p.healthConcerns, 4000),
    current_medicines: clip(p.currentMedicines, 2000),
    other_notes: clip(p.otherNotes, 2000),
  }));

  const { data, error } = await db().rpc('register_group', {
    p_token: clip(input.token, 64),
    p_slot_id: input.slotId,
    p_payment_method: input.payment,
    p_fee: REGISTRATION_FEE,
    p_language: isLang(input.language) ? input.language : 'en',
    p_patients: patients,
  });

  if (error) {
    const code = KNOWN.find((k) => error.message?.includes(k));
    if (!code) console.error('register_group failed', error);
    return { ok: false, error: code ?? 'GENERIC' };
  }

  const passes = await Promise.all(
    (data.patients as RawPass[]).map((raw) =>
      toPass(raw, { slot_date: data.slot_date, starts_at: data.starts_at, issued_at: data.issued_at }),
    ),
  );
  return { ok: true, passes, payment: data.payment_method, amountDue: data.amount_due };
}
