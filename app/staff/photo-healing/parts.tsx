'use client';

import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { keepFields } from '@/lib/keepForm';
import { t12 } from '@/lib/time12';
import { addSession, changeTime, saveDefaults, setStatus, type PhState } from './actions';


function Msg({ state }: { state: PhState }) {
  if (!state || state.ok === false && state.needConfirm) return null;
  return (
    <p className={state.ok ? 'seat-ok' : 'field-error'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </p>
  );
}

// Asks before saving when photos have already come in for the session
function ConfirmBox({ state, label, onYes, onNo, pending }: { state: PhState; label: string; onYes: () => void; onNo: () => void; pending: boolean }) {
  if (!state || state.ok || !state.needConfirm) return null;
  return (
    <div className="ph-confirm" role="alertdialog" aria-live="assertive">
      <p>
        <b>⚠ {state.photos} photo{state.photos === 1 ? '' : 's'} already received.</b> {state.message}
      </p>
      <div className="wd-actions">
        <button type="button" className="btn secondary" onClick={onNo} disabled={pending}>
          Cancel
        </button>
        <button type="button" className="btn primary" onClick={onYes} disabled={pending}>
          {pending ? 'Saving…' : label}
        </button>
      </div>
    </div>
  );
}

export type SessionView = {
  no: number;
  time: string;
  closeTime: string;
  status: 'open' | 'closed' | 'cancelled';
  rowId: string | null;
  fromDefault: boolean;
  added: boolean;
  photos: number;
  finished: boolean;
};

export function SessionRow({ date, s }: { date: string; s: SessionView }) {
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState(s.time);
  const [tState, tAction, tPending] = useActionState<PhState, FormData>(changeTime, null);
  const [cState, cAction, cPending] = useActionState<PhState, FormData>(setStatus, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [dismissT, setDismissT] = useState(0);
  const [dismissC, setDismissC] = useState(0);

  useEffect(() => {
    if (tState?.ok) setEditing(false);
  }, [tState]);

  const submitTime = (confirm: boolean) => {
    const fd = new FormData();
    fd.set('date', date);
    fd.set('no', String(s.no));
    fd.set('time', time);
    if (confirm) fd.set('confirm', '1');
    startTransition(() => tAction(fd));
  };
  const submitStatus = (status: 'open' | 'closed', confirm: boolean) => {
    const fd = new FormData();
    fd.set('date', date);
    fd.set('no', String(s.no));
    fd.set('status', status);
    if (confirm) fd.set('confirm', '1');
    startTransition(() => cAction(fd));
  };

  const closed = s.status !== 'open';
  return (
    <li className={`ph-session ${closed ? 'is-closed' : ''} ${s.finished ? 'is-done' : ''}`}>
      <div className="ph-main">
        <div className="ph-when">
          <p className="ph-time">{t12(s.time)}</p>
          <p className="ph-sub">
            Session {s.no}
            {s.added ? (
              <span className="tag">Added for this day</span>
            ) : (
              !s.fromDefault && <span className="tag">Changed for this day</span>
            )}
          </p>
        </div>
        <div className="ph-info">
          <p>
            Photos close <b>{t12(s.closeTime)}</b>
          </p>
          <p>
            <b>{s.photos}</b> photo{s.photos === 1 ? '' : 's'} received
          </p>
        </div>
        <span className={`status-pill ${s.finished ? 's-closed' : closed ? 's-cancelled' : 's-open'}`}>
          {s.finished ? 'Finished' : closed ? 'Closed' : 'Open'}
        </span>
      </div>

      {!s.finished && (
        <div className="ph-actions">
          {!closed && (
            <button type="button" className="btn small" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
              {editing ? 'Cancel' : 'Change time'}
            </button>
          )}
          {closed ? (
            <button type="button" className="btn small" onClick={() => submitStatus('open', false)} disabled={cPending}>
              {cPending ? 'Saving…' : 'Reopen'}
            </button>
          ) : (
            <button type="button" className="btn small danger" onClick={() => submitStatus('closed', false)} disabled={cPending}>
              {cPending ? 'Saving…' : 'Close for this day'}
            </button>
          )}
        </div>
      )}

      {editing && (
        <form
          ref={formRef}
          className="ph-edit"
          onSubmit={(e) => {
            e.preventDefault();
            submitTime(false);
          }}
        >
          <label className="rf">
            <span className="rf-l">New time (India time)</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required step={300} />
          </label>
          <button type="submit" className="btn primary" disabled={tPending}>
            {tPending ? 'Saving…' : `Save ${time ? t12(time) : ''}`}
          </button>
        </form>
      )}

      {dismissT !== tStateKey(tState) && (
        <ConfirmBox state={tState} label={`Yes, move to ${t12(time)}`} pending={tPending} onYes={() => submitTime(true)} onNo={() => setDismissT(tStateKey(tState))} />
      )}
      {dismissC !== tStateKey(cState) && (
        <ConfirmBox state={cState} label="Yes, close it" pending={cPending} onYes={() => submitStatus('closed', true)} onNo={() => setDismissC(tStateKey(cState))} />
      )}
      <Msg state={tState} />
      <Msg state={cState} />
    </li>
  );
}

// A stable number per result, so "Cancel" hides only that warning
const keys = new WeakMap<object, number>();
let next = 1;
function tStateKey(s: PhState) {
  if (!s) return 0;
  if (!keys.has(s)) keys.set(s, next++);
  return keys.get(s)!;
}

export function AddSession({ date, freeNos }: { date: string; freeNos: number[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<PhState, FormData>(addSession, null);
  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);
  if (freeNos.length === 0) return <p className="ph-note">This day already has 3 sessions (the most allowed).</p>;
  if (!open)
    return (
      <>
        <button type="button" className="btn small" onClick={() => setOpen(true)}>
          + Add a session
        </button>
        {state?.ok && <p className="seat-ok">{state.message}</p>}
      </>
    );
  return (
    <form onSubmit={keepFields(action)} className="ph-add">
      <input type="hidden" name="date" value={date} />
      <label className="rf">
        <span className="rf-l">Session</span>
        <select name="no" defaultValue={freeNos[0]}>
          {freeNos.map((n) => (
            <option key={n} value={n}>
              Session {n}
            </option>
          ))}
        </select>
      </label>
      <label className="rf">
        <span className="rf-l">Time (India time)</span>
        <input type="time" name="time" required step={300} />
      </label>
      <div className="ph-add-btns">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Adding…' : 'Add session'}
        </button>
        <button type="button" className="btn small" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {state && !state.ok && <p className="field-error">{state.message}</p>}
    </form>
  );
}

// ---------- Default times ----------

type Def = { no: number; time: string };

function ListEditor({ title, hint, list, setList }: { title: string; hint: string; list: Def[]; setList: (l: Def[]) => void }) {
  const used = list.map((d) => d.no);
  const free = [1, 2, 3].filter((n) => !used.includes(n));
  return (
    <section className="review-card ph-def">
      <h2 className="card-h">{title}</h2>
      <p className="hint">{hint}</p>
      {list.length === 0 ? (
        <p className="ph-note">No sessions on these days.</p>
      ) : (
        <ul className="ph-def-list">
          {[...list]
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((d) => (
              <li key={d.no}>
                <span className="ph-def-no">Session {d.no}</span>
                <input
                  type="time"
                  value={d.time}
                  step={300}
                  aria-label={`Session ${d.no} time`}
                  onChange={(e) => setList(list.map((x) => (x.no === d.no ? { ...x, time: e.target.value } : x)))}
                />
                <span className="ph-def-12">{d.time ? t12(d.time) : ''}</span>
                <button type="button" className="btn small danger" onClick={() => setList(list.filter((x) => x.no !== d.no))}>
                  Remove
                </button>
              </li>
            ))}
        </ul>
      )}
      {free.length > 0 && (
        <button type="button" className="btn small" onClick={() => setList([...list, { no: free[0], time: '' }])}>
          + Add session {free[0]}
        </button>
      )}
    </section>
  );
}

export function DefaultsEditor({ slots, sunday, cutoff }: { slots: Def[]; sunday: Def[]; cutoff: number }) {
  const [a, setA] = useState<Def[]>(slots);
  const [b, setB] = useState<Def[]>(sunday);
  const [c, setC] = useState(String(cutoff));
  const [state, action, pending] = useActionState<PhState, FormData>(saveDefaults, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.set('payload', JSON.stringify({ slots: a, sunday_slots: b, cutoff_minutes: Number(c) }));
        startTransition(() => action(fd));
      }}
      className="ph-defaults"
    >
      <ListEditor
        title="Monday to Saturday"
        hint="The usual sessions. A session keeps its number (1, 2 or 3) on every day."
        list={a}
        setList={setA}
      />
      <ListEditor title="Sunday" hint="Usually only the night session." list={b} setList={setB} />
      <section className="review-card ph-def">
        <h2 className="card-h">Photos close</h2>
        <label className="rf ph-cutoff">
          <span className="rf-l">Minutes before each session</span>
          <input type="number" min={0} max={180} value={c} onChange={(e) => setC(e.target.value)} required />
        </label>
        <p className="hint">Each session lasts 1 hour. Patients can send photos until this many minutes before it starts.</p>
      </section>
      <p className="ph-note">
        Days that already have their own time (shown as &quot;Changed for this day&quot;, or created when the first photo came in) keep that time. Change them in
        Upcoming days.
      </p>
      <div className="slot-actions">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Saving…' : 'Save default times'}
        </button>
        <Msg state={state} />
      </div>
    </form>
  );
}
