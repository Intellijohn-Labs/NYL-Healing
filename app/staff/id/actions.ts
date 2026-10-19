'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { FRONT_DESK_ROLES, staffWithRole } from '@/lib/staff';
import { ID_BUCKET } from '@/lib/idDocs';

// Reception compared the ID with the person: record it, then delete the ID photo right away (the record stays)
export async function verifyId(f: FormData) {
  const staff = await staffWithRole(FRONT_DESK_ROLES);
  if (!staff) redirect('/staff/login');
  const code = String(f.get('code') ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) return;
  const { data, error } = await db().rpc('staff_verify_id', { p_code: code, p_staff: staff.id });
  if (error) {
    console.error('staff_verify_id', error);
    return;
  }
  const path = (data as { id_doc_path: string | null })?.id_doc_path;
  if (path) {
    const { error: rmErr } = await db().storage.from(ID_BUCKET).remove([path]);
    // If removing fails, the nightly cleanup deletes it later
    if (!rmErr) await db().rpc('staff_id_deleted', { p_code: code, p_reason: 'verified' });
    else console.error('id photo delete', rmErr);
  }
  revalidatePath(`/staff/id/${code}`);
  revalidatePath(`/staff/patients/${code}`);
}
