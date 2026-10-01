'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DICTS, LANGS, LANG_NAMES, LOCALES, fill, type Lang } from '@/lib/i18n';
import type { Slot } from '@/lib/types';
import { register, type RegisterResult } from './actions';

type Fields = {
  fullName: string;
  dob: string;
  gender: string;
  city: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  healthConcerns: string;
  currentMedicines: string;
  otherNotes: string;
  consent: boolean;
  slotId: string;
};

const EMPTY: Fields = {
  fullName: '',
  dob: '',
  gender: '',
  city: '',
  guardianName: '',
  guardianRelation: '',
  guardianPhone: '',
  healthConcerns: '',
  currentMedicines: '',
  otherNotes: '',
  consent: false,
  slotId: '',
};

type Errors = Partial<Record<keyof Fields, string>>;
type Done = Extract<RegisterResult, { ok: true }>;

function todayISO() {
  // India date, so the date picker never allows tomorrow
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function isMinor(dob: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const [y, m, d] = dob.split('-').map(Number);
  const now = new Date();
  const eighteen = new Date(Date.UTC(y + 18, m - 1, d));
  return eighteen > now;
}

function formatDay(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

function formatTime(hms: string | null, lang: Lang) {
  if (!hms) return '';
  return new Intl.DateTimeFormat(LOCALES[lang], { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(
    new Date(`1970-01-01T${hms}Z`),
  );
}

export default function RegistrationForm({ token, lang, slots }: { token: string; lang: Lang; slots: Slot[] }) {
  const t = DICTS[lang];
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const [pending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  const minor = useMemo(() => isMinor(f.dob), [f.dob]);
  const today = todayISO();

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ block: 'start' });

  function validate(s: number): Errors {
    const e: Errors = {};
    if (s === 0) {
      if (!f.fullName.trim()) e.fullName = t.required;
      if (!f.dob) e.dob = t.required;
      else if (f.dob > today || f.dob < '1900-01-01') e.dob = t.dobInvalid;
      if (!f.gender) e.gender = t.required;
      if (minor) {
        if (!f.guardianName.trim()) e.guardianName = t.required;
        if (!f.guardianRelation.trim()) e.guardianRelation = t.required;
      }
    }
    if (s === 1) {
      if (!f.healthConcerns.trim()) e.healthConcerns = t.required;
      if (!f.consent) e.consent = t.consentError;
    }
    if (s === 2 && !f.slotId) e.slotId = t.chooseDayError;
    return e;
  }

  function focusFirstError(e: Errors) {
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`f-${first}`)?.focus();
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(e);
    setStep((s) => s + 1);
    scrollTop();
  }

  function back() {
    setErrors({});
    setFormError('');
    setStep((s) => s - 1);
    scrollTop();
  }

  function submit() {
    const e = validate(2);
    setErrors(e);
    if (Object.keys(e).length) return focusFirstError(e);
    setFormError('');
    startTransition(async () => {
      let res: RegisterResult;
      try {
        res = await register({ token, language: lang, ...f });
      } catch {
        res = { ok: false, error: 'GENERIC' };
      }
      if (res.ok) {
        setDone(res);
        scrollTop();
        return;
      }
      const messages: Record<string, string> = {
        SLOT_FULL: t.errSlotFull,
        SLOT_CLOSED: t.errSlotClosed,
        LINK_INVALID: t.errLink,
        GUARDIAN_REQUIRED: t.errGuardian,
        INVALID_INPUT: t.errGeneric,
        GENERIC: t.errGeneric,
      };
      setFormError(messages[res.error] ?? t.errGeneric);
      if (res.error === 'SLOT_FULL' || res.error === 'SLOT_CLOSED') {
        set('slotId', '');
        router.refresh(); // reload places left, keep what was typed
      }
      if (res.error === 'GUARDIAN_REQUIRED') setStep(0);
    });
  }

  function registerAnother() {
    setF(EMPTY);
    setErrors({});
    setFormError('');
    setDone(null);
    setStep(0);
    router.refresh();
    scrollTop();
  }

  const header = (
    <header className="brand" ref={topRef}>
      <div>
        <p className="wordmark">NYL Healing</p>
        <p className="centre">{t.centre}</p>
      </div>
      <label className="lang">
        <span className="sr-only">{t.language}</span>
        <select
          value={lang}
          onChange={(e) => router.replace(`${pathname}?lang=${e.target.value}`, { scroll: false })}
          aria-label={t.language}
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

  if (done) {
    return (
      <>
        {header}
        <section className="done" aria-live="polite">
          <h1>{t.doneTitle}</h1>
          <div className="pass">
            <p className="pass-label">{t.yourId}</p>
            <p className="pass-id">{done.patientCode}</p>
            <div className="pass-rule" />
            <p className="pass-label">{t.comeOn}</p>
            <p className="pass-day">
              {formatDay(done.slotDate, lang)}
              {done.startsAt ? `, ${formatTime(done.startsAt, lang)}` : ''}
            </p>
          </div>
          <p className="hint">{t.keepId}</p>
          <button type="button" className="btn secondary" onClick={registerAnother}>
            {t.another}
          </button>
        </section>
      </>
    );
  }

  const err = (k: keyof Fields) =>
    errors[k] ? (
      <p className="field-error" id={`e-${k}`}>
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: keyof Fields) =>
    errors[k] ? { 'aria-invalid': true as const, 'aria-describedby': `e-${k}` } : {};

  return (
    <>
      {header}

      <div className="progress" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <p className="step-of">{fill(t.stepOf, step + 1)}</p>
      <h1 className="step-title">{t.steps[step]}</h1>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 2) next();
          else submit();
        }}
      >
        {step === 0 && (
          <div className="fields">
            <div className="field">
              <label htmlFor="f-fullName">{t.fullName}</label>
              <input
                id="f-fullName"
                autoComplete="name"
                value={f.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                maxLength={120}
                {...aria('fullName')}
              />
              {err('fullName')}
            </div>

            <div className="field">
              <label htmlFor="f-dob">{t.dob}</label>
              <input
                id="f-dob"
                type="date"
                max={today}
                min="1900-01-01"
                value={f.dob}
                onChange={(e) => set('dob', e.target.value)}
                {...aria('dob')}
              />
              {err('dob')}
            </div>

            <fieldset className="field" id="f-gender" tabIndex={-1} {...aria('gender')}>
              <legend>{t.gender}</legend>
              <div className="choices">
                {(['male', 'female', 'other'] as const).map((g) => (
                  <label key={g} className={`choice ${f.gender === g ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={f.gender === g}
                      onChange={() => set('gender', g)}
                    />
                    {t[g]}
                  </label>
                ))}
              </div>
              {err('gender')}
            </fieldset>

            <div className="field">
              <label htmlFor="f-city">
                {t.city} <span className="opt">({t.optional})</span>
              </label>
              <input
                id="f-city"
                autoComplete="address-level2"
                value={f.city}
                onChange={(e) => set('city', e.target.value)}
                maxLength={120}
              />
            </div>

            {minor && (
              <div className="guardian">
                <p className="note">{t.minorNote}</p>
                <div className="field">
                  <label htmlFor="f-guardianName">{t.guardianName}</label>
                  <input
                    id="f-guardianName"
                    value={f.guardianName}
                    onChange={(e) => set('guardianName', e.target.value)}
                    maxLength={120}
                    {...aria('guardianName')}
                  />
                  {err('guardianName')}
                </div>
                <div className="field">
                  <label htmlFor="f-guardianRelation">{t.guardianRelation}</label>
                  <input
                    id="f-guardianRelation"
                    value={f.guardianRelation}
                    onChange={(e) => set('guardianRelation', e.target.value)}
                    maxLength={60}
                    {...aria('guardianRelation')}
                  />
                  {err('guardianRelation')}
                </div>
                <div className="field">
                  <label htmlFor="f-guardianPhone">
                    {t.guardianPhone} <span className="opt">({t.optional})</span>
                  </label>
                  <input
                    id="f-guardianPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    value={f.guardianPhone}
                    onChange={(e) => set('guardianPhone', e.target.value.replace(/[^\d+ ]/g, ''))}
                    maxLength={20}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="fields">
            <div className="field">
              <label htmlFor="f-healthConcerns">{t.healthConcerns}</label>
              <p className="hint">{t.healthHint}</p>
              <textarea
                id="f-healthConcerns"
                rows={5}
                value={f.healthConcerns}
                onChange={(e) => set('healthConcerns', e.target.value)}
                maxLength={4000}
                {...aria('healthConcerns')}
              />
              {err('healthConcerns')}
            </div>
            <div className="field">
              <label htmlFor="f-currentMedicines">
                {t.medicines} <span className="opt">({t.optional})</span>
              </label>
              <textarea
                id="f-currentMedicines"
                rows={3}
                value={f.currentMedicines}
                onChange={(e) => set('currentMedicines', e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="field">
              <label htmlFor="f-otherNotes">
                {t.notes} <span className="opt">({t.optional})</span>
              </label>
              <textarea
                id="f-otherNotes"
                rows={3}
                value={f.otherNotes}
                onChange={(e) => set('otherNotes', e.target.value)}
                maxLength={2000}
              />
            </div>
            <div className="field">
              <label className={`consent ${f.consent ? 'checked' : ''}`}>
                <input
                  id="f-consent"
                  type="checkbox"
                  checked={f.consent}
                  onChange={(e) => set('consent', e.target.checked)}
                  {...aria('consent')}
                />
                <span>{t.consent}</span>
              </label>
              {err('consent')}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fields">
            <p className="note">{t.dayNote}</p>
            {slots.length === 0 ? (
              <p className="empty">{t.noSlots}</p>
            ) : (
              <fieldset className="field" id="f-slotId" tabIndex={-1} {...aria('slotId')}>
                <legend className="sr-only">{t.steps[2]}</legend>
                <div className="days">
                  {slots.map((s) => {
                    const isFull = s.remaining <= 0;
                    return (
                      <label
                        key={s.id}
                        className={`day ${f.slotId === s.id ? 'checked' : ''} ${isFull ? 'full' : ''}`}
                      >
                        <input
                          type="radio"
                          name="slot"
                          value={s.id}
                          disabled={isFull}
                          checked={f.slotId === s.id}
                          onChange={() => set('slotId', s.id)}
                        />
                        <span className="day-date">{formatDay(s.slot_date, lang)}</span>
                        <span className="day-meta">
                          {[s.starts_at ? formatTime(s.starts_at, lang) : '', isFull ? t.full : fill(t.placesLeft, s.remaining)]
                            .filter(Boolean)
                            .join(lang === 'ar' ? '، ' : ', ')}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {err('slotId')}
              </fieldset>
            )}
          </div>
        )}

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}

        <div className="actions">
          {step > 0 && (
            <button type="button" className="btn secondary" onClick={back} disabled={pending}>
              {t.back}
            </button>
          )}
          {step < 2 ? (
            <button type="submit" className="btn primary">
              {t.next}
            </button>
          ) : (
            slots.length > 0 && (
              <button type="submit" className="btn primary" disabled={pending} aria-busy={pending}>
                {pending ? t.submitting : t.submit}
              </button>
            )
          )}
        </div>
      </form>
    </>
  );
}
