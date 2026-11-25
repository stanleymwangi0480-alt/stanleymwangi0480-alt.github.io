/**
 * MYSTIQUE COMPASS — Error Boundary
 *
 * React 19 unmounts the whole root on an uncaught throw, which turns any
 * rendering bug into a white screen. The Personal Year view did exactly this
 * before the 2026-11 audit (a `.join` on undefined). A boundary turns that
 * into a readable message with a retry, which is the difference between a
 * bug report and a support email.
 */
import * as React from 'react';

interface Props {
  children: React.ReactNode;
  /** Short label shown above the message, e.g. "Personal Year". */
  label?: string;
  /** Called when the user dismisses the error (e.g. back to the form). */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface it: silent failures are how the Personal Year crash survived in
    // production for as long as it did.
    console.error('[ErrorBoundary]', this.props.label ?? 'component', error, info.componentStack);
  }

  private handleRetry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          margin: '1.5rem auto',
          maxWidth: 520,
          padding: '1.25rem 1.1rem',
          borderRadius: 16,
          background: 'rgba(30,10,50,0.9)',
          border: '1px solid rgba(251,113,133,0.35)',
          color: 'rgba(231,221,255,0.92)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.78rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#fb7185',
            marginBottom: '0.5rem',
          }}
        >
          {this.props.label ? `${this.props.label} hit a snag` : 'Something went wrong'}
        </div>
        <p style={{ fontSize: '0.84rem', lineHeight: 1.6, margin: '0 0 0.9rem' }}>
          This section couldn't be rendered. The rest of your reading is
          unaffected, and nothing you entered has been lost.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #d4af37 0%, #a07820 100%)',
              color: '#04001a',
              fontFamily: "'Cinzel', serif",
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {this.props.onReset && (
            <button
              type="button"
              onClick={this.props.onReset}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(231,221,255,0.85)',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              Back to form
            </button>
          )}
        </div>
      </div>
    );
  }
}
