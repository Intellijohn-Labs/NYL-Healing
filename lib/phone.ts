// Checks a mobile number and returns it in one standard format (+<country><number>),
// or null if it isn't a real-looking mobile number.
//
// Accepted:
//   Indian mobiles: 10 digits starting 6-9, typed as 9876543210, 09876543210,
//                   919876543210 or +91 98765 43210 (spaces, dashes and brackets are ignored)
//   Other countries: + then the country code and number, 8 to 15 digits in total
export function normalizePhone(raw: string): string | null {
  const s = (raw ?? '').replace(/[\s\-().]/g, '');
  if (!s) return null;

  let out: string | null = null;
  if (s.startsWith('+')) {
    const d = s.slice(1);
    if (!/^\d+$/.test(d)) return null;
    if (d.startsWith('91')) out = /^91[6-9]\d{9}$/.test(d) ? `+${d}` : null;
    else out = /^[1-9]\d{7,14}$/.test(d) ? `+${d}` : null;
  } else {
    if (!/^\d+$/.test(s)) return null;
    let d = s;
    if (/^0\d{10}$/.test(d)) d = d.slice(1);
    else if (/^91\d{10}$/.test(d)) d = d.slice(2);
    out = /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
  }

  // Reject obvious fakes such as 9999999999
  if (out && /^(\d)\1+$/.test(out.slice(-10))) return null;
  return out;
}
