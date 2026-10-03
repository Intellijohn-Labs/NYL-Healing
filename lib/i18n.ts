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
  countTitle: string;
  countQ: string;
  countHint: string;
  patientOf: string;
  secPersonal: string;
  secHealth: string;
  notEnough: string;
  reviewTitle: string;
  reviewHint: string;
  edit: string;
  backToReview: string;
  consentGiven: string;
  years: string;
  payTitle: string;
  feeLine: string;
  total: string;
  payOffline: string;
  payOfflineHint: string;
  payOnline: string;
  payOnlineHint: string;
  comingSoon: string;
  choosePay: string;
  confirm: string;
  passesIntro: string;
  payNote: string;
  savePass: string;
  saving: string;
  openPass: string;
  registerMore: string;
  errGroupFull: string;
  patientLabel: string;
  centre: string;
  language: string;
  steps: [string, string, string];
  stepOf: string; // {n}
  registeringFor: string;
  forSelf: string;
  forChild: string;
  forParent: string;
  forSpouse: string;
  forOther: string;
  fullName: string;
  fullNameOther: string;
  dob: string;
  gender: string;
  male: string;
  female: string;
  other: string;
  city: string;
  minorNote: string;
  guardianName: string;
  guardianRelation: string;
  relFather: string;
  relMother: string;
  relOther: string;
  relOtherLabel: string;
  guardianPhone: string;
  guardianConsent: string;
  phoneInvalid: string;
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
  countTitle: 'Number of patients',
  countQ: 'How many people are you registering?',
  countHint: 'You can register up to 5 people together, for example your family. Everyone gets the same registration day.',
  patientOf: 'Patient {n} of {total}',
  secPersonal: 'Personal details',
  secHealth: 'Health details',
  notEnough: 'Only {n} places left',
  reviewTitle: 'Check the details',
  reviewHint: 'Please check everything before you continue. Tap Edit to correct anything.',
  edit: 'Edit',
  backToReview: 'Save and go back to review',
  consentGiven: 'Consent given',
  years: '{n} years',
  payTitle: 'Payment',
  feeLine: 'Registration day fee',
  total: 'Total',
  payOffline: 'Pay at reception',
  payOfflineHint: 'Pay at the centre on your registration day.',
  payOnline: 'Pay online',
  payOnlineHint: 'Pay now with UPI or card.',
  comingSoon: 'Coming soon',
  choosePay: 'Please choose how you\'ll pay.',
  confirm: 'Confirm and register',
  passesIntro: 'Here is a patient pass for each person. Bring it every day you come. Reception will scan it to mark attendance.',
  payNote: 'Please pay {amount} at reception on your registration day.',
  savePass: 'Save pass',
  saving: 'Saving…',
  openPass: 'Open this pass anytime',
  registerMore: 'Register more people',
  errGroupFull: 'That day doesn\'t have enough places for everyone now. Please choose another day.',
  patientLabel: 'Patient {n}',
  relFather: 'Father',
  relMother: 'Mother',
  relOther: 'Other guardian',
  relOtherLabel: 'How are they related to the patient?',
  registeringFor: 'Who are you registering?',
  forSelf: 'Myself',
  forChild: 'My child',
  forParent: 'My father or mother',
  forSpouse: 'My husband or wife',
  forOther: 'Someone else',
  fullNameOther: 'Patient\'s full name',
  guardianConsent: 'I am this patient\'s parent or guardian, and I agree to their registration and treatment at NYL Healing Centre.',
  phoneInvalid: 'Please enter a valid mobile number, like 98765 43210. For a number outside India, start with + and the country code.',
  title: 'Patient registration',
  centre: 'NYL Healing & Research Centre, Thandekkad, Perumbavoor',
  language: 'Language',
  steps: ['Your details', 'Health details', 'Registration day'],
  stepOf: 'Step {n} of {total}',
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
  errGuardian: 'For patients under 18, a parent or guardian\'s details and consent are needed.',
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
  countTitle: 'രോഗികളുടെ എണ്ണം',
  countQ: 'എത്ര പേരെയാണ് രജിസ്റ്റർ ചെയ്യുന്നത്?',
  countHint: 'കുടുംബാംഗങ്ങൾ പോലെ 5 പേരെ വരെ ഒരുമിച്ച് രജിസ്റ്റർ ചെയ്യാം. എല്ലാവർക്കും ഒരേ രജിസ്ട്രേഷൻ ദിവസമായിരിക്കും.',
  patientOf: 'രോഗി {n} / {total}',
  secPersonal: 'വ്യക്തിഗത വിവരങ്ങൾ',
  secHealth: 'ആരോഗ്യ വിവരങ്ങൾ',
  notEnough: '{n} സീറ്റ് മാത്രം ബാക്കി',
  reviewTitle: 'വിവരങ്ങൾ പരിശോധിക്കുക',
  reviewHint: 'തുടരുന്നതിന് മുൻപ് എല്ലാ വിവരങ്ങളും പരിശോധിക്കുക. തിരുത്താൻ എഡിറ്റ് അമർത്തുക.',
  edit: 'എഡിറ്റ്',
  backToReview: 'സേവ് ചെയ്ത് പരിശോധനയിലേക്ക് മടങ്ങുക',
  consentGiven: 'സമ്മതം നൽകി',
  years: '{n} വയസ്സ്',
  payTitle: 'പേയ്മെന്റ്',
  feeLine: 'രജിസ്ട്രേഷൻ ദിവസത്തെ ഫീസ്',
  total: 'ആകെ',
  payOffline: 'റിസപ്ഷനിൽ പണമടയ്ക്കുക',
  payOfflineHint: 'രജിസ്ട്രേഷൻ ദിവസം സെന്ററിൽ പണമടയ്ക്കുക.',
  payOnline: 'ഓൺലൈനായി പണമടയ്ക്കുക',
  payOnlineHint: 'ഇപ്പോൾ UPI അല്ലെങ്കിൽ കാർഡ് വഴി പണമടയ്ക്കുക.',
  comingSoon: 'ഉടൻ വരുന്നു',
  choosePay: 'പണമടയ്ക്കുന്ന രീതി തിരഞ്ഞെടുക്കുക.',
  confirm: 'സ്ഥിരീകരിച്ച് രജിസ്റ്റർ ചെയ്യുക',
  passesIntro: 'ഓരോരുത്തർക്കുമുള്ള പേഷ്യന്റ് പാസ് താഴെയുണ്ട്. വരുന്ന എല്ലാ ദിവസവും ഇത് കൊണ്ടുവരിക. ഹാജർ രേഖപ്പെടുത്താൻ റിസപ്ഷനിൽ ഇത് സ്കാൻ ചെയ്യും.',
  payNote: 'രജിസ്ട്രേഷൻ ദിവസം റിസപ്ഷനിൽ {amount} അടയ്ക്കുക.',
  savePass: 'പാസ് സേവ് ചെയ്യുക',
  saving: 'സേവ് ചെയ്യുന്നു…',
  openPass: 'ഈ പാസ് എപ്പോഴും തുറക്കാം',
  registerMore: 'കൂടുതൽ പേരെ രജിസ്റ്റർ ചെയ്യുക',
  errGroupFull: 'ആ ദിവസം എല്ലാവർക്കുമുള്ള സീറ്റുകൾ ഇപ്പോൾ ബാക്കിയില്ല. മറ്റൊരു ദിവസം തിരഞ്ഞെടുക്കുക.',
  patientLabel: 'രോഗി {n}',
  relFather: 'അച്ഛൻ',
  relMother: 'അമ്മ',
  relOther: 'മറ്റ് രക്ഷാധികാരി',
  relOtherLabel: 'രോഗിയുമായുള്ള ബന്ധം എഴുതുക',
  registeringFor: 'ആരെയാണ് രജിസ്റ്റർ ചെയ്യുന്നത്?',
  forSelf: 'ഞാൻ തന്നെ',
  forChild: 'എന്റെ കുട്ടി',
  forParent: 'എന്റെ അച്ഛൻ / അമ്മ',
  forSpouse: 'എന്റെ ഭർത്താവ് / ഭാര്യ',
  forOther: 'മറ്റൊരാൾ',
  fullNameOther: 'രോഗിയുടെ മുഴുവൻ പേര്',
  guardianConsent: 'ഞാൻ ഈ രോഗിയുടെ മാതാപിതാക്കളിൽ ഒരാളോ രക്ഷാധികാരിയോ ആണ്. NYL Healing Centre-ൽ ഇവരുടെ രജിസ്ട്രേഷനും ചികിത്സയ്ക്കും ഞാൻ സമ്മതിക്കുന്നു.',
  phoneInvalid: 'ശരിയായ മൊബൈൽ നമ്പർ നൽകുക, ഉദാ: 98765 43210. ഇന്ത്യക്ക് പുറത്തുള്ള നമ്പറാണെങ്കിൽ + ഉം രാജ്യ കോഡും ചേർത്ത് തുടങ്ങുക.',
  title: 'രോഗി രജിസ്ട്രേഷൻ',
  centre: 'NYL Healing & Research Centre, തണ്ടേക്കാട്, പെരുമ്പാവൂർ',
  language: 'ഭാഷ',
  steps: ['നിങ്ങളുടെ വിവരങ്ങൾ', 'ആരോഗ്യ വിവരങ്ങൾ', 'രജിസ്ട്രേഷൻ ദിവസം'],
  stepOf: 'ഘട്ടം {n} / {total}',
  fullName: 'മുഴുവൻ പേര്',
  dob: 'ജനന തീയതി',
  gender: 'ലിംഗം',
  male: 'പുരുഷൻ',
  female: 'സ്ത്രീ',
  other: 'മറ്റുള്ളവ',
  city: 'സ്ഥലം / നഗരം',
  minorNote: 'രോഗിക്ക് 18 വയസ്സിൽ താഴെയാണ്. മാതാപിതാക്കളുടെയോ രക്ഷാധികാരിയുടെയോ വിവരങ്ങൾ ചേർക്കുക.',
  guardianName: 'മാതാപിതാക്കളുടെ / രക്ഷാധികാരിയുടെ പേര്',
  guardianRelation: 'രോഗിയുമായുള്ള ബന്ധം',
  guardianPhone: 'മാതാപിതാക്കളുടെ / രക്ഷാധികാരിയുടെ ഫോൺ നമ്പർ',
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
  errGuardian: '18 വയസ്സിൽ താഴെയുള്ളവർക്ക് മാതാപിതാക്കളുടെയോ രക്ഷാധികാരിയുടെയോ വിവരങ്ങളും സമ്മതവും വേണം.',
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
  countTitle: 'நோயாளர்களின் எண்ணிக்கை',
  countQ: 'எத்தனை பேரைப் பதிவு செய்கிறீர்கள்?',
  countHint: 'உங்கள் குடும்பத்தினர் போல 5 பேர் வரை ஒன்றாகப் பதிவு செய்யலாம். அனைவருக்கும் ஒரே பதிவு நாள்.',
  patientOf: 'நோயாளர் {n} / {total}',
  secPersonal: 'தனிப்பட்ட விவரங்கள்',
  secHealth: 'உடல்நல விவரங்கள்',
  notEnough: '{n} இடங்கள் மட்டுமே உள்ளன',
  reviewTitle: 'விவரங்களைச் சரிபார்க்கவும்',
  reviewHint: 'தொடரும் முன் அனைத்தையும் சரிபார்க்கவும். திருத்த திருத்து என்பதைத் தட்டவும்.',
  edit: 'திருத்து',
  backToReview: 'சேமித்து சரிபார்ப்புக்குத் திரும்பு',
  consentGiven: 'ஒப்புதல் அளிக்கப்பட்டது',
  years: '{n} வயது',
  payTitle: 'கட்டணம்',
  feeLine: 'பதிவு நாள் கட்டணம்',
  total: 'மொத்தம்',
  payOffline: 'வரவேற்பில் செலுத்துங்கள்',
  payOfflineHint: 'பதிவு நாளில் மையத்தில் செலுத்துங்கள்.',
  payOnline: 'ஆன்லைனில் செலுத்துங்கள்',
  payOnlineHint: 'இப்போது UPI அல்லது கார்டு மூலம் செலுத்துங்கள்.',
  comingSoon: 'விரைவில்',
  choosePay: 'எப்படிச் செலுத்துவீர்கள் என்பதைத் தேர்ந்தெடுக்கவும்.',
  confirm: 'உறுதிசெய்து பதிவு செய்',
  passesIntro: 'ஒவ்வொருவருக்குமான நோயாளர் பாஸ் கீழே உள்ளது. வரும் ஒவ்வொரு நாளும் இதைக் கொண்டு வாருங்கள். வருகையைப் பதிவு செய்ய வரவேற்பில் இதை ஸ்கேன் செய்வார்கள்.',
  payNote: 'பதிவு நாளில் வரவேற்பில் {amount} செலுத்தவும்.',
  savePass: 'பாஸைச் சேமி',
  saving: 'சேமிக்கிறது…',
  openPass: 'இந்தப் பாஸை எப்போதும் திறக்கலாம்',
  registerMore: 'மேலும் பேரைப் பதிவு செய்',
  errGroupFull: 'அந்த நாளில் அனைவருக்கும் இடம் இப்போது இல்லை. வேறு நாளைத் தேர்ந்தெடுக்கவும்.',
  patientLabel: 'நோயாளர் {n}',
  relFather: 'அப்பா',
  relMother: 'அம்மா',
  relOther: 'வேறு பாதுகாவலர்',
  relOtherLabel: 'நோயாளருடன் உள்ள உறவை எழுதவும்',
  registeringFor: 'யாரைப் பதிவு செய்கிறீர்கள்?',
  forSelf: 'நானே',
  forChild: 'என் குழந்தை',
  forParent: 'என் அப்பா / அம்மா',
  forSpouse: 'என் கணவர் / மனைவி',
  forOther: 'வேறொருவர்',
  fullNameOther: 'நோயாளரின் முழுப் பெயர்',
  guardianConsent: 'நான் இந்த நோயாளரின் பெற்றோர் அல்லது பாதுகாவலர். NYL Healing Centre-ல் இவரின் பதிவுக்கும் சிகிச்சைக்கும் நான் ஒப்புக்கொள்கிறேன்.',
  phoneInvalid: 'சரியான மொபைல் எண்ணை உள்ளிடவும், எ.கா. 98765 43210. இந்தியாவுக்கு வெளியே உள்ள எண் என்றால் + மற்றும் நாட்டுக் குறியீட்டுடன் தொடங்கவும்.',
  title: 'நோயாளர் பதிவு',
  centre: 'NYL Healing & Research Centre, தண்டேக்காடு, பெரும்பாவூர்',
  language: 'மொழி',
  steps: ['உங்கள் விவரங்கள்', 'உடல்நல விவரங்கள்', 'பதிவு நாள்'],
  stepOf: 'படி {n} / {total}',
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
  errGuardian: '18 வயதுக்குக் குறைவானவர்களுக்கு பெற்றோர் அல்லது பாதுகாவலரின் விவரமும் ஒப்புதலும் தேவை.',
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
  countTitle: 'मरीज़ों की संख्या',
  countQ: 'आप कितने लोगों का पंजीकरण कर रहे हैं?',
  countHint: 'आप अपने परिवार जैसे 5 लोगों तक का एक साथ पंजीकरण कर सकते हैं। सभी का पंजीकरण दिन एक ही होगा।',
  patientOf: 'मरीज़ {n} / {total}',
  secPersonal: 'व्यक्तिगत जानकारी',
  secHealth: 'स्वास्थ्य जानकारी',
  notEnough: 'केवल {n} स्थान बाकी',
  reviewTitle: 'जानकारी जाँचें',
  reviewHint: 'आगे बढ़ने से पहले सब कुछ जाँच लें। कुछ ठीक करना हो तो बदलें पर टैप करें।',
  edit: 'बदलें',
  backToReview: 'सेव करें और जाँच पर लौटें',
  consentGiven: 'सहमति दी गई',
  years: '{n} साल',
  payTitle: 'भुगतान',
  feeLine: 'पंजीकरण दिन का शुल्क',
  total: 'कुल',
  payOffline: 'रिसेप्शन पर भुगतान करें',
  payOfflineHint: 'पंजीकरण के दिन केंद्र पर भुगतान करें।',
  payOnline: 'ऑनलाइन भुगतान करें',
  payOnlineHint: 'अभी UPI या कार्ड से भुगतान करें।',
  comingSoon: 'जल्द आ रहा है',
  choosePay: 'कृपया भुगतान का तरीका चुनें।',
  confirm: 'पुष्टि करें और पंजीकरण करें',
  passesIntro: 'हर व्यक्ति का पेशेंट पास नीचे है। जिस भी दिन आएँ, इसे साथ लाएँ। उपस्थिति दर्ज करने के लिए रिसेप्शन पर इसे स्कैन किया जाएगा।',
  payNote: 'पंजीकरण के दिन रिसेप्शन पर {amount} का भुगतान करें।',
  savePass: 'पास सेव करें',
  saving: 'सेव हो रहा है…',
  openPass: 'यह पास कभी भी खोलें',
  registerMore: 'और लोगों का पंजीकरण करें',
  errGroupFull: 'उस दिन अब सभी के लिए जगह नहीं बची है। कृपया कोई दूसरा दिन चुनें।',
  patientLabel: 'मरीज़ {n}',
  relFather: 'पिता',
  relMother: 'माता',
  relOther: 'अन्य अभिभावक',
  relOtherLabel: 'मरीज़ से उनका रिश्ता लिखें',
  registeringFor: 'आप किसका पंजीकरण कर रहे हैं?',
  forSelf: 'खुद का',
  forChild: 'मेरा बच्चा',
  forParent: 'मेरे पिता / माता',
  forSpouse: 'मेरे पति / पत्नी',
  forOther: 'कोई और',
  fullNameOther: 'मरीज़ का पूरा नाम',
  guardianConsent: 'मैं इस मरीज़ का माता-पिता या अभिभावक हूँ, और NYL Healing Centre में इनके पंजीकरण और उपचार के लिए सहमति देता/देती हूँ।',
  phoneInvalid: 'कृपया सही मोबाइल नंबर डालें, जैसे 98765 43210। भारत के बाहर का नंबर हो तो + और देश कोड से शुरू करें।',
  title: 'मरीज़ पंजीकरण',
  centre: 'NYL Healing & Research Centre, तंडेक्काड, पेरुम्बावूर',
  language: 'भाषा',
  steps: ['आपकी जानकारी', 'स्वास्थ्य जानकारी', 'पंजीकरण का दिन'],
  stepOf: 'चरण {n} / {total}',
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
  errGuardian: '18 साल से कम उम्र के मरीज़ों के लिए माता-पिता या अभिभावक की जानकारी और सहमति ज़रूरी है।',
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
  countTitle: 'ರೋಗಿಗಳ ಸಂಖ್ಯೆ',
  countQ: 'ನೀವು ಎಷ್ಟು ಜನರನ್ನು ನೋಂದಾಯಿಸುತ್ತಿದ್ದೀರಿ?',
  countHint: 'ನಿಮ್ಮ ಕುಟುಂಬದವರಂತೆ 5 ಜನರವರೆಗೆ ಒಟ್ಟಿಗೆ ನೋಂದಾಯಿಸಬಹುದು. ಎಲ್ಲರಿಗೂ ಒಂದೇ ನೋಂದಣಿ ದಿನ.',
  patientOf: 'ರೋಗಿ {n} / {total}',
  secPersonal: 'ವೈಯಕ್ತಿಕ ವಿವರಗಳು',
  secHealth: 'ಆರೋಗ್ಯ ವಿವರಗಳು',
  notEnough: '{n} ಸ್ಥಳಗಳು ಮಾತ್ರ ಬಾಕಿ',
  reviewTitle: 'ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
  reviewHint: 'ಮುಂದುವರಿಯುವ ಮೊದಲು ಎಲ್ಲವನ್ನೂ ಪರಿಶೀಲಿಸಿ. ಸರಿಪಡಿಸಲು ಎಡಿಟ್ ಒತ್ತಿ.',
  edit: 'ಎಡಿಟ್',
  backToReview: 'ಉಳಿಸಿ ಪರಿಶೀಲನೆಗೆ ಹಿಂತಿರುಗಿ',
  consentGiven: 'ಒಪ್ಪಿಗೆ ನೀಡಲಾಗಿದೆ',
  years: '{n} ವರ್ಷ',
  payTitle: 'ಪಾವತಿ',
  feeLine: 'ನೋಂದಣಿ ದಿನದ ಶುಲ್ಕ',
  total: 'ಒಟ್ಟು',
  payOffline: 'ಸ್ವಾಗತದಲ್ಲಿ ಪಾವತಿಸಿ',
  payOfflineHint: 'ನೋಂದಣಿ ದಿನ ಕೇಂದ್ರದಲ್ಲಿ ಪಾವತಿಸಿ.',
  payOnline: 'ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಪಾವತಿಸಿ',
  payOnlineHint: 'ಈಗಲೇ UPI ಅಥವಾ ಕಾರ್ಡ್ ಮೂಲಕ ಪಾವತಿಸಿ.',
  comingSoon: 'ಶೀಘ್ರದಲ್ಲೇ',
  choosePay: 'ಹೇಗೆ ಪಾವತಿಸುತ್ತೀರಿ ಎಂದು ಆಯ್ಕೆ ಮಾಡಿ.',
  confirm: 'ದೃಢೀಕರಿಸಿ ನೋಂದಣಿ ಮಾಡಿ',
  passesIntro: 'ಪ್ರತಿಯೊಬ್ಬರ ರೋಗಿ ಪಾಸ್ ಕೆಳಗಿದೆ. ಬರುವ ಪ್ರತಿದಿನ ಇದನ್ನು ತನ್ನಿ. ಹಾಜರಾತಿ ದಾಖಲಿಸಲು ಸ್ವಾಗತದಲ್ಲಿ ಇದನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಲಾಗುತ್ತದೆ.',
  payNote: 'ನೋಂದಣಿ ದಿನ ಸ್ವಾಗತದಲ್ಲಿ {amount} ಪಾವತಿಸಿ.',
  savePass: 'ಪಾಸ್ ಉಳಿಸಿ',
  saving: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ…',
  openPass: 'ಈ ಪಾಸ್ ಯಾವಾಗ ಬೇಕಾದರೂ ತೆರೆಯಿರಿ',
  registerMore: 'ಇನ್ನಷ್ಟು ಜನರನ್ನು ನೋಂದಾಯಿಸಿ',
  errGroupFull: 'ಆ ದಿನ ಈಗ ಎಲ್ಲರಿಗೂ ಸ್ಥಳವಿಲ್ಲ. ಬೇರೆ ದಿನ ಆಯ್ಕೆ ಮಾಡಿ.',
  patientLabel: 'ರೋಗಿ {n}',
  relFather: 'ತಂದೆ',
  relMother: 'ತಾಯಿ',
  relOther: 'ಇತರ ರಕ್ಷಕರು',
  relOtherLabel: 'ರೋಗಿಯೊಂದಿಗಿನ ಸಂಬಂಧ ಬರೆಯಿರಿ',
  registeringFor: 'ನೀವು ಯಾರನ್ನು ನೋಂದಾಯಿಸುತ್ತಿದ್ದೀರಿ?',
  forSelf: 'ನಾನೇ',
  forChild: 'ನನ್ನ ಮಗು',
  forParent: 'ನನ್ನ ತಂದೆ / ತಾಯಿ',
  forSpouse: 'ನನ್ನ ಪತಿ / ಪತ್ನಿ',
  forOther: 'ಬೇರೆಯವರು',
  fullNameOther: 'ರೋಗಿಯ ಪೂರ್ಣ ಹೆಸರು',
  guardianConsent: 'ನಾನು ಈ ರೋಗಿಯ ಪೋಷಕರು ಅಥವಾ ರಕ್ಷಕರು. NYL Healing Centre ನಲ್ಲಿ ಇವರ ನೋಂದಣಿ ಮತ್ತು ಚಿಕಿತ್ಸೆಗೆ ನಾನು ಒಪ್ಪುತ್ತೇನೆ.',
  phoneInvalid: 'ಸರಿಯಾದ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ, ಉದಾ: 98765 43210. ಭಾರತದ ಹೊರಗಿನ ಸಂಖ್ಯೆಯಾದರೆ + ಮತ್ತು ದೇಶದ ಕೋಡ್‌ನಿಂದ ಪ್ರಾರಂಭಿಸಿ.',
  title: 'ರೋಗಿ ನೋಂದಣಿ',
  centre: 'NYL Healing & Research Centre, ತಂಡೇಕ್ಕಾಡ್, ಪೆರುಂಬಾವೂರ್',
  language: 'ಭಾಷೆ',
  steps: ['ನಿಮ್ಮ ವಿವರಗಳು', 'ಆರೋಗ್ಯ ವಿವರಗಳು', 'ನೋಂದಣಿ ದಿನ'],
  stepOf: 'ಹಂತ {n} / {total}',
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
  errGuardian: '18 ವರ್ಷಕ್ಕಿಂತ ಕಡಿಮೆ ವಯಸ್ಸಿನವರಿಗೆ ಪೋಷಕರು ಅಥವಾ ರಕ್ಷಕರ ವಿವರ ಮತ್ತು ಒಪ್ಪಿಗೆ ಬೇಕು.',
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
  countTitle: 'عدد المرضى',
  countQ: 'كم شخصاً تسجّل؟',
  countHint: 'يمكنك تسجيل حتى 5 أشخاص معاً، مثل أفراد عائلتك. سيكون للجميع يوم التسجيل نفسه.',
  patientOf: 'المريض {n} من {total}',
  secPersonal: 'البيانات الشخصية',
  secHealth: 'البيانات الصحية',
  notEnough: 'متبقٍ {n} مقاعد فقط',
  reviewTitle: 'راجع البيانات',
  reviewHint: 'يرجى مراجعة كل شيء قبل المتابعة. اضغط تعديل لتصحيح أي شيء.',
  edit: 'تعديل',
  backToReview: 'احفظ وارجع إلى المراجعة',
  consentGiven: 'تمت الموافقة',
  years: '{n} سنة',
  payTitle: 'الدفع',
  feeLine: 'رسوم يوم التسجيل',
  total: 'الإجمالي',
  payOffline: 'الدفع في الاستقبال',
  payOfflineHint: 'ادفع في المركز يوم التسجيل.',
  payOnline: 'الدفع عبر الإنترنت',
  payOnlineHint: 'ادفع الآن عبر UPI أو البطاقة.',
  comingSoon: 'قريباً',
  choosePay: 'يرجى اختيار طريقة الدفع.',
  confirm: 'تأكيد التسجيل',
  passesIntro: 'هذه بطاقة مريض لكل شخص. أحضرها في كل يوم تأتي فيه، وسيمسحها الاستقبال لتسجيل الحضور.',
  payNote: 'يرجى دفع {amount} في الاستقبال يوم التسجيل.',
  savePass: 'حفظ البطاقة',
  saving: 'جارٍ الحفظ…',
  openPass: 'افتح هذه البطاقة في أي وقت',
  registerMore: 'تسجيل أشخاص آخرين',
  errGroupFull: 'لم يعد في ذلك اليوم أماكن كافية للجميع. يرجى اختيار يوم آخر.',
  patientLabel: 'المريض {n}',
  relFather: 'الأب',
  relMother: 'الأم',
  relOther: 'وصي آخر',
  relOtherLabel: 'ما صلة قرابته بالمريض؟',
  registeringFor: 'من تسجّل؟',
  forSelf: 'نفسي',
  forChild: 'طفلي',
  forParent: 'والدي أو والدتي',
  forSpouse: 'زوجي أو زوجتي',
  forOther: 'شخص آخر',
  fullNameOther: 'الاسم الكامل للمريض',
  guardianConsent: 'أنا أحد والدي هذا المريض أو الوصي عليه، وأوافق على تسجيله وعلاجه في مركز NYL Healing.',
  phoneInvalid: 'يرجى إدخال رقم جوال صحيح، مثل 98765 43210. للأرقام خارج الهند، ابدأ بـ + ورمز الدولة.',
  title: 'تسجيل المريض',
  centre: 'NYL Healing & Research Centre، ثانديكاد، بيرومبافور',
  language: 'اللغة',
  steps: ['بياناتك', 'البيانات الصحية', 'يوم التسجيل'],
  stepOf: 'الخطوة {n} من {total}',
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
  errGuardian: 'للمرضى دون 18 عاماً، يلزم إدخال بيانات أحد الوالدين أو الوصي وموافقته.',
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

export function fill(s: string, n: number | string, vars: Record<string, string | number> = {}) {
  let out = s.replace('{n}', String(n));
  for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
  return out;
}
