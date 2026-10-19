// Identity card types for the registration form (patients aged 15 and over). Codes match migration 012.
import type { Lang } from './i18n';

export const ID_TYPES = ['aadhaar', 'voter', 'passport', 'driving', 'pan', 'emirates', 'other'] as const;
export type IdType = (typeof ID_TYPES)[number];
export const ID_BUCKET = 'patient-ids';
export const ID_MIN_AGE = 15;

const L: Record<IdType, Record<Lang, string>> = {
  aadhaar: { en: 'Aadhaar (masked)', ml: 'ആധാർ (മാസ്ക് ചെയ്തത്)', ta: 'ஆதார் (மறைக்கப்பட்டது)', hi: 'आधार (मास्क्ड)', kn: 'ಆಧಾರ್ (ಮಾಸ್ಕ್ ಮಾಡಿದ)', ar: 'آدهار (مخفي الرقم)' },
  voter: { en: 'Voter ID', ml: 'വോട്ടർ ഐഡി', ta: 'வாக்காளர் அடையாள அட்டை', hi: 'वोटर आईडी', kn: 'ಮತದಾರರ ಗುರುತಿನ ಚೀಟಿ', ar: 'بطاقة الناخب' },
  passport: { en: 'Passport', ml: 'പാസ്പോർട്ട്', ta: 'பாஸ்போர்ட்', hi: 'पासपोर्ट', kn: 'ಪಾಸ್‌ಪೋರ್ಟ್', ar: 'جواز السفر' },
  driving: { en: 'Driving licence', ml: 'ഡ്രൈവിംഗ് ലൈസൻസ്', ta: 'ஓட்டுநர் உரிமம்', hi: 'ड्राइविंग लाइसेंस', kn: 'ಚಾಲನಾ ಪರವಾನಗಿ', ar: 'رخصة القيادة' },
  pan: { en: 'PAN card', ml: 'പാൻ കാർഡ്', ta: 'பான் கார்டு', hi: 'पैन कार्ड', kn: 'ಪ್ಯಾನ್ ಕಾರ್ಡ್', ar: 'بطاقة PAN' },
  emirates: { en: 'Emirates ID', ml: 'എമിറേറ്റ്സ് ഐഡി', ta: 'எமிரேட்ஸ் ஐடி', hi: 'अमीरात आईडी', kn: 'ಎಮಿರೇಟ್ಸ್ ಐಡಿ', ar: 'الهوية الإماراتية' },
  other: { en: 'Other government ID', ml: 'മറ്റ് സർക്കാർ ഐഡി', ta: 'பிற அரசு அடையாள அட்டை', hi: 'अन्य सरकारी आईडी', kn: 'ಇತರ ಸರ್ಕಾರಿ ಗುರುತಿನ ಚೀಟಿ', ar: 'هوية حكومية أخرى' },
};
export const idTypeLabel = (t: string, lang: Lang = 'en') => L[t as IdType]?.[lang] ?? L[t as IdType]?.en ?? t;
export const isIdType = (x: unknown): x is IdType => typeof x === 'string' && (ID_TYPES as readonly string[]).includes(x);
