import type { PassData } from '@/lib/types';

const ICONS = {
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </>
  ),
  idcard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.5-1.5 1.6-2.3 3-2.3s2.5.8 3 2.3M14.5 10h4M14.5 13.5h3" />
    </>
  ),
  cap: (
    <>
      <path d="M3 8.5 12 4l9 4.5-9 4.5z" />
      <path d="M7 10.5V15c1.3 1.2 3 1.8 5 1.8s3.7-.6 5-1.8v-4.5" />
    </>
  ),
  gate: <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 9l3 3 3-3" />,
  door: (
    <>
      <rect x="6" y="3.5" width="12" height="17" rx="1" />
      <path d="M14.5 12h.01" />
    </>
  ),
  early: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.5V13l2.2 1.5M9 3h6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20z" />
      <path d="M14 3.5V8h4M9 12h6M9 15.5h6" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      className="pp-ic"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

const GENDER: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };
const FOR: Record<string, string> = {
  self: 'Myself',
  child: 'My child',
  parent: 'My father or mother',
  spouse: 'My husband or wife',
  other: 'Someone else',
};

function relation(r: string | null) {
  if (!r) return '';
  if (r === 'father') return 'Father';
  if (r === 'mother') return 'Mother';
  return r.replace(/^other:\s*/, '');
}

function day(iso: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

function time(hms: string | null) {
  if (!hms) return '';
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
    .format(new Date(`1970-01-01T${hms}Z`))
    .toUpperCase();
}

function issued(ts: string | null) {
  if (!ts) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(ts));
}

export default function PatientPass({ pass, id }: { pass: PassData; id?: string }) {
  const ageGender = [pass.age ?? '', GENDER[pass.gender] ?? ''].filter((x) => x !== '').join(', ');
  return (
    <article className="pp" id={id} lang="en" dir="ltr" aria-label={`Patient pass for ${pass.fullName}`}>
      <header className="pp-hd">
        <div className="pp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nyl-emblem.png" alt="NYL Healing" width={62} height={62} />
          <div>
            <b>NYL HEALING</b>
            <span>&amp; RESEARCH CENTRE</span>
          </div>
        </div>
        <div className="pp-title">
          <p className="pp-t1">PATIENT PASS</p>
          <div className="pp-rule" />
          <p className="pp-tag">HEALING&nbsp; |&nbsp; HOPE&nbsp; |&nbsp; TOGETHER</p>
        </div>
      </header>

      <div className="pp-bd">
        <div className="pp-namerow">
          <div>
            <p className="pp-lbl">Patient name</p>
            <p className="pp-name">{pass.fullName}</p>
          </div>
          <div className="pp-id">
            <p className="pp-lbl">Patient ID</p>
            <b>{pass.patientCode}</b>
          </div>
        </div>

        <div className="pp-grid">
          <div className="pp-c">
            <Icon name="pin" />
            <div>
              <p className="pp-lbl">Centre</p>
              <p className="pp-v">Thandekkad, Perumbavoor</p>
            </div>
          </div>
          <div className="pp-c">
            <Icon name="cal" />
            <div>
              <p className="pp-lbl">Registration day</p>
              <p className="pp-v">{day(pass.slotDate)}</p>
            </div>
          </div>
          <div className="pp-c">
            <Icon name="clock" />
            <div>
              <p className="pp-lbl">Reporting time</p>
              <p className="pp-v">{time(pass.startsAt) || '–'}</p>
            </div>
          </div>
          <div className="pp-c">
            <Icon name="user" />
            <div>
              <p className="pp-lbl">Age / gender</p>
              <p className="pp-v">{ageGender}</p>
            </div>
          </div>
        </div>

        <section className="pp-panel">
          <h2>
            <Icon name="idcard" />
            Patient details
          </h2>
          <div className="pp-chips">
            {pass.registeringFor && (
              <div className="pp-chip">
                <p className="pp-lbl">Registered for</p>
                <p className="pp-v">{FOR[pass.registeringFor] ?? pass.registeringFor}</p>
              </div>
            )}
            <div className="pp-chip">
              <p className="pp-lbl">Town</p>
              <p className="pp-v">{pass.city}</p>
            </div>
            {pass.guardianName && (
              <div className="pp-chip wide">
                <p className="pp-lbl">Parent / guardian</p>
                <p className="pp-v">
                  {pass.guardianName}
                  {relation(pass.guardianRelation) ? ` (${relation(pass.guardianRelation)})` : ''}
                </p>
              </div>
            )}
          </div>
          <p className="pp-first">
            <Icon name="cap" />
            First day: registration + health awareness class with healer Nisar Sir
          </p>
        </section>

        <section className="pp-scan">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pass.qr} alt="Attendance QR code" width={112} height={112} />
          <div>
            <div className="pp-scan-h">
              <Icon name="gate" />
              <h3>Scan at reception on every visit</h3>
            </div>
            <ul>
              <li>
                <Icon name="door" />
                Bring this pass every day you come.
              </li>
              <li>
                <Icon name="shield" />
                Reception scans it to mark your attendance.
              </li>
              <li>
                <Icon name="early" />
                Please arrive 20 minutes early.
              </li>
            </ul>
            <span className="pp-share">
              <Icon name="shield" />
              Don&apos;t share this pass
            </span>
          </div>
        </section>
      </div>

      <footer className="pp-ft">
        <div className="pp-ft-l">
          <p>
            <Icon name="pin" />
            NYL Healing Centre, Thandekkad, Perumbavoor, Ernakulam
          </p>
          <p>
            <Icon name="doc" />
            Issued {issued(pass.issuedAt)}&nbsp; ·&nbsp; This pass is personal and non-transferable.
          </p>
        </div>
        <div className="pp-ft-r">
          CARE
          <br />
          BEYOND
          <br />
          TREATMENT
        </div>
      </footer>
    </article>
  );
}
