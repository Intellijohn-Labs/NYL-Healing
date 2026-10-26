import { NextResponse, type NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /pay-qr?a=300&n=Photo+healing -> PNG UPI QR code for NYL's UPI ID (from the staff Photo screen) with the amount filled in.
// Sent by the WhatsApp bot as an image. Public: it only contains NYL's UPI ID and the amount.
export async function GET(req: NextRequest) {
  const amount = Math.round(Number(req.nextUrl.searchParams.get('a') || '0'));
  const note = (req.nextUrl.searchParams.get('n') || 'NYL Photo Healing').replace(/[^\w .,-]/g, '').slice(0, 40);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) return NextResponse.json({ error: 'Bad amount' }, { status: 400 });
  const { data } = await db().from('settings').select('value').eq('key', 'photo_healing').maybeSingle();
  const v = (data?.value ?? {}) as { upi_id?: string; upi_name?: string };
  const upi = String(v.upi_id ?? '').trim();
  if (!/^[\w.-]{2,}@[\w.-]{2,}$/.test(upi)) return NextResponse.json({ error: 'UPI not set' }, { status: 404 });
  const name = String(v.upi_name || 'NYL Healing').slice(0, 50);
  const link = `upi://pay?pa=${upi}&pn=${encodeURIComponent(name)}&am=${amount}.00&cu=INR&tn=${encodeURIComponent(note)}`;
  const png = await QRCode.toBuffer(link, { type: 'png', errorCorrectionLevel: 'M', margin: 3, width: 640, color: { dark: '#13294B', light: '#FFFFFF' } });
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
  });
}
