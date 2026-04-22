'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

const COOLDOWN_S = 60;
const LS_KEY = 'ps_verify_resent_at';

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

type Props = { action: () => Promise<void> };

export function ResendForm({ action }: Props) {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const left = Math.ceil((COOLDOWN_S * 1000 - (Date.now() - parseInt(stored, 10))) / 1000);
      if (left > 0) startCountdown(left);
    }
    return () => clearInterval(intervalRef.current);
  }, []);

  function startCountdown(seconds: number) {
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
    localStorage.setItem(LS_KEY, Date.now().toString());
    startCountdown(COOLDOWN_S);
    await action();
  }

  return (
    <form action={handleAction}>
      <SubmitButton remaining={remaining} />
    </form>
  );
}
