'use client';

import { useActionState, useState } from 'react';
import { login, type LoginState } from '../actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  // Kept in state so a wrong password doesn't clear the email
  const [email, setEmail] = useState('');
  return (
    <form action={action} className="fields staff-login">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn primary" disabled={pending} aria-busy={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
