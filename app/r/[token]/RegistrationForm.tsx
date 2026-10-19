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
import { DISEASES, diseaseLabel } from '@/lib/diseases';
import { ID_MIN_AGE, ID_TYPES, idTypeLabel } from '@/lib/idDocs';
import { uploadIdPhoto } from './idActions';

type P = PatientInput;
type PKey = keyof P;
type Done = Extract<RegisterResult, { ok: true }>;

const EMPTY: P = {
  registeringFor: '',
  fullName: '',
  dob: '',
  gender: '',
  city: '',
  designation: '',
  guardianName: '',
  guardianRelation: '',
  guardianRelationOther: '',
  guardianPhone: '',
  guardianConsent: false,
  diseases: [],
  diseasesOther: '',
  healthConcerns: '',
  idType: '',
  idPath: '',
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
const needsId = (dob: string) => {
  const a = ageOf(dob);
  return a !== null && a >= ID_MIN_AGE;
};
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
  if (!p.diseases.length) e[k('diseases')] = t.diseasesError;
  else if (p.diseases.includes('other') && !p.diseasesOther.trim()) e[k('diseasesOther')] = t.required;
  if (needsId(p.dob)) {
    if (!p.idType) e[k('idType')] = t.required;
    if (!p.idPath) e[k('idPath')] = t.idError;
  }
  if (!p.consent) e[k('consent')] = t.consentError;
  return e;
}

// Shrink an ID photo in the browser before uploading: at most 1600 px on the long side, JPEG ~85%
async function shrinkPhoto(file: File): Promise<Blob> {
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return file;
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  return blob && blob.size < file.size ? blob : file;
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
  const [justSaved, setJustSaved] = useState<number | null>(null); // index of the patient just finished
  const [errors, setErrors] = useState<Errors>({});
  const [idPreview, setIdPreview] = useState<Record<number, string>>({}); // local preview of each patient's ID photo
  const [idBusy, setIdBusy] = useState<Record<number, 'busy' | 'fail' | undefined>>({});
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
    setJustSaved(null);
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
    const finished = step >= 1 && step < count ? step - 1 : null;
    go(step + 1);
    if (finished !== null) setJustSaved(finished); // show "Patient 1 saved" on the next patient's page
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
        ID_REQUIRED: t.idError,
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
    setJustSaved(null);
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

  // Upload an ID photo as soon as it's chosen; the form keeps only the stored path
  async function pickIdPhoto(i: number, file: File | undefined) {
    if (!file) return;
    setIdBusy((m) => ({ ...m, [i]: 'busy' }));
    try {
      const blob = await shrinkPhoto(file);
      const fd = new FormData();
      fd.append('photo', new File([blob], 'id.jpg', { type: blob.type || file.type }));
      const r = await uploadIdPhoto(token, fd);
      if (!r.ok) throw new Error('upload');
      setIdPreview((m) => {
        if (m[i]) URL.revokeObjectURL(m[i]);
        return { ...m, [i]: URL.createObjectURL(blob) };
      });
      setP(i, 'idPath', r.path);
      setIdBusy((m) => ({ ...m, [i]: undefined }));
    } catch {
      setIdBusy((m) => ({ ...m, [i]: 'fail' }));
    }
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
        {Text({ i, field: 'designation', label: t.designation, optional: true, len: 80, autoComplete: 'organization-title' })}

        {needsId(p.dob) && (
          <div className="idcard">
            <h2 className="section">{t.secId}</h2>
            <p className="hint">{t.idHint}</p>
            <div className="field">
              <label htmlFor={`f-${i}-idType`}>{t.idType}</label>
              <select id={`f-${i}-idType`} value={p.idType} onChange={(e) => setP(i, 'idType', e.target.value)} {...aria(`${i}.idType`)}>
                <option value="">{t.idChoose}</option>
                {ID_TYPES.map((x) => (
                  <option key={x} value={x}>
                    {idTypeLabel(x, lang)}
                  </option>
                ))}
              </select>
              {err(`${i}.idType`)}
            </div>
            {p.idType === 'aadhaar' && <p className="note">{t.idTip}</p>}
            <div className="field" id={`f-${i}-idPath`} tabIndex={-1} aria-invalid={!!errors[`${i}.idPath`] || undefined}>
              <p className="id-label">{t.idPhoto}</p>
              {idPreview[i] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={idPreview[i]} alt="" className="id-preview" />
              )}
              <label className={`btn id-btn ${idBusy[i] === 'busy' ? 'is-busy' : ''} ${p.idPath ? '' : 'primary'}`}>
                {idBusy[i] === 'busy' ? t.idUploading : p.idPath ? t.idChange : t.idAdd}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  hidden
                  disabled={idBusy[i] === 'busy'}
                  onChange={(e) => {
                    pickIdPhoto(i, e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              {idBusy[i] === 'fail' && <p className="field-error">{t.idFailed}</p>}
              {err(`${i}.idPath`)}
            </div>
          </div>
        )}

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
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d+ ]/g, '').replace(/(?!^)\+/g, '');
                  const key = `${i}.guardianPhone`;
                  setPatients((list) => list.map((x, j) => (j === i ? { ...x, guardianPhone: v } : x)));
                  // Once an error is showing, update it live: it clears as soon as the number is valid
                  if (errors[key]) {
                    setErrors((er) => {
                      const n = { ...er };
                      if (!v.trim() || normalizePhone(v)) delete n[key];
                      else n[key] = t.phoneInvalid;
                      return n;
                    });
                  }
                }}
                onBlur={(e) => {
                  // Check as soon as the person leaves the field
                  const v = e.target.value;
                  if (v.trim() && !normalizePhone(v)) {
                    setErrors((er) => ({ ...er, [`${i}.guardianPhone`]: t.phoneInvalid }));
                  }
                }}
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
        <fieldset className="field" id={`f-${i}-diseases`} tabIndex={-1} aria-invalid={!!errors[`${i}.diseases`] || undefined}>
          <legend>{t.diseases}</legend>
          <div className="dis-grid">
            {DISEASES.map((d) => {
              const on = p.diseases.includes(d);
              return (
                <label key={d} className={`dis-opt ${on ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      setP(i, 'diseases', (e.target.checked ? [...p.diseases, d] : p.diseases.filter((x) => x !== d)) as never)
                    }
                  />
                  <span>{diseaseLabel(d, lang)}</span>
                </label>
              );
            })}
          </div>
          {err(`${i}.diseases`)}
        </fieldset>
        {p.diseases.includes('other') && Text({ i, field: 'diseasesOther', label: t.diseasesOther, len: 120 })}
        {Text({ i, field: 'healthConcerns', label: t.healthConcerns, optional: true, area: true, rows: 3, len: 4000 })}
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
            ...(needsId(p.dob) && p.idType ? ([[t.idReview, `${idTypeLabel(p.idType, lang)} ✓`]] as [string, string][]) : []),
            ...(p.designation.trim() ? ([[t.designation, p.designation]] as [string, string][]) : []),
            ...(minor
              ? ([
                  [t.guardianName, p.guardianName],
                  [t.guardianRelation, rel],
                  [t.guardianPhone, p.guardianPhone],
                ] as [string, string][])
              : []),
            [
              t.diseases.replace(/\s*\(.*\)\s*$/, ''),
              p.diseases
                .map((d) => (d === 'other' && p.diseasesOther.trim() ? `${diseaseLabel(d, lang)}: ${p.diseasesOther.trim()}` : diseaseLabel(d, lang)))
                .join(', '),
            ],
            ...(p.healthConcerns.trim() ? ([[t.healthConcerns, p.healthConcerns]] as [string, string][]) : []),
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

  const primaryLabel =
    step === PAY
      ? pending
        ? t.submitting
        : t.confirm
      : fromReview
        ? t.backToReview
        : step >= 1 && step < count
          ? fill(t.continueTo, step + 1)
          : t.next;
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

      {count > 1 && step >= 1 && step <= count && (
        <ol className="who-steps" aria-label={t.countTitle}>
          {patients.map((p, j) => {
            const done = Object.keys(validatePatient(p, j, t, today)).length === 0;
            const current = j === step - 1;
            const label = (
              <>
                {done && !current && <span aria-hidden="true">✓ </span>}
                {fill(t.patientLabel, j + 1)}
                {p.fullName.trim() && <small>{p.fullName.trim()}</small>}
              </>
            );
            return (
              <li key={j} className={`${current ? 'current' : ''} ${done ? 'done' : ''}`} aria-current={current ? 'step' : undefined}>
                {j < step - 1 && !fromReview ? (
                  <button type="button" onClick={() => go(j + 1)}>
                    {label}
                  </button>
                ) : (
                  <span>{label}</span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {justSaved !== null && step === justSaved + 2 && (
        <p className="saved-note" role="status">
          {fill(t.savedNote, step, { name: patients[justSaved].fullName.trim() || fill(t.patientLabel, justSaved + 1) })}
        </p>
      )}

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
