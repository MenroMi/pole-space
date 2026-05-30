'use client';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { recordStreakActivityAction } from '@/features/profile/actions';
import { usePathname } from '@/i18n/navigation';

export default function StreakPing() {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'authenticated') return;

    function ping() {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = new Date().toLocaleDateString('en-CA');
      void recordStreakActivityAction(today, tz);
    }

    ping();

    function onVisibility() {
      if (document.visibilityState === 'visible') ping();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [status, pathname]);

  return null;
}
