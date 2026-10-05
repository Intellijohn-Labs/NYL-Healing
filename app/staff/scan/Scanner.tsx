'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import jsQR from 'jsqr';
import { checkIn, setSeat, todayCheckins, type Card, type ScanResult, type TodayRow } from '../actions';

type View = { kind: 'scanning' } | { kind: 'result'; res: ScanResult };

const GENDER: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };

function ageOf(dob: string | null) {
  if (!dob) return null;
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
    .format(new Date())
    .split('-')
    .map(Number);
  let a = ty - y;
  if (tm < m || (tm === m && td < d)) a--;
  return a;
}
const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const timeOf = (ts: string) =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    .format(new Date(ts))
    .toUpperCase();
const dayOf = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
const relation = (r: string | null) =>
  !r ? '' : r === 'father' ? 'Father' : r === 'mother' ? 'Mother' : r.replace(/^other:\s*/, '');

// Short sounds so reception knows the result without looking
function beep(kind: 'ok' | 'warn' | 'bad') {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const tones = kind === 'ok' ? [[880, 0.12]] : kind === 'warn' ? [[660, 0.1], [660, 0.1]] : [[220, 0.35]];
    let t = ctx.currentTime;
    for (const [f, d] of tones) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.value = 0.15;
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + d);
      t += d + 0.06;
    }
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* no sound available */
  }
  if (navigator.vibrate) navigator.vibrate(kind === 'ok' ? 80 : kind === 'warn' ? [60, 60, 60] : 300);
}

export default function Scanner({ initialToday }: { initialToday: TodayRow[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const busyRef = useRef(false);

  const [view, setView] = useState<View>({ kind: 'scanning' });
  const [camError, setCamError] = useState('');
  const [manual, setManual] = useState('');
  const [seat, setSeatValue] = useState('');
  const [seatMsg, setSeatMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [today, setToday] = useState<TodayRow[]>(initialToday);
  const [pending, start] = useTransition();
  const seatRef = useRef<HTMLInputElement>(null);

  const refreshToday = useCallback(() => {
    todayCheckins().then(setToday).catch(() => {});
  }, []);

  const handleCode = useCallback(
    (code: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      start(async () => {
        let res: ScanResult;
        try {
          res = await checkIn(code, localStorage.getItem('nyl_station') || 'reception');
        } catch {
          res = { result: 'error' };
        }
        if (res.result === 'signed_out') {
          window.location.href = '/staff/login';
          return;
        }
        beep(res.result === 'checked_in' ? 'ok' : res.result === 'already' ? 'warn' : 'bad');
        setSeatValue('patient' in res ? (res.patient.seat ?? '') : '');
        setSeatMsg(null);
        setView({ kind: 'result', res });
        refreshToday();
        busyRef.current = false;
      });
    },
    [refreshToday],
  );

  // Camera: start once, keep running; only decode while scanning
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let stopped = false;

    async function startCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        loop(0);
      } catch {
        setCamError(
          "The camera couldn't start. Allow camera access for this site in the browser settings, or type the patient ID below.",
        );
      }
    }

    function loop(ts: number) {
      raf = requestAnimationFrame(loop);
      if (ts - last < 180) return; // about 5 checks a second is plenty
      last = ts;
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState < 2 || busyRef.current) return;
      if (document.body.dataset.scanPaused === '1') return;
      const w = 640;
      const h = Math.round((v.videoHeight / v.videoWidth) * w) || 480;
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const found = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
      if (!found?.data) return;
      const now = Date.now();
      // Ignore the same pass for 30 seconds, so a pass still held up isn't scanned again and again
      if (found.data === lastRef.current.code && now - lastRef.current.at < 30000) return;
      lastRef.current = { code: found.data, at: now };
      handleCode(found.data);
    }

    startCam();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [handleCode]);

  // Pause decoding while a result is on screen
  useEffect(() => {
    document.body.dataset.scanPaused = view.kind === 'result' ? '1' : '0';
    if (view.kind === 'result' && 'patient' in view.res) setTimeout(() => seatRef.current?.focus(), 50);
  }, [view]);

  function scanNext() {
    setView({ kind: 'scanning' });
    setSeatMsg(null);
    setManual('');
  }

  function saveSeat(card: Card) {
    const value = seat.trim();
    start(async () => {
      const res = await setSeat(card.attendance_id, value);
      if (res.ok) {
        setSeatMsg({ ok: true, text: value ? `Seat ${res.patient.seat} saved.` : 'Seat cleared.' });
        setView({ kind: 'result', res: { result: 'already', patient: res.patient } });
        refreshToday();
        setTimeout(scanNext, 1200);
      } else if (res.error === 'SEAT_TAKEN') {
        setSeatMsg({ ok: false, text: `Seat ${value.toUpperCase()} is already given to someone else today.` });
        beep('bad');
      } else if (res.error === 'SIGNED_OUT') {
        window.location.href = '/staff/login';
      } else {
        setSeatMsg({ ok: false, text: "The seat couldn't be saved. Please try again." });
      }
    });
  }

  const res = view.kind === 'result' ? view.res : null;
  const card = res && 'patient' in res ? res.patient : null;

  return (
    <div className="scanner">
      <div className={`cam ${view.kind === 'result' ? 'dim' : ''}`}>
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} hidden />
        {!camError && view.kind === 'scanning' && (
          <div className="cam-frame" aria-hidden="true">
            <span />
          </div>
        )}
        {camError && <p className="cam-error">{camError}</p>}
        {view.kind === 'scanning' && !camError && (
          <p className="cam-hint">{pending ? 'Checking…' : 'Point the camera at the QR code on the patient pass'}</p>
        )}
      </div>

      {view.kind === 'scanning' && (
        <form
          className="manual"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) handleCode(manual.trim());
          }}
        >
          <label htmlFor="manual">No QR? Type the patient ID</label>
          <div className="manual-row">
            <input
              id="manual"
              value={manual}
              onChange={(e) => setManual(e.target.value.toUpperCase())}
              placeholder="NYL1042"
              autoComplete="off"
              autoCapitalize="characters"
            />
            <button type="submit" className="btn primary" disabled={pending || !manual.trim()}>
              Check in
            </button>
          </div>
        </form>
      )}

      {res && (
        <section className={`result r-${res.result}`} aria-live="assertive">
          <p className="result-banner">
            {res.result === 'checked_in' && '✓ Checked in'}
            {res.result === 'already' && card && `Already checked in today at ${timeOf(card.checked_in_at)}`}
            {res.result === 'not_found' && '✕ Pass not found'}
            {res.result === 'error' && "✕ Couldn't check in. Check the internet connection and try again."}
          </p>

          {res.result === 'not_found' && (
            <p className="result-note">This QR code isn&apos;t an NYL patient pass, or the patient ID is wrong.</p>
          )}

          {card && (
            <>
              <div className="result-who">
                <div>
                  <p className="result-name">{card.full_name}</p>
                  <p className="result-meta">
                    {[ageOf(card.dob) !== null ? `${ageOf(card.dob)} yrs` : '', GENDER[card.gender ?? ''] ?? '', card.city ?? '']
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
                <p className="result-id">{card.patient_code}</p>
              </div>

              <ul className="result-facts">
                <li>Visit {card.visit_count}</li>
                {card.guardian_name && (
                  <li>
                    Parent / guardian: {card.guardian_name}
                    {relation(card.guardian_relation) ? ` (${relation(card.guardian_relation)})` : ''}
                  </li>
                )}
                {card.registration_day === todayIST() && <li className="hl">Registration day today: send to the class</li>}
                {card.registration_day && card.registration_day > todayIST() && (
                  <li className="warn">Registered for {dayOf(card.registration_day)}, not today</li>
                )}
                {card.payment_status === 'pending' && card.payment_method === 'offline' && card.amount_due != null && (
                  <li className="warn">Registration fee to collect: ₹{card.amount_due.toLocaleString('en-IN')}</li>
                )}
              </ul>

              <form
                className="seat"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSeat(card);
                }}
              >
                <label htmlFor="seat">Seat</label>
                <div className="manual-row">
                  <input
                    id="seat"
                    ref={seatRef}
                    value={seat}
                    onChange={(e) => {
                      setSeatValue(e.target.value.toUpperCase());
                      setSeatMsg(null);
                    }}
                    placeholder="B-14"
                    maxLength={12}
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                  <button type="submit" className="btn primary" disabled={pending}>
                    {card.seat ? 'Change seat' : 'Save seat'}
                  </button>
                </div>
                {seatMsg && <p className={seatMsg.ok ? 'seat-ok' : 'field-error'}>{seatMsg.text}</p>}
              </form>
            </>
          )}

          <button type="button" className="btn secondary next" onClick={scanNext}>
            Scan next patient
          </button>
        </section>
      )}

      <section className="today">
        <h2>
          Checked in today <span>{today.length}</span>
        </h2>
        {today.length === 0 ? (
          <p className="hint">No one yet.</p>
        ) : (
          <ol>
            {today.map((r) => (
              <li key={r.attendance_id}>
                <span className="t-time">{timeOf(r.checked_in_at)}</span>
                <span className="t-name">
                  {r.full_name} <small>{r.patient_code}</small>
                </span>
                <span className={`t-seat ${r.seat ? '' : 'none'}`}>{r.seat ?? 'No seat'}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
