'use client';
import { useState } from 'react';

import MoveBreakdown from './MoveBreakdown';

type Tab = 'breakdown' | 'muscles' | 'safety';

const TABS: { id: Tab; label: string }[] = [
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'muscles', label: 'Muscles' },
  { id: 'safety', label: 'Safety' },
];

export default function MoveTabs({ steps }: { steps: string[] }) {
  const [active, setActive] = useState<Tab>('breakdown');

  return (
    <div>
      <div role="tablist" className="mb-8 flex gap-8 border-b border-outline-variant/15 pb-4">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            aria-selected={active === id}
            aria-controls="move-tabpanel"
            tabIndex={active === id ? 0 : -1}
            onClick={() => setActive(id)}
            className={`relative font-display text-lg tracking-wide uppercase transition-colors ${
              active === id ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {label}
            {active === id && (
              <span
                aria-hidden="true"
                className="absolute -bottom-[17px] left-0 h-[2px] w-full bg-gradient-to-r from-primary to-primary-container"
              />
            )}
          </button>
        ))}
      </div>

      <div id="move-tabpanel" role="tabpanel" aria-labelledby={`tab-${active}`} tabIndex={0}>
        <div key={active} className="animate-in duration-200 fade-in-0 slide-in-from-bottom-2">
          {active === 'breakdown' && <MoveBreakdown steps={steps} />}
          {(active === 'muscles' || active === 'safety') && (
            <p className="py-12 text-center font-display text-xs font-bold tracking-[0.3em] text-on-surface-variant uppercase">
              Coming soon
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
