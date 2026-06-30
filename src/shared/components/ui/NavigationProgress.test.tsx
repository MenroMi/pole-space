import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pathnameMock = vi.fn(() => '/en/catalog');
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));

import NavigationProgress from './NavigationProgress';

function getBar(container: HTMLElement) {
  return container.querySelector('[data-active]') as HTMLElement;
}

describe('NavigationProgress', () => {
  beforeEach(() => {
    pathnameMock.mockReturnValue('/en/catalog');
    // jsdom lacks matchMedia; the component reads prefers-reduced-motion.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });
  afterEach(() => vi.clearAllMocks());

  it('starts inactive', () => {
    const { container } = render(<NavigationProgress />);
    expect(getBar(container).getAttribute('data-active')).toBe('false');
  });

  it('activates when an internal link is clicked', () => {
    const { container } = render(
      <div>
        <a href="/en/moves/abc">go</a>
        <NavigationProgress />
      </div>,
    );
    fireEvent.click(container.querySelector('a')!);
    expect(getBar(container).getAttribute('data-active')).toBe('true');
  });

  it('deactivates when the pathname changes after activation', () => {
    const { container, rerender } = render(
      <div>
        <a href="/en/moves/abc">go</a>
        <NavigationProgress />
      </div>,
    );
    fireEvent.click(container.querySelector('a')!);
    expect(getBar(container).getAttribute('data-active')).toBe('true');

    // navigation commits → pathname changes → bar hides
    pathnameMock.mockReturnValue('/en/moves/abc');
    rerender(
      <div>
        <a href="/en/moves/abc">go</a>
        <NavigationProgress />
      </div>,
    );
    expect(getBar(container).getAttribute('data-active')).toBe('false');
  });

  it('ignores query-only link clicks (same pathname)', () => {
    // jsdom location pathname is '/', so a query-only href keeps the same pathname.
    const { container } = render(
      <div>
        <a href="/?difficulty=BEGINNER">filter</a>
        <NavigationProgress />
      </div>,
    );
    fireEvent.click(container.querySelector('a')!);
    expect(getBar(container).getAttribute('data-active')).toBe('false');
  });

  it('ignores hash-only link clicks (same pathname)', () => {
    const { container } = render(
      <div>
        <a href="/#section">jump</a>
        <NavigationProgress />
      </div>,
    );
    fireEvent.click(container.querySelector('a')!);
    expect(getBar(container).getAttribute('data-active')).toBe('false');
  });
});
