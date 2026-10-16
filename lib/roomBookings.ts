import 'server-only';
import { db } from './supabase';
import { roomPhotoUrl } from './rooms';

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

// ---------- Hotel cards and photos (for the Rooms screens) ----------

export type HotelCard = {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  cover: string | null;
  photos: string[];
  rooms: number;
  waiting: number;
};

export async function hotelCards(): Promise<HotelCard[]> {
  const [{ data: hotels }, { data: photos }, { data: rooms }, { data: holds }] = await Promise.all([
    db().from('hotels').select('id, name, address, active').order('sort_order').order('name'),
    db().from('room_photos').select('hotel_id, room_type_id, storage_path, sort_order, created_at').order('sort_order').order('created_at'),
    db().from('hotel_rooms').select('hotel_id').eq('active', true),
    db().from('hotel_bookings').select('hotel_id').eq('status', 'held'),
  ]);
  return (hotels ?? []).map((h) => {
    const own = (photos ?? []).filter((p) => p.hotel_id === h.id);
    // The hotel's own photos first; if it has none, use room photos
    const hotelPics = own.filter((p) => !p.room_type_id).map((p) => roomPhotoUrl(p.storage_path));
    const roomPics = own.filter((p) => p.room_type_id).map((p) => roomPhotoUrl(p.storage_path));
    const all = [...hotelPics, ...roomPics];
    return {
      ...h,
      cover: all[0] ?? null,
      photos: all,
      rooms: (rooms ?? []).filter((r) => r.hotel_id === h.id).length,
      waiting: (holds ?? []).filter((b) => b.hotel_id === h.id).length,
    } as HotelCard;
  });
}

// The chosen hotel (?hotel=) or the first open one, with cards for the switcher
export async function pickHotelCard(asked?: string) {
  const cards = await hotelCards();
  const hotel = cards.find((h) => h.id === asked) ?? cards.find((h) => h.active) ?? cards[0] ?? null;
  return { cards, hotel };
}

// Photos of each room type of a hotel, cover first
export async function typePhotos(hotelId: string): Promise<Record<string, string[]>> {
  const { data } = await db()
    .from('room_photos')
    .select('room_type_id, storage_path')
    .eq('hotel_id', hotelId)
    .not('room_type_id', 'is', null)
    .order('sort_order')
    .order('created_at');
  const out: Record<string, string[]> = {};
  for (const p of data ?? []) (out[p.room_type_id as string] ??= []).push(roomPhotoUrl(p.storage_path));
  return out;
}
