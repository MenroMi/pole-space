import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MoveCardImage from './MoveCardImage';

// Pass handlers/props through so we can simulate onLoad with a synthetic event.
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

function setNaturalWidth(img: HTMLImageElement, width: number) {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
}

describe('MoveCardImage', () => {
  it('renders the image initially', () => {
    render(<MoveCardImage src="https://example.com/pic.jpg" alt="Jade" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/pic.jpg');
  });

  it('shows placeholder icon when loaded image is YouTube unavailable (<=120px wide)', () => {
    const { container } = render(
      <MoveCardImage src="https://img.youtube.com/vi/fake/hqdefault.jpg" alt="Fake" />,
    );
    const img = screen.getByRole('img') as HTMLImageElement;
    setNaturalWidth(img, 120);
    fireEvent.load(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('keeps the image when loaded at full width (>120px)', () => {
    render(<MoveCardImage src="https://img.youtube.com/vi/real/hqdefault.jpg" alt="Real" />);
    const img = screen.getByRole('img') as HTMLImageElement;
    setNaturalWidth(img, 480);
    fireEvent.load(img);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows placeholder icon when image errors', () => {
    const { container } = render(
      <MoveCardImage src="https://invalid.example.com/pic.jpg" alt="Broken" />,
    );
    const img = screen.getByRole('img') as HTMLImageElement;
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
