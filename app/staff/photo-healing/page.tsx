import Link from 'next/link';
import { FRONT_DESK_ROLES, requireStaff } from '@/lib/staff';
import { MAX_SESSIONS, todayIST, upcomingDays } from '@/lib/photoHealing';
import StaffShell from '@/components/staff/StaffShell';
import { t12 } from '@/lib/time12';
import { AddSession, DefaultsEditor, SessionRow } from './parts';

export const dynamic = 'force-dynamic';

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

export default async function PhotoHealingPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const staff = await requireStaff(FRONT_DESK_ROLES);
  const { view } = await searchParams;
  const showDefaults = view === 'defaults';
  const { settings, settingsExist, plan } = await upcomingDays(7);
  const today = todayIST();

  return (
    <StaffShell staff={staff} active="photo">
      <h1 className="step-title">Photo Healing</h1>
      <p className="hint page-intro">
        Session times for distance healing, in India time. The WhatsApp bot uses these times when patients book.
      </p>

      <nav className="ph-switch" aria-label="Photo Healing views">
        <Link href="/staff/photo-healing" className={showDefaults ? '' : 'on'} aria-current={showDefaults ? undefined : 'page'}>
          Upcoming days
        </Link>
        <Link href="/staff/photo-healing?view=defaults" className={showDefaults ? 'on' : ''} aria-current={showDefaults ? 'page' : undefined}>
          Default times
        </Link>
      </nav>

      {!settingsExist && (
        <p className="ph-note warn">
          The default times haven&apos;t been saved yet, so these are suggested times. Open <b>Default times</b> and press Save to use them.
        </p>
      )}

      {showDefaults ? (
        <DefaultsEditor slots={settings.slots} sunday={settings.sunday_slots} cutoff={settings.cutoff_minutes} />
      ) : (
        <div className="ph-days">
          {plan.map((d) => {
            const used = d.sessions.map((s) => s.no);
            const free = Array.from({ length: MAX_SESSIONS }, (_, i) => i + 1).filter((n) => !used.includes(n));
            return (
              <section key={d.date} className="review-card ph-day">
                <div className="ph-day-hd">
                  <h2 className="card-h">
                    {d.date === today ? 'Today, ' : ''}
                    {dayLabel(d.date)}
                  </h2>
                  {d.sunday && <span className="tag">Sunday</span>}
                </div>
                {d.sessions.length === 0 ? (
                  <p className="ph-note">No sessions on this day.</p>
                ) : (
                  <ul className="ph-sessions">
                    {d.sessions.map((s) => (
                      <SessionRow key={`${d.date}-${s.no}-${s.time}-${s.status}`} date={d.date} s={s} />
                    ))}
                  </ul>
                )}
                <div className="ph-day-foot">
                  <AddSession date={d.date} freeNos={free} />
                </div>
              </section>
            );
          })}
          <p className="ph-note">
            Photos close {settings.cutoff_minutes} minutes before each session. Default night session: {t12(settings.sunday_slots.at(-1)?.time ?? '21:30')}.
          </p>
        </div>
      )}
    </StaffShell>
  );
}
