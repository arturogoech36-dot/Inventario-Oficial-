import { GoogleSheetsSyncStatus } from '../services/googleSheetsService';

export type TabType = 
  | 'dashboard' 
  | 'kardex' 
  | 'actas' 
  | 'sincosto' 
  | 'trazabilidad' 
  | 'herramientas' 
  | 'equiposmenores';

interface TopbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  usuario: string;
  sheetsStatus?: GoogleSheetsSyncStatus;
  onOpenSheetsModal?: () => void;
  onOpenTerminalPistola?: (modo: 'ingreso' | 'despacho' | 'consulta') => void;
  onScanQR?: () => void;
  onOpenDespachoContinuo?: () => void;
  onOpenOCR?: () => void;
  onHelp?: () => void;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onTabChange,
  usuario,
  sheetsStatus,
  onOpenSheetsModal,
  onOpenTerminalPistola,
  onScanQR,
  onOpenDespachoContinuo,
  onOpenOCR,
  onHelp,
  onLogout,
  theme = 'dark',
  onToggleTheme,
}) => {
  return (
    <div className="topbar">
      {/* ── FILA SUPERIOR: TÍTULO INSTITUCIONAL + ESTADO DE SESIÓN ── */}
      <div className="topbar-header-row">
        <div className="topbar-title-wrap">
          <span className="topbar-title">INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH</span>
          <span className="topbar-subbadge">
            HAH-CGI5 · Hospital Alto Hospicio
          </span>
        </div>
        <div className="topbar-user-wrap">
          <span className="badge-user" id="badgeUsuario" title={`Usuario actual: ${usuario}`}>
            👤 {usuario} ☰
          </span>
          <button
            onClick={onLogout}
            className="btn-logout"
            title="Cerrar sesión"
          >
            🔒 Salir
          </button>
        </div>
      </div>

      {/* ── FILA DE BOTONES: TODOS LOS BOTONES ALINEADOS EN LA MISMA LÍNEA, MISMA MEDIDA Y FORMA ── */}
      <div className="topbar-buttons-row">
        <div className="nav-tabs">
          <button
            className={`btn-nav ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onTabChange('dashboard')}
          >
            🏠 Panel de Control
          </button>
          <button
            className={`btn-nav ${currentTab === 'kardex' ? 'active' : ''}`}
            onClick={() => onTabChange('kardex')}
          >
            📋 Registro Kardex (Historial)
          </button>
          <button
            className={`btn-nav ${currentTab === 'actas' ? 'active' : ''}`}
            onClick={() => onTabChange('actas')}
          >
            📤 Historial de Actas de Salida
          </button>
          <button
            className={`btn-nav ${currentTab === 'sincosto' ? 'active' : ''}`}
            onClick={() => onTabChange('sincosto')}
          >
            📦 Tránsito Despacho
          </button>
          <button
            className={`btn-nav ${currentTab === 'trazabilidad' ? 'active' : ''}`}
            onClick={() => onTabChange('trazabilidad')}
          >
            🔧 Trazabilidad Equipos (Préstamos)
          </button>
          <button
            className={`btn-nav ${currentTab === 'herramientas' ? 'active' : ''}`}
            onClick={() => onTabChange('herramientas')}
          >
            🧰 Trazabilidad Herramientas
          </button>
          <button
            className={`btn-nav ${currentTab === 'equiposmenores' ? 'active' : ''}`}
            onClick={() => onTabChange('equiposmenores')}
          >
            ⚙️ Trazabilidad Equipos Menores
          </button>
        </div>

        <div className="topbar-action-buttons">
          {onOpenSheetsModal && (
            <button
              onClick={onOpenSheetsModal}
              className="btn-nav"
              style={{
                background: sheetsStatus?.spreadsheetId
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(14, 165, 233, 0.12)',
                borderColor: sheetsStatus?.spreadsheetId ? '#10b981' : '#0ea5e9',
                color: sheetsStatus?.spreadsheetId ? '#34d399' : '#38bdf8',
                fontWeight: 700,
              }}
              title={
                sheetsStatus?.spreadsheetId
                  ? `Google Sheets: Sincronización Automática Activa`
                  : 'Configurar Google Sheets y Google Drive'
              }
            >
              <span style={{ fontSize: '13px' }}>📊</span>
              <span>
                {sheetsStatus?.isSyncing
                  ? 'Sincronizando...'
                  : sheetsStatus?.spreadsheetId
                  ? 'Sheets Auto-Sync 🟢'
                  : 'Google Sheets'}
              </span>
            </button>
          )}

          {onOpenOCR && (
            <button
              onClick={onOpenOCR}
              className="btn-nav btn-ocr"
              title="Escáner Inteligente OCR con IA"
            >
              ✨ Escaneo OCR con IA
            </button>
          )}
          {/* TERMINAL PISTOLA: UN SOLO SISTEMA INTEGRADO (INGRESO Y DESPACHO CONTINUO) */}
          <button
            onClick={() => {
              if (onOpenTerminalPistola) onOpenTerminalPistola('despacho');
              else if (onOpenDespachoContinuo) onOpenDespachoContinuo();
            }}
            className="btn-nav btn-pistola"
            title="Terminal Pistola: Ingreso y Despacho Continuo (Lector de Códigos de Barras y QR)"
          >
            <span style={{ fontSize: '13px' }}>🔫</span>
            <span>Ingreso / Despacho (Pistola)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
