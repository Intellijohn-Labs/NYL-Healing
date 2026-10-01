import type { Metadata } from 'next';
import { getPassRaw } from '@/lib/data';
import { toPass, type RawPass } from '@/lib/pass';
import PatientPass from '@/components/PatientPass';
import SavePassButton from '@/components/SavePassButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NYL Patient Pass',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function PassPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = (await getPassRaw(token)) as RawPass | null;

  if (!raw) {
    return (
      <main className="shell" lang="en">
        <header className="brand">
          <p className="wordmark">NYL Healing</p>
        </header>
        <section className="notice">
          <h1>This pass link doesn&apos;t work</h1>
          <p>Please check the link, or ask at NYL reception for help.</p>
        </section>
      </main>
    );
  }

  const pass = await toPass(raw);
  return (
    <main className="shell pass-page" lang="en">
      <div className="pp-wrap">
        <PatientPass pass={pass} />
      </div>
      <div className="pass-actions">
        <SavePassButton pass={pass} label="Save pass" busyLabel="Saving…" />
      </div>
      <p className="hint pass-hint">Bring this pass every day you come. Reception will scan the QR code to mark your attendance.</p>
    </main>
  );
}
