import { Component, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro desconhecido',
      errorStack: error?.stack?.split('\n').slice(0, 5).join('\n') || ''
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '', errorStack: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1A1A2E] flex flex-col items-center justify-center p-6 text-center">
          <p className="text-white/60 text-sm mb-1">Algo deu errado</p>
          <p className="text-white/30 text-xs mb-4">Toque abaixo para tentar novamente</p>

          {/* Mostrar erro para debug */}
          <div className="w-full max-w-sm mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
            <p className="text-red-400 text-[10px] font-mono break-all">{this.state.errorMessage}</p>
            {this.state.errorStack && (
              <p className="text-red-400/50 text-[8px] font-mono mt-1 break-all whitespace-pre-wrap">{this.state.errorStack}</p>
            )}
          </div>

          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
