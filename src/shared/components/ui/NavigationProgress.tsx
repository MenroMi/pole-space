'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// A thin top progress bar. Starts on internal <a> clicks, completes when the
// committed pathname changes. A safety timeout guarantees it never sticks.
export default function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Completion is driven by `pathname` changes only, so only activate when the
    // click actually changes the pathname — query-only and hash-only `<a>`
    // navigations would otherwise leave the bar stuck until the safety timeout.
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || anchor.hasAttribute('download')) return;
      if (anchor.target && anchor.target !== '_self') return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      setActive(true);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Disable the travel animation when the user prefers reduced motion.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a media query on mount, not deriving state from state
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Completed navigation: pathname changed → hide.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(false);
  }, [pathname]);

  // Safety net: never let the bar stay forever.
  useEffect(() => {
    if (!active) return;
    timeoutRef.current = setTimeout(() => setActive(false), 8000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active]);

  return (
    <div
      data-active={active}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 100,
        background: 'var(--primary)',
        transformOrigin: 'left',
        transform: active ? 'scaleX(0.9)' : 'scaleX(0)',
        opacity: active ? 1 : 0,
        transition: reducedMotion
          ? 'none'
          : active
            ? 'transform 8s cubic-bezier(0.1,0.6,0.2,1)'
            : 'opacity 200ms ease 120ms',
        pointerEvents: 'none',
      }}
    />
  );
}
