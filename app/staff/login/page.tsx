import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/staff';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getStaff()) redirect('/staff/scan');
  return (
    <main className="shell">
      <header className="brand">
        <div className="brand-l">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nyl-emblem.png" alt="" width={44} height={44} />
          <div>
            <p className="wordmark">NYL Reception</p>
            <p className="centre">Staff sign in</p>
          </div>
        </div>
      </header>
      <h1 className="step-title">Sign in to the scanner</h1>
      <LoginForm />
    </main>
  );
}
