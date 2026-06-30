import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import FavouritesLoading from './favourite-moves/loading';
import ProfileLoading from './loading';
import ProgressLoading from './progress/loading';
import SettingsLoading from './settings/loading';

function shimmerCount(container: HTMLElement) {
  return Array.from(container.querySelectorAll('div')).filter((d) =>
    (d as HTMLElement).style.animation.includes('shimmer'),
  ).length;
}

describe('profile loading skeletons', () => {
  it.each([
    ['overview', ProfileLoading],
    ['progress', ProgressLoading],
    ['favourites', FavouritesLoading],
    ['settings', SettingsLoading],
  ])('%s renders shimmer blocks', (_label, Component) => {
    const { container } = render(<Component />);
    expect(shimmerCount(container)).toBeGreaterThan(3);
  });
});
