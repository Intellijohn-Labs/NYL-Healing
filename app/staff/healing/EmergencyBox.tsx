'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Emergency = {
  id: string;
  status: 'waiting' | 'started';
  note: string;
  createdAt: string;
  startedAt: string | null;
  code: string;
  name: string;
  illness: string;
  photo: string | null;
};

const POLL_MS = 10 * 1000; // check for new emergencies every 10 seconds
const minutesSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

// A siren made with the browser's own sound (no file needed). Browsers only allow sound after a tap on the page,
// so the healer turns it on once per visit with "Turn on alarm sound".
function useSiren() {
  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [enabled, setEnabled] = useState(false);
  const enable = useCallback(() => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx.current = ctx.current ?? new AC();
      ctx.current.resume();
      setEnabled(true);
    } catch {
      setEnabled(false);
    }
  }, []);
  const beep = useCallback(() => {
    const ac = ctx.current;
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, ac.currentTime);
    o.frequency.linearRampToValueAtTime(1320, ac.currentTime + 0.45);
    o.frequency.linearRampToValueAtTime(880, ac.currentTime + 0.9);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.35, ac.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.95);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 1);
  }, []);
  const ring = useCallback(
    (on: boolean) => {
      if (on && !timer.current && enabled) {
        beep();
        timer.current = setInterval(beep, 1500);
      }
      if ((!on || !enabled) && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    },
    [beep, enabled],
  );
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);
  return { enabled, enable, ring };
}

// Emergency photo healing (within 5 minutes, 24 hours): shown on top of the healer screen with a siren until someone taps Started
export default function EmergencyBox() {
  const [list, setList] = useState<Emergency[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [, tick] = useState(0);
  const siren = useSiren();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/staff/healing/emergencies', { cache: 'no-store' });
      if (res.status === 401) return;
      const data = await res.json();
      if (Array.isArray(data.emergencies)) setList(data.emergencies);
    } catch {
      /* try again on the next check */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    const clock = setInterval(() => tick((x) => x + 1), 30 * 1000);
    return () => {
      clearInterval(t);
      clearInterval(clock);
    };
  }, [load]);

  const waiting = list.filter((e) => e.status === 'waiting').length;
  useEffect(() => {
    siren.ring(waiting > 0);
    document.title = waiting ? `🚨 (${waiting}) Emergency – NYL Photo Healing` : 'NYL Photo Healing';
  }, [waiting, siren]);

  async function act(id: string, action: 'start' | 'done') {
    setBusy(id + action);
    await fetch('/staff/healing/emergencies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) }).catch(() => null);
    await load();
    setBusy(null);
  }

  return (
    <>
      {!siren.enabled && (
        <button type="button" className="em-sound" onClick={siren.enable}>
          🔔 Turn on alarm sound for emergencies
        </button>
      )}
      {list.length > 0 && (
        <section className="em-box" role="alert" aria-live="assertive">
          <h2>
            🚨 Emergency photo healing <span>{list.length}</span>
          </h2>
          <ul>
            {list.map((e) => {
              const mins = minutesSince(e.createdAt);
              return (
                <li key={e.id} className={`em-item ${e.status}`}>
                  <div className="em-photo">
                    {e.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.photo} alt={`Photo of ${e.name}`} />
                    ) : (
                      <span>No photo</span>
                    )}
                  </div>
                  <div className="em-info">
                    <b>{e.name}</b> <small>{e.code}</small>
                    {e.note && <p className="em-note">{e.note}</p>}
                    {e.illness && <p className="em-ill">{e.illness}</p>}
                    <p className={`em-time ${e.status === 'waiting' && mins >= 5 ? 'late' : ''}`}>
                      {e.status === 'waiting'
                        ? `Waiting ${mins} min${mins >= 5 ? ' (start now!)' : ''}`
                        : `Healing started ${minutesSince(e.startedAt ?? e.createdAt)} min ago`}
                    </p>
                  </div>
                  <div className="em-acts">
                    {e.status === 'waiting' ? (
                      <button type="button" className="btn primary" disabled={busy === e.id + 'start'} onClick={() => act(e.id, 'start')}>
                        ▶ Started
                      </button>
                    ) : (
                      <button type="button" className="btn primary" disabled={busy === e.id + 'done'} onClick={() => act(e.id, 'done')}>
                        ✓ Done
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
