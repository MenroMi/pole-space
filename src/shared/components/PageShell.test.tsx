import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PageShell from './PageShell'

describe('PageShell', () => {
  it('renders aside content', () => {
    render(<PageShell aside={<div>filters</div>}><div>main</div></PageShell>)
    expect(screen.getByText('filters')).toBeInTheDocument()
  })

  it('renders children in main area', () => {
    render(<PageShell aside={<div>aside</div>}><div>main content</div></PageShell>)
    expect(screen.getByText('main content')).toBeInTheDocument()
  })

  it('places aside inside an <aside> element', () => {
    render(
      <PageShell aside={<div data-testid="aside-content">filters</div>}>
        <div>main</div>
      </PageShell>
    )
    const asideContent = screen.getByTestId('aside-content')
    expect(asideContent.closest('aside')).toBeInTheDocument()
  })

  it('places children inside a <main> element', () => {
    render(
      <PageShell aside={<div>aside</div>}>
        <div data-testid="main-content">content</div>
      </PageShell>
    )
    const mainContent = screen.getByTestId('main-content')
    expect(mainContent.closest('main')).toBeInTheDocument()
  })
})
