import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/supabase';
import { HEALER_ROLES, staffWithRole } from '@/lib/staff';
import { LINK_SECONDS, PHOTO_BUCKET } from '@/lib/healing';
import { isDisease } from '@/lib/diseases';
import { diseasesInText } from '@/lib/diseaseWords';

export const dynamic = 'force-dynamic';

type PhotoRow = { id: string; storage_path: string; status: string; checks: Record<string, unknown> | null; created_at: string; deleted_at: string | null };
type BookingRow = {
  id: string;
  daily_index: number;
  status: string;
  patients: {
    patient_code: string;
    full_name: string;
    patient_health: { diseases: string[] | null } | { diseases: string[] | null }[] | null;
  } | null;
  photos: PhotoRow[] | null;
};

// GET /staff/healing/patients?slot=<distance_slots.id> -> bookings in number order, each with its newest usable photo
export async function GET(req: NextRequest) {
  if (!(await staffWithRole(HEALER_ROLES))) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const slot = req.nextUrl.searchParams.get('slot') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(slot)) return NextResponse.json({ error: 'Choose a healing time.' }, { status: 400 });

  try {
    const { data, error } = await db()
      .from('distance_bookings')
      .select(
        'id, daily_index, status, patients(patient_code, full_name, patient_health(diseases)), photos(id, storage_path, status, checks, created_at, deleted_at)',
      )
      .eq('slot_id', slot)
      .neq('status', 'cancelled')
      .order('daily_index', { ascending: true });
    if (error) throw error;

    const rows = ((data ?? []) as unknown as BookingRow[]).map((b) => {
      // The newest photo that wasn't replaced, rejected or removed
      const photo = (b.photos ?? [])
        .filter((p) => p.status !== 'rejected' && !p.deleted_at)
        .sort((a, z) => String(z.created_at).localeCompare(String(a.created_at)))[0];
      const c = (photo?.checks ?? {}) as Record<string, unknown>;
      const ai = (c.ai_check ?? {}) as { status?: string; problems?: string[] };
      // Diseases: ticked on the web form + chosen in WhatsApp + recognised in the typed illness
      const ph = b.patients?.patient_health;
      const ticked = (Array.isArray(ph) ? ph[0]?.diseases : ph?.diseases) ?? [];
      const chosen = Array.isArray(c.diseases) ? (c.diseases as unknown[]) : [];
      const diseases = [...new Set([...ticked, ...chosen].filter(isDisease).concat(diseasesInText(c.illness as string)))];
      return {
        id: b.id,
        number: b.daily_index,
        diseases,
        code: b.patients?.patient_code ?? '',
        name: (c.name as string) || b.patients?.full_name || '',
        age: (c.age as number | null) ?? null,
        illness: (c.illness as string) || '',
        district: (c.district as string) || '',
        // Gemini's photo check: flag photos the healer should look at closely
        check: ai.status === 'accepted_after_retries' || ai.status === 'not_checked' ? ai.status : null,
        problems: Array.isArray(ai.problems) ? ai.problems : [],
        path: photo?.storage_path ?? null,
      };
    });

    const paths = rows.map((r) => r.path).filter((p): p is string => !!p);
    const links: Record<string, string> = {};
    if (paths.length) {
      const { data: signed, error: e2 } = await db().storage.from(PHOTO_BUCKET).createSignedUrls(paths, LINK_SECONDS);
      if (e2) throw e2;
      for (const s of signed ?? []) if (s.signedUrl && s.path) links[s.path] = s.signedUrl;
    }

    return NextResponse.json({
      patients: rows.map(({ path, ...r }) => ({ ...r, photo: path ? (links[path] ?? null) : null })),
    });
  } catch (err) {
    console.error('healing patients', err);
    return NextResponse.json({ error: "Couldn't load the patients for this time. Please reload." }, { status: 500 });
  }
}
