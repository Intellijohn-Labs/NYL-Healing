'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { ROOM_SETTINGS_ROLES, staffWithRole } from '@/lib/staff';

export type BState = { ok: boolean; message: string } | null;

const ERR: Record<string, string> = {
  NOT_FREE: 'No room of this type is free for all of these nights. Check the calendar or choose other dates.',
  ROOM_NOT_FREE: 'That room is already booked for some of these nights. Choose another room.',
  ROOM_BLOCKED: 'That room is blocked for some of these nights.',
  TOO_MANY_GUESTS: 'Too many guests for this room type.',
  PAST_DATE: "Check-in can't be in the past.",
  NEED_ROOM: 'Choose a room number before checking in.',
  WRONG_STATUS: "This can't be done for a booking with this status.",
  NOT_FOUND: 'Booking not found.',
  INVALID_INPUT: 'Please check the details.',
};
const friendly = (msg?: string) => {
  const code = Object.keys(ERR).find((k) => msg?.includes(k));
  return code ? ERR[code] : "Couldn't save. Please try again.";
};
const s = (f: FormData, k: string, max = 200) => String(f.get(k) ?? '').trim().slice(0, max);

export async function createBooking(_prev: BState, f: FormData): Promise<BState> {
  const staff = await staffWithRole(ROOM_SETTINGS_ROLES);
  if (!staff) redirect('/staff/login');
  const payload = {
    room_type_id: s(f, 'room_type_id', 40),
    room_id: s(f, 'room_id', 40),
    guest_name: s(f, 'guest_name', 120),
    guest_phone: s(f, 'guest_phone', 30),
    patient_code: s(f, 'patient_code', 20),
    guests: Number(s(f, 'guests', 3)) || 1,
    check_in: s(f, 'check_in', 10),
    check_out: s(f, 'check_out', 10),
    advance_paid: Number(s(f, 'advance_paid', 9)) || 0,
    notes: s(f, 'notes', 500),
  };
  if (!payload.guest_name) return { ok: false, message: "Please enter the guest's name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.check_in) || !/^\d{4}-\d{2}-\d{2}$/.test(payload.check_out))
    return { ok: false, message: 'Please choose the check-in and check-out dates.' };
  if (payload.check_out <= payload.check_in) return { ok: false, message: 'Check-out must be after check-in.' };
  const { data, error } = await db().rpc('hotel_create_booking', { p: payload, p_staff: staff.id });
  if (error) {
    if (!Object.keys(ERR).some((k) => error.message?.includes(k))) console.error('hotel_create_booking', error);
    return { ok: false, message: friendly(error.message) };
  }
  revalidatePath('/staff/rooms', 'layout');
  redirect(`/staff/rooms/bookings/${(data as { id: string }).id}?created=1`);
}

export async function bookingAction(_prev: BState, f: FormData): Promise<BState> {
  const staff = await staffWithRole(ROOM_SETTINGS_ROLES);
  if (!staff) redirect('/staff/login');
  const id = s(f, 'id', 40);
  const action = s(f, 'action', 20);
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, message: 'Booking not found.' };
  const p = { amount: Number(s(f, 'amount', 9)) || 0, room_id: s(f, 'room_id', 40), reason: s(f, 'reason', 300), notes: s(f, 'notes', 500) };
  const { error } = await db().rpc('hotel_booking_action', { p_id: id, p_action: action, p, p_staff: staff.id });
  if (error) {
    if (!Object.keys(ERR).some((k) => error.message?.includes(k))) console.error('hotel_booking_action', error);
    return { ok: false, message: friendly(error.message) };
  }
  revalidatePath('/staff/rooms', 'layout');
  const done: Record<string, string> = {
    advance: 'Advance recorded.',
    assign: 'Room saved.',
    check_in: 'Checked in.',
    check_out: 'Checked out.',
    cancel: 'Booking cancelled.',
    payment: 'Payment recorded.',
    note: 'Note saved.',
  };
  return { ok: true, message: done[action] ?? 'Saved.' };
}
