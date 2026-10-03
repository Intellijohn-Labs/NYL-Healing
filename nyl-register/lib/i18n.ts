export const LANGS = ['ml', 'ta', 'hi', 'kn', 'ar', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_NAMES: Record<Lang, string> = {
  ml: 'മലയാളം',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
  kn: 'ಕನ್ನಡ',
  ar: 'العربية',
  en: 'English',
};

// Locale used for dates and times on screen
export const LOCALES: Record<Lang, string> = {
  ml: 'ml-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  ar: 'ar',
  en: 'en-IN',
};

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v);
}

export type Dict = {
  title: string;
  centre: string;
  language: string;
  steps: [string, string, string];
  stepOf: string; // {n}
  fullName: string;
  dob: string;
  gender: string;
  male: string;
  female: string;
  other: string;
  city: string;
  minorNote: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  optional: string;
  healthConcerns: string;
  healthHint: string;
  medicines: string;
  notes: string;
  consent: string;
  dayNote: string;
  placesLeft: string; // {n}
  full: string;
  noSlots: string;
  next: string;
  back: string;
  submit: string;
  submitting: string;
  required: string;
  dobInvalid: string;
  chooseDayError: string;
  consentError: string;
  errSlotFull: string;
  errSlotClosed: string;
  errLink: string;
  errGuardian: string;
  errGeneric: string;
  doneTitle: string;
  yourId: string;
  comeOn: string;
  keepId: string;
  another: string;
  linkTitle: string;
  linkBody: string;
  homeBody: string;
};

const en: Dict = {
  title: 'Patient registration',
  centre: 'NYL Healing & Research Centre, Thandekkad, Perumbavoor',
  language: 'Language',
  steps: ['Your details', 'Health details', 'Registration day'],
  stepOf: 'Step {n} of 3',
  fullName: 'Full name',
  dob: 'Date of birth',
  gender: 'Gender',
  male: 'Male',
  female: 'Female',
  other: 'Other',
  city: 'Town or city',
  minorNote: 'This patient is under 18, so a parent or guardian needs to be added.',
  guardianName: "Parent or guardian's name",
  guardianRelation: 'Relation to the patient',
  guardianPhone: "Parent or guardian's phone",
  optional: 'optional',
  healthConcerns: 'What health problems do you want treatment for?',
  healthHint: 'You can write in any language.',
  medicines: 'Medicines you take now',
  notes: 'Anything else the healer should know',
  consent: 'I agree that NYL Healing Centre may keep these health details to plan my treatment.',
  dayNote:
    "Registration and the healer's health awareness class happen on this day at the Perumbavoor centre. Please come on the day you choose.",
  placesLeft: '{n} places left',
  full: 'Full',
  noSlots:
    'No registration days are open right now. Please check the NYL Healing channel and open this link again later.',
  next: 'Continue',
  back: 'Back',
  submit: 'Register',
  submitting: 'Registering…',
  required: 'Please fill this in.',
  dobInvalid: 'Please enter a real date of birth.',
  chooseDayError: 'Please choose a registration day.',
  consentError: 'Please tick this box to continue.',
  errSlotFull: 'That day has just filled up. Please choose another day.',
  errSlotClosed: 'That day is no longer open. Please choose another day.',
  errLink:
    'This registration link has expired. Open Registration again in the NYL WhatsApp chat to get a new link.',
  errGuardian: 'A parent or guardian is needed for patients under 18.',
  errGeneric: "Registration didn't go through. Please check your connection and try again.",
  doneTitle: "You're registered",
  yourId: 'Your NYL Patient ID',
  comeOn: 'Please come to the Perumbavoor centre on',
  keepId: 'Show this ID at reception. Take a screenshot to keep it.',
  another: 'Register another person',
  linkTitle: "This link doesn't work",
  linkBody:
    'The link may have expired. Open Registration again in the NYL WhatsApp chat to get a new link.',
  homeBody: 'To register, open Registration in the NYL WhatsApp chat and tap the link it sends you.',
};

const ml: Dict = {
  title: 'രോഗി രജിസ്ട്രേഷൻ',
  centre: 'NYL Healing & Research Centre, തണ്ടേക്കാട്, പെരുമ്പാവൂർ',
  language: 'ഭാഷ',
  steps: ['നിങ്ങളുടെ വിവരങ്ങൾ', 'ആരോഗ്യ വിവരങ്ങൾ', 'രജിസ്ട്രേഷൻ ദിവസം'],
  stepOf: 'ഘട്ടം {n} / 3',
  fullName: 'മുഴുവൻ പേര്',
  dob: 'ജനന തീയതി',
  gender: 'ലിംഗം',
  male: 'പുരുഷൻ',
  female: 'സ്ത്രീ',
  other: 'മറ്റുള്ളവ',
  city: 'സ്ഥലം / നഗരം',
  minorNote: 'രോഗിക്ക് 18 വയസ്സിൽ താഴെയാണ്. മാതാപിതാക്കളുടെയോ രക്ഷിതാവിന്റെയോ വിവരങ്ങൾ ചേർക്കുക.',
  guardianName: 'മാതാപിതാക്കളുടെ / രക്ഷിതാവിന്റെ പേര്',
  guardianRelation: 'രോഗിയുമായുള്ള ബന്ധം',
  guardianPhone: 'മാതാപിതാക്കളുടെ / രക്ഷിതാവിന്റെ ഫോൺ',
  optional: 'നിർബന്ധമില്ല',
  healthConcerns: 'ഏതെല്ലാം ആരോഗ്യ പ്രശ്നങ്ങൾക്കാണ് ചികിത്സ വേണ്ടത്?',
  healthHint: 'ഏത് ഭാഷയിലും എഴുതാം.',
  medicines: 'ഇപ്പോൾ കഴിക്കുന്ന മരുന്നുകൾ',
  notes: 'ഹീലർ അറിയേണ്ട മറ്റെന്തെങ്കിലും',
  consent: 'എന്റെ ചികിത്സ പ്ലാൻ ചെയ്യാൻ ഈ ആരോഗ്യ വിവരങ്ങൾ NYL Healing Centre സൂക്ഷിക്കുന്നതിന് ഞാൻ സമ്മതിക്കുന്നു.',
  dayNote:
    'ഈ ദിവസം പെരുമ്പാവൂർ സെന്ററിൽ രജിസ്ട്രേഷനും ഹീലറുടെ health awareness ക്ലാസും നടക്കും. നിങ്ങൾ തിരഞ്ഞെടുക്കുന്ന ദിവസം തന്നെ വരിക.',
  placesLeft: '{n} സീറ്റ് ബാക്കി',
  full: 'നിറഞ്ഞു',
  noSlots:
    'ഇപ്പോൾ രജിസ്ട്രേഷൻ ദിവസങ്ങൾ ഒന്നും ലഭ്യമല്ല. NYL Healing ചാനൽ നോക്കി, പിന്നീട് ഈ ലിങ്ക് വീണ്ടും തുറക്കുക.',
  next: 'തുടരുക',
  back: 'തിരികെ',
  submit: 'രജിസ്റ്റർ ചെയ്യുക',
  submitting: 'രജിസ്റ്റർ ചെയ്യുന്നു…',
  required: 'ഇത് പൂരിപ്പിക്കുക.',
  dobInvalid: 'ശരിയായ ജനന തീയതി നൽകുക.',
  chooseDayError: 'ഒരു രജിസ്ട്രേഷൻ ദിവസം തിരഞ്ഞെടുക്കുക.',
  consentError: 'തുടരാൻ ഈ ബോക്സ് ടിക്ക് ചെയ്യുക.',
  errSlotFull: 'ആ ദിവസത്തെ സീറ്റുകൾ ഇപ്പോൾ നിറഞ്ഞു. മറ്റൊരു ദിവസം തിരഞ്ഞെടുക്കുക.',
  errSlotClosed: 'ആ ദിവസം ഇപ്പോൾ ലഭ്യമല്ല. മറ്റൊരു ദിവസം തിരഞ്ഞെടുക്കുക.',
  errLink:
    'ഈ രജിസ്ട്രേഷൻ ലിങ്കിന്റെ സമയം കഴിഞ്ഞു. പുതിയ ലിങ്ക് ലഭിക്കാൻ NYL WhatsApp ചാറ്റിൽ വീണ്ടും രജിസ്ട്രേഷൻ തുറക്കുക.',
  errGuardian: '18 വയസ്സിൽ താഴെയുള്ളവർക്ക് മാതാപിതാക്കളുടെയോ രക്ഷിതാവിന്റെയോ വിവരങ്ങൾ വേണം.',
  errGeneric: 'രജിസ്ട്രേഷൻ പൂർത്തിയായില്ല. ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.',
  doneTitle: 'രജിസ്ട്രേഷൻ പൂർത്തിയായി',
  yourId: 'നിങ്ങളുടെ NYL പേഷ്യന്റ് ഐഡി',
  comeOn: 'പെരുമ്പാവൂർ സെന്ററിൽ വരേണ്ട ദിവസം',
  keepId: 'റിസപ്ഷനിൽ ഈ ഐഡി കാണിക്കുക. സ്ക്രീൻഷോട്ട് എടുത്ത് സൂക്ഷിക്കുക.',
  another: 'മറ്റൊരാളെ രജിസ്റ്റർ ചെയ്യുക',
  linkTitle: 'ഈ ലിങ്ക് പ്രവർത്തിക്കുന്നില്ല',
  linkBody: 'ലിങ്കിന്റെ സമയം കഴിഞ്ഞിരിക്കാം. പുതിയ ലിങ്ക് ലഭിക്കാൻ NYL WhatsApp ചാറ്റിൽ വീണ്ടും രജിസ്ട്രേഷൻ തുറക്കുക.',
  homeBody: 'രജിസ്റ്റർ ചെയ്യാൻ NYL WhatsApp ചാറ്റിൽ രജിസ്ട്രേഷൻ തുറന്ന്, ലഭിക്കുന്ന ലിങ്കിൽ അമർത്തുക.',
};

const ta: Dict = {
  title: 'நோயாளர் பதிவு',
  centre: 'NYL Healing & Research Centre, தண்டேக்காடு, பெரும்பாவூர்',
  language: 'மொழி',
  steps: ['உங்கள் விவரங்கள்', 'உடல்நல விவரங்கள்', 'பதிவு நாள்'],
  stepOf: 'படி {n} / 3',
  fullName: 'முழுப் பெயர்',
  dob: 'பிறந்த தேதி',
  gender: 'பாலினம்',
  male: 'ஆண்',
  female: 'பெண்',
  other: 'மற்றவை',
  city: 'ஊர் / நகரம்',
  minorNote: 'நோயாளருக்கு 18 வயதுக்குக் குறைவு. பெற்றோர் அல்லது பாதுகாவலர் விவரங்களைச் சேர்க்கவும்.',
  guardianName: 'பெற்றோர் / பாதுகாவலர் பெயர்',
  guardianRelation: 'நோயாளருடன் உறவு',
  guardianPhone: 'பெற்றோர் / பாதுகாவலர் தொலைபேசி',
  optional: 'விருப்பம்',
  healthConcerns: 'எந்த உடல்நலப் பிரச்சினைகளுக்கு சிகிச்சை வேண்டும்?',
  healthHint: 'எந்த மொழியிலும் எழுதலாம்.',
  medicines: 'இப்போது எடுக்கும் மருந்துகள்',
  notes: 'ஹீலர் அறிய வேண்டிய வேறு ஏதேனும்',
  consent: 'என் சிகிச்சையைத் திட்டமிட இந்த உடல்நல விவரங்களை NYL Healing Centre வைத்திருக்க நான் ஒப்புக்கொள்கிறேன்.',
  dayNote:
    'இந்த நாளில் பெரும்பாவூர் மையத்தில் பதிவும் ஹீலரின் விழிப்புணர்வு வகுப்பும் நடைபெறும். நீங்கள் தேர்ந்தெடுக்கும் நாளில் வரவும்.',
  placesLeft: '{n} இடங்கள் உள்ளன',
  full: 'நிரம்பியது',
  noSlots: 'தற்போது பதிவு நாட்கள் எதுவும் இல்லை. NYL Healing சேனலைப் பார்த்து, பின்னர் இந்த இணைப்பை மீண்டும் திறக்கவும்.',
  next: 'தொடரவும்',
  back: 'பின்செல்',
  submit: 'பதிவு செய்',
  submitting: 'பதிவு செய்கிறது…',
  required: 'இதை நிரப்பவும்.',
  dobInvalid: 'சரியான பிறந்த தேதியை உள்ளிடவும்.',
  chooseDayError: 'ஒரு பதிவு நாளைத் தேர்ந்தெடுக்கவும்.',
  consentError: 'தொடர இந்தப் பெட்டியைத் தேர்வு செய்யவும்.',
  errSlotFull: 'அந்த நாள் இப்போது நிரம்பிவிட்டது. வேறு நாளைத் தேர்ந்தெடுக்கவும்.',
  errSlotClosed: 'அந்த நாள் இப்போது கிடைக்கவில்லை. வேறு நாளைத் தேர்ந்தெடுக்கவும்.',
  errLink: 'இந்தப் பதிவு இணைப்பு காலாவதியானது. புதிய இணைப்பைப் பெற NYL WhatsApp உரையாடலில் மீண்டும் பதிவைத் திறக்கவும்.',
  errGuardian: '18 வயதுக்குக் குறைவானவர்களுக்கு பெற்றோர் அல்லது பாதுகாவலர் விவரம் தேவை.',
  errGeneric: 'பதிவு நிறைவடையவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
  doneTitle: 'பதிவு முடிந்தது',
  yourId: 'உங்கள் NYL நோயாளர் ஐடி',
  comeOn: 'பெரும்பாவூர் மையத்திற்கு வர வேண்டிய நாள்',
  keepId: 'வரவேற்பில் இந்த ஐடியைக் காட்டவும். ஸ்கிரீன்ஷாட் எடுத்து வைத்துக்கொள்ளவும்.',
  another: 'மற்றொருவரைப் பதிவு செய்',
  linkTitle: 'இந்த இணைப்பு வேலை செய்யவில்லை',
  linkBody: 'இணைப்பு காலாவதியாகியிருக்கலாம். புதிய இணைப்பைப் பெற NYL WhatsApp உரையாடலில் மீண்டும் பதிவைத் திறக்கவும்.',
  homeBody: 'பதிவு செய்ய, NYL WhatsApp உரையாடலில் பதிவைத் திறந்து, அனுப்பப்படும் இணைப்பைத் தட்டவும்.',
};

const hi: Dict = {
  title: 'मरीज़ पंजीकरण',
  centre: 'NYL Healing & Research Centre, तंडेक्काड, पेरुम्बावूर',
  language: 'भाषा',
  steps: ['आपकी जानकारी', 'स्वास्थ्य जानकारी', 'पंजीकरण का दिन'],
  stepOf: 'चरण {n} / 3',
  fullName: 'पूरा नाम',
  dob: 'जन्म तिथि',
  gender: 'लिंग',
  male: 'पुरुष',
  female: 'महिला',
  other: 'अन्य',
  city: 'शहर / कस्बा',
  minorNote: 'मरीज़ की उम्र 18 साल से कम है, इसलिए माता-पिता या अभिभावक की जानकारी जोड़ें।',
  guardianName: 'माता-पिता / अभिभावक का नाम',
  guardianRelation: 'मरीज़ से रिश्ता',
  guardianPhone: 'माता-पिता / अभिभावक का फ़ोन',
  optional: 'वैकल्पिक',
  healthConcerns: 'आप किन स्वास्थ्य समस्याओं का उपचार चाहते हैं?',
  healthHint: 'आप किसी भी भाषा में लिख सकते हैं।',
  medicines: 'अभी ली जा रही दवाएँ',
  notes: 'हीलर को और कुछ बताना हो तो',
  consent: 'मैं सहमत हूँ कि मेरे उपचार की योजना के लिए NYL Healing Centre ये स्वास्थ्य जानकारी रख सकता है।',
  dayNote:
    'इस दिन पेरुम्बावूर केंद्र में पंजीकरण और हीलर की स्वास्थ्य जागरूकता कक्षा होगी। कृपया चुने हुए दिन ही आएँ।',
  placesLeft: '{n} स्थान बाकी',
  full: 'भर गया',
  noSlots: 'अभी कोई पंजीकरण दिन खुला नहीं है। NYL Healing चैनल देखें और बाद में यह लिंक फिर खोलें।',
  next: 'आगे बढ़ें',
  back: 'पीछे',
  submit: 'पंजीकरण करें',
  submitting: 'पंजीकरण हो रहा है…',
  required: 'कृपया इसे भरें।',
  dobInvalid: 'कृपया सही जन्म तिथि डालें।',
  chooseDayError: 'कृपया पंजीकरण का एक दिन चुनें।',
  consentError: 'आगे बढ़ने के लिए यह बॉक्स चुनें।',
  errSlotFull: 'वह दिन अभी भर गया है। कृपया कोई दूसरा दिन चुनें।',
  errSlotClosed: 'वह दिन अब खुला नहीं है। कृपया कोई दूसरा दिन चुनें।',
  errLink: 'इस पंजीकरण लिंक की समय-सीमा खत्म हो गई है। नया लिंक पाने के लिए NYL WhatsApp चैट में फिर से पंजीकरण खोलें।',
  errGuardian: '18 साल से कम उम्र के मरीज़ों के लिए माता-पिता या अभिभावक की जानकारी ज़रूरी है।',
  errGeneric: 'पंजीकरण पूरा नहीं हुआ। अपना इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।',
  doneTitle: 'पंजीकरण हो गया',
  yourId: 'आपकी NYL पेशेंट आईडी',
  comeOn: 'पेरुम्बावूर केंद्र पर आने का दिन',
  keepId: 'रिसेप्शन पर यह आईडी दिखाएँ। स्क्रीनशॉट लेकर रख लें।',
  another: 'किसी और का पंजीकरण करें',
  linkTitle: 'यह लिंक काम नहीं कर रहा',
  linkBody: 'लिंक की समय-सीमा खत्म हो गई होगी। नया लिंक पाने के लिए NYL WhatsApp चैट में फिर से पंजीकरण खोलें।',
  homeBody: 'पंजीकरण के लिए NYL WhatsApp चैट में पंजीकरण खोलें और भेजे गए लिंक पर टैप करें।',
};

const kn: Dict = {
  title: 'ರೋಗಿ ನೋಂದಣಿ',
  centre: 'NYL Healing & Research Centre, ತಂಡೇಕ್ಕಾಡ್, ಪೆರುಂಬಾವೂರ್',
  language: 'ಭಾಷೆ',
  steps: ['ನಿಮ್ಮ ವಿವರಗಳು', 'ಆರೋಗ್ಯ ವಿವರಗಳು', 'ನೋಂದಣಿ ದಿನ'],
  stepOf: 'ಹಂತ {n} / 3',
  fullName: 'ಪೂರ್ಣ ಹೆಸರು',
  dob: 'ಜನ್ಮ ದಿನಾಂಕ',
  gender: 'ಲಿಂಗ',
  male: 'ಪುರುಷ',
  female: 'ಮಹಿಳೆ',
  other: 'ಇತರೆ',
  city: 'ಊರು / ನಗರ',
  minorNote: 'ರೋಗಿಗೆ 18 ವರ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ. ಪೋಷಕರು ಅಥವಾ ರಕ್ಷಕರ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ.',
  guardianName: 'ಪೋಷಕರು / ರಕ್ಷಕರ ಹೆಸರು',
  guardianRelation: 'ರೋಗಿಯೊಂದಿಗೆ ಸಂಬಂಧ',
  guardianPhone: 'ಪೋಷಕರು / ರಕ್ಷಕರ ಫೋನ್',
  optional: 'ಐಚ್ಛಿಕ',
  healthConcerns: 'ಯಾವ ಆರೋಗ್ಯ ಸಮಸ್ಯೆಗಳಿಗೆ ಚಿಕಿತ್ಸೆ ಬೇಕು?',
  healthHint: 'ಯಾವುದೇ ಭಾಷೆಯಲ್ಲಿ ಬರೆಯಬಹುದು.',
  medicines: 'ಈಗ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿರುವ ಔಷಧಿಗಳು',
  notes: 'ಹೀಲರ್ ತಿಳಿಯಬೇಕಾದ ಬೇರೆ ಏನಾದರೂ',
  consent: 'ನನ್ನ ಚಿಕಿತ್ಸೆ ಯೋಜಿಸಲು NYL Healing Centre ಈ ಆರೋಗ್ಯ ವಿವರಗಳನ್ನು ಇಟ್ಟುಕೊಳ್ಳಲು ನಾನು ಒಪ್ಪುತ್ತೇನೆ.',
  dayNote:
    'ಈ ದಿನ ಪೆರುಂಬಾವೂರ್ ಕೇಂದ್ರದಲ್ಲಿ ನೋಂದಣಿ ಮತ್ತು ಹೀಲರ್ ಅವರ ಆರೋಗ್ಯ ಜಾಗೃತಿ ತರಗತಿ ನಡೆಯುತ್ತದೆ. ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ ದಿನವೇ ಬನ್ನಿ.',
  placesLeft: '{n} ಸ್ಥಳಗಳು ಬಾಕಿ',
  full: 'ಭರ್ತಿಯಾಗಿದೆ',
  noSlots: 'ಈಗ ಯಾವುದೇ ನೋಂದಣಿ ದಿನ ತೆರೆದಿಲ್ಲ. NYL Healing ಚಾನೆಲ್ ನೋಡಿ, ನಂತರ ಈ ಲಿಂಕ್ ಮತ್ತೆ ತೆರೆಯಿರಿ.',
  next: 'ಮುಂದುವರಿಸಿ',
  back: 'ಹಿಂದೆ',
  submit: 'ನೋಂದಣಿ ಮಾಡಿ',
  submitting: 'ನೋಂದಣಿ ಆಗುತ್ತಿದೆ…',
  required: 'ದಯವಿಟ್ಟು ಇದನ್ನು ಭರ್ತಿ ಮಾಡಿ.',
  dobInvalid: 'ಸರಿಯಾದ ಜನ್ಮ ದಿನಾಂಕ ನಮೂದಿಸಿ.',
  chooseDayError: 'ದಯವಿಟ್ಟು ಒಂದು ನೋಂದಣಿ ದಿನ ಆಯ್ಕೆ ಮಾಡಿ.',
  consentError: 'ಮುಂದುವರಿಯಲು ಈ ಬಾಕ್ಸ್ ಆಯ್ಕೆ ಮಾಡಿ.',
  errSlotFull: 'ಆ ದಿನ ಈಗಷ್ಟೇ ಭರ್ತಿಯಾಗಿದೆ. ಬೇರೆ ದಿನ ಆಯ್ಕೆ ಮಾಡಿ.',
  errSlotClosed: 'ಆ ದಿನ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ಬೇರೆ ದಿನ ಆಯ್ಕೆ ಮಾಡಿ.',
  errLink: 'ಈ ನೋಂದಣಿ ಲಿಂಕ್ ಅವಧಿ ಮುಗಿದಿದೆ. ಹೊಸ ಲಿಂಕ್ ಪಡೆಯಲು NYL WhatsApp ಚಾಟ್‌ನಲ್ಲಿ ಮತ್ತೆ ನೋಂದಣಿ ತೆರೆಯಿರಿ.',
  errGuardian: '18 ವರ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ ವಯಸ್ಸಿನವರಿಗೆ ಪೋಷಕರು ಅಥವಾ ರಕ್ಷಕರ ವಿವರ ಬೇಕು.',
  errGeneric: 'ನೋಂದಣಿ ಪೂರ್ಣಗೊಂಡಿಲ್ಲ. ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  doneTitle: 'ನೋಂದಣಿ ಪೂರ್ಣಗೊಂಡಿದೆ',
  yourId: 'ನಿಮ್ಮ NYL ರೋಗಿ ಐಡಿ',
  comeOn: 'ಪೆರುಂಬಾವೂರ್ ಕೇಂದ್ರಕ್ಕೆ ಬರಬೇಕಾದ ದಿನ',
  keepId: 'ಸ್ವಾಗತದಲ್ಲಿ ಈ ಐಡಿ ತೋರಿಸಿ. ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ತೆಗೆದು ಇಟ್ಟುಕೊಳ್ಳಿ.',
  another: 'ಇನ್ನೊಬ್ಬರನ್ನು ನೋಂದಣಿ ಮಾಡಿ',
  linkTitle: 'ಈ ಲಿಂಕ್ ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ',
  linkBody: 'ಲಿಂಕ್ ಅವಧಿ ಮುಗಿದಿರಬಹುದು. ಹೊಸ ಲಿಂಕ್ ಪಡೆಯಲು NYL WhatsApp ಚಾಟ್‌ನಲ್ಲಿ ಮತ್ತೆ ನೋಂದಣಿ ತೆರೆಯಿರಿ.',
  homeBody: 'ನೋಂದಣಿಗೆ NYL WhatsApp ಚಾಟ್‌ನಲ್ಲಿ ನೋಂದಣಿ ತೆರೆದು, ಕಳುಹಿಸಿದ ಲಿಂಕ್ ಒತ್ತಿ.',
};

const ar: Dict = {
  title: 'تسجيل المريض',
  centre: 'NYL Healing & Research Centre، ثانديكاد، بيرومبافور',
  language: 'اللغة',
  steps: ['بياناتك', 'البيانات الصحية', 'يوم التسجيل'],
  stepOf: 'الخطوة {n} من 3',
  fullName: 'الاسم الكامل',
  dob: 'تاريخ الميلاد',
  gender: 'الجنس',
  male: 'ذكر',
  female: 'أنثى',
  other: 'آخر',
  city: 'المدينة أو البلدة',
  minorNote: 'عمر المريض أقل من 18 عاماً، لذا يجب إضافة بيانات أحد الوالدين أو الوصي.',
  guardianName: 'اسم الوالد أو الوصي',
  guardianRelation: 'صلة القرابة بالمريض',
  guardianPhone: 'هاتف الوالد أو الوصي',
  optional: 'اختياري',
  healthConcerns: 'ما المشكلات الصحية التي تريد علاجها؟',
  healthHint: 'يمكنك الكتابة بأي لغة.',
  medicines: 'الأدوية التي تتناولها حالياً',
  notes: 'أي شيء آخر يجب أن يعرفه المعالج',
  consent: 'أوافق على أن يحتفظ مركز NYL Healing بهذه البيانات الصحية لتخطيط علاجي.',
  dayNote: 'في هذا اليوم يتم التسجيل وتُعقد حصة التوعية الصحية مع المعالج في مركز بيرومبافور. يرجى الحضور في اليوم الذي تختاره.',
  placesLeft: 'متبقٍ {n} مقعد',
  full: 'ممتلئ',
  noSlots: 'لا توجد أيام تسجيل متاحة الآن. يرجى متابعة قناة NYL Healing وفتح هذا الرابط لاحقاً.',
  next: 'متابعة',
  back: 'رجوع',
  submit: 'سجّل',
  submitting: 'جارٍ التسجيل…',
  required: 'يرجى تعبئة هذا الحقل.',
  dobInvalid: 'يرجى إدخال تاريخ ميلاد صحيح.',
  chooseDayError: 'يرجى اختيار يوم التسجيل.',
  consentError: 'يرجى تحديد هذا المربع للمتابعة.',
  errSlotFull: 'امتلأ هذا اليوم للتو. يرجى اختيار يوم آخر.',
  errSlotClosed: 'هذا اليوم لم يعد متاحاً. يرجى اختيار يوم آخر.',
  errLink: 'انتهت صلاحية رابط التسجيل هذا. افتح التسجيل مرة أخرى في محادثة NYL على واتساب للحصول على رابط جديد.',
  errGuardian: 'يلزم إضافة أحد الوالدين أو الوصي للمرضى دون 18 عاماً.',
  errGeneric: 'لم يكتمل التسجيل. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.',
  doneTitle: 'تم تسجيلك',
  yourId: 'رقم المريض في NYL',
  comeOn: 'يرجى الحضور إلى مركز بيرومبافور يوم',
  keepId: 'أظهر هذا الرقم في الاستقبال. التقط لقطة شاشة للاحتفاظ به.',
  another: 'تسجيل شخص آخر',
  linkTitle: 'هذا الرابط لا يعمل',
  linkBody: 'ربما انتهت صلاحية الرابط. افتح التسجيل مرة أخرى في محادثة NYL على واتساب للحصول على رابط جديد.',
  homeBody: 'للتسجيل، افتح التسجيل في محادثة NYL على واتساب واضغط على الرابط المرسل إليك.',
};

export const DICTS: Record<Lang, Dict> = { en, ml, ta, hi, kn, ar };

export function fill(s: string, n: number | string) {
  return s.replace('{n}', String(n));
}
