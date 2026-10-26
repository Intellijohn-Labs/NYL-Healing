import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/supabase';
import { FRONT_DESK_ROLES, staffWithRole } from '@/lib/staff';

export const dynamic = 'force-dynamic';

// POST { id, action: 'verify' | 'reject', reason? } -> then n8n tells the patient (and, for emergencies, the healers)
export async function POST(req: NextRequest) {
  const staff = await staffWithRole(FRONT_DESK_ROLES);
  if (!staff) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? '');
  const action = String(b.action ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['verify', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { error } =
    action === 'verify'
      ? await db().rpc('staff_verify_payment', { p_id: id, p_staff: staff.id })
      : await db().rpc('staff_reject_payment', { p_id: id, p_reason: String(b.reason ?? '').slice(0, 300), p_staff: staff.id });
  if (error) {
    if (error.message?.includes('ALREADY_DONE')) return NextResponse.json({ error: 'Someone has already handled this payment.' }, { status: 409 });
    console.error('payment action', error);
    return NextResponse.json({ error: "Couldn't save. Please try again." }, { status: 500 });
  }
  // Tell the patient on WhatsApp (n8n "NYL - Payment Result"); never blocks the staff member
  try {
    await fetch(process.env.PAYMENT_RESULT_HOOK_URL || 'https://n8n.srv1691210.hstgr.cloud/webhook/nyl-payment-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error('payment result hook', err);
  }
  return NextResponse.json({ ok: true });
}
