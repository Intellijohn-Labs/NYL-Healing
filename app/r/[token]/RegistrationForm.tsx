'use client';

import { Fragment, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DICTS, LANGS, LANG_NAMES, LOCALES, fill, type Dict, type Lang } from '@/lib/i18n';
import { MAX_PATIENTS, ONLINE_PAYMENT_ENABLED, REGISTRATION_FEE } from '@/lib/config';
import type { Slot } from '@/lib/types';
import PatientPass from '@/components/PatientPass';
import SavePassButton from '@/components/SavePassButton';
import { normalizePhone } from '@/lib/phone';
import { register, type PatientInput, type RegisterResult } from './actions';

type P = PatientInput;
type PKey = keyof P;
type Done = Extract<RegisterResult, { ok: true }>;

const EMPTY: P = {
  registeringFor: '',
  fullName: '',
  dob: '',
  gender: '',
  city: '',
  guardianName: '',
  guardianRelation: '',
  guardianRelationOther: '',
  guardianPhone: '',
  guardianConsent: false,
  healthConcerns: '',
  currentMedicines: '',
  otherNotes: '',
  consent: false,
};

// Errors are keyed "0.fullName", "slot", "payment", ...
type Errors = Record<string, string>;

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function ageOf(dob: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = todayISO().split('-').map(Number);
  let a = ty - y;
  if (tm < m || (tm === m && td < d)) a--;
  return a;
}
const isMinor = (dob: string) => {
  const a = ageOf(dob);
  return a !== null && a < 18;
};

function formatDay(iso: string, lang: Lang, long = true) {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(long ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}
function formatTime(hms: string | null, lang: Lang) {
  if (!hms) return '';
  return new Intl.DateTimeFormat(LOCALES[lang], { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(`1970-01-01T${hms}Z`),
  );
}
function formatDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
// "1 places left" reads badly in English; other languages don't change
const places = (s: string, n: number, lang: Lang) => (lang === 'en' && n === 1 ? s.replace('places', 'place') : s);

function validatePatient(p: P, i: number, t: Dict, today: string): Errors {
  const e: Errors = {};
  const k = (f: PKey) => `${i}.${f}`;
  if (!p.registeringFor) e[k('registeringFor')] = t.required;
  if (!p.fullName.trim()) e[k('fullName')] = t.required;
  if (!p.dob) e[k('dob')] = t.required;
  else if (p.dob > today || p.dob < '1900-01-01') e[k('dob')] = t.dobInvalid;
  if (!p.gender) e[k('gender')] = t.required;
  if (!p.city.trim()) e[k('city')] = t.required;
  if (isMinor(p.dob)) {
    if (!p.guardianName.trim()) e[k('guardianName')] = t.required;
    if (!p.guardianRelation) e[k('guardianRelation')] = t.required;
    else if (p.guardianRelation === 'other' && !p.guardianRelationOther.trim()) e[k('guardianRelationOther')] = t.required;
    if (!p.guardianPhone.trim()) e[k('guardianPhone')] = t.required;
    else if (!normalizePhone(p.guardianPhone)) e[k('guardianPhone')] = t.phoneInvalid;
    if (!p.guardianConsent) e[k('guardianConsent')] = t.consentError;
  }
  if (!p.healthConcerns.trim()) e[k('healthConcerns')] = t.required;
  if (!p.consent) e[k('consent')] = t.consentError;
  return e;
}

export default function RegistrationForm({ token, lang, slots }: { token: string; lang: Lang; slots: Slot[] }) {
  const t = DICTS[lang];
  const router = useRouter();
  const pathname = usePathname();
  const today = todayISO();

  const [count, setCount] = useState(1);
  const [patients, setPatients] = useState<P[]>([{ ...EMPTY }]);
  const [slotId, setSlotId] = useState('');
  const [payment, setPayment] = useState('');
  const [step, setStep] = useState(0);
  const [fromReview, setFromReview] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [pending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  // Steps: 0 count | 1..count patients | day | review | payment
  const DAY = count + 1;
  const REVIEW = count + 2;
  const PAY = count + 3;
  const total = count + 4;

  const scrollTop = () => topRef.current?.scrollIntoView({ block: 'start' });

  const setP = <K extends PKey>(i: number, k: K, v: P[K]) => {
    setPatients((list) => list.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
    const key = `${i}.${k}`;
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  function changeCount(n: number) {
    setCount(n);
    setPatients((list) => Array.from({ length: n }, (_, i) => list[i] ?? { ...EMPTY }));
    // the chosen day may no longer have enough places
    const s = slots.find((x) => x.id === slotId);
    if (s && s.remaining < n) setSlotId('');
  }

  function validate(s: number): Errors {
    if (s >= 1 && s <= count) return validatePatient(patients[s - 1], s - 1, t, today);
    if (s === DAY && !slotId) return { slot: t.chooseDayError };
    if (s === PAY && !payment) return { payment: t.choosePay };
    return {};
  }

  function focusFirst(e: Errors) {
    const first = Object.keys(e)[0];
    if (!first) return;
    const id = first.includes('.') ? `f-${first.replace('.', '-')}` : `f-${first}`;
    document.getElementById(id)?.focus();
  }

  function go(s: number) {
    setErrors({});
    setFormError('');
    setStep(s);
    scrollTop();
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return focusFirst(e);
    if (fromReview) {
      setFromReview(false);
      return go(REVIEW);
    }
    go(step + 1);
  }

  function edit(s: number) {
    setFromReview(true);
    go(s);
  }

  function submit() {
    // Re-check everything once more before sending
    let all: Errors = {};
    patients.forEach((p, i) => (all = { ...all, ...validatePatient(p, i, t, today) }));
    if (Object.keys(all).length) {
      const firstPatient = Number(Object.keys(all)[0].split('.')[0]);
      setFromReview(true);
      setStep(firstPatient + 1);
      setErrors(all);
      return;
    }
    const e = validate(PAY);
    setErrors(e);
    if (Object.keys(e).length) return focusFirst(e);
    setFormError('');
    startTransition(async () => {
      let res: RegisterResult;
      try {
        res = await register({ token, language: lang, slotId, payment, patients });
      } catch {
        res = { ok: false, error: 'GENERIC' };
      }
      if (res.ok) {
        setDone(res);
        scrollTop();
        return;
      }
      const msg: Record<string, string> = {
        SLOT_FULL: t.errGroupFull,
        SLOT_CLOSED: t.errSlotClosed,
        LINK_INVALID: t.errLink,
        GUARDIAN_REQUIRED: t.errGuardian,
        INVALID_INPUT: t.errGeneric,
        GENERIC: t.errGeneric,
      };
      setFormError(msg[res.error] ?? t.errGeneric);
      if (res.error === 'SLOT_FULL' || res.error === 'SLOT_CLOSED') {
        setSlotId('');
        router.refresh();
        setStep(DAY);
        scrollTop();
      }
    });
  }

  function registerMore() {
    setCount(1);
    setPatients([{ ...EMPTY }]);
    setSlotId('');
    setPayment('');
    setErrors({});
    setFormError('');
    setDone(null);
    setFromReview(false);
    setStep(0);
    router.refresh();
    scrollTop();
  }

  const header = (
    <header className="brand" ref={topRef}>
      <div className="brand-l">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nyl-emblem.png" alt="" width={44} height={44} />
        <div>
          <p className="wordmark">NYL Healing</p>
          <p className="centre">{t.centre}</p>
        </div>
      </div>
      <label className="lang">
        <span className="sr-only">{t.language}</span>
        <select
          value={lang}
          onChange={(e) => router.replace(`${pathname}?lang=${e.target.value}`, { scroll: false })}
          aria-label={t.language}
          disabled={!!done}
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>
              {LANG_NAMES[l]}
            </option>
          ))}
        </select>
      </label>
    </header>
  );

  // ---------- Done: one pass per patient ----------
  if (done) {
    return (
      <>
        {header}
        <section className="done" aria-live="polite">
          <h1>{t.doneTitle}</h1>
          <p className="hint">{t.passesIntro}</p>
          {done.payment === 'offline' && (
            <p className="note pay-note">{fill(t.payNote, '', { amount: rupees(done.amountDue) })}</p>
          )}
          <div className="passes">
            {done.passes.map((pass, i) => (
              <div className="pass-block" key={pass.passToken}>
                {done.passes.length > 1 && <h2>{fill(t.patientLabel, i + 1)}</h2>}
                <div className="pp-wrap">
                  <PatientPass pass={pass} />
                </div>
                <div className="pass-actions">
                  <SavePassButton pass={pass} label={t.savePass} busyLabel={t.saving} />
                  <a className="link-btn" href={pass.url} target="_blank" rel="noopener">
                    {t.openPass}
                  </a>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn secondary more" onClick={registerMore}>
            {t.registerMore}
          </button>
        </section>
      </>
    );
  }

  const err = (key: string) =>
    errors[key] ? (
      <p className="field-error" id={`e-${key.replace('.', '-')}`}>
        {errors[key]}
      </p>
    ) : null;
  const aria = (key: string) =>
    errors[key] ? { 'aria-invalid': true as const, 'aria-describedby': `e-${key.replace('.', '-')}` } : {};

  const forLabels: [string, string][] = [
    ['self', t.forSelf],
    ['child', t.forChild],
    ['parent', t.forParent],
    ['spouse', t.forSpouse],
    ['other', t.forOther],
  ];
  const genderLabels: [string, string][] = [
    ['male', t.male],
    ['female', t.female],
    ['other', t.other],
  ];
  const relLabels: [string, string][] = [
    ['father', t.relFather],
    ['mother', t.relMother],
    ['other', t.relOther],
  ];
  const labelOf = (list: [string, string][], v: string) => list.find(([k]) => k === v)?.[1] ?? v;

  function Radios({
    i,
    field,
    options,
    legend,
    stack,
  }: {
    i: number;
    field: PKey;
    options: [string, string][];
    legend: string;
    stack?: boolean;
  }) {
    const key = `${i}.${field}`;
    const value = patients[i][field] as string;
    return (
      <fieldset className="field" id={`f-${i}-${field}`} tabIndex={-1} {...aria(key)}>
        <legend>{legend}</legend>
        <div className={`choices${stack ? ' stack' : ''}`}>
          {options.map(([v, label]) => (
            <label key={v} className={`choice ${value === v ? 'checked' : ''}`}>
              <input
                type="radio"
                name={`${field}-${i}`}
                value={v}
                checked={value === v}
                onChange={() => setP(i, field, v as never)}
              />
              {label}
            </label>
          ))}
        </div>
        {err(key)}
      </fieldset>
    );
  }

  function Text({
    i,
    field,
    label,
    optional,
    area,
    rows,
    len,
    ...rest
  }: {
    i: number;
    field: PKey;
    label: string;
    optional?: boolean;
    area?: boolean;
    rows?: number;
    len: number;
  } & React.InputHTMLAttributes<HTMLInputElement>) {
    const key = `${i}.${field}`;
    const id = `f-${i}-${field}`;
    const common = {
      id,
      value: patients[i][field] as string,
      maxLength: len,
      ...aria(key),
    };
    return (
      <div className="field">
        <label htmlFor={id}>
          {label} {optional && <span className="opt">({t.optional})</span>}
        </label>
        {area ? (
          <textarea {...common} rows={rows ?? 3} onChange={(e) => setP(i, field, e.target.value as never)} />
        ) : (
          <input {...common} {...rest} onChange={(e) => setP(i, field, e.target.value as never)} />
        )}
        {err(key)}
      </div>
    );
  }

  function Check({ i, field, text }: { i: number; field: 'consent' | 'guardianConsent'; text: string }) {
    const key = `${i}.${field}`;
    return (
      <div className="field">
        <label className={`consent ${patients[i][field] ? 'checked' : ''}`}>
          <input
            id={`f-${i}-${field}`}
            type="checkbox"
            checked={patients[i][field]}
            onChange={(e) => setP(i, field, e.target.checked)}
            {...aria(key)}
          />
          <span>{text}</span>
        </label>
        {err(key)}
      </div>
    );
  }

  function patientStep(i: number) {
    const p = patients[i];
    const minor = isMinor(p.dob);
    return (
      <div className="fields">
        <h2 className="section">{t.secPersonal}</h2>
        {Radios({ i, field: 'registeringFor', options: forLabels, legend: t.registeringFor, stack: true })}
        {Text({
          i,
          field: 'fullName',
          label: p.registeringFor && p.registeringFor !== 'self' ? t.fullNameOther : t.fullName,
          len: 120,
          autoComplete: p.registeringFor === 'self' ? 'name' : 'off',
        })}
        {Text({ i, field: 'dob', label: t.dob, len: 10, type: 'date', min: '1900-01-01', max: today })}
        {Radios({ i, field: 'gender', options: genderLabels, legend: t.gender })}
        {Text({ i, field: 'city', label: t.city, len: 120, autoComplete: 'address-level2' })}

        {minor && (
          <div className="guardian">
            <p className="note">{t.minorNote}</p>
            {Text({ i, field: 'guardianName', label: t.guardianName, len: 120 })}
            {Radios({ i, field: 'guardianRelation', options: relLabels, legend: t.guardianRelation })}
            {p.guardianRelation === 'other' && Text({ i, field: 'guardianRelationOther', label: t.relOtherLabel, len: 60 })}
            <div className="field">
              <label htmlFor={`f-${i}-guardianPhone`}>{t.guardianPhone}</label>
              <input
                id={`f-${i}-guardianPhone`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                value={p.guardianPhone}
                onChange={(e) => setP(i, 'guardianPhone', e.target.value.replace(/[^\d+ ]/g, '').replace(/(?!^)\+/g, ''))}
                maxLength={20}
                placeholder="98765 43210"
                {...aria(`${i}.guardianPhone`)}
              />
              {err(`${i}.guardianPhone`)}
            </div>
            {Check({ i, field: 'guardianConsent', text: t.guardianConsent })}
          </div>
        )}

        <h2 className="section">{t.secHealth}</h2>
        <div className="field">
          <label htmlFor={`f-${i}-healthConcerns`}>{t.healthConcerns}</label>
          <p className="hint">{t.healthHint}</p>
          <textarea
            id={`f-${i}-healthConcerns`}
            rows={4}
            value={p.healthConcerns}
            onChange={(e) => setP(i, 'healthConcerns', e.target.value)}
            maxLength={4000}
            {...aria(`${i}.healthConcerns`)}
          />
          {err(`${i}.healthConcerns`)}
        </div>
        {Text({ i, field: 'currentMedicines', label: t.medicines, optional: true, area: true, len: 2000 })}
        {Text({ i, field: 'otherNotes', label: t.notes, optional: true, area: true, len: 2000 })}
        {Check({ i, field: 'consent', text: t.consent })}
      </div>
    );
  }

  const chosenSlot = slots.find((s) => s.id === slotId);

  function reviewStep() {
    return (
      <div className="fields">
        <p className="hint">{t.reviewHint}</p>
        {patients.map((p, i) => {
          const age = ageOf(p.dob);
          const minor = isMinor(p.dob);
          const rel =
            p.guardianRelation === 'other' ? p.guardianRelationOther : labelOf(relLabels, p.guardianRelation);
          const rows: [string, string][] = [
            [t.registeringFor, labelOf(forLabels, p.registeringFor)],
            [t.dob, `${p.dob ? formatDate(p.dob, lang) : ''}${age !== null ? ` (${fill(t.years, age)})` : ''}`],
            [t.gender, labelOf(genderLabels, p.gender)],
            [t.city, p.city],
            ...(minor
              ? ([
                  [t.guardianName, p.guardianName],
                  [t.guardianRelation, rel],
                  [t.guardianPhone, p.guardianPhone],
                ] as [string, string][])
              : []),
            [t.healthConcerns, p.healthConcerns],
            ...(p.currentMedicines.trim() ? ([[t.medicines, p.currentMedicines]] as [string, string][]) : []),
            ...(p.otherNotes.trim() ? ([[t.notes, p.otherNotes]] as [string, string][]) : []),
          ];
          return (
            <section className="review-card" key={i}>
              <div className="review-hd">
                <div>
                  {count > 1 && <p className="review-kicker">{fill(t.patientLabel, i + 1)}</p>}
                  <h2>{p.fullName}</h2>
                </div>
                <button type="button" className="btn small" onClick={() => edit(i + 1)}>
                  {t.edit}
                </button>
              </div>
              <dl>
                {rows.map(([k, v]) => (
                  <Fragment key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </Fragment>
                ))}
              </dl>
            </section>
          );
        })}
        <section className="review-card">
          <div className="review-hd">
            <div>
              <p className="review-kicker">{t.steps[2]}</p>
              <h2>{chosenSlot ? formatDay(chosenSlot.slot_date, lang) : ''}</h2>
              {chosenSlot?.starts_at && <p className="hint">{formatTime(chosenSlot.starts_at, lang)}</p>}
            </div>
            <button type="button" className="btn small" onClick={() => edit(DAY)}>
              {t.edit}
            </button>
          </div>
        </section>
      </div>
    );
  }

  function dayStep() {
    return (
      <div className="fields">
        <p className="note">{t.dayNote}</p>
        {slots.length === 0 ? (
          <p className="empty">{t.noSlots}</p>
        ) : (
          <fieldset className="field" id="f-slot" tabIndex={-1} {...aria('slot')}>
            <legend className="sr-only">{t.steps[2]}</legend>
            <div className="days">
              {slots.map((s) => {
                const tooFew = s.remaining < count;
                const meta = [
                  s.starts_at ? formatTime(s.starts_at, lang) : '',
                  s.remaining <= 0
                    ? t.full
                    : places(fill(tooFew ? t.notEnough : t.placesLeft, s.remaining), s.remaining, lang),
                ]
                  .filter(Boolean)
                  .join(lang === 'ar' ? '، ' : ', ');
                return (
                  <label key={s.id} className={`day ${slotId === s.id ? 'checked' : ''} ${tooFew ? 'full' : ''}`}>
                    <input
                      type="radio"
                      name="slot"
                      value={s.id}
                      disabled={tooFew}
                      checked={slotId === s.id}
                      onChange={() => {
                        setSlotId(s.id);
                        setErrors(({ slot: _, ...r }) => r);
                      }}
                    />
                    <span className="day-date">{formatDay(s.slot_date, lang, false)}</span>
                    <span className="day-meta">{meta}</span>
                  </label>
                );
              })}
            </div>
            {err('slot')}
          </fieldset>
        )}
      </div>
    );
  }

  function payStep() {
    const sum = REGISTRATION_FEE * count;
    return (
      <div className="fields">
        <div className="bill">
          <div className="bill-row">
            <span>{t.feeLine}</span>
            <span>
              {count} × {rupees(REGISTRATION_FEE)}
            </span>
          </div>
          <div className="bill-row bill-total">
            <span>{t.total}</span>
            <span>{rupees(sum)}</span>
          </div>
        </div>
        <fieldset className="field" id="f-payment" tabIndex={-1} {...aria('payment')}>
          <legend className="sr-only">{t.payTitle}</legend>
          <div className="days">
            <label className={`day ${payment === 'offline' ? 'checked' : ''}`}>
              <input
                type="radio"
                name="payment"
                value="offline"
                checked={payment === 'offline'}
                onChange={() => {
                  setPayment('offline');
                  setErrors(({ payment: _, ...r }) => r);
                }}
              />
              <span className="day-date">{t.payOffline}</span>
              <span className="day-meta">{t.payOfflineHint}</span>
            </label>
            <label className={`day ${payment === 'online' ? 'checked' : ''} ${ONLINE_PAYMENT_ENABLED ? '' : 'full'}`}>
              <input
                type="radio"
                name="payment"
                value="online"
                disabled={!ONLINE_PAYMENT_ENABLED}
                checked={payment === 'online'}
                onChange={() => {
                  setPayment('online');
                  setErrors(({ payment: _, ...r }) => r);
                }}
              />
              <span className="day-date">
                {t.payOnline}
                {!ONLINE_PAYMENT_ENABLED && <span className="soon">{t.comingSoon}</span>}
              </span>
              <span className="day-meta">{t.payOnlineHint}</span>
            </label>
          </div>
          {err('payment')}
        </fieldset>
      </div>
    );
  }

  const title =
    step === 0
      ? t.countTitle
      : step <= count
        ? count > 1
          ? fill(t.patientOf, step, { total: count })
          : t.steps[0]
        : step === DAY
          ? t.steps[2]
          : step === REVIEW
            ? t.reviewTitle
            : t.payTitle;

  const primaryLabel = step === PAY ? (pending ? t.submitting : t.confirm) : fromReview ? t.backToReview : t.next;
  const showPrimary = !(step === DAY && slots.length === 0);

  return (
    <>
      {header}

      <div className="progress" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <p className="step-of">{fill(t.stepOf, step + 1, { total })}</p>
      <h1 className="step-title">{title}</h1>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === PAY) submit();
          else next();
        }}
      >
        {step === 0 && (
          <div className="fields">
            <fieldset className="field">
              <legend>{t.countQ}</legend>
              <p className="hint">{t.countHint}</p>
              <div className="counts">
                {Array.from({ length: MAX_PATIENTS }, (_, i) => i + 1).map((n) => (
                  <label key={n} className={`count ${count === n ? 'checked' : ''}`}>
                    <input type="radio" name="count" value={n} checked={count === n} onChange={() => changeCount(n)} />
                    {n}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
        {step >= 1 && step <= count && patientStep(step - 1)}
        {step === DAY && dayStep()}
        {step === REVIEW && reviewStep()}
        {step === PAY && payStep()}

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <div className="actions">
          {step > 0 && !fromReview && (
            <button type="button" className="btn secondary" onClick={() => go(step - 1)} disabled={pending}>
              {t.back}
            </button>
          )}
          {showPrimary && (
            <button type="submit" className="btn primary" disabled={pending} aria-busy={pending}>
              {primaryLabel}
            </button>
          )}
        </div>
      </form>
    </>
  );
}
