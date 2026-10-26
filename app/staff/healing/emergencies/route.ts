import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/supabase';
import { HEALER_ROLES, staffWithRole } from '@/lib/staff';
import { LINK_SECONDS, PHOTO_BUCKET } from '@/lib/healing';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  note: string | null;
  status: 'waiting' | 'started';
  created_at: string;
  released_at: string | null;
  started_at: string | null;
  patients: { patient_code: string; full_name: string } | null;
  photos: { storage_path: string; status: string; checks: Record<string, unknown> | null; created_at: string; deleted_at: string | null }[] | null;
};

// GET: emergencies waiting or in progress (healing within 5 minutes, any time of day)
export async function GET() {
  if (!(await staffWithRole(HEALER_ROLES))) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data, error } = await db()
      .from('emergency_requests')
      .select('id, note, status, created_at, released_at, started_at, patients(patient_code, full_name), photos(storage_path, status, checks, created_at, deleted_at)')
      .in('status', ['waiting', 'started'])
      .gte('created_at', since)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as unknown as Row[];
    const paths = rows
      .map((r) => (r.photos ?? []).filter((p) => p.status !== 'rejected' && !p.deleted_at).sort((a, z) => z.created_at.localeCompare(a.created_at))[0]?.storage_path)
      .filter((p): p is string => !!p);
    const links: Record<string, string> = {};
    if (paths.length) {
      const { data: signed } = await db().storage.from(PHOTO_BUCKET).createSignedUrls(paths, LINK_SECONDS);
      for (const s of signed ?? []) if (s.signedUrl && s.path) links[s.path] = s.signedUrl;
    }
    return NextResponse.json({
      emergencies: rows.map((r) => {
        const ph = (r.photos ?? []).filter((p) => p.status !== 'rejected' && !p.deleted_at).sort((a, z) => z.created_at.localeCompare(a.created_at))[0];
        return {
          id: r.id,
          status: r.status,
          note: r.note ?? '',
          // waiting time counts from when it reached the healers (after the payment was verified)
          createdAt: r.released_at ?? r.created_at,
          startedAt: r.started_at,
          code: r.patients?.patient_code ?? '',
          name: (ph?.checks?.name as string) || r.patients?.full_name || '',
          illness: (ph?.checks?.illness as string) || '',
          photo: ph ? (links[ph.storage_path] ?? null) : null,
        };
      }),
    });
  } catch (err) {
    console.error('emergencies', err);
    return NextResponse.json({ error: "Couldn't load emergencies." }, { status: 500 });
  }
}

// POST { id, action: 'start' | 'done' }
export async function POST(req: NextRequest) {
  const staff = await staffWithRole(HEALER_ROLES);
  if (!staff) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? '');
  const action = String(body.action ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['start', 'done'].includes(action)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { error } = await db().rpc('staff_emergency_action', { p_id: id, p_action: action, p_staff: staff.id });
  if (error) {
    console.error('staff_emergency_action', error);
    return NextResponse.json({ error: "Couldn't save. Please try again." }, { status: 500 });
  }
  // Tell the patient on WhatsApp ("healing has started" / "healing is complete"). The n8n workflow
  // "NYL - Emergency Patient Update" sends each message only once. A failure here never blocks the healer.
  try {
    await fetch(process.env.EMERGENCY_UPDATE_HOOK_URL || 'https://n8n.srv1691210.hstgr.cloud/webhook/nyl-emergency-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error('emergency patient update', err);
  }
  return NextResponse.json({ ok: true });
}
