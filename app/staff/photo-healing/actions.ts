'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { FRONT_DESK_ROLES, staffWithRole, type Staff } from '@/lib/staff';
import { t12 } from '@/lib/time12';
import {
  addDays,
  hhmmIST,
  isSunday,
  isTime,
  MAX_SESSIONS,
  readSettings,
  slotTimes,
  startAt,
  todayIST,
  TZ,
  type DistanceSlotRow,
  type PhotoHealingSettings,
  type SlotDef,
} from '@/lib/photoHealing';

export type PhState =
  | { ok: true; message: string }
  | { ok: false; message: string; needConfirm?: boolean; photos?: number }
  | null;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const fail = (message: string): PhState => ({ ok: false, message });

async function staffOrLogin(): Promise<Staff> {
  const staff = await staffWithRole(FRONT_DESK_ROLES);
  if (!staff) redirect('/staff/login');
  return staff;
}

// action_log is append-only: insert, never update or delete
async function log(staff: Staff, action: 'slot_updated' | 'photo_healing_defaults_updated', details: Record<string, unknown>) {
  const { error } = await db()
    .from('action_log')
    .insert({ module: 'distance', action, actor_type: 'staff', actor_id: staff.id, details: { ...details, staff_name: staff.name } });
  if (error) console.error('action_log insert failed', error);
}

function validDate(date: string) {
  const today = todayIST();
  return DATE_RE.test(date) && date >= today && date <= addDays(today, 13);
}

async function getRow(date: string, no: number): Promise<DistanceSlotRow | null> {
  const { data, error } = await db()
    .from('distance_slots')
    .select('id, slot_date, slot_no, healing_start, healing_end, booking_close_at, capacity, fee, status')
    .eq('slot_date', date)
    .eq('slot_no', no)
    .maybeSingle();
  if (error) throw error;
  return (data as DistanceSlotRow) ?? null;
}

async function photoCount(rowId: string | null) {
  if (!rowId) return 0;
  const { count } = await db()
    .from('distance_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('slot_id', rowId)
    .neq('status', 'cancelled');
  return count ?? 0;
}

/**
 * Update the day's row for this session (keeping its id, because bookings point to it),
 * or create it if there isn't one yet. If the bot creates the row at the same moment,
 * the insert fails on the unique (slot_date, slot_no) and we update that row instead.
 */
async function saveRow(
  date: string,
  no: number,
  patch: Partial<DistanceSlotRow>,
  newRow: () => Omit<DistanceSlotRow, 'id'>,
): Promise<DistanceSlotRow> {
  const existing = await getRow(date, no);
  if (existing) {
    const { data, error } = await db().from('distance_slots').update(patch).eq('id', existing.id).select().single();
    if (error) throw error;
    return data as DistanceSlotRow;
  }
  const { data, error } = await db().from('distance_slots').insert(newRow()).select().single();
  if (!error) return data as DistanceSlotRow;
  if (error.code !== '23505') throw error;
  const raced = await getRow(date, no);
  if (!raced) throw error;
  const { data: d2, error: e2 } = await db().from('distance_slots').update(patch).eq('id', raced.id).select().single();
  if (e2) throw e2;
  return d2 as DistanceSlotRow;
}

function defaultTime(settings: PhotoHealingSettings, date: string, no: number) {
  return (isSunday(date) ? settings.sunday_slots : settings.slots).find((s) => s.no === no)?.time ?? null;
}

const fullRow = (settings: PhotoHealingSettings, date: string, no: number, time: string, status: string) => () => ({
  slot_date: date,
  slot_no: no,
  ...slotTimes(date, time, settings),
  capacity: settings.capacity > 0 ? settings.capacity : 100000,
  fee: settings.fee ?? 0,
  status,
});

function done(date: string, message: string): PhState {
  revalidatePath('/staff/photo-healing');
  return { ok: true, message };
}

// ---------- Change a session's time for one day ----------

export async function changeTime(_prev: PhState, f: FormData): Promise<PhState> {
  const staff = await staffOrLogin();
  const date = String(f.get('date') ?? '');
  const no = Number(f.get('no'));
  const time = String(f.get('time') ?? '').slice(0, 5);
  const confirmed = f.get('confirm') === '1';
  if (!validDate(date) || !Number.isInteger(no) || no < 1 || no > MAX_SESSIONS) return fail('This session could not be found.');
  if (!isTime(time)) return fail('Please choose a time.');
  if (startAt(date, time).getTime() <= Date.now()) return fail('That time has already passed. Please choose a later time.');

  try {
    const { settings } = await readSettings();
    const row = await getRow(date, no);
    const oldTime = row ? hhmmIST(row.healing_start) : defaultTime(settings, date, no);
    if (!row && !oldTime) return fail('This session could not be found.');
    if (oldTime === time) return { ok: true, message: 'No change: that is already the time.' };

    const photos = await photoCount(row?.id ?? null);
    if (photos > 0 && !confirmed) {
      return {
        ok: false,
        needConfirm: true,
        photos,
        message: `${photos} photo${photos === 1 ? ' has' : 's have'} already been sent for this session. Those patients were told the old time and won't be told about the change automatically.`,
      };
    }

    const saved = await saveRow(date, no, slotTimes(date, time, settings), fullRow(settings, date, no, time, 'open'));
    await log(staff, 'slot_updated', {
      change: 'time',
      date,
      slot_no: no,
      slot_id: saved.id,
      old_time: oldTime,
      new_time: time,
      status: saved.status,
      photos,
      tz: TZ,
    });
    return done(date, `Session ${no} moved to ${t12(time)}.`);
  } catch (e) {
    console.error('changeTime failed', e);
    return fail("Couldn't save. Please try again.");
  }
}

// ---------- Close or reopen a session for one day ----------

export async function setStatus(_prev: PhState, f: FormData): Promise<PhState> {
  const staff = await staffOrLogin();
  const date = String(f.get('date') ?? '');
  const no = Number(f.get('no'));
  const status = String(f.get('status') ?? '');
  const confirmed = f.get('confirm') === '1';
  if (!validDate(date) || !Number.isInteger(no) || no < 1 || no > MAX_SESSIONS) return fail('This session could not be found.');
  if (status !== 'open' && status !== 'closed') return fail('Unknown change.');

  try {
    const { settings } = await readSettings();
    const row = await getRow(date, no);
    const oldStatus = row?.status ?? 'open';
    if (oldStatus === status) return { ok: true, message: status === 'closed' ? 'Already closed.' : 'Already open.' };

    if (status === 'closed') {
      const photos = await photoCount(row?.id ?? null);
      if (photos > 0 && !confirmed) {
        return {
          ok: false,
          needConfirm: true,
          photos,
          message: `${photos} photo${photos === 1 ? ' has' : 's have'} already been sent for this session. Closing stops new photos, but those patients won't be told automatically.`,
        };
      }
      const time = row ? hhmmIST(row.healing_start) : defaultTime(settings, date, no);
      if (!time) return fail('This session could not be found.');
      const saved = await saveRow(date, no, { status: 'closed' }, fullRow(settings, date, no, time, 'closed'));
      await log(staff, 'slot_updated', { change: 'closed', date, slot_no: no, slot_id: saved.id, time, old_status: oldStatus, new_status: 'closed', photos, tz: TZ });
      return done(date, `Session ${no} closed for this day.`);
    }

    // Reopen: only needed when a row exists (no row = it's open by default)
    if (!row) return { ok: true, message: 'Already open.' };
    const { error } = await db().from('distance_slots').update({ status: 'open' }).eq('id', row.id);
    if (error) throw error;
    await log(staff, 'slot_updated', {
      change: 'reopened',
      date,
      slot_no: no,
      slot_id: row.id,
      time: hhmmIST(row.healing_start),
      old_status: oldStatus,
      new_status: 'open',
      photos: await photoCount(row.id),
      tz: TZ,
    });
    return done(date, `Session ${no} reopened.`);
  } catch (e) {
    console.error('setStatus failed', e);
    return fail("Couldn't save. Please try again.");
  }
}

// ---------- Add a session to one day ----------

export async function addSession(_prev: PhState, f: FormData): Promise<PhState> {
  const staff = await staffOrLogin();
  const date = String(f.get('date') ?? '');
  const no = Number(f.get('no'));
  const time = String(f.get('time') ?? '').slice(0, 5);
  if (!validDate(date)) return fail('This day could not be found.');
  if (!Number.isInteger(no) || no < 1 || no > MAX_SESSIONS) return fail('Please choose a session number.');
  if (!isTime(time)) return fail('Please choose a time.');
  if (startAt(date, time).getTime() <= Date.now()) return fail('That time has already passed. Please choose a later time.');

  try {
    const { settings } = await readSettings();
    const row = await getRow(date, no);
    if (row || defaultTime(settings, date, no)) {
      return fail(`Session ${no} already exists on this day. Use "Change time" on it instead.`);
    }
    const { data, error } = await db().from('distance_slots').insert(fullRow(settings, date, no, time, 'open')()).select('id').single();
    if (error) {
      if (error.code === '23505') return fail(`Session ${no} was just added by someone else. Refresh the page.`);
      throw error;
    }
    await log(staff, 'slot_updated', { change: 'added', date, slot_no: no, slot_id: data.id, old_time: null, new_time: time, new_status: 'open', photos: 0, tz: TZ });
    return done(date, `Session ${no} added at ${t12(time)}.`);
  } catch (e) {
    console.error('addSession failed', e);
    return fail("Couldn't add the session. Please try again.");
  }
}

// ---------- Default times (settings.photo_healing) ----------

function checkList(list: unknown, label: string): SlotDef[] | string {
  if (!Array.isArray(list)) return `${label}: please add the sessions again.`;
  if (list.length > MAX_SESSIONS) return `${label}: at most ${MAX_SESSIONS} sessions.`;
  const out: SlotDef[] = [];
  for (const s of list) {
    const no = Number((s as SlotDef)?.no);
    const time = String((s as SlotDef)?.time ?? '').slice(0, 5);
    if (!Number.isInteger(no) || no < 1 || no > MAX_SESSIONS) return `${label}: session numbers must be 1 to ${MAX_SESSIONS}.`;
    if (!isTime(time)) return `${label}: please set a time for every session.`;
    if (out.some((o) => o.no === no)) return `${label}: session ${no} is listed twice.`;
    if (out.some((o) => o.time === time)) return `${label}: two sessions have the same time (${t12(time)}).`;
    out.push({ no, time });
  }
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export async function saveDefaults(_prev: PhState, f: FormData): Promise<PhState> {
  const staff = await staffOrLogin();
  let input: {
    slots?: unknown;
    sunday_slots?: unknown;
    cutoff_minutes?: unknown;
    emergency_fee?: unknown;
    emergency_alert_numbers?: unknown;
    fee?: unknown;
    upi_id?: unknown;
    upi_name?: unknown;
  };
  try {
    input = JSON.parse(String(f.get('payload') ?? '{}'));
  } catch {
    return fail('Something went wrong. Please reload the page.');
  }
  const slots = checkList(input.slots, 'Monday to Saturday');
  if (typeof slots === 'string') return fail(slots);
  const sunday = checkList(input.sunday_slots, 'Sunday');
  if (typeof sunday === 'string') return fail(sunday);
  const cutoff = Number(input.cutoff_minutes);
  if (!Number.isInteger(cutoff) || cutoff < 0 || cutoff > 180) return fail('Photos close: please enter 0 to 180 minutes.');
  const efee = Number(input.emergency_fee ?? 0);
  if (!Number.isInteger(efee) || efee < 0 || efee > 100000) return fail('Emergency fee: please enter an amount from 0 to 1,00,000.');
  // WhatsApp numbers for the emergency alert: digits only, Indian 10-digit numbers get 91 in front
  const alertNums = String(input.emergency_alert_numbers ?? '')
    .split(/[\n,;]+/)
    .map((x) => x.replace(/\D/g, ''))
    .filter(Boolean)
    .map((x) => (x.length === 10 ? '91' + x : x));
  if (alertNums.some((x) => x.length < 11 || x.length > 15)) return fail('Emergency alert numbers: please enter full WhatsApp numbers, one per line.');
  if (alertNums.length > 10) return fail('Emergency alert numbers: at most 10 numbers.');
  const fee = Number(input.fee ?? 0);
  if (!Number.isInteger(fee) || fee < 0 || fee > 100000) return fail('Photo healing fee: please enter an amount from 0 to 1,00,000.');
  const upiId = String(input.upi_id ?? '').trim();
  if (upiId && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upiId)) return fail('UPI ID: please enter it like nylhealing@okaxis.');
  const upiName = String(input.upi_name ?? '').trim().slice(0, 50) || 'NYL Healing';

  try {
    const { settings, raw } = await readSettings();
    // Keep every key already in the row; only set the ones this screen manages
    const value = {
      ...(raw ?? {}),
      tz: TZ,
      cutoff_minutes: cutoff,
      duration_minutes: settings.duration_minutes,
      capacity: settings.capacity,
      days_ahead: settings.days_ahead,
      emergency_fee: efee,
      emergency_alert_numbers: [...new Set(alertNums)],
      fee,
      upi_id: upiId,
      upi_name: upiName,
      slots,
      sunday_slots: sunday,
    };
    const { error } = await db()
      .from('settings')
      .upsert({ key: 'photo_healing', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    await log(staff, 'photo_healing_defaults_updated', {
      old: raw
        ? { slots: raw.slots ?? null, sunday_slots: raw.sunday_slots ?? null, cutoff_minutes: raw.cutoff_minutes ?? null, emergency_fee: raw.emergency_fee ?? null }
        : null,
      new: { slots, sunday_slots: sunday, cutoff_minutes: cutoff, emergency_fee: efee },
    });
    revalidatePath('/staff/photo-healing');
    return { ok: true, message: 'Default times saved.' };
  } catch (e) {
    console.error('saveDefaults failed', e);
    return fail("Couldn't save. Please try again.");
  }
}

