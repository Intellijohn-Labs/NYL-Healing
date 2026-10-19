// Words that point to each disease in a typed illness (WhatsApp answers like "sugar and BP" or "പ്രമേഹം").
// Used only to help the healers' disease filter for patients who typed their illness instead of ticking boxes.
import type { Disease } from './diseases';

const WORDS: Record<Exclude<Disease, 'other'>, string[]> = {
  heart: ['heart', 'cardiac', 'angina', 'bypass', 'stent', 'ഹൃദയ', 'ഹാർട്ട്', 'நெஞ்சு', 'இதய', 'हृदय', 'दिल', 'ಹೃದಯ', 'قلب'],
  kidney: ['kidney', 'renal', 'dialysis', 'creatinine', 'വൃക്ക', 'കിഡ്നി', 'ഡയാലിസിസ്', 'சிறுநீரக', 'கிட்னி', 'गुर्दे', 'किडनी', 'ಮೂತ್ರಪಿಂಡ', 'ಕಿಡ್ನಿ', 'كلى', 'الكلى'],
  liver: ['liver', 'hepat', 'jaundice', 'fatty liver', 'cirrhosis', 'കരൾ', 'ലിവർ', 'മഞ്ഞപ്പിത്തം', 'கல்லீரல்', 'लिवर', 'जिगर', 'ಯಕೃತ್', 'ಲಿವರ್', 'كبد'],
  stomach: ['stomach', 'gastr', 'ulcer', 'acidity', 'gas trouble', 'indigestion', 'constipation', 'വയർ', 'വയറ്', 'ഗ്യാസ്', 'അൾസർ', 'വയിറ്', 'வயிற்று', 'பேட்', 'पेट', 'गैस', 'ಹೊಟ್ಟೆ', 'معدة'],
  lungs: ['lung', 'asthma', 'breath', 'wheez', 'copd', 'bronch', 'tb', 'tuberculosis', 'ശ്വാസ', 'ആസ്ത്മ', 'കഫം', 'ஆஸ்துமா', 'நுரையீரல்', 'दमा', 'फेफड़', 'ಆಸ್ತಮಾ', 'ಶ್ವಾಸ', 'ربو', 'رئة'],
  cholesterol: ['cholest', 'lipid', 'triglycer', 'കൊളസ്ട്രോൾ', 'கொலஸ்ட்ரால்', 'कोलेस्ट्रॉल', 'ಕೊಲೆಸ್ಟ್ರಾಲ್', 'كوليسترول'],
  bp: ['bp', 'blood pressure', 'hypertension', 'pressure', 'ബിപി', 'ബി.പി', 'രക്തസമ്മർദ്ദ', 'പ്രഷർ', 'ரத்த அழுத்த', 'இரத்த அழுத்த', 'பிபி', 'बीपी', 'रक्तचाप', 'ब्लड प्रेशर', 'ಬಿಪಿ', 'ರಕ್ತದೊತ್ತಡ', 'ضغط'],
  diabetes: ['diabet', 'sugar', 'dm ', 'insulin', 'പ്രമേഹ', 'ഷുഗർ', 'ഷുഗര്', 'சர்க்கரை', 'நீரிழிவு', 'सुगर', 'शुगर', 'मधुमेह', 'डायबिटीज', 'ಮಧುಮೇಹ', 'ಶುಗರ್', 'سكري', 'السكر'],
  neck_pain: ['neck', 'cervical', 'spondyl', 'കഴുത്ത്', 'கழுத்து', 'गर्दन', 'ಕುತ್ತಿಗೆ', 'رقبة'],
  back_pain: ['back pain', 'backache', 'lumbar', 'slip disc', 'disc prolapse', 'sciatica', 'നടുവേദന', 'നടു വേദന', 'ഡിസ്ക്', 'முதுகு', 'कमर', 'पीठ', 'ಬೆನ್ನು', 'ظهر'],
  shoulder_pain: ['shoulder', 'frozen', 'തോൾ', 'തോള്', 'தோள்', 'कंधे', 'कंधा', 'ಭುಜ', 'كتف'],
  stroke: ['stroke', 'paralys', 'hemipleg', 'സ്ട്രോക്ക്', 'പക്ഷാഘാത', 'തളർവാത', 'பக்கவாத', 'ஸ்ட்ரோக்', 'लकवा', 'स्ट्रोक', 'ಪಾರ್ಶ್ವವಾಯು', 'ಸ್ಟ್ರೋಕ್', 'سكتة', 'شلل'],
  parkinsons: ['parkinson', 'tremor', 'പാർക്കിൻസ', 'വിറയൽ', 'பார்கின்சன்', 'पार्किंसन', 'ಪಾರ್ಕಿನ್ಸನ್', 'باركنسون'],
  mental: ['mental', 'depress', 'anxiety', 'stress', 'insomnia', 'bipolar', 'schizo', 'മാനസിക', 'ഡിപ്രഷൻ', 'ഉറക്കമില്ല', 'ടെൻഷൻ', 'மன', 'மனச்சோர்வு', 'मानसिक', 'डिप्रेशन', 'तनाव', 'ಮಾನಸಿಕ', 'نفسي', 'اكتئاب', 'قلق'],
  eye: ['eye', 'vision', 'cataract', 'glaucoma', 'retina', 'കണ്ണ്', 'കാഴ്ച', 'തിമിര', 'கண்', 'பார்வை', 'आँख', 'आंख', 'मोतियाबिंद', 'ಕಣ್ಣು', 'ದೃಷ್ಟಿ', 'عين', 'عيون', 'نظر'],
  thyroid: ['thyroid', 'thyro', 'goitre', 'goiter', 'തൈറോയ്ഡ്', 'തൈറോയിഡ്', 'தைராய்டு', 'थायरॉइड', 'थायराइड', 'ಥೈರಾಯ್ಡ್', 'غدة', 'درقية'],
  cancer: ['cancer', 'tumour', 'tumor', 'carcinoma', 'chemo', 'malignan', 'കാൻസർ', 'ക്യാൻസർ', 'അർബുദ', 'ട്യൂമർ', 'புற்றுநோய்', 'கட்டி', 'कैंसर', 'ट्यूमर', 'ಕ್ಯಾನ್ಸರ್', 'ಗೆಡ್ಡೆ', 'سرطان', 'ورم'],
};

// Diseases that a typed illness seems to mention
export function diseasesInText(text: string | null | undefined): Disease[] {
  const t = ` ${String(text ?? '').toLowerCase().replace(/[.,;:/()|+&]+/g, ' ')} `;
  if (!t.trim()) return [];
  const found: Disease[] = [];
  for (const [code, words] of Object.entries(WORDS) as [Exclude<Disease, 'other'>, string[]][]) {
    if (
      words.some((w) => {
        const word = w.toLowerCase();
        // short Latin words ("bp", "tb", "dm ") must stand alone; others can be part of a longer word
        return /^[a-z]{1,3}\s?$/.test(word) ? new RegExp(`(^|\\s)${word.trim()}(\\s|$)`).test(t) : t.includes(word);
      })
    )
      found.push(code);
  }
  return found;
}
