import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/supabase';
import { HEALER_ROLES, staffWithRole } from '@/lib/staff';

export const dynamic = 'force-dynamic';

// GET /staff/healing/slots?date=YYYY-MM-DD -> that day's healing times, with how many patients are booked
export async function GET(req: NextRequest) {
  // Every request checks the login itself
  if (!(await staffWithRole(HEALER_ROLES))) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const date = req.nextUrl.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Choose a valid date.' }, { status: 400 });

  try {
    const { data: slots, error } = await db()
      .from('distance_slots')
      .select('id, slot_no, healing_start, healing_end, status')
      .eq('slot_date', date)
      .order('healing_start', { ascending: true });
    if (error) throw error;

    const ids = (slots ?? []).map((s) => s.id);
    const counts: Record<string, number> = {};
    if (ids.length) {
      const { data: bookings, error: e2 } = await db()
        .from('distance_bookings')
        .select('slot_id')
        .in('slot_id', ids)
        .neq('status', 'cancelled');
      if (e2) throw e2;
      for (const b of bookings ?? []) counts[b.slot_id] = (counts[b.slot_id] ?? 0) + 1;
    }

    return NextResponse.json({
      slots: (slots ?? []).map((s) => ({
        id: s.id,
        no: s.slot_no,
        start: s.healing_start,
        end: s.healing_end,
        status: s.status,
        booked: counts[s.id] ?? 0,
      })),
    });
  } catch (err) {
    console.error('healing slots', err);
    return NextResponse.json({ error: "Couldn't load the healing times. Please reload." }, { status: 500 });
  }
}
