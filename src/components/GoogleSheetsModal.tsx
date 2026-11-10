import React, { useState, useEffect } from 'react';
import { GoogleSheetsSyncStatus, SHEET_NAMES, SHEET_COLUMNS } from '../services/googleSheetsService';
import { APPS_SCRIPT_BACKEND_CODE } from '../services/appsScriptBackendCode';
import {
  getStoredAppsScriptUrl,
  setStoredAppsScriptUrl,
  pingAppsScript,
  AppsScriptPingResult,
} from '../services/appsScriptService';
import { User } from 'firebase/auth';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: GoogleSheetsSyncStatus;
  user: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onCreateSpreadsheet: () => Promise<void>;
  onSyncAll: () => Promise<void>;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  onPushAppsScript?: (url: string) => Promise<void>;
  onPullAppsScript?: (url: string) => Promise<void>;
  onSaveAppsScriptUrl?: (url: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  status,
  user,
  onSignIn,
  onSignOut,
  onCreateSpreadsheet,
  onSyncAll,
  autoSyncEnabled,
  onToggleAutoSync,
  onPushAppsScript,
  onPullAppsScript,
  onSaveAppsScriptUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'sheets' | 'backend'>('sheets');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Estados de Apps Script Backend
  const [appsScriptUrl, setAppsScriptUrlState] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<AppsScriptPingResult | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);
  const [showCodePreview, setShowCodePreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAppsScriptUrlState(getStoredAppsScriptUrl());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setLocalError(null);
    setIsProcessing(true);
    try {
      await onSignIn();
    } catch (err: any) {
      setLocalError(err.message || 'Error al conectar con Google.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreate = async () => {
    setLocalError(null);
    setIsProcessing(true);
    try {
      await onCreateSpreadsheet();
    } catch (err: any) {
      setLocalError(err.message || 'Error al crear la planilla en Google Drive.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    setLocalError(null);
    setIsProcessing(true);
    try {
      await onSyncAll();
    } catch (err: any) {
      setLocalError(err.message || 'Error al sincronizar con Google Sheets.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_BACKEND_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3500);
    } catch (err) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = APPS_SCRIPT_BACKEND_CODE;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3500);
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([APPS_SCRIPT_BACKEND_CODE], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Codigo.gs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveAndPingUrl = async () => {
    setPingError(null);
    setPingResult(null);
    const cleanUrl = appsScriptUrl.trim();

    if (!cleanUrl) {
      setPingError('Por favor ingresa la URL de la Aplicación Web generada en Google Apps Script.');
      return;
    }

    setStoredAppsScriptUrl(cleanUrl);
    if (onSaveAppsScriptUrl) {
      onSaveAppsScriptUrl(cleanUrl);
    }
    setIsPinging(true);

    try {
      const res = await pingAppsScript(cleanUrl);
      setPingResult(res);
      if (res.spreadsheetId) {
        const directUrl = `https://docs.google.com/spreadsheets/d/${res.spreadsheetId}/edit`;
        localStorage.setItem('hah_google_sheets_id', res.spreadsheetId);
        localStorage.setItem('hah_google_sheets_url', directUrl);
      }
    } catch (err: any) {
      setPingError(err.message || 'Error de conexión con Google Apps Script');
    } finally {
      setIsPinging(false);
    }
  };

  const handlePushToAppsScript = async () => {
    if (!onPushAppsScript) return;
    const cleanUrl = appsScriptUrl.trim();
    if (!cleanUrl) {
      setPingError('Primero ingresa tu URL de Google Apps Script.');
      return;
    }
    setPingError(null);
    setStoredAppsScriptUrl(cleanUrl);
    if (onSaveAppsScriptUrl) onSaveAppsScriptUrl(cleanUrl);
    setIsPinging(true);
    try {
      await onPushAppsScript(cleanUrl);
    } catch (err: any) {
      setPingError(err.message || 'Error al subir datos a Google Apps Script');
    } finally {
      setIsPinging(false);
    }
  };

  const handlePullFromAppsScript = async () => {
    if (!onPullAppsScript) return;
    const cleanUrl = appsScriptUrl.trim();
    if (!cleanUrl) {
      setPingError('Primero ingresa tu URL de Google Apps Script.');
      return;
    }
    setPingError(null);
    setStoredAppsScriptUrl(cleanUrl);
    if (onSaveAppsScriptUrl) onSaveAppsScriptUrl(cleanUrl);
    setIsPinging(true);
    try {
      await onPullAppsScript(cleanUrl);
    } catch (err: any) {
      setPingError(err.message || 'Error al descargar datos desde Google Apps Script');
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', zIndex: 1100 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '780px',
          width: '94%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          border: '1.5px solid #00d4ff',
          boxShadow: '0 16px 50px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 212, 255, 0.25)',
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '10px',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>📊</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                Conexión con Google Sheets & Backend Apps Script
              </div>
              <div style={{ fontSize: '11px', color: 'var(--cyan)' }}>
                Base de Datos Oficial en la Nube y API de Sincronización Automática
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-red btn-sm"
            style={{ width: '28px', height: '28px', padding: 0 }}
            title="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        {/* Pestañas de Navegación (Sheets vs Backend Apps Script) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '10px',
            marginBottom: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`btn btn-sm ${activeTab === 'sheets' ? 'btn-cyan' : ''}`}
            style={{
              flex: 1,
              fontWeight: 800,
              fontSize: '12px',
              padding: '8px 12px',
              background: activeTab === 'sheets' ? undefined : 'rgba(255, 255, 255, 0.05)',
              border: activeTab === 'sheets' ? undefined : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📑</span>
            <span>1. Google Sheets & Drive</span>
            {status.spreadsheetId && (
              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '1px 6px', borderRadius: '4px' }}>
                Conectado
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backend')}
            className={`btn btn-sm ${activeTab === 'backend' ? 'btn-cyan' : ''}`}
            style={{
              flex: 1,
              fontWeight: 800,
              fontSize: '12px',
              padding: '8px 12px',
              background: activeTab === 'backend' ? undefined : 'rgba(255, 255, 255, 0.05)',
              border: activeTab === 'backend' ? undefined : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>⚡</span>
            <span>2. Backend (Google Apps Script)</span>
            <span style={{ fontSize: '10px', background: 'rgba(0, 212, 255, 0.25)', color: '#00d4ff', padding: '1px 6px', borderRadius: '4px' }}>
              Código.gs
            </span>
          </button>
        </div>

        {/* Mensaje de error general si ocurre */}
        {(localError || status.error) && activeTab === 'sheets' && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#fca5a5',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{localError || status.error}</span>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* ========================================================================================= */}
          {/* TAB 1: GOOGLE SHEETS & DRIVE                                                              */}
          {/* ========================================================================================= */}
          {activeTab === 'sheets' && (
            <>
              {/* PASO 1: CUENTA DE GOOGLE CONECTADA */}
              <div
                style={{
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {user ? (
                      <>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#0ea5e9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            color: '#ffffff',
                            fontSize: '14px',
                            border: '2px solid #38bdf8',
                            overflow: 'hidden',
                          }}
                        >
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" style={{ width: '100%', height: '100%' }} />
                          ) : (
                            user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                            {user.displayName || 'Usuario Google'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {user.email} · <span style={{ color: '#10b981', fontWeight: 700 }}>Conectado</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                          Paso 1: Conectar tu cuenta de Google
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Inicia sesión para autorizar la creación y actualización automática en Google Drive y Sheets
                        </div>
                      </div>
                    )}
                  </div>

                  {user ? (
                    <button
                      onClick={onSignOut}
                      className="btn btn-sm"
                      style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      onClick={handleSignIn}
                      disabled={isProcessing}
                      className="gsi-material-button"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #747775',
                        borderRadius: '6px',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        color: '#1f1f1f',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      <span>{isProcessing ? 'Conectando...' : 'Iniciar sesión con Google'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* PASO 2: CREACIÓN AUTOMÁTICA O VINCULACIÓN DE PLANILLA */}
              <div
                style={{
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--cyan)', marginBottom: '4px' }}>
                  Paso 2: Planilla Oficial en Google Drive
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '10px' }}>
                  Al presionar <strong>"Crear Hoja de Google Sheets Ahora"</strong>, la aplicación genera automáticamente en tu Google Drive la planilla:
                  <br />
                  <strong style={{ color: '#ffffff' }}>
                    "INVENTARIO OFICIAL BODEGA DE TRANSITO HAH - Registro Automático"
                  </strong>
                </div>

                {status.spreadsheetId ? (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid #10b981',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>✅</span>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#34d399' }}>
                            Planilla Vinculada y Activa
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                            ID: {status.spreadsheetId}
                          </div>
                        </div>
                      </div>
                      {status.spreadsheetUrl && (
                        <a
                          href={status.spreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-cyan btn-sm"
                          style={{ textDecoration: 'none', fontWeight: 700, fontSize: '11px' }}
                        >
                          Abrir Sheet ↗
                        </a>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingTop: '8px',
                        fontSize: '11px',
                        color: 'var(--muted)',
                      }}
                    >
                      <span>
                        Última sincronización:{' '}
                        <strong style={{ color: '#ffffff' }}>
                          {status.lastSyncTime || 'Al inicio'}
                        </strong>
                      </span>
                      <button
                        onClick={handleSync}
                        disabled={status.isSyncing || isProcessing}
                        className="btn btn-green btn-sm"
                        style={{ fontSize: '11px' }}
                      >
                        {status.isSyncing || isProcessing ? '⏳ Sincronizando...' : '🔄 Sincronizar Todo Ahora'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={!user || isProcessing}
                    className="btn btn-cyan btn-full"
                    style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 800,
                      opacity: !user ? 0.6 : 1,
                      cursor: !user ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isProcessing
                      ? '⏳ Creando planilla y formateando 6 pestañas...'
                      : '⚡ Crear Hoja de Google Sheets Ahora'}
                  </button>
                )}
              </div>

              {/* ESTRUCTURA DE PESTAÑAS GENERADAS */}
              <div
                style={{
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                  📋 6 Pestañas y Columnas Creadas en la Planilla:
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    fontSize: '11px',
                  }}
                >
                  {Object.entries(SHEET_COLUMNS).map(([sheetTitle, cols]) => (
                    <div
                      key={sheetTitle}
                      style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--cyan)', marginBottom: '3px' }}>
                        📌 {sheetTitle}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        {cols.length} columnas: {cols.slice(0, 3).join(', ')}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AJUSTES DE SINCRONIZACIÓN AUTOMÁTICA EN TIEMPO REAL */}
              <div
                style={{
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                    Sincronización Automática en Tiempo Real
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
                    Envía cada nuevo registro, acta o edición directamente a Google Sheets sin exportar manualmente
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => onToggleAutoSync(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#00d4ff', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: autoSyncEnabled ? 'var(--green)' : 'var(--muted)' }}>
                    {autoSyncEnabled ? 'Activada' : 'Pausada'}
                  </span>
                </label>
              </div>
            </>
          )}

          {/* ========================================================================================= */}
          {/* TAB 2: BACKEND GOOGLE APPS SCRIPT (CÓDIGO.GS Y GUÍA PASO A PASO)                          */}
          {/* ========================================================================================= */}
          {activeTab === 'backend' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Tarjeta de Presentación del Backend */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.35) 0%, rgba(15, 23, 42, 0.7) 100%)',
                  border: '1px solid rgba(0, 212, 255, 0.35)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>⚡</span>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff' }}>
                        Backend Oficial Google Apps Script (Código.gs) <span style={{ fontSize: '11px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.4)' }}>v2.5 Medidas Fijas</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--cyan)' }}>
                        Sintaxis verificada (0 errores) • 4 gráficos con medidas fijas y coordenadas inamovibles
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="btn btn-cyan btn-sm"
                      style={{ fontWeight: 800, fontSize: '11px', padding: '6px 12px' }}
                    >
                      {copiedCode ? '✅ ¡Código Copiado (v2.5)!' : '📋 Copiar Código.gs (v2.5)'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadCode}
                      className="btn btn-sm"
                      style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid var(--border)', fontSize: '11px', padding: '6px 10px' }}
                      title="Descargar archivo Código.gs"
                    >
                      ⬇️ Descargar
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '11.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
                  Este script proporciona a tu planilla de Google Sheets una <strong>API REST (doGet y doPost)</strong>,
                  un menú superior interno <strong>🏥 Bodega Tránsito HAH</strong>, formato institucional automático y recálculo
                  de saldos Kardex e insumos sin costo.
                </div>
              </div>

              {/* GUÍA PASO A PASO DETALLADA */}
              <div
                style={{
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--cyan)', marginBottom: '10px' }}>
                  📖 Paso a Paso para Implementar el Backend (Sin Cometer Errores)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11.5px', lineHeight: '1.45' }}>
                  {/* Paso 1 */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        background: '#0ea5e9',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '11px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      1
                    </div>
                    <div>
                      <strong style={{ color: '#ffffff' }}>Abre tu planilla de Google Sheets:</strong>
                      <div style={{ color: 'var(--muted)' }}>
                        {status.spreadsheetUrl ? (
                          <a
                            href={status.spreadsheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--cyan)', textDecoration: 'underline' }}
                          >
                            Clic aquí para abrir tu planilla "INVENTARIO OFICIAL BODEGA DE TRANSITO HAH" ↗
                          </a>
                        ) : (
                          'Abre la planilla creada desde Google Drive.'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Paso 2 */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        background: '#0ea5e9',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '11px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      2
                    </div>
                    <div>
                      <strong style={{ color: '#ffffff' }}>Abre el editor de Apps Script:</strong>
                      <div style={{ color: 'var(--muted)' }}>
                        En el menú superior de Google Sheets, ve a: <strong>Extensiones</strong> ➔ <strong>Apps Script</strong>. Se abrirá una pestaña nueva con el editor de código.
                      </div>
                    </div>
                  </div>

                  {/* Paso 3 */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        background: '#0ea5e9',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '11px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      3
                    </div>
                    <div>
                      <strong style={{ color: '#ffffff' }}>Pega el código del backend y guarda:</strong>
                      <div style={{ color: 'var(--muted)' }}>
                        En el archivo <code>Código.gs</code>, borra todo lo que venga por defecto.
                        Haz clic en el botón superior <strong>"📋 Copiar Código.gs"</strong> y pégalo en el editor. Luego presiona el icono de <strong>Guardar (💾 o Ctrl+S)</strong>.
                      </div>
                    </div>
                  </div>

                  {/* Paso 4: Implementación */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        background: '#0ea5e9',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '11px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      4
                    </div>
                    <div>
                      <strong style={{ color: '#ffffff' }}>¿Tengo que implementar después de Guardar (💾)? ¡SÍ, SIEMPRE!:</strong>
                      <div style={{ color: '#cbd5e1', marginTop: '3px' }}>
                        Guardar con el icono 💾 solo guarda el borrador. Google Apps Script <strong>NO</strong> actualiza la App Web hasta que implementes:
                      </div>
                      <div
                        style={{
                          background: 'rgba(14, 165, 233, 0.12)',
                          border: '1px solid rgba(14, 165, 233, 0.35)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          marginTop: '6px',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                          🔄 Para actualizar sin cambiar tu URL (Recomendado):
                        </div>
                        <ul style={{ margin: '0 0 0 16px', padding: 0, color: '#e2e8f0', lineHeight: '1.5' }}>
                          <li>Arriba a la derecha, clic en el botón azul <strong>"Implementar"</strong> ➔ <strong>"Administrar implementaciones"</strong>.</li>
                          <li>Haz clic en el icono del lápiz <strong>✏️ (Editar)</strong>.</li>
                          <li>👤 <strong>Ejecutar como:</strong> Selecciona <strong>"Yo (tu correo de Gmail)"</strong> <em>(⚠️ ¡NUNCA "El usuario que accede", porque dará error de acceso a la planilla!)</em>.</li>
                          <li>🌐 <strong>Quién tiene acceso:</strong> <strong>"Cualquier usuario"</strong> (Anyone).</li>
                          <li>📌 En el menú desplegable <strong>Versión:</strong> Selecciona <strong>"Nueva versión"</strong>.</li>
                          <li>Haz clic en el botón azul <strong>"Implementar"</strong> y luego en <strong>"Listo"</strong>.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Paso 5 */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        background: '#0ea5e9',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '11px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      5
                    </div>
                    <div>
                      <strong style={{ color: '#ffffff' }}>Autorizar Permisos de Google (Botón ▶️ Ejecutar):</strong>
                      <div style={{ color: 'var(--muted)', marginTop: '2px' }}>
                        En la barra superior del editor de Apps Script, junto al icono 💾, selecciona cualquier función (por ejemplo <code>menuGenerarDashboard</code> o <code>onOpen</code>) y presiona <strong>▶️ Ejecutar</strong>.
                        <br />
                        Si Google te pide autorización: Clic en <strong>"Revisar permisos"</strong> ➔ Selecciona tu cuenta ➔ Clic en <strong>"Configuración avanzada"</strong> ➔ Clic en <strong>"Ir a Proyecto (no seguro)"</strong> ➔ Clic en <strong>"Permitir"</strong>.
                      </div>
                    </div>
                  </div>

                  {/* Paso 6 */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        background: '#10b981',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '11px',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      6
                    </div>
                    <div>
                      <strong style={{ color: '#ffffff' }}>Pega aquí la URL de la Aplicación Web generada:</strong>
                      <div style={{ color: 'var(--muted)' }}>
                        Copia la URL que termina en <code>/exec</code> y pégala en la casilla a continuación para probar la conexión en tiempo real:
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIP RÁPIDO PARA LIMPIAR GRÁFICOS FLOTANTES Y ALINEAR */}
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '11.5px',
                  color: '#fef08a',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ fontWeight: 800, color: '#facc15', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡</span>
                  <span>¿Ves cuadros con "Agrega una serie para comenzar" en tu Google Sheets?</span>
                </div>
                <div style={{ color: '#fef9c3', lineHeight: '1.45' }}>
                  Son contenedores de gráficos anteriores. Para eliminarlos en 1 segundo:
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    <li>Haz clic sobre cada cuadro gris y presiona la tecla <strong>Supr</strong> (Delete) en tu teclado.</li>
                    <li>O en tu Google Sheets ve al menú superior <strong>🏥 Bodega Tránsito HAH</strong> ➔ <strong>🧹 Eliminar Gráficos Vacíos</strong>.</li>
                    <li>Luego pega aquí tu URL y presiona <strong>"⬆️ Subir de este Equipo a la Nube"</strong> para poblar y alinear todos los datos automáticamente.</li>
                  </ul>
                </div>
              </div>

              {/* VINCULACIÓN Y TEST DE URL DE APPS SCRIPT */}
              <div
                style={{
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                  🔗 URL de la Aplicación Web de Google Apps Script:
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="url"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrlState(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="input-field"
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: '11.5px',
                      background: 'rgba(0, 0, 0, 0.4)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveAndPingUrl}
                    disabled={isPinging || !appsScriptUrl.trim()}
                    className="btn btn-cyan btn-sm"
                    style={{ fontWeight: 800, fontSize: '11px', whiteSpace: 'nowrap', padding: '0 14px' }}
                  >
                    {isPinging ? '⏳ Procesando...' : '🧪 Guardar y Probar (Ping)'}
                  </button>
                </div>

                {/* BOTONES DE SINCRONIZACIÓN MULTI-EQUIPO (PC TRABAJO, PC CASA Y TABLET) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginTop: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handlePushToAppsScript}
                    disabled={isPinging || !appsScriptUrl.trim()}
                    className="btn btn-green btn-sm"
                    style={{ fontWeight: 800, fontSize: '11px', padding: '8px 10px' }}
                    title="Envía todos los datos actuales de este equipo hacia tu Google Sheets"
                  >
                    ⬆️ Subir de este Equipo a la Nube
                  </button>
                  <button
                    type="button"
                    onClick={handlePullFromAppsScript}
                    disabled={isPinging || !appsScriptUrl.trim()}
                    className="btn btn-cyan btn-sm"
                    style={{ fontWeight: 800, fontSize: '11px', padding: '8px 10px' }}
                    title="Trae los datos guardados en Google Sheets para igualar este equipo (PC o Tablet)"
                  >
                    ⬇️ Descargar de la Nube a este Equipo
                  </button>
                </div>

                {/* Mensaje de Éxito al Probar */}
                {pingResult && (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10b981',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      fontSize: '11.5px',
                      color: '#a7f3d0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✅</span>
                      <span>¡Backend de Apps Script En Línea y Conectado!</span>
                    </div>
                    {pingResult.spreadsheetTitle && (
                      <div style={{ fontSize: '11px', color: '#ffffff' }}>
                        Planilla: <strong>{pingResult.spreadsheetTitle}</strong>
                      </div>
                    )}
                    <div style={{ fontSize: '10px', color: '#6ee7b7' }}>
                      Versión API: {pingResult.version || '2.0.0'} · Estado: OK
                    </div>
                    {pingResult.spreadsheetId && (
                      <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${pingResult.spreadsheetId}/edit`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#38bdf8',
                            textDecoration: 'underline',
                            fontWeight: 800,
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ↗ Clic aquí para abrir tu planilla oficial actualizada en Google Sheets
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Mensaje de Error al Probar */}
                {pingError && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      fontSize: '11.5px',
                      color: '#fca5a5',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {pingError}
                  </div>
                )}
              </div>

              {/* VISTA PREVIA DEL CÓDIGO */}
              <div
                style={{
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                    💻 Inspeccionar Código Fuente (Código.gs)
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCodePreview(!showCodePreview)}
                    className="btn btn-sm"
                    style={{ background: 'rgba(255, 255, 255, 0.08)', fontSize: '10.5px', padding: '4px 8px' }}
                  >
                    {showCodePreview ? 'Ocultar Código ▲' : 'Mostrar Código ▼'}
                  </button>
                </div>

                {showCodePreview && (
                  <pre
                    style={{
                      maxHeight: '220px',
                      overflowY: 'auto',
                      background: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '10.5px',
                      color: '#93c5fd',
                      fontFamily: 'monospace',
                      lineHeight: '1.4',
                    }}
                  >
                    {APPS_SCRIPT_BACKEND_CODE}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botón Inferior de Cierre */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-cyan btn-sm" style={{ padding: '0 24px', fontWeight: 800 }}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
