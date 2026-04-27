import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import MoveBreadcrumb from './MoveBreadcrumb';

describe('MoveBreadcrumb', () => {
  it('renders Catalog link to /catalog', () => {
    render(<MoveBreadcrumb category="SPINS" moveName="Fireman Spin" />);
    expect(screen.getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/catalog');
  });

  it('renders category label', () => {
    render(<MoveBreadcrumb category="SPINS" moveName="Fireman Spin" />);
    expect(screen.getByText('SPINS')).toBeInTheDocument();
  });

  it('renders move name', () => {
    render(<MoveBreadcrumb category="SPINS" moveName="Fireman Spin" />);
    expect(screen.getByText('Fireman Spin')).toBeInTheDocument();
  });
});
