'use server';

import { randomUUID } from 'node:crypto';
import { db } from '@/lib/supabase';
import { ID_BUCKET } from '@/lib/idDocs';

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024;

// Upload one ID photo for a registration in progress. It goes to the PRIVATE bucket under pending/<link token>/,
// and the registration step only accepts paths from its own link. Unused uploads are removed by the nightly cleanup.
export async function uploadIdPhoto(token: string, f: FormData): Promise<{ ok: true; path: string } | { ok: false }> {
  if (!/^[a-f0-9]{32,64}$/i.test(token)) return { ok: false };
  const { data: link } = await db().from('registration_links').select('token, expires_at').eq('token', token).maybeSingle();
  if (!link || new Date(link.expires_at) < new Date()) return { ok: false };
  const file = f.get('photo');
  if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) return { ok: false };
  const ext = TYPES[file.type];
  if (!ext) return { ok: false };
  const path = `pending/${token}/${randomUUID()}.${ext}`;
  const { error } = await db()
    .storage.from(ID_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) {
    console.error('id photo upload', error);
    return { ok: false };
  }
  return { ok: true, path };
}
