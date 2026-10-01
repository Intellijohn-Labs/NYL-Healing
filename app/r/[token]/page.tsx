import type { Metadata } from 'next';
import { getLink, getSlots } from '@/lib/data';
import { DICTS, isLang, type Lang } from '@/lib/i18n';
import RegistrationForm from './RegistrationForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'NYL Patient Registration',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { token } = await params;
  const { lang: langParam } = await searchParams;

  const link = await getLink(token);
  const lang: Lang = isLang(langParam) ? langParam : (link?.language ?? 'ml');
  const t = DICTS[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  if (!link) {
    return (
      <main className="shell" dir={dir} lang={lang}>
        <header className="brand">
          <p className="wordmark">NYL Healing</p>
        </header>
        <section className="notice">
          <h1>{t.linkTitle}</h1>
          <p>{t.linkBody}</p>
        </section>
      </main>
    );
  }

  const slots = await getSlots();

  return (
    <main className="shell" dir={dir} lang={lang}>
      <RegistrationForm token={link.token} lang={lang} slots={slots} />
    </main>
  );
}
