'use client';

/**
 * Global error boundary — the last line of defense.
 *
 * This catches errors that escape the route-level error.tsx: failures in the
 * root layout, providers, or chunk-load failures after a deployment. Without
 * it, Next.js renders its raw default "Application error" screen. It must
 * render its own <html> and <body>.
 *
 * Deliberately dependency-free: if the app shell crashed, keep this page as
 * simple as possible so it can always render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#050507', color: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ textAlign: 'center', maxWidth: '420px' }}>
            <div
              style={{
                width: 72,
                height: 72,
                margin: '0 auto 24px',
                borderRadius: 18,
                background: '#0B0B10',
                border: '1px solid rgba(212,168,83,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 40px rgba(212,168,83,0.08)',
              }}
            >
              <svg viewBox="0 0 30 30" width="36" height="36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="ts-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#E8C97A" />
                    <stop offset="0.55" stopColor="#D4A853" />
                    <stop offset="1" stopColor="#B8922F" />
                  </linearGradient>
                </defs>
                <g fill="url(#ts-gold)">
                  <path d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09 C6.16,7.1,15.47,7.1,15.47,7.1z" />
                  <polygon points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1" />
                  <path d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z" />
                </g>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 8 }}>Typescribe hit a snag</h1>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 6 }}>
              The app failed to start properly. This usually fixes itself with a reload.
            </p>
            {error?.digest ? (
              <p style={{ color: '#4b5563', fontSize: '0.75rem', marginBottom: 20 }}>Reference: {error.digest}</p>
            ) : (
              <div style={{ marginBottom: 20 }} />
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  appearance: 'none',
                  border: 0,
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #E8C97A, #D4A853 55%, #B8922F)',
                  color: '#141414',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '11px 26px',
                  borderRadius: 10,
                }}
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  border: '1px solid #2a2a35',
                  color: '#9ca3af',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  padding: '11px 22px',
                  borderRadius: 10,
                }}
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
