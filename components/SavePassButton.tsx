'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import PatientPass from './PatientPass';
import type { PassData } from '@/lib/types';

export default function SavePassButton({ pass, label, busyLabel }: { pass: PassData; label: string; busyLabel: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const node = ref.current?.firstElementChild as HTMLElement | null;
    if (!node) return;
    setBusy(true);
    try {
      let url: string;
      try {
        url = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true });
      } catch {
        // Some browsers block reading the web font file; save with system fonts instead
        url = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true });
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = `NYL-pass-${pass.patientCode}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn primary" onClick={save} disabled={busy} aria-busy={busy}>
        {busy ? busyLabel : label}
      </button>
      <div className="pp-export" ref={ref} aria-hidden="true">
        <PatientPass pass={pass} />
      </div>
    </>
  );
}
