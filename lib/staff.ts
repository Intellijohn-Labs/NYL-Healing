import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './supabase';

export const STAFF_COOKIE = 'nyl_staff';
export const SESSION_HOURS = 12; // one working day
// Who may use which part of the staff app
export const FRONT_DESK_ROLES = ['owner', 'reception', 'gate']; // scanner, today, bookings, patients, days
export const ROOM_SETTINGS_ROLES = ['owner', 'rooms_manager']; // hotels, room types, prices, rooms
export const HEALER_ROLES = ['owner', 'healer']; // photo healing screen for the healers
export const STAFF_ROLES = [...new Set([...FRONT_DESK_ROLES, ...ROOM_SETTINGS_ROLES, ...HEALER_ROLES])]; // may sign in at all
export const SCAN_ROLES = FRONT_DESK_ROLES; // kept for older code

// Where each role lands after signing in
export const homeFor = (role: string) =>
  FRONT_DESK_ROLES.includes(role) ? '/staff/scan' : role === 'healer' ? '/staff/healing' : '/staff/rooms';

export type Staff = { id: string; name: string; role: string; centre_id: number | null };

function secret() {
  const s = process.env.STAFF_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('STAFF_SESSION_SECRET must be set (at least 32 characters)');
  return s;
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = (body: string) => createHmac('sha256', secret()).update(body).digest('base64url');

export function makeSession(staffId: string) {
  const body = b64(JSON.stringify({ sid: staffId, exp: Date.now() + SESSION_HOURS * 3600_000 }));
  return `${body}.${sign(body)}`;
}

function readSession(value: string | undefined): string | null {
  if (!value) return null;
  const [body, mac] = value.split('.');
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { sid, exp } = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof sid !== 'string' || typeof exp !== 'number' || exp < Date.now()) return null;
    return sid;
  } catch {
    return null;
  }
}

// The signed-in staff member, or null. Also re-checks they're still active.
export async function getStaff(): Promise<Staff | null> {
  const jar = await cookies();
  const sid = readSession(jar.get(STAFF_COOKIE)?.value);
  if (!sid) return null;
  const { data } = await db()
    .from('staff_users')
    .select('id, name, role, centre_id, active')
    .eq('id', sid)
    .maybeSingle();
  if (!data || !data.active || !STAFF_ROLES.includes(data.role)) return null;
  return { id: data.id, name: data.name, role: data.role, centre_id: data.centre_id };
}

// Signed in AND allowed on this screen; otherwise sent to sign-in or to their own home screen
export async function requireStaff(roles: string[] = FRONT_DESK_ROLES): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect('/staff/login');
  if (!roles.includes(staff.role)) redirect(homeFor(staff.role));
  return staff;
}

// For server actions: the staff member if they have one of these roles, else null
export async function staffWithRole(roles: string[]): Promise<Staff | null> {
  const staff = await getStaff();
  return staff && roles.includes(staff.role) ? staff : null;
}
