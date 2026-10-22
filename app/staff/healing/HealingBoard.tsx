'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DISEASES, diseaseLabel } from '@/lib/diseases';

const TZ = 'Asia/Kolkata';
const REFRESH_MS = 60 * 1000; // new bookings and fresh photo links every minute

type Slot = { id: string; no: number; start: string; end: string; status: string; booked: number };
type Patient = {
  id: string;
  number: number;
  code: string;
  name: string;
  age: number | null;
  illness: string;
  district: string;
  emergency: boolean;
  emergencyNote: string;
  diseases: string[];
  check: 'accepted_after_retries' | 'not_checked' | null;
  problems: string[];
  photo: string | null;
};

const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const timeLabel = (iso: string) =>
  iso ? new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).toUpperCase() : '';
function dayLabel(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}
// Phone: 10 per page (2 x 5). Tablet/laptop: 20. Big screen or TV: 40. Matches the grid columns in globals.css.
const pageSizeFor = (w: number) => (w >= 1300 ? 40 : w >= 700 ? 20 : 10);
// Default healing time: the one happening now or next; otherwise the last one of the day
function pickDefaultSlot(slots: Slot[]) {
  if (!slots.length) return null;
  const now = Date.now();
  const current = slots.find((s) => new Date(s.end || s.start).getTime() > now);
  return (current || slots[slots.length - 1]).id;
}
async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 401) {
    window.location.href = '/staff/login';
    throw new Error('Please sign in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Reload the page.');
  return data as T;
}
const metaLine = (p: Patient) => [p.age != null ? p.age + ' yrs' : '', p.district].filter(Boolean).join(', ');
const PROBLEM: Record<string, string> = {
  eyes_open: 'eyes open',
  not_clothed: 'not clothed',
  distorted: 'distorted proportions',
  unclear: 'not clear',
  no_person: 'person not clearly visible',
};
const checkNote = (p: Patient) =>
  p.check === 'not_checked'
    ? 'Photo not checked by AI'
    : 'Check photo: ' + (p.problems.map((x) => PROBLEM[x] || x).join(', ') || 'see photo');

export default function HealingBoard() {
  const [date, setDate] = useState(todayIST);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState<number | null>(null); // index into the shown (filtered) list
  const [picked, setPicked] = useState<string[]>([]); // disease filter ('none' = no disease given)
  const touch = useRef<number | null>(null);

  useEffect(() => {
    const update = () => setPerPage(pageSizeFor(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const loadSlots = useCallback(
    async (keepSelection: boolean) => {
      try {
        const data = await getJSON<{ slots: Slot[] }>('/staff/healing/slots?date=' + date);
        const list = data.slots || [];
        setSlots(list);
        setSlotId((prev) => (keepSelection && list.some((s) => s.id === prev) ? prev : pickDefaultSlot(list)));
        setError('');
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoadingSlots(false);
      }
    },
    [date],
  );

  const loadPatients = useCallback(async () => {
    if (!slotId) {
      setPatients([]);
      return;
    }
    try {
      const data = await getJSON<{ patients: Patient[] }>('/staff/healing/patients?slot=' + slotId);
      setPatients(data.patients || []);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingPatients(false);
    }
  }, [slotId]);

  useEffect(() => {
    setLoadingSlots(true);
    setSlots([]);
    setSlotId(null);
    loadSlots(false);
  }, [date, loadSlots]);

  useEffect(() => {
    setPage(0);
    setViewer(null);
    setLoadingPatients(true);
    loadPatients();
  }, [slotId, loadPatients]);

  // Quietly refresh every minute so new bookings appear without reloading
  useEffect(() => {
    const t = setInterval(() => {
      loadSlots(true);
      loadPatients();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [loadSlots, loadPatients]);

  // Disease filter: a patient matches if they have ANY of the chosen diseases
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of patients) {
      if (p.emergency) c.emergency = (c.emergency ?? 0) + 1;
      if (!p.diseases.length) c.none = (c.none ?? 0) + 1;
      for (const d of p.diseases) c[d] = (c[d] ?? 0) + 1;
    }
    return c;
  }, [patients]);
  const list = useMemo(
    () =>
      picked.length
        ? patients.filter(
            (p) =>
              (picked.includes('emergency') && p.emergency) ||
              (p.diseases.length ? p.diseases.some((d) => picked.includes(d)) : picked.includes('none')),
          )
        : patients,
    [patients, picked],
  );
  const chips = [...DISEASES.filter((d) => counts[d] || picked.includes(d)), ...(counts.none || picked.includes('none') ? ['none'] : [])];
  const togglePick = (d: string) => {
    setPicked((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
    setPage(0);
    setViewer(null);
  };

  const pageCount = Math.max(1, Math.ceil(list.length / perPage));
  const safePage = Math.min(page, pageCount - 1);
  const shown = useMemo(() => list.slice(safePage * perPage, safePage * perPage + perPage), [list, safePage, perPage]);
  const goPage = useCallback((n: number) => setPage(Math.max(0, Math.min(pageCount - 1, n))), [pageCount]);

  // Keyboard: arrows move pages (or photos when one is open), Esc closes the photo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (viewer !== null) {
        if (e.key === 'Escape') setViewer(null);
        if (e.key === 'ArrowRight') setViewer((v) => Math.min(list.length - 1, (v ?? 0) + 1));
        if (e.key === 'ArrowLeft') setViewer((v) => Math.max(0, (v ?? 0) - 1));
        return;
      }
      if (e.key === 'ArrowRight') goPage(safePage + 1);
      if (e.key === 'ArrowLeft') goPage(safePage - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, list.length, safePage, goPage]);

  useEffect(() => {
    document.body.style.overflow = viewer !== null ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [viewer]);

  function onTouchStart(e: React.TouchEvent) {
    touch.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) < 50) return;
    goPage(safePage + (dx < 0 ? 1 : -1));
  }

  const current = slots.find((s) => s.id === slotId);
  const open = viewer !== null ? list[viewer] : null;
  const first = list.length ? safePage * perPage + 1 : 0;
  const last = Math.min(list.length, (safePage + 1) * perPage);

  return (
    <>
      <section className="hb-controls" aria-label="Choose the day and healing time">
        <input className="hb-date" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Day" />
        {date !== todayIST() && (
          <button type="button" className="btn small" onClick={() => setDate(todayIST())}>
            Today
          </button>
        )}
        <div className="hb-slots" role="group" aria-label="Healing time">
          {slots.map((s) => (
            <button
              key={s.id}
              type="button"
              className={'hb-slot' + (s.status !== 'open' ? ' closed' : '')}
              aria-pressed={s.id === slotId}
              onClick={() => setSlotId(s.id)}
            >
              {timeLabel(s.start)}
              <small>
                {s.booked} {s.booked === 1 ? 'patient' : 'patients'}
                {s.status !== 'open' ? ' · closed by reception' : ''}
              </small>
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p className="hb-status error" role="alert">
          {error}
        </p>
      )}
      {!error && loadingSlots && <p className="hb-status">Loading {dayLabel(date)}…</p>}
      {!error && !loadingSlots && !slots.length && <p className="hb-status">No photo healing bookings on {dayLabel(date)}. Pick another day above.</p>}
      {!error && current && loadingPatients && !patients.length && <p className="hb-status">Loading patients for {timeLabel(current.start)}…</p>}
      {!error && current && !loadingPatients && !patients.length && (
        <p className="hb-status">No patients booked for {timeLabel(current.start)} yet. New bookings appear here automatically.</p>
      )}

      {patients.length > 0 && chips.length > 0 && (
        <div className="hb-filter" role="group" aria-label="Filter by disease">
          <button type="button" className={`hb-chip ${picked.length ? '' : 'on'}`} aria-pressed={!picked.length} onClick={() => { setPicked([]); setPage(0); setViewer(null); }}>
            All <span>{patients.length}</span>
          </button>
          {(counts.emergency || picked.includes('emergency')) && (
            <button
              type="button"
              className={`hb-chip emerg ${picked.includes('emergency') ? 'on' : ''}`}
              aria-pressed={picked.includes('emergency')}
              onClick={() => togglePick('emergency')}
            >
              🚨 Emergency <span>{counts.emergency ?? 0}</span>
            </button>
          )}
          {chips.map((d) => (
            <button key={d} type="button" className={`hb-chip ${picked.includes(d) ? 'on' : ''}`} aria-pressed={picked.includes(d)} onClick={() => togglePick(d)}>
              {d === 'none' ? 'Not given' : diseaseLabel(d)} <span>{counts[d] ?? 0}</span>
            </button>
          ))}
        </div>
      )}
      {patients.length > 0 && picked.length > 0 && list.length === 0 && (
        <p className="hb-status">
          No patients with {picked.map((d) => (d === 'none' ? 'no disease given' : d === 'emergency' ? 'emergency' : diseaseLabel(d))).join(' or ')} in this
          session.
        </p>
      )}

      {list.length > 0 && (
        <>
          <ul className="hb-grid" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {shown.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`hb-card ${p.emergency ? 'emerg' : ''}`}
                  onClick={() => setViewer(safePage * perPage + i)}
                  aria-label={(p.emergency ? 'Emergency: ' : '') + 'Open photo of ' + p.name}
                >
                  <div className="hb-photo">
                    {p.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo} alt="" loading="lazy" />
                    ) : (
                      <div className="hb-nophoto">No photo yet</div>
                    )}
                    <span className="hb-num">{p.number}</span>
                    {p.emergency && (
                      <span className="hb-emerg" title="Emergency" aria-label="Emergency">
                        🚨
                      </span>
                    )}
                    {p.check && (
                      <span className="hb-flag" title={checkNote(p)}>
                        ⚠ Check photo
                      </span>
                    )}
                  </div>
                  <div className="hb-info">
                    <div className="hb-name">{p.name}</div>
                    {metaLine(p) && <div className="hb-meta">{metaLine(p)}</div>}
                    {p.emergency && p.emergencyNote && <div className="hb-enote">🚨 {p.emergencyNote}</div>}
                    {p.illness && <div className="hb-illness">{p.illness}</div>}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <nav className="hb-pager" aria-label="Pages">
            <button type="button" className="btn small" onClick={() => goPage(safePage - 1)} disabled={safePage === 0}>
              Previous
            </button>
            <span>
              {first}–{last} of {list.length}
              {picked.length ? ` (filtered from ${patients.length})` : ''}
            </span>
            <button type="button" className="btn small" onClick={() => goPage(safePage + 1)} disabled={safePage >= pageCount - 1}>
              Next
            </button>
          </nav>
        </>
      )}

      {open && viewer !== null && (
        <div className="hb-viewer" role="dialog" aria-modal="true" aria-label={'Photo of ' + open.name}>
          <button type="button" className="btn small hb-close" onClick={() => setViewer(null)}>
            Close
          </button>
          <div className="hb-viewer-photo">
            {open.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={open.photo} alt={'Photo of ' + open.name} />
            ) : (
              <div className="hb-nophoto">No photo yet</div>
            )}
          </div>
          <div className="hb-viewer-info">
            <span className="hb-num">{open.number}</span>
            <div className="hb-viewer-text">
              {open.emergency && <div className="hb-flag-text emerg">🚨 Emergency{open.emergencyNote ? `: ${open.emergencyNote}` : ''}</div>}
              <div className="hb-name">{open.name}</div>
              <div className="hb-meta">{[metaLine(open), open.code].filter(Boolean).join(', ')}</div>
              {open.illness && <div className="hb-illness">{open.illness}</div>}
              {open.diseases.length > 0 && (
                <div className="hb-dtags">
                  {open.diseases.map((d) => (
                    <span key={d} className="tag">
                      {diseaseLabel(d)}
                    </span>
                  ))}
                </div>
              )}
              {open.check && <div className="hb-flag-text">⚠ {checkNote(open)}</div>}
            </div>
            <div className="hb-viewer-nav">
              <button type="button" className="btn small" onClick={() => setViewer(viewer - 1)} disabled={viewer === 0}>
                Previous
              </button>
              <button type="button" className="btn small" onClick={() => setViewer(viewer + 1)} disabled={viewer >= list.length - 1}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
