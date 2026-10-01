import 'server-only';
import { db } from './supabase';
import { isLang, type Lang } from './i18n';

import type { Slot } from './types';

export type Link = { token: string; language: Lang };

const TOKEN_RE = /^[a-f0-9]{36}$/;

export async function getLink(token: string): Promise<Link | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await db()
    .from('registration_links')
    .select('token, language, expires_at')
    .eq('token', token)
    .maybeSingle();
  if (error) throw error;
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return { token: data.token, language: isLang(data.language) ? data.language : 'en' };
}

export async function getSlots(): Promise<Slot[]> {
  const { data, error } = await db().rpc('available_registration_slots', { p_centre: 1 });
  if (error) throw error;
  return (data ?? []).map((s: Slot) => ({
    id: s.id,
    slot_date: s.slot_date,
    starts_at: s.starts_at,
    remaining: s.remaining,
  }));
}
