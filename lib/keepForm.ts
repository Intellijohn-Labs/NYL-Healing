'use client';

import { startTransition, type FormEvent } from 'react';

// React clears a form's fields after a form action runs. For forms that can show an error,
// submit like this instead, so what staff typed stays in the boxes when something needs fixing.
export function keepFields(action: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };
}
