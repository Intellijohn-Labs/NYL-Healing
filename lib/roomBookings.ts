import 'server-only';
import { db } from './supabase';

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export type BookingStatus = 'held' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'expired';

export type BookingRow = {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_phone: string | null;
  guests: number;
  check_in: string;
  check_out: string;
  nights: number;
  type_name: string;
  room_label: string | null;
  status: BookingStatus;
  total: number;
  advance_due: number;
  advance_paid: number;
  balance_paid: number;
  balance_due: number;
  hold_until: string | null;
  patient_code?: string | null;
};

export type Dashboard = {
  today: string;
  rooms_total: number;
  occupied: number;
  booked_tonight: number;
  blocked_tonight: number;
  money_today: number;
  free_by_type: { type: string; free: number }[];
  arrivals: BookingRow[];
  departures: BookingRow[];
  in_house: BookingRow[];
  holds: BookingRow[];
};

export type Calendar = {
  from: string;
  to: string;
  types: { id: string; name: string; free: number[] }[];
  rooms: { id: string; label: string; type_id: string; type: string }[];
  bookings: { id: string; code: string; guest: string; room_id: string | null; type_id: string; check_in: string; check_out: string; status: BookingStatus }[];
  blocks: { room_id: string; start: string; end: string; reason: string | null }[];
};

export type BookingDetail = {
  booking: BookingRow & {
    hotel_id: string;
    room_type_id: string;
    room_id: string | null;
    price_per_night: number;
    extra_per_night: number;
    notes: string | null;
    cancel_reason: string | null;
    source: string;
    created_at: string;
    checked_in_at: string | null;
    checked_out_at: string | null;
  };
  hotel_name: string;
  type_name: string;
  room_label: string | null;
  patient_code: string | null;
  balance_due: number;
  free_rooms: { id: string; label: string }[];
  history: { at: string; action: string; by: string; details: Record<string, unknown> }[];
};

export type HotelOption = { id: string; name: string; active: boolean };

export async function hotelsList(): Promise<HotelOption[]> {
  const { data } = await db().from('hotels').select('id, name, active').order('sort_order').order('name');
  return (data ?? []) as HotelOption[];
}

// The hotel chosen in the address (?hotel=), otherwise the first open hotel
export async function pickHotel(asked?: string) {
  const hotels = await hotelsList();
  const hotel = hotels.find((h) => h.id === asked) ?? hotels.find((h) => h.active) ?? hotels[0] ?? null;
  return { hotels, hotel };
}

export const dashboard = (hotel: string) => rpc<Dashboard>('hotel_dashboard', { p_hotel: hotel });
export const calendar = (hotel: string, from: string, days: number) => rpc<Calendar>('hotel_calendar', { p_hotel: hotel, p_from: from, p_days: days });
export const bookingsList = (hotel: string, status: string, from: string | null, to: string | null, q: string) =>
  rpc<BookingRow[]>('hotel_bookings_list', { p_hotel: hotel, p_status: status, p_from: from, p_to: to, p_q: q });
export const bookingDetail = (id: string) => rpc<BookingDetail | null>('hotel_booking_detail', { p_id: id });

export async function bookableTypes(hotel: string) {
  const { data } = await db()
    .from('room_types')
    .select('id, name, max_guests, base_guests, price_per_night, extra_guest_price, long_stay_nights, long_stay_price')
    .eq('hotel_id', hotel)
    .eq('active', true)
    .order('sort_order')
    .order('name');
  return data ?? [];
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  held: 'Held · advance due',
  confirmed: 'Confirmed',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  cancelled: 'Cancelled',
  expired: 'Expired (not paid)',
};
