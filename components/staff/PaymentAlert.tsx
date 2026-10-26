'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

// Red banner on staff screens while payments are waiting to be verified; a siren for emergency payments
// (healing only starts after the payment is verified). The siren needs one tap first (browser rule).
export default function PaymentAlert() {
  const [c, setC] = useState({ total: 0, emergency: 0 });
  const [sound, setSound] = useState(false);
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch('/staff/payments/count', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => live && setC({ total: d.total ?? 0, emergency: d.emergency ?? 0 }))
        .catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!sound || !c.emergency || !ctx.current) return;
    const ac = ctx.current;
    const beep = () => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(880, ac.currentTime);
      o.frequency.linearRampToValueAtTime(1320, ac.currentTime + 0.45);
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.9);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 1);
    };
    beep();
    const t = setInterval(beep, 1800);
    return () => clearInterval(t);
  }, [sound, c.emergency]);

  if (!c.total) return null;
  return (
    <div className={`pay-banner ${c.emergency ? 'emerg' : ''}`} role="alert">
      <Link href="/staff/payments">
        💳 {c.total} payment{c.total === 1 ? '' : 's'} to verify
        {c.emergency ? ` · 🚨 ${c.emergency} emergency` : ''} →
      </Link>
      {c.emergency > 0 && !sound && (
        <button
          type="button"
          onClick={() => {
            try {
              const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              ctx.current = ctx.current ?? new AC();
              ctx.current.resume();
              setSound(true);
            } catch {
              /* no sound */
            }
          }}
        >
          🔔 Sound on
        </button>
      )}
    </div>
  );
}
