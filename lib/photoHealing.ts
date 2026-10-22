import 'server-only';
import { db } from './supabase';

// ---------- Settings (settings.key = 'photo_healing') ----------

export type SlotDef = { no: number; time: string }; // time = HH:MM, 24-hour, India time

export type PhotoHealingSettings = {
  tz: string;
  cutoff_minutes: number;
  duration_minutes: number;
  capacity: number;
  fee: number;
  days_ahead: number;
  emergency_fee: number; // extra fee for emergency photo healing (0 = not shown)
  emergency_alert_numbers: string[]; // WhatsApp numbers alerted for each emergency
  slots: SlotDef[]; // Monday to Saturday
  sunday_slots: SlotDef[];
  [other: string]: unknown; // any other keys already in the row are kept as they are
};

export const TZ = 'Asia/Kolkata';
export const MAX_SESSIONS = 3; // distance_slots.slot_no is limited to 1..3 by the database

// Used only when the settings row doesn't exist yet
export const DEFAULTS: PhotoHealingSettings = {
  tz: TZ,
  cutoff_minutes: 30,
  duration_minutes: 60,
  capacity: 100000,
  fee: 0,
  days_ahead: 7,
  emergency_fee: 0,
  emergency_alert_numbers: [],
  slots: [
    { no: 1, time: '06:30' },
    { no: 2, time: '14:30' },
    { no: 3, time: '21:30' },
  ],
  sunday_slots: [{ no: 3, time: '21:30' }],
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTime = (t: unknown): t is string => typeof t === 'string' && TIME_RE.test(t);

function cleanSlots(v: unknown): SlotDef[] | null {
  if (!Array.isArray(v)) return null;
  const out = v
    .map((s) => ({ no: Number((s as SlotDef)?.no), time: String((s as SlotDef)?.time ?? '').slice(0, 5) }))
    .filter((s) => Number.isInteger(s.no) && s.no >= 1 && s.no <= MAX_SESSIONS && isTime(s.time));
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

export async function readSettings(): Promise<{ settings: PhotoHealingSettings; exists: boolean; raw: Record<string, unknown> | null }> {
  const { data, error } = await db().from('settings').select('value').eq('key', 'photo_healing').maybeSingle();
  if (error) throw error;
  const raw = (data?.value ?? null) as Record<string, unknown> | null;
  const v = raw ?? {};
  const num = (k: string, d: number) => (typeof v[k] === 'number' && Number.isFinite(v[k]) ? (v[k] as number) : d);
  return {
    exists: !!raw,
    raw,
    settings: {
      ...v,
      tz: TZ,
      cutoff_minutes: num('cutoff_minutes', DEFAULTS.cutoff_minutes),
      duration_minutes: num('duration_minutes', DEFAULTS.duration_minutes),
      capacity: num('capacity', DEFAULTS.capacity),
      fee: num('fee', DEFAULTS.fee),
      days_ahead: num('days_ahead', DEFAULTS.days_ahead),
      emergency_fee: num('emergency_fee', DEFAULTS.emergency_fee),
      emergency_alert_numbers: Array.isArray(v.emergency_alert_numbers) ? (v.emergency_alert_numbers as unknown[]).map(String) : [],
      slots: cleanSlots(v.slots) ?? DEFAULTS.slots,
      sunday_slots: cleanSlots(v.sunday_slots) ?? DEFAULTS.sunday_slots,
    },
  };
}

// ---------- India time helpers (India has no daylight saving, so +05:30 is always right) ----------

export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

export function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export const isSunday = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
};

/** The moment a session starts: date + HH:MM in India time */
export const startAt = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);

/** HH:MM (India time) of a stored timestamp */
export const hhmmIST = (ts: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(new Date(ts));

/** The three times stored on a distance_slots row */
export function slotTimes(date: string, time: string, s: Pick<PhotoHealingSettings, 'duration_minutes' | 'cutoff_minutes'>) {
  const start = startAt(date, time);
  return {
    healing_start: start.toISOString(),
    healing_end: new Date(start.getTime() + s.duration_minutes * 60_000).toISOString(),
    booking_close_at: new Date(start.getTime() - s.cutoff_minutes * 60_000).toISOString(),
  };
}

// ---------- Upcoming days ----------

export type DistanceSlotRow = {
  id: string;
  slot_date: string;
  slot_no: number;
  healing_start: string;
  healing_end: string;
  booking_close_at: string;
  capacity: number;
  fee: number;
  status: string;
};

export type Session = {
  no: number;
  time: string; // HH:MM India time
  closeTime: string; // HH:MM India time ("photos close at")
  status: 'open' | 'closed' | 'cancelled';
  rowId: string | null; // null = only the default, no row for this day yet
  fromDefault: boolean; // true when the time is the default (no row, or row with the default time)
  added: boolean; // a session that isn't in the defaults for this day (added just for this day)
  photos: number;
  finished: boolean; // the session has already ended
};

export type DayPlan = { date: string; sunday: boolean; sessions: Session[] };

export async function upcomingDays(days = 7): Promise<{ settings: PhotoHealingSettings; settingsExist: boolean; plan: DayPlan[] }> {
  const { settings, exists } = await readSettings();
  const first = todayIST();
  const last = addDays(first, days - 1);

  const { data: rows, error } = await db()
    .from('distance_slots')
    .select('id, slot_date, slot_no, healing_start, healing_end, booking_close_at, capacity, fee, status')
    .gte('slot_date', first)
    .lte('slot_date', last);
  if (error) throw error;
  const slotRows = (rows ?? []) as DistanceSlotRow[];

  // Photos received = bookings for the slot that aren't cancelled
  const counts = new Map<string, number>();
  if (slotRows.length) {
    const { data: bookings, error: bErr } = await db()
      .from('distance_bookings')
      .select('slot_id, status')
      .in('slot_id', slotRows.map((r) => r.id))
      .neq('status', 'cancelled');
    if (bErr) throw bErr;
    for (const b of bookings ?? []) counts.set(b.slot_id, (counts.get(b.slot_id) ?? 0) + 1);
  }

  const now = Date.now();
  const plan: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(first, i);
    const sunday = isSunday(date);
    const defaults = sunday ? settings.sunday_slots : settings.slots;
    const byNo = new Map<number, Session>();

    for (const d of defaults) {
      const t = slotTimes(date, d.time, settings);
      byNo.set(d.no, {
        no: d.no,
        time: d.time,
        closeTime: hhmmIST(t.booking_close_at),
        status: 'open',
        rowId: null,
        fromDefault: true,
        added: false,
        photos: 0,
        finished: new Date(t.healing_end).getTime() < now,
      });
    }
    // A row for this day and session number overrides the default (same rule the bot uses)
    for (const r of slotRows.filter((x) => x.slot_date === date)) {
      const time = hhmmIST(r.healing_start);
      const def = defaults.find((d) => d.no === r.slot_no);
      byNo.set(r.slot_no, {
        no: r.slot_no,
        time,
        closeTime: hhmmIST(r.booking_close_at),
        status: (['open', 'closed', 'cancelled'].includes(r.status) ? r.status : 'open') as Session['status'],
        rowId: r.id,
        fromDefault: !!def && def.time === time,
        added: !def,
        photos: counts.get(r.id) ?? 0,
        finished: new Date(r.healing_end).getTime() < now,
      });
    }
    plan.push({ date, sunday, sessions: [...byNo.values()].sort((a, b) => a.time.localeCompare(b.time) || a.no - b.no) });
  }
  return { settings, settingsExist: exists, plan };
}
