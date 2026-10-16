// Disease options on the registration form (the same as NYL's Google Form).
// The codes are what the database stores; to add an option, add it here and in disease_codes() (migration 009).
import type { Lang } from './i18n';

export const DISEASES = [
  'heart', 'kidney', 'liver', 'stomach', 'lungs', 'cholesterol', 'bp', 'diabetes', 'neck_pain',
  'back_pain', 'shoulder_pain', 'stroke', 'parkinsons', 'mental', 'eye', 'thyroid', 'cancer', 'other',
] as const;
export type Disease = (typeof DISEASES)[number];

const L: Record<Disease, Record<Lang, string>> = {
  heart: { en: 'Heart related diseases', ml: 'ഹൃദയ സംബന്ധമായ രോഗങ്ങൾ', ta: 'இதய நோய்கள்', hi: 'हृदय संबंधी रोग', kn: 'ಹೃದಯ ಸಂಬಂಧಿತ ಕಾಯಿಲೆಗಳು', ar: 'أمراض القلب' },
  kidney: { en: 'Kidney related diseases', ml: 'വൃക്ക സംബന്ധമായ രോഗങ്ങൾ', ta: 'சிறுநீரக நோய்கள்', hi: 'गुर्दे संबंधी रोग', kn: 'ಮೂತ್ರಪಿಂಡ ಸಂಬಂಧಿತ ಕಾಯಿಲೆಗಳು', ar: 'أمراض الكلى' },
  liver: { en: 'Liver related diseases', ml: 'കരൾ സംബന്ധമായ രോഗങ്ങൾ', ta: 'கல்லீரல் நோய்கள்', hi: 'लिवर संबंधी रोग', kn: 'ಯಕೃತ್ ಸಂಬಂಧಿತ ಕಾಯಿಲೆಗಳು', ar: 'أمراض الكبد' },
  stomach: { en: 'Stomach related diseases', ml: 'വയർ സംബന്ധമായ രോഗങ്ങൾ', ta: 'வயிற்று நோய்கள்', hi: 'पेट संबंधी रोग', kn: 'ಹೊಟ್ಟೆ ಸಂಬಂಧಿತ ಕಾಯಿಲೆಗಳು', ar: 'أمراض المعدة' },
  lungs: { en: 'Lungs related diseases', ml: 'ശ്വാസകോശ സംബന്ധമായ രോഗങ്ങൾ', ta: 'நுரையீரல் நோய்கள்', hi: 'फेफड़ों संबंधी रोग', kn: 'ಶ್ವಾಸಕೋಶ ಸಂಬಂಧಿತ ಕಾಯಿಲೆಗಳು', ar: 'أمراض الرئة' },
  cholesterol: { en: 'Cholesterol', ml: 'കൊളസ്ട്രോൾ', ta: 'கொலஸ்ட்ரால்', hi: 'कोलेस्ट्रॉल', kn: 'ಕೊಲೆಸ್ಟ್ರಾಲ್', ar: 'الكوليسترول' },
  bp: { en: 'BP (blood pressure)', ml: 'ബിപി (രക്തസമ്മർദ്ദം)', ta: 'பிபி (இரத்த அழுத்தம்)', hi: 'बीपी (रक्तचाप)', kn: 'ಬಿಪಿ (ರಕ್ತದೊತ್ತಡ)', ar: 'ضغط الدم' },
  diabetes: { en: 'Diabetes', ml: 'പ്രമേഹം (ഷുഗർ)', ta: 'நீரிழிவு (சர்க்கரை)', hi: 'मधुमेह (शुगर)', kn: 'ಮಧುಮೇಹ (ಶುಗರ್)', ar: 'السكري' },
  neck_pain: { en: 'Neck pain', ml: 'കഴുത്ത് വേദന', ta: 'கழுத்து வலி', hi: 'गर्दन दर्द', kn: 'ಕುತ್ತಿಗೆ ನೋವು', ar: 'ألم الرقبة' },
  back_pain: { en: 'Back pain', ml: 'നടുവേദന', ta: 'முதுகு வலி', hi: 'कमर दर्द', kn: 'ಬೆನ್ನು ನೋವು', ar: 'ألم الظهر' },
  shoulder_pain: { en: 'Shoulder pain', ml: 'തോൾ വേദന', ta: 'தோள் வலி', hi: 'कंधे का दर्द', kn: 'ಭುಜದ ನೋವು', ar: 'ألم الكتف' },
  stroke: { en: 'Stroke', ml: 'സ്ട്രോക്ക് (പക്ഷാഘാതം)', ta: 'பக்கவாதம் (ஸ்ட்ரோக்)', hi: 'लकवा (स्ट्रोक)', kn: 'ಪಾರ್ಶ್ವವಾಯು (ಸ್ಟ್ರೋಕ್)', ar: 'السكتة الدماغية' },
  parkinsons: { en: "Parkinson's", ml: 'പാർക്കിൻസൺസ്', ta: 'பார்கின்சன்', hi: 'पार्किंसन', kn: 'ಪಾರ್ಕಿನ್ಸನ್', ar: 'باركنسون' },
  mental: { en: 'Mental disorders', ml: 'മാനസിക പ്രശ്നങ്ങൾ', ta: 'மனநலப் பிரச்சினைகள்', hi: 'मानसिक विकार', kn: 'ಮಾನಸಿಕ ಸಮಸ್ಯೆಗಳು', ar: 'اضطرابات نفسية' },
  eye: { en: 'Eye diseases', ml: 'കണ്ണ് രോഗങ്ങൾ', ta: 'கண் நோய்கள்', hi: 'आँखों के रोग', kn: 'ಕಣ್ಣಿನ ಕಾಯಿಲೆಗಳು', ar: 'أمراض العيون' },
  thyroid: { en: 'Thyroid', ml: 'തൈറോയ്ഡ്', ta: 'தைராய்டு', hi: 'थायरॉइड', kn: 'ಥೈರಾಯ್ಡ್', ar: 'الغدة الدرقية' },
  cancer: { en: 'Tumours / cancers', ml: 'ട്യൂമർ / കാൻസർ', ta: 'கட்டிகள் / புற்றுநோய்', hi: 'ट्यूमर / कैंसर', kn: 'ಗೆಡ್ಡೆ / ಕ್ಯಾನ್ಸರ್', ar: 'الأورام / السرطان' },
  other: { en: 'Others', ml: 'മറ്റുള്ളവ', ta: 'மற்றவை', hi: 'अन्य', kn: 'ಇತರೆ', ar: 'أخرى' },
};

export const diseaseLabel = (code: string, lang: Lang = 'en') => L[code as Disease]?.[lang] ?? L[code as Disease]?.en ?? code;
export const isDisease = (x: unknown): x is Disease => typeof x === 'string' && (DISEASES as readonly string[]).includes(x);
