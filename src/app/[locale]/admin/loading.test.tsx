import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AdminLoading from './loading';

describe('AdminLoading', () => {
  it('renders shell + dashboard stat-card skeletons', () => {
    const { container } = render(<AdminLoading />);
    const shimmering = Array.from(container.querySelectorAll('div')).filter((d) =>
      (d as HTMLElement).style.animation.includes('shimmer'),
    );
    // 7 stat cards (2 blocks each) + greeting + sidebar/topbar + chart blocks
    expect(shimmering.length).toBeGreaterThanOrEqual(14);
  });
});
