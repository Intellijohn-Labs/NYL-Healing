'use server';

import { db } from '@/lib/supabase';
import { isLang } from '@/lib/i18n';

export type RegisterInput = {
  token: string;
  language: string;
  slotId: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: string;
  city: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  healthConcerns: string;
  currentMedicines: string;
  otherNotes: string;
  consent: boolean;
};

export type RegisterResult =
  | { ok: true; patientCode: string; slotDate: string; startsAt: string | null }
  | { ok: false; error: 'SLOT_FULL' | 'SLOT_CLOSED' | 'LINK_INVALID' | 'GUARDIAN_REQUIRED' | 'INVALID_INPUT' | 'GENERIC' };

const KNOWN = ['SLOT_FULL', 'SLOT_CLOSED', 'LINK_INVALID', 'GUARDIAN_REQUIRED', 'INVALID_INPUT'] as const;

const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const dob = clip(input.dob, 10);
  if (
    !input.consent ||
    !clip(input.fullName, 120) ||
    !clip(input.healthConcerns, 4000) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dob) ||
    !['male', 'female', 'other'].includes(input.gender) ||
    !/^[0-9a-f-]{36}$/.test(input.slotId)
  ) {
    return { ok: false, error: 'INVALID_INPUT' };
  }

  const { data, error } = await db().rpc('register_patient', {
    p_token: clip(input.token, 64),
    p_slot_id: input.slotId,
    p_full_name: clip(input.fullName, 120),
    p_dob: dob,
    p_gender: input.gender,
    p_city: clip(input.city, 120),
    p_guardian_name: clip(input.guardianName, 120),
    p_guardian_relation: clip(input.guardianRelation, 60),
    p_guardian_phone: clip(input.guardianPhone, 20),
    p_health_concerns: clip(input.healthConcerns, 4000),
    p_current_medicines: clip(input.currentMedicines, 2000),
    p_other_notes: clip(input.otherNotes, 2000),
    p_language: isLang(input.language) ? input.language : 'en',
  });

  if (error) {
    const code = KNOWN.find((k) => error.message?.includes(k));
    if (!code) console.error('register_patient failed', error);
    return { ok: false, error: code ?? 'GENERIC' };
  }

  return {
    ok: true,
    patientCode: data.patient_code,
    slotDate: data.slot_date,
    startsAt: data.starts_at ?? null,
  };
}
