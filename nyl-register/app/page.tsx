import { DICTS } from '@/lib/i18n';

export default function Home() {
  return (
    <main className="shell">
      <header className="brand">
        <p className="wordmark">NYL Healing</p>
      </header>
      <section className="notice">
        <h1>{DICTS.ml.title}</h1>
        <p lang="ml">{DICTS.ml.homeBody}</p>
        <p lang="en">{DICTS.en.homeBody}</p>
      </section>
    </main>
  );
}
