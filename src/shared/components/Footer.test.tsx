import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import Footer from './Footer';

describe('Footer', () => {
  it('renders the version label', () => {
    render(<Footer />);
    expect(screen.getByText(/pole space v\.0\.1/i)).toBeInTheDocument();
  });
});
