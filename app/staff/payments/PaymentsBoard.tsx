'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type R = {
  id: string;
  kind: 'photo' | 'emergency';
  is_emergency: boolean;
  amount: number;
  utr: string;
  created_at: string;
  wa_phone: string;
  full_name: string;
  patient_code: string;
  condition: string | null;
  session: string | null;
  shot: string | null;
};

const rupees = (n: number) => '₹' + n.toLocaleString('en-IN');
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`;
};
const phone = (p: string) => (p.startsWith('91') && p.length === 12 ? `+91 ${p.slice(2, 7)} ${p.slice(7)}` : '+' + p);

export default function PaymentsBoard({ receipts, waiting }: { receipts: R[]; waiting: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);

  // New receipts appear by themselves
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(t);
  }, [router]);

  async function act(id: string, action: 'verify' | 'reject') {
    setBusy(id);
    const res = await fetch('/staff/payments/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reason: action === 'reject' ? reason : undefined }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (!res || !res.ok) {
      setMsg((m) => ({ ...m, [id]: data.error || "Couldn't save. Please try again." }));
      return;
    }
    setRejecting(null);
    setReason('');
    router.refresh();
  }

  return (
    <>
      {receipts.length === 0 ? (
        <p className="empty">No payments waiting to be verified.</p>
      ) : (
        <ul className="pay-list">
          {receipts.map((r) => (
            <li key={r.id} className={`pay-item ${r.is_emergency ? 'emerg' : ''}`}>
              <button type="button" className="pay-shot" onClick={() => r.shot && setZoom(r.shot)} aria-label="Open the payment screenshot">
                {r.shot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.shot} alt="Payment screenshot" />
                ) : (
                  <span>No screenshot</span>
                )}
              </button>
              <div className="pay-info">
                <p className="pay-kind">{r.is_emergency ? '🚨 Emergency photo healing' : '📸 Photo healing'}</p>
                <p className="pay-amt">{rupees(r.amount)}</p>
                <p>
                  UTR <b className="pay-utr">{r.utr}</b>
                </p>
                <p>
                  <b>{r.full_name}</b> ({r.patient_code}) · {phone(r.wa_phone)}
                </p>
                {r.is_emergency ? (
                  r.condition && <p className="pay-cond">{r.condition}</p>
                ) : (
                  r.session && <p className="g-meta">Session: {r.session}</p>
                )}
                <p className="g-meta">Sent {ago(r.created_at)}</p>
                {msg[r.id] && <p className="field-error">{msg[r.id]}</p>}
                {rejecting === r.id ? (
                  <div className="pay-reject">
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. amount not received" maxLength={300} />
                    <button type="button" className="btn small danger" disabled={busy === r.id} onClick={() => act(r.id, 'reject')}>
                      Reject and tell the patient
                    </button>
                    <button type="button" className="btn small" onClick={() => setRejecting(null)}>
                      Back
                    </button>
                  </div>
                ) : (
                  <div className="pay-acts">
                    <button
                      type="button"
                      className="btn primary"
                      disabled={busy === r.id}
                      onClick={() => {
                        if (confirm(`Did ${rupees(r.amount)} with UTR ${r.utr} arrive in NYL's bank / UPI app?`)) act(r.id, 'verify');
                      }}
                    >
                      ✓ Verify
                    </button>
                    <button type="button" className="btn small danger" onClick={() => setRejecting(r.id)}>
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {waiting > 0 && <p className="hint">{waiting} booking{waiting === 1 ? '' : 's'} still waiting for the patient to send the payment.</p>}
      {zoom && (
        <div className="hb-viewer" role="dialog" aria-modal="true" aria-label="Payment screenshot" onClick={() => setZoom(null)}>
          <button type="button" className="btn small hb-close" onClick={() => setZoom(null)}>
            Close
          </button>
          <div className="hb-viewer-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom} alt="Payment screenshot" />
          </div>
        </div>
      )}
    </>
  );
}
