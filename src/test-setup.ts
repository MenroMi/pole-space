import { createElement } from 'react';

import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_: object, tag: string) =>
        ({
          children,
          ...props
        }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
          const {
            initial: _i,
            animate: _a,
            exit: _e,
            variants: _v,
            layout: _l,
            ...rest
          } = props as Record<string, unknown>;
          return createElement(tag, rest as React.HTMLAttributes<HTMLElement>, children);
        },
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));
