import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/staff';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getStaff()) redirect('/staff/scan');
  return (
    <main className="shell staff-shell staff-login-page">
      <section className="login-hero glass">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nyl-emblem.png" alt="" width={88} height={88} />
        <h1>NYL Reception</h1>
        <p className="login-tag">Healing &amp; Research Centre</p>
        <LoginForm />
      </section>
    </main>
  );
}
