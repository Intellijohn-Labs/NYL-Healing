import { NextResponse, type NextRequest } from 'next/server';
import { FRONT_DESK_ROLES, staffWithRole } from '@/lib/staff';
import { collections, isDay } from '@/lib/collections';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const ist = (ts: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short', hour12: true }).format(new Date(ts));

// GET /staff/collections/download?from=YYYY-MM-DD&to=YYYY-MM-DD -> CSV that opens in Excel
export async function GET(req: NextRequest) {
  if (!(await staffWithRole(FRONT_DESK_ROLES))) return NextResponse.redirect(new URL('/staff/login', req.url));
  let from = req.nextUrl.searchParams.get('from');
  let to = req.nextUrl.searchParams.get('to');
  if (!isDay(from) || !isDay(to)) return NextResponse.json({ error: 'Choose the dates.' }, { status: 400 });
  if (to < from) [from, to] = [to, from];
  const rows = await collections(from, to);
  const head = ['Paid on (India time)', 'Amount (Rs)', 'Patients', 'People', 'Registration day', 'WhatsApp', 'Marked paid by'];
  const lines = rows.map((r) => [ist(r.paid_at), r.amount, r.patients ?? '', r.patient_count, r.slot_date ?? '', r.wa_phone ?? '', r.paid_by]);
  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const csv = '\uFEFF' + [head, ...lines, [], ['Total', total, `${rows.length} payments`]].map((l) => l.map(cell).join(',')).join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="nyl-collections-${from}${from === to ? '' : '-to-' + to}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
