'use client';

import { useEffect, useRef, useState } from 'react';
import { logout } from '@/app/staff/actions';

const ROLE: Record<string, string> = {
  owner: 'Owner',
  reception: 'Reception',
  gate: 'Gate',
  healer: 'Healer',
  accounts: 'Accounts',
  rooms_manager: 'Rooms manager',
};

const initials = (name: string) =>
  name
    .replace(/^(dr|mr|mrs|ms)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

// Who is signed in: a small box at the top right. Tapping it opens a menu with Sign out.
export default function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className="um" ref={box}>
      <button type="button" className="um-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="um-av" aria-hidden="true">
          {initials(name)}
        </span>
        <span className="um-txt">
          <b>{name}</b>
          <small>{ROLE[role] ?? role}</small>
        </span>
      </button>
      {open && (
        <div className="um-menu" role="menu">
          <p className="um-who">
            Signed in as <b>{name}</b>
            <small>{ROLE[role] ?? role}</small>
          </p>
          <form action={logout}>
            <button type="submit" className="um-item" role="menuitem">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
