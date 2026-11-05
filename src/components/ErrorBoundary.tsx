import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportBoundaryError } from '@/lib/errorReport';

interface Props {
  children: ReactNode;
}
interface State {
  failed: boolean;
}

/** Última rede de segurança: um erro de render não pode deixar a tela em branco. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportBoundaryError(Object.assign(error, { stack: `${error.stack ?? ''}\n${info.componentStack ?? ''}` }));
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="text-sm text-muted">
          Tivemos um problema inesperado ao mostrar esta página. Seus dados não foram perdidos.
        </p>
        <div className="flex gap-3">
          <button type="button" className="rounded bg-primary px-4 py-2 text-primary-fg" onClick={() => window.location.reload()}>
            Recarregar a página
          </button>
          <a className="rounded border border-border px-4 py-2" href="/">
            Ir para o início
          </a>
        </div>
      </div>
    );
  }
}
