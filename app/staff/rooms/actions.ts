'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { ROOM_SETTINGS_ROLES, staffWithRole } from '@/lib/staff';

export type FormState = { ok: boolean; message: string } | null;

const manager = () => staffWithRole(ROOM_SETTINGS_ROLES);
const UUID = /^[0-9a-f-]{36}$/;
const str = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);
const opt = (f: FormData, k: string, max = 200) => str(f, k, max) || null;
const int = (f: FormData, k: string) => {
  const v = str(f, k, 12);
  if (v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};
const time = (f: FormData, k: string) => {
  const v = str(f, k, 8);
  return /^\d{2}:\d{2}/.test(v) ? v.slice(0, 5) : null;
};
const bad = (message: string): FormState => ({ ok: false, message });

function friendly(e: { message?: string; code?: string } | null, fallback: string) {
  if (!e) return fallback;
  if (e.code === '23505') return 'That name or room number is already used in this hotel.';
  if (e.code === '23503') return "This can't be removed because other records still use it.";
  if (e.code === '23514') return 'Please check the numbers: one of them is outside the allowed range.';
  console.error(e);
  return fallback;
}

// ---------- Hotels ----------

export async function addHotel(_prev: FormState, f: FormData): Promise<FormState> {
  const staff = await manager();
  if (!staff) redirect('/staff/login');
  const name = str(f, 'name', 120);
  if (!name) return bad('Please enter the hotel name.');
  const { data, error } = await db().from('hotels').insert({ name, updated_by: staff.id }).select('id').single();
  if (error) return bad(friendly(error, "Couldn't add the hotel."));
  revalidatePath('/staff/rooms');
  redirect(`/staff/rooms/${data.id}`);
}

export async function saveHotel(_prev: FormState, f: FormData): Promise<FormState> {
  const staff = await manager();
  if (!staff) redirect('/staff/login');
  const id = str(f, 'id', 40);
  if (!UUID.test(id)) return bad('Hotel not found.');
  const name = str(f, 'name', 120);
  const checkin = time(f, 'checkin_time');
  const checkout = time(f, 'checkout_time');
  const advanceType = str(f, 'advance_type', 10);
  const advanceValue = int(f, 'advance_value');
  const hold = int(f, 'hold_hours');
  const cancel = int(f, 'free_cancel_days');
  const who = str(f, 'who_can_book', 10);
  const maps = opt(f, 'maps_url', 500);

  if (!name) return bad('Please enter the hotel name.');
  if (!checkin || !checkout) return bad('Please set the check-in and check-out times.');
  if (!['fixed', 'percent', 'nights'].includes(advanceType)) return bad('Please choose how the advance is worked out.');
  if (advanceValue === null || Number.isNaN(advanceValue) || advanceValue < 0) return bad('Please enter the advance as a whole number.');
  if (advanceType === 'percent' && advanceValue > 100) return bad('The advance percent must be between 0 and 100.');
  if (advanceType === 'nights' && (advanceValue < 1 || advanceValue > 30)) return bad('The advance in nights must be between 1 and 30.');
  if (hold === null || Number.isNaN(hold) || hold < 1 || hold > 168) return bad('Hold time must be between 1 and 168 hours.');
  if (cancel === null || Number.isNaN(cancel) || cancel < 0 || cancel > 60) return bad('Free cancellation must be between 0 and 60 days.');
  if (!['patients', 'anyone'].includes(who)) return bad('Please choose who can book.');
  if (maps && !/^https:\/\//.test(maps)) return bad('The Google Maps link must start with https://');

  const { error } = await db()
    .from('hotels')
    .update({
      name,
      address: opt(f, 'address', 300),
      phone: opt(f, 'phone', 30),
      maps_url: maps,
      active: f.get('active') === 'on',
      checkin_time: checkin,
      checkout_time: checkout,
      advance_type: advanceType,
      advance_value: advanceValue,
      hold_hours: hold,
      free_cancel_days: cancel,
      who_can_book: who,
      upi_id: opt(f, 'upi_id', 80),
      payment_note: opt(f, 'payment_note', 300),
      updated_at: new Date().toISOString(),
      updated_by: staff.id,
    })
    .eq('id', id);
  if (error) return bad(friendly(error, "Couldn't save. Please try again."));
  revalidatePath('/staff/rooms', 'layout');
  return { ok: true, message: 'Hotel details saved.' };
}

// ---------- Room types ----------

export async function saveRoomType(_prev: FormState, f: FormData): Promise<FormState> {
  const staff = await manager();
  if (!staff) redirect('/staff/login');
  const id = str(f, 'id', 40);
  const hotelId = str(f, 'hotel_id', 40);
  if (!UUID.test(hotelId) || (id && !UUID.test(id))) return bad('Hotel not found.');
  const name = str(f, 'name', 80);
  const price = int(f, 'price_per_night');
  const maxGuests = int(f, 'max_guests');
  const baseGuests = int(f, 'base_guests');
  const extra = int(f, 'extra_guest_price') ?? 0;
  const lsNights = int(f, 'long_stay_nights');
  const lsPrice = int(f, 'long_stay_price');

  if (!name) return bad('Please enter a name, for example "AC Double".');
  if (price === null || Number.isNaN(price) || price < 0) return bad('Please enter the price per night.');
  if (!maxGuests || Number.isNaN(maxGuests) || maxGuests < 1 || maxGuests > 20) return bad('Max guests must be between 1 and 20.');
  if (!baseGuests || Number.isNaN(baseGuests) || baseGuests < 1 || baseGuests > maxGuests)
    return bad('"Guests included" must be between 1 and the max guests.');
  if (Number.isNaN(extra) || extra < 0) return bad('Extra guest price must be 0 or more.');
  if ((lsNights === null) !== (lsPrice === null)) return bad('For a long-stay price, fill in both the nights and the price (or leave both empty).');
  if (lsNights !== null && (Number.isNaN(lsNights) || lsNights < 2 || lsNights > 365)) return bad('Long stay must start from 2 to 365 nights.');
  if (lsPrice !== null && (Number.isNaN(lsPrice) || lsPrice < 0)) return bad('Long-stay price must be 0 or more.');

  const row = {
    hotel_id: hotelId,
    name,
    description: opt(f, 'description', 400),
    facilities: str(f, 'facilities', 300)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 15),
    price_per_night: price,
    max_guests: maxGuests,
    base_guests: baseGuests,
    extra_guest_price: extra,
    long_stay_nights: lsNights,
    long_stay_price: lsPrice,
    active: f.get('active') === 'on',
    updated_at: new Date().toISOString(),
    updated_by: staff.id,
  };
  const { error } = id ? await db().from('room_types').update(row).eq('id', id) : await db().from('room_types').insert(row);
  if (error) return bad(friendly(error, "Couldn't save the room type."));
  revalidatePath(`/staff/rooms/${hotelId}`);
  return { ok: true, message: id ? 'Room type saved.' : 'Room type added.' };
}

// ---------- Rooms ----------

// "101-110" adds 101 to 110; "101, 102, A1" adds those three
function parseLabels(input: string): string[] | null {
  const out: string[] = [];
  for (const part of input.split(',').map((p) => p.trim()).filter(Boolean)) {
    const range = part.match(/^([A-Za-z]*)(\d+)\s*[-–]\s*\1?(\d+)$/);
    if (range) {
      const [, prefix, a, b] = range;
      const from = Number(a);
      const to = Number(b);
      if (to < from || to - from > 200) return null;
      for (let n = from; n <= to; n++) out.push(`${prefix}${String(n).padStart(a.length, '0')}`.toUpperCase());
    } else if (/^[A-Za-z0-9\-]{1,12}$/.test(part)) {
      out.push(part.toUpperCase());
    } else {
      return null;
    }
  }
  return out.length ? [...new Set(out)] : null;
}

export async function addRooms(_prev: FormState, f: FormData): Promise<FormState> {
  const staff = await manager();
  if (!staff) redirect('/staff/login');
  const hotelId = str(f, 'hotel_id', 40);
  const typeId = str(f, 'room_type_id', 40);
  if (!UUID.test(hotelId) || !UUID.test(typeId)) return bad('Please choose a room type.');
  const labels = parseLabels(str(f, 'labels', 400));
  if (!labels) return bad('Enter room numbers like "101-110" or "101, 102, A1".');
  const { count } = await db().from('rooms').select('id', { count: 'exact', head: true }).eq('hotel_id', hotelId);
  const { error } = await db()
    .from('rooms')
    .insert(labels.map((label, i) => ({ hotel_id: hotelId, room_type_id: typeId, label, sort_order: (count ?? 0) + i })));
  if (error) return bad(friendly(error, "Couldn't add the rooms."));
  revalidatePath(`/staff/rooms/${hotelId}`);
  return { ok: true, message: `${labels.length} room${labels.length > 1 ? 's' : ''} added: ${labels.join(', ')}.` };
}

export async function roomAction(f: FormData) {
  const staff = await manager();
  if (!staff) redirect('/staff/login');
  const id = str(f, 'room_id', 40);
  const hotelId = str(f, 'hotel_id', 40);
  const action = str(f, 'action', 20);
  if (!UUID.test(id) || !UUID.test(hotelId)) return;
  if (action === 'on' || action === 'off') {
    await db().from('rooms').update({ active: action === 'on' }).eq('id', id);
  } else if (action === 'move') {
    const typeId = str(f, 'room_type_id', 40);
    if (UUID.test(typeId)) await db().from('rooms').update({ room_type_id: typeId }).eq('id', id);
  } else if (action === 'delete') {
    // Once bookings exist, a booked room is switched off instead of deleted
    await db().from('rooms').delete().eq('id', id);
  }
  revalidatePath(`/staff/rooms/${hotelId}`);
}

// ---------- Blocked dates ----------

export async function addBlock(_prev: FormState, f: FormData): Promise<FormState> {
  const staff = await manager();
  if (!staff) redirect('/staff/login');
  const roomId = str(f, 'room_id', 40);
  const hotelId = str(f, 'hotel_id', 40);
  const start = str(f, 'start_date', 10);
  const end = str(f, 'end_date', 10) || start;
  if (!UUID.test(roomId)) return bad('Please choose a room.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return bad('Please choose the dates.');
  if (end < start) return bad('The last day must be on or after the first day.');
  const { error } = await db()
    .from('room_blocks')
    .insert({ room_id: roomId, start_date: start, end_date: end, reason: opt(f, 'reason', 120), created_by: staff.id });
  if (error) return bad(friendly(error, "Couldn't block those dates."));
  revalidatePath(`/staff/rooms/${hotelId}`);
  return { ok: true, message: 'Dates blocked.' };
}

export async function removeBlock(f: FormData) {
  const staff = await manager();
  if (!staff) redirect('/staff/login');
  const id = str(f, 'block_id', 40);
  const hotelId = str(f, 'hotel_id', 40);
  if (UUID.test(id)) await db().from('room_blocks').delete().eq('id', id);
  revalidatePath(`/staff/rooms/${hotelId}`);
}
