'use client';

import { useFormStatus } from 'react-dom';
import { markPaidForm } from '@/app/staff/actions';

function Btn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn small" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}

export default function MarkPaidButton({ groupId, amount }: { groupId: string; amount: number }) {
  return (
    <form
      action={markPaidForm}
      onSubmit={(e) => {
        if (!confirm(`Mark ₹${amount.toLocaleString('en-IN')} as received?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="group_id" value={groupId} />
      <Btn label="Mark paid" />
    </form>
  );
}
