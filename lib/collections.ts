import 'server-only';
import { db } from './supabase';

// Registration fees marked paid at reception (offline class), from migration 017
export type Payment = {
  group_id: string;
  paid_at: string;
  paid_day: string;
  amount: number;
  patient_count: number;
  slot_date: string | null;
  paid_by: string;
  patients: string | null;
  wa_phone: string | null;
};

export async function collections(from: string, to: string): Promise<Payment[]> {
  const { data, error } = await db().rpc('staff_collections', { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

// Totals: overall, by staff member, by day
export function summarise(rows: Payment[]) {
  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const byStaff = new Map<string, { amount: number; count: number }>();
  const byDay = new Map<string, { amount: number; count: number }>();
  for (const r of rows) {
    const s = byStaff.get(r.paid_by) ?? { amount: 0, count: 0 };
    s.amount += r.amount ?? 0;
    s.count += 1;
    byStaff.set(r.paid_by, s);
    const d = byDay.get(r.paid_day) ?? { amount: 0, count: 0 };
    d.amount += r.amount ?? 0;
    d.count += 1;
    byDay.set(r.paid_day, d);
  }
  return {
    total,
    count: rows.length,
    byStaff: [...byStaff.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount),
    byDay: [...byDay.entries()].map(([day, v]) => ({ day, ...v })).sort((a, b) => b.day.localeCompare(a.day)),
  };
}

export const isDay = (s: string | undefined | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
