'use client';
import { useSyncExternalStore } from 'react';

// useSyncExternalStore tolerates the SSR=`false` / client=`true` divergence
// without logging a hydration mismatch warning, and subscribes via matchMedia.
export function useIsMobile(breakpoint = 1024): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches,
    () => false,
  );
}
