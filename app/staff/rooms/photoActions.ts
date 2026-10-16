'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { ROOM_SETTINGS_ROLES, staffWithRole } from '@/lib/staff';
import { ROOM_PHOTO_BUCKET } from '@/lib/rooms';

export type PhotoState = { ok: boolean; message: string } | null;

const MAX_PER_GROUP = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const UUID = /^[0-9a-f-]{36}$/;

// Upload one or more photos for a room type (or for the hotel itself when room_type_id is empty)
export async function uploadRoomPhotos(_prev: PhotoState, f: FormData): Promise<PhotoState> {
  const staff = await staffWithRole(ROOM_SETTINGS_ROLES);
  if (!staff) redirect('/staff/login');
  const hotelId = String(f.get('hotel_id') ?? '');
  const typeId = String(f.get('room_type_id') ?? '');
  if (!UUID.test(hotelId) || (typeId && !UUID.test(typeId))) return { ok: false, message: 'Hotel not found.' };
  const files = f.getAll('photos').filter((x): x is File => x instanceof File && x.size > 0);
  if (!files.length) return { ok: false, message: 'Choose at least one photo.' };

  const existing = db().from('room_photos').select('id, sort_order', { count: 'exact' }).eq('hotel_id', hotelId);
  const { data: have, count } = await (typeId ? existing.eq('room_type_id', typeId) : existing.is('room_type_id', null));
  const room = MAX_PER_GROUP - (count ?? 0);
  if (room <= 0) return { ok: false, message: `There are already ${MAX_PER_GROUP} photos here. Remove one first.` };
  let order = Math.max(0, ...(have ?? []).map((p) => p.sort_order + 1));

  let added = 0;
  const problems: string[] = [];
  for (const file of files.slice(0, room)) {
    const ext = TYPES[file.type];
    if (!ext) {
      problems.push(`${file.name}: not a photo`);
      continue;
    }
    if (file.size > MAX_BYTES) {
      problems.push(`${file.name}: too large`);
      continue;
    }
    const path = `${hotelId}/${typeId || 'hotel'}/${randomUUID()}.${ext}`;
    const { error: upErr } = await db()
      .storage.from(ROOM_PHOTO_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upErr) {
      console.error('room photo upload', upErr);
      problems.push(`${file.name}: upload failed`);
      continue;
    }
    const { error: dbErr } = await db()
      .from('room_photos')
      .insert({ hotel_id: hotelId, room_type_id: typeId || null, storage_path: path, sort_order: order++, created_by: staff.id });
    if (dbErr) {
      console.error('room photo save', dbErr);
      await db().storage.from(ROOM_PHOTO_BUCKET).remove([path]);
      problems.push(`${file.name}: couldn't be saved`);
      continue;
    }
    added++;
  }
  revalidatePath(`/staff/rooms/${hotelId}`);
  const skipped = files.length - Math.min(files.length, room);
  if (skipped > 0) problems.push(`${skipped} not added (the limit is ${MAX_PER_GROUP} photos)`);
  if (!added) return { ok: false, message: problems.join('; ') || 'No photos were added.' };
  return { ok: true, message: `${added} photo${added === 1 ? '' : 's'} added.${problems.length ? ' ' + problems.join('; ') + '.' : ''}` };
}

// Make a photo the cover, or remove it
export async function roomPhotoAction(f: FormData) {
  const staff = await staffWithRole(ROOM_SETTINGS_ROLES);
  if (!staff) redirect('/staff/login');
  const id = String(f.get('photo_id') ?? '');
  const action = String(f.get('action') ?? '');
  if (!UUID.test(id)) return;
  const { data: photo } = await db().from('room_photos').select('id, hotel_id, room_type_id, storage_path').eq('id', id).maybeSingle();
  if (!photo) return;
  if (action === 'cover') {
    const q = db().from('room_photos').select('sort_order').eq('hotel_id', photo.hotel_id);
    const { data: group } = await (photo.room_type_id ? q.eq('room_type_id', photo.room_type_id) : q.is('room_type_id', null));
    const min = Math.min(0, ...(group ?? []).map((g) => g.sort_order));
    await db().from('room_photos').update({ sort_order: min - 1 }).eq('id', id);
  } else if (action === 'remove') {
    await db().storage.from(ROOM_PHOTO_BUCKET).remove([photo.storage_path]);
    await db().from('room_photos').delete().eq('id', id);
  }
  revalidatePath(`/staff/rooms/${photo.hotel_id}`);
}
