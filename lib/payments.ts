import 'server-only';
import { db } from './supabase';

export type Receipt = {
  id: string;
  kind: 'photo' | 'emergency';
  is_emergency: boolean;
  amount: number;
  utr: string;
  screenshot_path: string | null;
  created_at: string;
  wa_phone: string;
  full_name: string;
  patient_code: string;
  condition: string | null;
  session: string | null;
};

export async function paymentList(): Promise<{ receipts: Receipt[]; waiting_receipt: number }> {
  const { data, error } = await db().rpc('staff_payment_list');
  if (error) throw error;
  const d = (data ?? {}) as { receipts?: Receipt[]; waiting_receipt?: number };
  return { receipts: d.receipts ?? [], waiting_receipt: d.waiting_receipt ?? 0 };
}
