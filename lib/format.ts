// Small display helpers shared by the staff screens (India time, English)
export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

export function ageOf(dob: string | null) {
  if (!dob) return null;
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = todayIST().split('-').map(Number);
  let a = ty - y;
  if (tm < m || (tm === m && td < d)) a--;
  return a;
}

export const dayLabel = (iso: string, withYear = false) =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

export const timeOf = (ts: string) =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    .format(new Date(ts))
    .toUpperCase();

export const slotTime = (hms: string | null) =>
  hms
    ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
        .format(new Date(`1970-01-01T${hms}Z`))
        .toUpperCase()
    : '';

export const rupees = (n: number | null | undefined) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

export const GENDER: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other' };
export const FOR: Record<string, string> = {
  self: 'Myself',
  child: 'Their child',
  parent: 'Their parent',
  spouse: 'Their spouse',
  other: 'Someone else',
};
export const relation = (r: string | null) =>
  !r ? '' : r === 'father' ? 'Father' : r === 'mother' ? 'Mother' : r.replace(/^other:\s*/, '');

export const phone = (p: string | null) => {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return p.startsWith('+') ? p : `+${d}`;
};
