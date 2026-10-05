import 'server-only';
import QRCode from 'qrcode';
import { headers } from 'next/headers';
import type { PassData } from './types';

export type RawPass = {
  patient_code: string;
  pass_token: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  city: string | null;
  registering_for: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  slot_date?: string | null;
  starts_at?: string | null;
  issued_at?: string | null;
};

export async function siteUrl() {
  const fixed = process.env.NEXT_PUBLIC_SITE_URL;
  if (fixed) return fixed.replace(/\/$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

function ageFrom(dob: string | null) {
  if (!dob) return null;
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number);
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

export async function toPass(raw: RawPass, extra: { slot_date?: string; starts_at?: string | null; issued_at?: string } = {}): Promise<PassData> {
  const url = `${await siteUrl()}/p/${raw.pass_token}`;
  // The QR holds only the pass code, not a link: a normal phone camera shows just the code,
  // and reception's scanner page (/staff/scan) uses it to check the patient in.
  const svg = await QRCode.toString(`NYLPASS:${raw.pass_token}`, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#13294B', light: '#0000' } });
  return {
    patientCode: raw.patient_code,
    passToken: raw.pass_token,
    fullName: raw.full_name,
    age: ageFrom(raw.dob),
    gender: raw.gender ?? '',
    city: raw.city ?? '',
    registeringFor: raw.registering_for,
    guardianName: raw.guardian_name,
    guardianRelation: raw.guardian_relation,
    slotDate: (extra.slot_date ?? raw.slot_date ?? null)?.slice(0, 10) ?? null,
    startsAt: extra.starts_at ?? raw.starts_at ?? null,
    issuedAt: extra.issued_at ?? raw.issued_at ?? null,
    qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    url,
  };
}
