import React, { Component, ErrorInfo, ReactNode } from 'react';
import { cleanupBloatedLocalStorage } from '../utils/attachmentStorage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary atrapó un error:', error, errorInfo);
    try {
      cleanupBloatedLocalStorage();
    } catch (e) {}
  }

  private handleRecover = () => {
    try {
      cleanupBloatedLocalStorage();
    } catch (e) {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      cleanupBloatedLocalStorage();
      localStorage.removeItem('hah_sincosto');
      localStorage.removeItem('hah_kardex');
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isQuota =
        this.state.error?.name === 'QuotaExceededError' ||
        (this.state.error?.message && this.state.error.message.includes('quota'));

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0f1d',
            color: '#e2e8f0',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '24px',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '12px',
              padding: '28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>
              {isQuota ? '💾' : '⚠️'}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
              {isQuota ? 'Límite de Almacenamiento Optimizado' : 'Se presentó un inconveniente'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px' }}>
              {isQuota
                ? 'El archivo adjunto superó temporalmente la cuota local. Ya se activó el motor de persistencia en IndexedDB para manejar archivos pesados sin límites.'
                : 'La aplicación se recuperará inmediatamente recargando los datos protegidos.'}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleRecover}
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                🔄 Recargar y Continuar
              </button>
              <button
                type="button"
                onClick={this.handleResetStorage}
                style={{
                  backgroundColor: '#374151',
                  color: '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                🧹 Limpiar Caché Residual
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
