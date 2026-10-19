import 'server-only';
import { db } from './supabase';

export type IdCard = {
  patient_code: string;
  full_name: string;
  dob: string | null;
  id_type: string | null;
  id_doc_path: string | null;
  id_card_url: string | null;
  id_uploaded_at: string | null;
  id_verified_at: string | null;
  id_deleted_at: string | null;
  verified_by: string | null;
  needs_id: boolean;
  next_visit: string | null;
};

export async function idCard(code: string): Promise<IdCard | null> {
  const { data, error } = await db().rpc('staff_id_card', { p_code: code });
  if (error) throw error;
  return (data as IdCard | null) ?? null;
}
