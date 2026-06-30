import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MoveLoading from './loading';

describe('MoveLoading', () => {
  it('renders hero, specs, tabs and related skeleton blocks', () => {
    const { container } = render(<MoveLoading />);
    const shimmering = Array.from(container.querySelectorAll('div')).filter((d) =>
      (d as HTMLElement).style.animation.includes('shimmer'),
    );
    expect(shimmering.length).toBeGreaterThanOrEqual(12);
  });
});
