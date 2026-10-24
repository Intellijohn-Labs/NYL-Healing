// "Back to WhatsApp chat": opens the NYL WhatsApp chat (the bot's number) in the WhatsApp app.
// The number can be changed with NEXT_PUBLIC_WHATSAPP_NUMBER (digits with country code).
const NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '917356627729').replace(/\D/g, '');

export const BACK_TO_WHATSAPP: Record<string, string> = {
  en: 'Back to WhatsApp chat',
  ml: 'WhatsApp ചാറ്റിലേക്ക് മടങ്ങുക',
  ta: 'WhatsApp உரையாடலுக்குத் திரும்பு',
  hi: 'WhatsApp चैट पर वापस जाएँ',
  kn: 'WhatsApp ಚಾಟ್‌ಗೆ ಹಿಂತಿರುಗಿ',
  ar: 'العودة إلى محادثة واتساب',
};

export default function BackToWhatsApp({ lang }: { lang?: string | null }) {
  return (
    <a className="btn wa-back" href={`https://wa.me/${NUMBER}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">
        <path
          fill="currentColor"
          d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z"
        />
      </svg>
      {BACK_TO_WHATSAPP[lang ?? 'en'] ?? BACK_TO_WHATSAPP.en}
    </a>
  );
}
