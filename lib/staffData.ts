import 'server-only';
import { db } from './supabase';

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export type TodaySummary = {
  date: string;
  checked_in: number;
  with_seat: number;
  seats_total: number;
  registrations: number;
  fees_pending: number;
  checkins: {
    attendance_id: string;
    seat: string | null;
    checked_in_at: string;
    patient_code: string;
    full_name: string;
    payment_status: string | null;
    payment_method: string | null;
    registration_today: boolean | null;
  }[];
};

export type DayPatient = {
  patient_code: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  city: string | null;
  wa_phone: string | null;
  registering_for: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  checked_in: boolean;
  seat: string | null;
  last_visit: string | null; // most recent visit on any day
  last_seat: string | null;
};
export type DayGroup = {
  group_id: string;
  created_at: string;
  patient_count: number;
  payment_method: string;
  payment_status: string;
  amount_due: number;
  paid_at: string | null;
  patients: DayPatient[];
};
export type DayBookings = {
  slot: { id: string; slot_date: string; starts_at: string | null; capacity: number; status: string } | null;
  groups: DayGroup[];
};

export type SearchRow = {
  patient_code: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  city: string | null;
  wa_phone: string | null;
  last_visit: string | null;
};

export type PatientDetail = {
  patient_code: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  city: string | null;
  wa_phone: string | null;
  language: string | null;
  source_channel: string | null;
  created_at: string;
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_phone: string | null;
  pass_token: string;
  health: { health_concerns: string; current_medicines: string | null; other_notes: string | null } | null;
  registrations: {
    slot_date: string;
    starts_at: string | null;
    registering_for: string | null;
    status: string;
    group_id: string | null;
    group_size: number | null;
    payment_method: string | null;
    payment_status: string | null;
    amount_due: number | null;
    paid_at: string | null;
  }[];
  visits: { visit_date: string; seat: string | null; checked_in_at: string }[];
};

export type SlotRow = {
  id: string;
  slot_date: string;
  starts_at: string | null;
  capacity: number;
  status: string;
  note: string | null;
  booked: number;
};

export const todaySummary = (centre: number) => rpc<TodaySummary>('staff_today_summary', { p_centre: centre });
export const dayBookings = (date: string, centre: number) => rpc<DayBookings>('staff_day_bookings', { p_date: date, p_centre: centre });
export const searchPatients = (q: string) => rpc<SearchRow[]>('staff_search_patients', { p_q: q });
export const patientDetail = (code: string) => rpc<PatientDetail | null>('staff_patient_detail', { p_code: code });
export const listSlots = (centre: number) => rpc<SlotRow[]>('staff_list_slots', { p_centre: centre });
