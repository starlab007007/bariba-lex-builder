import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Short label shown in the default fallback ("Voice recorder", "Answer card", ...) */
  label?: string;
  /** Called when an error is caught (telemetry, logging, ...) */
  onError?: (error: Error, info: { componentStack?: string }) => void;
}

interface State {
  error: Error | null;
}

/**
 * Reusable React error boundary so a single buggy subtree
 * (audio recorder, answer card, ...) never blanks the whole page.
 *
 * Usage:
 *   <SafeBoundary label="Réponse vocale">
 *     <VoiceAnswerRecorder ... />
 *   </SafeBoundary>
 */
export default class SafeBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[SafeBoundary]', this.props.label ?? '', error, info);
    try {
      this.props.onError?.(error, info);
    } catch {
      /* ignore secondary failures */
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="font-bold">
            ❌ Une erreur est survenue{this.props.label ? ` (${this.props.label})` : ''}.
          </p>
          <p className="text-red-700/80 break-words">
            {error.message || 'Erreur inconnue'}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-1 px-2 py-1 rounded-md bg-red-600 text-white text-[11px] font-bold hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }
}