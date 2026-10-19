'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { FRONT_DESK_ROLES, staffWithRole } from '@/lib/staff';

// NYL team allows a patient who missed a registered day to register again online
export async function clearMissed(f: FormData) {
  const staff = await staffWithRole(FRONT_DESK_ROLES);
  if (!staff) redirect('/staff/login');
  const code = String(f.get('code') ?? '').trim().toUpperCase();
  const note = String(f.get('note') ?? '').trim().slice(0, 300);
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) return;
  const { error } = await db().rpc('staff_clear_missed', { p_code: code, p_staff: staff.id, p_note: note });
  if (error) console.error('staff_clear_missed', error);
  revalidatePath(`/staff/patients/${code}`);
}
