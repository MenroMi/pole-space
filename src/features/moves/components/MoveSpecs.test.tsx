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

  it('renders poleType as capitalized label (STATIC → Static)', () => {
    render(<MoveSpecs gripType={null} entry={null} duration={null} poleType="STATIC" />);
    expect(screen.getByText('Static')).toBeInTheDocument();
    expect(screen.getByText('Pole Setting')).toBeInTheDocument();
  });

  it('renders all four cards when all fields are provided', () => {
    render(<MoveSpecs gripType="Twisted" entry="Standing" duration="Short" poleType="SPIN" />);
    expect(screen.getByText('Grip Type')).toBeInTheDocument();
    expect(screen.getByText('Entry')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Pole Setting')).toBeInTheDocument();
  });

  it('renders "Specs" section label when specs are present', () => {
    render(<MoveSpecs gripType="Twisted" entry={null} duration={null} poleType={null} />);
    expect(screen.getByText('Specs')).toBeInTheDocument();
  });

  it('does not render "Specs" label when no specs', () => {
    const { container } = render(
      <MoveSpecs gripType={null} entry={null} duration={null} poleType={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
