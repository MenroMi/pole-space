'use client';
import { createContext, useContext, useTransition } from 'react';

type CatalogTransition = {
  isPending: boolean;
  startFilterTransition: (fn: () => void) => void;
};

// Default runs the navigation directly (no transition) so consumers used
// outside a provider — e.g. in isolation tests — still work.
export const CatalogTransitionContext = createContext<CatalogTransition>({
  isPending: false,
  startFilterTransition: (fn) => fn(),
});

export function CatalogTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <CatalogTransitionContext.Provider
      value={{ isPending, startFilterTransition: (fn) => startTransition(fn) }}
    >
      {children}
    </CatalogTransitionContext.Provider>
  );
}

export function useCatalogTransition() {
  return useContext(CatalogTransitionContext);
}
