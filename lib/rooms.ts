import 'server-only';
import { db } from './supabase';

export type Hotel = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  maps_url: string | null;
  active: boolean;
  checkin_time: string;
  checkout_time: string;
  advance_type: 'fixed' | 'percent' | 'nights';
  advance_value: number;
  hold_hours: number;
  free_cancel_days: number;
  who_can_book: 'patients' | 'anyone';
  upi_id: string | null;
  payment_note: string | null;
  sort_order: number;
};

export type RoomType = {
  id: string;
  hotel_id: string;
  name: string;
  description: string | null;
  facilities: string[];
  max_guests: number;
  base_guests: number;
  price_per_night: number;
  extra_guest_price: number;
  long_stay_nights: number | null;
  long_stay_price: number | null;
  active: boolean;
  sort_order: number;
};

export type Room = { id: string; hotel_id: string; room_type_id: string; label: string; active: boolean; sort_order: number };
export type RoomPhoto = { id: string; room_type_id: string | null; storage_path: string; sort_order: number; url: string };

// Room photos are in a public bucket, so their address is fixed
export const ROOM_PHOTO_BUCKET = 'room-photos';
export const roomPhotoUrl = (path: string) =>
  `${process.env.SUPABASE_URL}/storage/v1/object/public/${ROOM_PHOTO_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;

export type RoomBlock = { id: string; room_id: string; start_date: string; end_date: string; reason: string | null };

export type HotelSummary = Hotel & { type_count: number; room_count: number; active_room_count: number };

export async function listHotels(): Promise<HotelSummary[]> {
  const [{ data: hotels, error }, { data: types }, { data: rooms }] = await Promise.all([
    db().from('hotels').select('*').order('sort_order').order('name'),
    db().from('room_types').select('id, hotel_id'),
    db().from('hotel_rooms').select('id, hotel_id, active'),
  ]);
  if (error) throw error;
  return (hotels ?? []).map((h: Hotel) => ({
    ...h,
    type_count: (types ?? []).filter((t: { hotel_id: string }) => t.hotel_id === h.id).length,
    room_count: (rooms ?? []).filter((r: { hotel_id: string }) => r.hotel_id === h.id).length,
    active_room_count: (rooms ?? []).filter((r: { hotel_id: string; active: boolean }) => r.hotel_id === h.id && r.active).length,
  }));
}

export async function getHotel(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const { data: hotel } = await db().from('hotels').select('*').eq('id', id).maybeSingle();
  if (!hotel) return null;
  const [{ data: types }, { data: rooms }] = await Promise.all([
    db().from('room_types').select('*').eq('hotel_id', id).order('sort_order').order('name'),
    db().from('hotel_rooms').select('*').eq('hotel_id', id).order('sort_order').order('label'),
  ]);
  const roomIds = (rooms ?? []).map((r: Room) => r.id);
  const { data: blocks } = roomIds.length
    ? await db().from('room_blocks').select('*').in('room_id', roomIds).gte('end_date', today).order('start_date')
    : { data: [] };
  const { data: photos } = await db()
    .from('room_photos')
    .select('id, room_type_id, storage_path, sort_order')
    .eq('hotel_id', id)
    .order('sort_order')
    .order('created_at');
  return {
    hotel: hotel as Hotel,
    types: (types ?? []) as RoomType[],
    rooms: (rooms ?? []) as Room[],
    blocks: (blocks ?? []) as RoomBlock[],
    photos: (photos ?? []).map((p) => ({ ...p, url: roomPhotoUrl(p.storage_path) })) as RoomPhoto[],
  };
}
