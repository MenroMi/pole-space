import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CatalogLoading from './loading';

describe('CatalogLoading', () => {
  it('renders 12 card skeletons inside the shell', () => {
    const { container } = render(<CatalogLoading />);
    // Every Skeleton block uses the shimmer animation; the 12 cards each have one.
    const shimmering = Array.from(container.querySelectorAll('div')).filter((d) =>
      (d as HTMLElement).style.animation.includes('shimmer'),
    );
    expect(shimmering.length).toBeGreaterThanOrEqual(12);
  });
});
