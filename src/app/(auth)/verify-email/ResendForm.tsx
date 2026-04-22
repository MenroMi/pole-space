'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { RESEND_COOLDOWN_S } from '@/features/auth';

function SubmitButton({ remaining }: { remaining: number }) {
  const { pending } = useFormStatus();
  const blocked = pending || remaining > 0;

  return (
    <button
      type="submit"
      disabled={blocked}
      className="kinetic-gradient w-full cursor-pointer rounded-md py-4 text-xs font-bold tracking-widest text-on-primary uppercase shadow-[0_4px_16px_-2px_rgba(132,88,179,0.4)] hover:scale-[1.01] hover:shadow-[0_6px_20px_-2px_rgba(220,184,255,0.5)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
    >
      {pending
        ? 'sending...'
        : remaining > 0
          ? `resend in ${remaining}s`
          : 'resend verification email'}
    </button>
  );
}

type Props = { action: () => Promise<void>; initialRemaining?: number };

export function ResendForm({ action, initialRemaining = 0 }: Props) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (initialRemaining > 0) startCountdown(initialRemaining);
    return () => clearInterval(intervalRef.current);
  }, [initialRemaining]);

  function startCountdown(seconds: number) {
    clearInterval(intervalRef.current);
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleAction() {
    startCountdown(RESEND_COOLDOWN_S);
    await action();
  }

  return (
    <form action={handleAction}>
      <SubmitButton remaining={remaining} />
    </form>
  );
}
