'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

import { useRouter } from '@/i18n/navigation';

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (status === 'authenticated') wasAuthenticated.current = true;
    if (status === 'unauthenticated' && wasAuthenticated.current) {
      router.replace('/login');
    }
  }, [status, router]);

  return <>{children}</>;
}
