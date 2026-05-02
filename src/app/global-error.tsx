'use client';

import './globals.css';

type Props = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function GlobalError({ error, unstable_retry }: Props) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-on-surface)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '28rem' }}>
          <p
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-outline)',
              marginBottom: '1.5rem',
            }}
          >
            critical error
          </p>
          <h1
            className="font-display"
            style={{
              fontSize: '2.5rem',
              fontWeight: 300,
              letterSpacing: '-0.025em',
              color: 'var(--color-on-surface)',
              marginBottom: '0.75rem',
              lineHeight: 1.2,
            }}
          >
            something went wrong.
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              lineHeight: 1.625,
              color: 'var(--color-on-surface-variant)',
              marginBottom: error.digest ? '0.5rem' : '2.5rem',
            }}
          >
            an unexpected error occurred. try refreshing the page.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: 'var(--color-outline)',
                marginBottom: '2.5rem',
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={unstable_retry}
            className="kinetic-gradient"
            style={{
              display: 'inline-block',
              borderRadius: '0.375rem',
              padding: '1rem 2.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--color-on-primary)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            try again
          </button>
        </div>
      </body>
    </html>
  );
}
