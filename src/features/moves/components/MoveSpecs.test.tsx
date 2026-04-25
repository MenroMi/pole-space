import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MoveSpecs from './MoveSpecs';

describe('MoveSpecs', () => {
  it('renders nothing when all fields are null', () => {
    const { container } = render(
      <MoveSpecs gripType={null} entry={null} duration={null} poleType={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only non-null fields', () => {
    render(<MoveSpecs gripType="Twisted" entry={null} duration="Short" poleType={null} />);
    expect(screen.getByText('Twisted')).toBeInTheDocument();
    expect(screen.getByText('Short')).toBeInTheDocument();
    expect(screen.queryByText('Entry')).not.toBeInTheDocument();
  });

  it('renders poleType as capitalized label (SPIN → Spin)', () => {
    render(<MoveSpecs gripType={null} entry={null} duration={null} poleType="SPIN" />);
    expect(screen.getByText('Spin')).toBeInTheDocument();
    expect(screen.getByText('Pole Setting')).toBeInTheDocument();
  });
});
