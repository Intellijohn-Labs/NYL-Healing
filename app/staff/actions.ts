'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { getStaff, makeSession, SCAN_ROLES, SESSION_HOURS, STAFF_COOKIE } from '@/lib/staff';

// ---------- Login / logout ----------

export type LoginState = { error: string } | null;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  // A separate, throwaway client: signing in must not change the server's own database client
  const auth = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'Email or password is wrong.' };

  const { data: staff } = await db()
    .from('staff_users')
    .select('id, role, active')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();
  if (!staff || !staff.active || !SCAN_ROLES.includes(staff.role)) {
    return { error: "This account doesn't have access to the scanner. Ask the NYL admin." };
  }

  const jar = await cookies();
  jar.set(STAFF_COOKIE, makeSession(staff.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/staff',
    maxAge: SESSION_HOURS * 3600,
  });
  redirect('/staff/scan');
}

export async function logout() {
  const jar = await cookies();
  jar.delete({ name: STAFF_COOKIE, path: '/staff' });
  redirect('/staff/login');
}

// ---------- Scanner ----------

export type Card = {
  attendance_id: string;
  seat: string | null;
  checked_in_at: string;
  patient_code: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  city: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  visit_count: number;
  registration_day: string | null;
  payment_method: string | null;
  payment_status: string | null;
  amount_due: number | null;
};

export type ScanResult =
  | { result: 'checked_in' | 'already'; patient: Card }
  | { result: 'not_found' }
  | { result: 'signed_out' }
  | { result: 'error' };

export async function checkIn(code: string, station: string): Promise<ScanResult> {
  const staff = await getStaff();
  if (!staff) return { result: 'signed_out' };
  const clean = String(code ?? '').trim().slice(0, 300);
  if (!clean) return { result: 'not_found' };
  const { data, error } = await db().rpc('staff_check_in', {
    p_code: clean,
    p_staff: staff.id,
    p_station: String(station ?? '').slice(0, 40) || null,
  });
  if (error) {
    console.error('staff_check_in failed', error);
    return { result: 'error' };
  }
  return data as ScanResult;
}

export type SeatResult = { ok: true; patient: Card } | { ok: false; error: 'SEAT_TAKEN' | 'NOT_FOUND' | 'SIGNED_OUT' | 'GENERIC' };

export async function setSeat(attendanceId: string, seat: string): Promise<SeatResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: 'SIGNED_OUT' };
  if (!/^[0-9a-f-]{36}$/.test(attendanceId)) return { ok: false, error: 'NOT_FOUND' };
  const { data, error } = await db().rpc('staff_set_seat', {
    p_attendance: attendanceId,
    p_seat: String(seat ?? '').slice(0, 12),
    p_staff: staff.id,
  });
  if (error) {
    if (error.message?.includes('SEAT_TAKEN')) return { ok: false, error: 'SEAT_TAKEN' };
    if (error.message?.includes('NOT_FOUND')) return { ok: false, error: 'NOT_FOUND' };
    console.error('staff_set_seat failed', error);
    return { ok: false, error: 'GENERIC' };
  }
  return { ok: true, patient: data as Card };
}

export type TodayRow = { attendance_id: string; seat: string | null; checked_in_at: string; patient_code: string; full_name: string };

export async function todayCheckins(): Promise<TodayRow[]> {
  const staff = await getStaff();
  if (!staff) return [];
  const { data } = await db().rpc('staff_today_checkins', { p_centre: staff.centre_id ?? 1 });
  return (data ?? []) as TodayRow[];
}
