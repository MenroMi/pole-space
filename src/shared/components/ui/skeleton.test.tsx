import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders an aria-hidden shimmer block with the shimmer animation', () => {
    const { container } = render(<Skeleton style={{ height: 20 }} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.style.animation).toContain('shimmer');
    expect(el.style.height).toBe('20px');
  });

  it('merges a passed className', () => {
    const { container } = render(<Skeleton className="aspect-[4/5]" />);
    expect((container.firstChild as HTMLElement).className).toContain('aspect-[4/5]');
  });
});
