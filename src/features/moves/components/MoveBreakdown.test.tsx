import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MoveBreakdown from './MoveBreakdown';

describe('MoveBreakdown', () => {
  it('renders nothing when steps is empty', () => {
    const { container } = render(<MoveBreakdown steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the correct number of steps', () => {
    render(<MoveBreakdown steps={['Grip the pole', 'Kick out', 'Extend']} />);
    expect(screen.getByText('Grip the pole')).toBeInTheDocument();
    expect(screen.getByText('Kick out')).toBeInTheDocument();
    expect(screen.getByText('Extend')).toBeInTheDocument();
  });

  it('renders step numbers padded to two digits', () => {
    render(<MoveBreakdown steps={['First step']} />);
    expect(screen.getByText('01')).toBeInTheDocument();
  });
});
