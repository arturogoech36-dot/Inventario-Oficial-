import React, { useState, useEffect, useRef } from 'react';
import {
  Producto,
  KardexMovimiento,
  ActaSalida,
  SinCostoMovimiento,
  TrazabilidadEquipo,
  Herramienta,
  EquipoMenor,
  ItemDespacho,
  ItemIngresoPistola,
  FamiliaCatalogo,
} from './types';
import {
  INITIAL_PRODUCTOS,
  INITIAL_KARDEX,
  INITIAL_ACTAS,
  INITIAL_FAMILIAS,
} from './data/initialData';
import { fmtMoney, today, todayIso, padNum, genId, extractDocNumberFromFilename } from './utils/format';
import { Topbar, TabType } from './components/Topbar';
import { DashboardView } from './components/DashboardView';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { KardexView } from './components/KardexView';
import { ActasView } from './components/ActasView';
import { SinCostoView } from './components/SinCostoView';
import { TrazabilidadView } from './components/TrazabilidadView';
import { HerramientasView } from './components/HerramientasView';
import { EquiposMenoresView } from './components/EquiposMenoresView';
import { Modals } from './components/Modals';
import { LoginScreen } from './components/LoginScreen';
import { MobileView } from './components/MobileView';
import { downloadExcelOrCSV } from './utils/exportHelpers';
import {
  initGoogleAuth,
  signInWithGoogle,
  signOutGoogle,
  createOfficialInventorySpreadsheet,
  syncAllToGoogleSheets,
  GoogleSheetsSyncStatus,
  getGoogleAccessToken,
} from './services/googleSheetsService';
import { User } from 'firebase/auth';
import { EtiquetaTrazabilidadModal, EtiquetaItemData } from './components/EtiquetaTrazabilidadModal';
import { ScanResultModal, ScanResultData } from './components/ScanResultModal';
import { FamiliasModal } from './components/FamiliasModal';
import { ScannerUnifiedModal } from './components/ScannerUnifiedModal';
import { DespachoContinuoModal } from './components/DespachoContinuoModal';
import { TerminalPistolaModal, TerminalMode } from './components/TerminalPistolaModal';
import { getNextTrazCode, playScannerBeep, pickDesktopFile } from './utils/barcodeHelpers';
import {
  buildActaDespachoTemplate,
  buildReporteTrazabilidadEquiposTemplate,
  buildReporteTrazabilidadHerramientasTemplate,
  buildReporteTrazabilidadEquiposMenoresTemplate,
  buildReporteInventarioValorizadoTemplate,
  buildKardexResumenTemplate,
  buildSinCostoTemplate,
} from './utils/hospitalTemplates';
import {
  openGmailWebComposer,
  openOutlookWebComposer,
  openDefaultMailClient,
  copyReportToClipboard,
  buildReportEmailSubject,
  buildReportEmailBody,
  buildReportEmailBodyForUrl,
} from './utils/emailReportHelper';
import {
  getStoredAppsScriptUrl,
  setStoredAppsScriptUrl,
  sendEmailViaAppsScript,
  syncToAppsScriptBackend,
  fetchFromAppsScriptBackend,
  fetchServerCloudState,
  pushServerCloudState,
} from './services/appsScriptService';
import {
  printReporteTexto,
  printActaSalidaDocument,
  printKardexResumenDocument,
  printSinCostoReporte,
  printProductoEtiqueta,
  printDocument,
  printAttachedDocument,
  downloadHtmlAsPDF,
  downloadKardexResumenPDF,
  downloadSinCostoPDF,
  downloadActaSalidaPDF,
} from './utils/printHelpers';
import { DocumentPreviewModal, DocumentPreviewData } from './components/DocumentPreviewModal';
import {
  saveAttachmentToDB,
  getAttachmentFromDB,
  setMemoryAttachment,
  getMemoryAttachment,
  sanitizeItemsForStorage,
  safeLocalStorageSetItem,
  cleanupBloatedLocalStorage,
  rehydrateAttachments,
} from './utils/attachmentStorage';

declare const XLSX: any;

export default function App() {
  // Authentication
  const [usuario, setUsuario] = useState<string | null>(() => {
    return localStorage.getItem('hah_nombreUsuario') || null;
  });

  // Device mode: siempre inicia en la versión completa de escritorio (PC Trabajo, PC Casa y Tablet ven exactamente la misma versión)
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Current View Tab
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  // Theme mode: dark (default, exactly as is) or light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('hah_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      safeLocalStorageSetItem('hah_theme', next);
      showToast(next === 'light' ? '☀️ Modo Claro activado' : '🌙 Modo Oscuro activado');
      return next;
    });
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  // ── GOOGLE SHEETS & DRIVE OAUTH & SYNC STATE ──
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('hah_sheets_autosync') !== 'false';
  });
  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsSyncStatus>(() => ({
    isConnected: Boolean(localStorage.getItem('hah_apps_script_url')),
    user: null,
    spreadsheetId: localStorage.getItem('hah_google_sheets_id') || localStorage.getItem('hah_apps_script_url') || null,
    spreadsheetUrl: localStorage.getItem('hah_google_sheets_url') || null,
    lastSyncTime: localStorage.getItem('hah_sheets_last_sync') || null,
    isSyncing: false,
    error: null,
  }));

  const syncTimeoutRef = useRef<any>(null);
  const initialCloudLoadDoneRef = useRef<boolean>(false);

  useEffect(() => {
    const unsub = initGoogleAuth(
      (user) => {
        setGoogleUser(user);
        setSheetsStatus((prev) => ({
          ...prev,
          isConnected: true,
          user,
        }));
      },
      () => {
        setGoogleUser(null);
        setSheetsStatus((prev) => ({
          ...prev,
          isConnected: false,
          user: null,
        }));
      }
    );
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithGoogle();
      if (res) {
        setGoogleUser(res.user);
        setSheetsStatus((prev) => ({
          ...prev,
          isConnected: true,
          user: res.user,
          error: null,
        }));
        showToast(`✅ Conectado con Google: ${res.user.email}`);
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      showToast(`Error de conexión con Google: ${err.message || 'Error desconocido'}`, true);
      throw err;
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogle();
      setGoogleUser(null);
      setSheetsStatus((prev) => ({
        ...prev,
        isConnected: false,
        user: null,
      }));
      showToast('🔒 Sesión de Google cerrada');
    } catch (err: any) {
      console.error('Error signing out:', err);
    }
  };

  const handleCreateOfficialSpreadsheet = async () => {
    if (!googleUser || !getGoogleAccessToken()) {
      await handleGoogleSignIn();
    }
    setSheetsStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      showToast('⏳ Creando planilla en Google Drive y formateando 6 pestañas...');
      const res = await createOfficialInventorySpreadsheet({
        productos,
        kardex,
        actas,
        sinCostoList,
        equipos: trazabilidad,
        herramientas,
        equiposMenores,
      });
      const nowStr = new Date().toLocaleTimeString('es-CL');
      setSheetsStatus((prev) => ({
        ...prev,
        spreadsheetId: res.spreadsheetId,
        spreadsheetUrl: res.spreadsheetUrl,
        lastSyncTime: nowStr,
        isSyncing: false,
        error: null,
      }));
      localStorage.setItem('hah_sheets_last_sync', nowStr);
      showToast('✅ ¡Planilla oficial creada con éxito en Google Drive!');
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      setSheetsStatus((prev) => ({ ...prev, isSyncing: false, error: err.message }));
      showToast(`Error al crear planilla: ${err.message}`, true);
      throw err;
    }
  };

  const handleSyncAllSheets = async () => {
    if (!sheetsStatus.spreadsheetId) {
      showToast('Primero debes crear la planilla oficial en Google Drive', true);
      setSheetsModalOpen(true);
      return;
    }
    if (!getGoogleAccessToken()) {
      await handleGoogleSignIn();
    }
    setSheetsStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      showToast('⏳ Sincronizando datos con las 6 pestañas de Google Sheets...');
      await syncAllToGoogleSheets(sheetsStatus.spreadsheetId, {
        productos,
        kardex,
        actas,
        sinCostoList,
        equipos: trazabilidad,
        herramientas,
        equiposMenores,
      });
      const scriptUrl = getStoredAppsScriptUrl();
      if (scriptUrl) {
        await syncToAppsScriptBackend(scriptUrl, {
          productos,
          kardex: sanitizeItemsForStorage(kardex),
          actas,
          sinCostoList: sanitizeItemsForStorage(sinCostoList),
          equipos: sanitizeItemsForStorage(trazabilidad),
          herramientas: sanitizeItemsForStorage(herramientas),
          equiposMenores: sanitizeItemsForStorage(equiposMenores),
          familias,
        });
      }
      const nowStr = new Date().toLocaleTimeString('es-CL');
      setSheetsStatus((prev) => ({
        ...prev,
        lastSyncTime: nowStr,
        isSyncing: false,
        error: null,
      }));
      localStorage.setItem('hah_sheets_last_sync', nowStr);
      showToast('✅ ¡Sincronización completa con Google Sheets!');
    } catch (err: any) {
      console.error('Error syncing sheets:', err);
      setSheetsStatus((prev) => ({ ...prev, isSyncing: false, error: err.message }));
      showToast(`Error al sincronizar: ${err.message}`, true);
      throw err;
    }
  };

  const isDummyTestItem = (item: any): boolean => {
    if (!item) return false;
    const desc = (item.descripcion || item.nombreEquipo || item.desc || '').toUpperCase();
    const guia = String(item.guia || '').trim();
    return (
      desc.includes('SOPORTE ATRIL CON BASE') ||
      desc.includes('TENSIOMETRO ANEROIDE DE PEDESTAL') ||
      desc.includes('SATUROMETRO DE PULSO PORTATIL') ||
      desc.includes('FONENDOSCOPIO CLINICO DOBLE') ||
      desc.includes('TERMOMETRO DIGITAL INFRARROJO SIN CONTACTO') ||
      guia === '0000046950'
    );
  };

  const applyRemoteAppState = (remote: any) => {
    if (!remote || typeof remote !== 'object') return false;
    let applied = false;
    if (Array.isArray(remote.productos) && remote.productos.length > 0) {
      setProductos(remote.productos);
      applied = true;
    }
    if (Array.isArray(remote.kardex)) {
      setKardex(remote.kardex);
      applied = true;
    }
    if (Array.isArray(remote.actas)) {
      setActas(remote.actas);
      applied = true;
    }
    if (Array.isArray(remote.sinCostoList)) {
      setSinCostoList(remote.sinCostoList);
      applied = true;
    }
    if (Array.isArray(remote.equipos)) {
      setTrazabilidad(
        remote.equipos
          .filter((it: any) => !isDummyTestItem(it))
          .map((item: any, idx: number) => {
            const svc = item.servicioDestino || item.servClinico || item.servicio || item.destino || 'HOSPITAL DE ALTO HOSPICIO';
            const rec = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';
            return {
              ...item,
              codigo: item.codigo || `TRZ-EQ-${String(idx + 1).padStart(3, '0')}`,
              servicioDestino: svc,
              servClinico: svc,
              personaRecibe: rec,
              quienRecibe: rec,
            };
          })
      );
      applied = true;
    }
    if (Array.isArray(remote.herramientas)) {
      setHerramientas(
        remote.herramientas
          .filter((it: any) => !isDummyTestItem(it))
          .map((item: any, idx: number) => {
            const svc = item.servicioDestino || item.servClinico || item.servicio || item.destino || 'HOSPITAL DE ALTO HOSPICIO';
            const rec = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';
            return {
              ...item,
              codigo: item.codigo || `TRZ-HER-${String(idx + 1).padStart(3, '0')}`,
              servicioDestino: svc,
              servClinico: svc,
              personaRecibe: rec,
              quienRecibe: rec,
            };
          })
      );
      applied = true;
    }
    if (Array.isArray(remote.equiposMenores)) {
      setEquiposMenores(
        remote.equiposMenores
          .filter((it: any) => !isDummyTestItem(it))
          .map((item: any, idx: number) => {
            const svc = item.servicioDestino || item.servClinico || item.servicio || item.destino || 'HOSPITAL DE ALTO HOSPICIO';
            const rec = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';
            return {
              ...item,
              codigo: item.codigo || `TRZ-EQM-${String(idx + 1).padStart(3, '0')}`,
              servicioDestino: svc,
              servClinico: svc,
              personaRecibe: rec,
              quienRecibe: rec,
            };
          })
      );
      applied = true;
    }
    if (Array.isArray(remote.familias) && remote.familias.length > 0) {
      setFamilias(remote.familias);
      applied = true;
    }
    return applied;
  };

  const handlePushAppsScript = async (url: string) => {
    setSheetsStatus((prev) => ({ ...prev, isSyncing: true, spreadsheetId: prev.spreadsheetId || url, error: null }));
    try {
      const cleanPayload = {
        productos,
        kardex: sanitizeItemsForStorage(kardex),
        actas,
        sinCostoList: sanitizeItemsForStorage(sinCostoList),
        equipos: sanitizeItemsForStorage(trazabilidad),
        herramientas: sanitizeItemsForStorage(herramientas),
        equiposMenores: sanitizeItemsForStorage(equiposMenores),
        familias,
      };
      await syncToAppsScriptBackend(url, cleanPayload);
      await pushServerCloudState({ appsScriptUrl: url, appState: cleanPayload });
      const nowStr = new Date().toLocaleTimeString('es-CL');
      setSheetsStatus((prev) => ({
        ...prev,
        isSyncing: false,
        spreadsheetId: prev.spreadsheetId || url,
        lastSyncTime: nowStr,
        error: null,
      }));
      localStorage.setItem('hah_sheets_last_sync', nowStr);
      showToast('✅ Datos subidos a Google Sheets y sincronizados para PC y Tablet');
    } catch (err: any) {
      setSheetsStatus((prev) => ({ ...prev, isSyncing: false, error: err.message }));
      showToast(`Error al subir a Apps Script: ${err.message}`, true);
      throw err;
    }
  };

  const handlePullAppsScript = async (url: string) => {
    setSheetsStatus((prev) => ({ ...prev, isSyncing: true, spreadsheetId: prev.spreadsheetId || url, error: null }));
    try {
      const res = await fetchFromAppsScriptBackend(url);
      if (res.appState && applyRemoteAppState(res.appState)) {
        await pushServerCloudState({ appsScriptUrl: url, appState: res.appState });
        const nowStr = new Date().toLocaleTimeString('es-CL');
        setSheetsStatus((prev) => ({
          ...prev,
          isSyncing: false,
          spreadsheetId: prev.spreadsheetId || url,
          lastSyncTime: nowStr,
          error: null,
        }));
        localStorage.setItem('hah_sheets_last_sync', nowStr);
        showToast('✅ ¡Equipo igualado con los datos de la Nube (Google Sheets)!');
      } else {
        setSheetsStatus((prev) => ({ ...prev, isSyncing: false }));
        showToast('ℹ️ La planilla aún no tiene registros guardados; sube primero desde tu equipo principal');
      }
    } catch (err: any) {
      setSheetsStatus((prev) => ({ ...prev, isSyncing: false, error: err.message }));
      showToast(`Error al descargar desde Apps Script: ${err.message}`, true);
      throw err;
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('hah_sheets_autosync', String(enabled));
    showToast(
      enabled
        ? '🟢 Sincronización automática en tiempo real activada'
        : '⏸️ Sincronización automática pausada'
    );
  };

  // ── CORE DATA STATES WITH LOCALSTORAGE PERSISTENCE ──
  const [productos, setProductos] = useState<Producto[]>(() => {
    let prods: Producto[] = INITIAL_PRODUCTOS;
    const saved = localStorage.getItem('hah_productos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) prods = parsed;
      } catch (e) {}
    }
    // Ensure all families (including PMEL and custom families) have representation at the end of the inventory
    const savedFams = localStorage.getItem('hah_familias');
    let famsList = INITIAL_FAMILIAS;
    if (savedFams) {
      try {
        const parsed = JSON.parse(savedFams);
        if (Array.isArray(parsed) && parsed.length > 0) famsList = parsed;
      } catch (e) {}
    }
    famsList.forEach((f) => {
      if (!prods.some((p) => p.familia.toUpperCase() === f.id.toUpperCase())) {
        prods = [
          ...prods,
          {
            id: Date.now() + Math.floor(Math.random() * 1000),
            codigo: `${f.id}-01`,
            desc: `${f.nombre} (Ítem Inicial)`,
            familia: f.id,
            tipo: 'Variable',
            stock: 0,
            stockMin: 10,
            valor: 15000,
            venc: '',
            estado: 'Activo',
          },
        ];
      }
    });
    return prods;
  });

  const [kardex, setKardex] = useState<KardexMovimiento[]>(() => {
    const saved = localStorage.getItem('hah_kardex');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_KARDEX;
  });

  const [actas, setActas] = useState<ActaSalida[]>(() => {
    const saved = localStorage.getItem('hah_actas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seenIds = new Set<string>();
          const cleanList: ActaSalida[] = [];
          parsed.forEach((a, idx) => {
            if (!a) return;
            let id = a.id || `HAH-SAL-${padNum(idx + 1, 2)}`;
            if (seenIds.has(id)) {
              let suffix = 2;
              while (seenIds.has(`${id}-${suffix}`)) suffix++;
              id = `${id}-${suffix}`;
            }
            seenIds.add(id);
            cleanList.push({
              ...a,
              id,
              items: Array.isArray(a.items) ? a.items : [],
            });
          });
          return cleanList;
        }
      } catch (e) {}
    }
    return INITIAL_ACTAS;
  });

  const [sinCostoList, setSinCostoList] = useState<SinCostoMovimiento[]>(() => {
    const saved = localStorage.getItem('hah_sincosto');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  const [trazabilidad, setTrazabilidad] = useState<TrazabilidadEquipo[]>(() => {
    const saved = localStorage.getItem('hah_trazabilidad');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item: any) => !isDummyTestItem(item))
            .map((item: any, idx: number) => {
              const svc = item.servicioDestino || item.servClinico || item.servicio || item.destino || 'HOSPITAL DE ALTO HOSPICIO';
              const rec = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';
              return {
                ...item,
                codigo: item.codigo || `TRZ-EQ-${String(idx + 1).padStart(3, '0')}`,
                servicioDestino: svc,
                servClinico: svc,
                personaRecibe: rec,
                quienRecibe: rec,
              };
            });
        }
      } catch (e) {}
    }
    return [];
  });

  const [herramientas, setHerramientas] = useState<Herramienta[]>(() => {
    const saved = localStorage.getItem('hah_herramientas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item: any) => !isDummyTestItem(item))
            .map((item: any, idx: number) => {
              const svc = item.servicioDestino || item.servClinico || item.servicio || item.destino || 'HOSPITAL DE ALTO HOSPICIO';
              const rec = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';
              return {
                ...item,
                codigo: item.codigo || `TRZ-HER-${String(idx + 1).padStart(3, '0')}`,
                servicioDestino: svc,
                servClinico: svc,
                personaRecibe: rec,
                quienRecibe: rec,
              };
            });
        }
      } catch (e) {}
    }
    return [];
  });

  const [equiposMenores, setEquiposMenores] = useState<EquipoMenor[]>(() => {
    const saved = localStorage.getItem('hah_equiposmenores');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item: any) => !isDummyTestItem(item))
            .map((item: any, idx: number) => {
              const svc = item.servicioDestino || item.servClinico || item.servicio || item.destino || 'HOSPITAL DE ALTO HOSPICIO';
              const rec = item.personaRecibe || item.quienRecibe || item.recibe || item.responsable || '';
              return {
                ...item,
                codigo: item.codigo || `TRZ-EQM-${String(idx + 1).padStart(3, '0')}`,
                servicioDestino: svc,
                servClinico: svc,
                personaRecibe: rec,
                quienRecibe: rec,
              };
            });
        }
      } catch (e) {}
    }
    return [];
  });

  // Modal states for Labels, Desktop Attachments and Gun Scanner
  const [etiquetaModalData, setEtiquetaModalData] = useState<{
    item?: EtiquetaItemData | null;
    items?: EtiquetaItemData[] | null;
    defaultMode?: 'barra' | 'qr' | 'combinada' | 'caja';
  } | null>(null);

  // Familias de Productos (base oficial ALI, GOB, EQM, BOT + creadas por usuario)
  const [familias, setFamilias] = useState<FamiliaCatalogo[]>(() => {
    const saved = localStorage.getItem('hah_familias');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((f: any) =>
            f.id === 'GOB'
              ? { ...f, nombre: 'Gineco-Obstetricia', descripcion: 'Kits y equipamiento neonatal de Gineco-Obstetricia y apego (GOB-22 y GOB-23)' }
              : f
          );
        }
      } catch (e) {}
    }
    return INITIAL_FAMILIAS;
  });

  useEffect(() => {
    safeLocalStorageSetItem('hah_familias', JSON.stringify(familias));
  }, [familias]);

  const [familiasModalOpen, setFamiliasModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [despachoContinuoOpen, setDespachoContinuoOpen] = useState(false);
  const [terminalPistolaOpen, setTerminalPistolaOpen] = useState(false);
  const [terminalPistolaMode, setTerminalPistolaMode] = useState<TerminalMode>('despacho');
  const [terminalInitialCode, setTerminalInitialCode] = useState<string | null>(null);

  // Shared Despacho State between Dashboard & Continuous Scanner
  const [itemsDespacho, setItemsDespacho] = useState<ItemDespacho[]>([]);
  const [svcDestino, setSvcDestino] = useState<string>('Urgencia');
  const [nroSolicitud, setNroSolicitud] = useState<string>('');
  const [responsableRecep, setResponsableRecep] = useState<string>('');
  const [notaEntrega, setNotaEntrega] = useState<string>('ENTREGADOS : CORREO , URGENCIA');

  const [scanResultModalData, setScanResultModalData] = useState<ScanResultData | null>(null);

  const [actaCorrelativo, setActaCorrelativo] = useState<number>(() => {
    const saved = localStorage.getItem('hah_actaCorrelativo');
    let num = saved ? parseInt(saved, 10) : 1;
    if (isNaN(num) || num < 1 || num > 5000) num = 1;
    try {
      const savedActas = localStorage.getItem('hah_actas');
      const list = savedActas ? JSON.parse(savedActas) : INITIAL_ACTAS;
      if (Array.isArray(list)) {
        list.forEach((a: any) => {
          const m = a?.id?.match(/(\d+)/);
          if (m && m[1]) {
            const val = parseInt(m[1], 10);
            if (val < 1000 && val >= num) num = val + 1;
          }
        });
      }
    } catch (e) {}
    return num;
  });

  // Inputs on Left Panel (Entrada / OC / Factura / Guia)
  const [inOC, setInOC] = useState('');
  const [inFactura, setInFactura] = useState('');
  const [inGuia, setInGuia] = useState('');
  const [archivos, setArchivos] = useState<{ [key: string]: { nombre: string; data: string; tipo: string } | null }>({
    Factura: null,
    Guia: null,
    OC: null,
  });

  // Toast alert
  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = (text: string, isError = false) => {
    setToastMsg({ text, isError });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 2800);
  };

  // Modals management
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [modalProductoTitulo, setModalProductoTitulo] = useState('➕ Nuevo Registro');
  const [modalProdData, setModalProdData] = useState({
    id: 0,
    familia: '',
    codigo: '',
    desc: '',
    stock: 0,
    stockMin: 0,
    valor: 0,
    venc: '',
    fechaIngreso: todayIso(),
    isEdit: false,
  });

  // Selected items for Modals
  const [corrProd, setCorrProd] = useState<Producto | null>(null);
  const [qrProducto, setQrProducto] = useState<Producto | null>(null);
  const [actaContent, setActaContent] = useState('');
  const [reporteContent, setReporteContent] = useState('');
  const [reporteFam, setReporteFam] = useState('TOTAL');
  const [confirmData, setConfirmData] = useState<any>(null);
  const [editKardexData, setEditKardexData] = useState<any>(null);
  const [despachoSCItem, setDespachoSCItem] = useState<SinCostoMovimiento | null>(null);
  const [detalleActa, setDetalleActa] = useState<ActaSalida | null>(null);

  const [trazData, setTrazData] = useState<Partial<TrazabilidadEquipo>>({});
  const [herData, setHerData] = useState<Partial<Herramienta>>({});
  const [eqmData, setEqmData] = useState<Partial<EquipoMenor>>({});

  // Document visualizer preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentPreviewData | null>(null);
  const [isPreviewDocOpen, setIsPreviewDocOpen] = useState(false);

  // One-time startup effect: clean up any existing bloated localStorage keys and rehydrate attachments from IndexedDB
  useEffect(() => {
    cleanupBloatedLocalStorage();

    // Purgar inmediatamente cualquier dato de prueba residual en localStorage
    ['hah_trazabilidad', 'hah_herramientas', 'hah_equiposmenores'].forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const cleaned = list.filter((it: any) => !isDummyTestItem(it));
            safeLocalStorageSetItem(key, JSON.stringify(cleaned));
          }
        } catch (e) {}
      }
    });

    rehydrateAttachments(sinCostoList).then((hydrated) => {
      if (hydrated && hydrated.length > 0) {
        setSinCostoList(hydrated);
      }
    });

    // Sincronización inicial al abrir la app (vincula PC Trabajo, PC Casa y Tablet automáticamente)
    (async () => {
      try {
        let activeScriptUrl = getStoredAppsScriptUrl();
        const serverCloud = await fetchServerCloudState();
        if (serverCloud) {
          if (!activeScriptUrl && serverCloud.appsScriptUrl) {
            activeScriptUrl = serverCloud.appsScriptUrl;
            setStoredAppsScriptUrl(activeScriptUrl);
            setSheetsStatus((prev) => ({
              ...prev,
              spreadsheetId: prev.spreadsheetId || activeScriptUrl,
            }));
          }
          if (serverCloud.appState) {
            applyRemoteAppState(serverCloud.appState);
          }
        }
        if (activeScriptUrl) {
          const remote = await fetchFromAppsScriptBackend(activeScriptUrl);
          if (remote?.appState) {
            applyRemoteAppState(remote.appState);
          }
        }
      } catch (e) {
        console.warn('Initial cloud sync check:', e);
      } finally {
        initialCloudLoadDoneRef.current = true;
      }
    })();
  }, []);

  // Local storage save effect with safe sanitized payloads to completely prevent QuotaExceededError
  useEffect(() => {
    safeLocalStorageSetItem('hah_productos', JSON.stringify(productos));
    safeLocalStorageSetItem('hah_kardex', JSON.stringify(sanitizeItemsForStorage(kardex)));
    safeLocalStorageSetItem('hah_actas', JSON.stringify(actas));
    safeLocalStorageSetItem('hah_sincosto', JSON.stringify(sanitizeItemsForStorage(sinCostoList)));
    safeLocalStorageSetItem('hah_trazabilidad', JSON.stringify(sanitizeItemsForStorage(trazabilidad)));
    safeLocalStorageSetItem('hah_herramientas', JSON.stringify(sanitizeItemsForStorage(herramientas)));
    safeLocalStorageSetItem('hah_equiposmenores', JSON.stringify(sanitizeItemsForStorage(equiposMenores)));
    safeLocalStorageSetItem('hah_actaCorrelativo', String(actaCorrelativo));
  }, [productos, kardex, actas, sinCostoList, trazabilidad, herramientas, equiposMenores, actaCorrelativo]);

  // Handle Login / Logout
  const handleLogin = (nombre: string) => {
    setUsuario(nombre);
    localStorage.setItem('hah_nombreUsuario', nombre);
    showToast(`Bienvenido ${nombre}`);
  };

  const handleLogout = () => {
    setConfirmData({
      icono: '🔒',
      titulo: 'Cerrar Sesión',
      mensaje: `¿Deseas cerrar la sesión de <b>${usuario}</b>?`,
      textoOk: 'Cerrar Sesión',
      colorOk: 'btn-red',
      onOk: () => {
        setUsuario(null);
        localStorage.removeItem('hah_nombreUsuario');
      },
    });
    setModalOpen('modalConfirm');
  };

  // Attach Clip PDF handler - extracts doc number from desktop file and reflects in corresponding box
  const handleClip = (tipo: 'Factura' | 'Guia' | 'OC') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const fileData = {
          nombre: file.name,
          data: ev.target?.result as string,
          tipo: file.type || 'application/pdf',
        };
        setArchivos((prev) => ({
          ...prev,
          [tipo]: fileData,
        }));

        // Reflejar automáticamente el número del documento según corresponda
        const docNumero = extractDocNumberFromFilename(file.name, tipo);
        if (tipo === 'OC') {
          setInOC(docNumero);
        } else if (tipo === 'Factura') {
          setInFactura(docNumero);
        } else if (tipo === 'Guia') {
          setInGuia(docNumero);
        }

        showToast(`📎 PDF "${file.name}" adjuntado ➔ Reflejado en ${tipo}: ${docNumero}`);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Imprimir documento adjunto en panel izquierdo de Entrada
  const handleImprimirAdjuntoEntrada = async (
    adjunto: { nombre: string; data: string; tipo: string }
  ) => {
    if (!adjunto?.data) {
      showToast('El archivo adjunto no contiene datos imprimibles', true);
      return;
    }
    showToast(`🖨️ Mandando a imprimir: ${adjunto.nombre}...`);
    try {
      await printAttachedDocument(adjunto);
    } catch (e) {
      console.error('Error al imprimir documento:', e);
      showToast('Error al imprimir documento adjunto', true);
    }
  };

  const handleRemoverAdjuntoEntrada = (tipo: 'Factura' | 'Guia' | 'OC') => {
    setArchivos((prev) => ({ ...prev, [tipo]: null }));
    showToast(`Archivo PDF de ${tipo} desvinculado`);
  };

  // ── REAL-TIME AUTO SYNC CON GOOGLE SHEETS / APPS SCRIPT Y SERVIDOR MULTI-DISPOSITIVO ──
  useEffect(() => {
    if (!initialCloudLoadDoneRef.current) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      const cleanPayload = {
        productos,
        kardex: sanitizeItemsForStorage(kardex),
        actas,
        sinCostoList: sanitizeItemsForStorage(sinCostoList),
        equipos: sanitizeItemsForStorage(trazabilidad),
        herramientas: sanitizeItemsForStorage(herramientas),
        equiposMenores: sanitizeItemsForStorage(equiposMenores),
        familias,
      };

      const scriptUrl = getStoredAppsScriptUrl();
      // Guardar siempre en el estado compartido del servidor para igualar PC Trabajo, PC Casa y Tablet
      await pushServerCloudState({
        appsScriptUrl: scriptUrl || undefined,
        appState: cleanPayload,
      });

      if (!autoSyncEnabled) return;

      const token = getGoogleAccessToken();
      const canSyncDirectSheets = Boolean(sheetsStatus.spreadsheetId && token && !sheetsStatus.spreadsheetId.startsWith('http'));
      const canSyncAppsScript = Boolean(scriptUrl);

      if (!canSyncDirectSheets && !canSyncAppsScript) return;

      try {
        setSheetsStatus((prev) => ({ ...prev, isSyncing: true }));
        if (canSyncDirectSheets && sheetsStatus.spreadsheetId) {
          await syncAllToGoogleSheets(sheetsStatus.spreadsheetId, {
            productos,
            kardex,
            actas,
            sinCostoList,
            equipos: trazabilidad,
            herramientas,
            equiposMenores,
          });
        }
        if (canSyncAppsScript) {
          await syncToAppsScriptBackend(scriptUrl, cleanPayload);
        }
        const nowStr = new Date().toLocaleTimeString('es-CL');
        setSheetsStatus((prev) => ({
          ...prev,
          isSyncing: false,
          spreadsheetId: prev.spreadsheetId || scriptUrl || null,
          lastSyncTime: nowStr,
          error: null,
        }));
        localStorage.setItem('hah_sheets_last_sync', nowStr);
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        const isTransientTimeout =
          msg.includes('tiempo de espera') ||
          msg.includes('timed out') ||
          msg.includes('timeout') ||
          msg.includes('en curso');

        if (isTransientTimeout) {
          console.warn('Auto-sync diferido (Google Sheets procesando):', msg);
          setSheetsStatus((prev) => ({
            ...prev,
            isSyncing: false,
            // Mantener sin alerta roja para no interrumpir el trabajo del usuario
            error: null,
          }));
        } else {
          console.warn('Auto-sync aviso:', msg);
          setSheetsStatus((prev) => ({
            ...prev,
            isSyncing: false,
            error: msg,
          }));
        }
      }
    }, 5000);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [
    productos,
    kardex,
    actas,
    sinCostoList,
    trazabilidad,
    herramientas,
    equiposMenores,
    familias,
    autoSyncEnabled,
    sheetsStatus.spreadsheetId,
  ]);

  // Product save handler
  const handleSaveProducto = () => {
    const { familia, codigo, desc, stock, stockMin, valor, venc, fechaIngreso, isEdit } = modalProdData;
    if (!familia || !desc) {
      showToast('Familia y descripción son obligatorios', true);
      return;
    }
    const finalFechaIngreso = fechaIngreso || todayIso();

    const adjuntosEntrada = Object.entries(archivos)
      .filter(([_, file]) => file !== null)
      .map(([tipo, file]) => ({
        nombre: `[${tipo}] ${file!.nombre}`,
        tipo: file!.tipo,
        data: file!.data,
      }));

    if (valor === 0 && !isEdit) {
      // Sin Costo
      const scItem: SinCostoMovimiento = {
        id: genId('sc'),
        fecha: new Date().toLocaleString('es-CL'),
        fechaIngreso: finalFechaIngreso,
        tipo: 'ENTRADA',
        codigo: codigo || 'SC-01',
        desc,
        familia,
        guia: inGuia || '—',
        factura: inFactura || '—',
        oc: inOC || '—',
        cantidad: stock || 0,
        unidad: 'Bodega de Tránsito HAH',
        persona: usuario || 'Arturo Gómez E.',
        estado: 'SIN COSTO',
        despachos: [],
        adjuntos: adjuntosEntrada,
      };
      setSinCostoList((prev) => [scItem, ...prev]);
      setModalOpen(null);
      setCurrentTab('sincosto');
      showToast(`📦 ${codigo} (${stock} uds.) registrado en Tránsito Despacho`);
      return;
    }

    let updatedProd: Producto;
    const exists = productos.find((p) => p.codigo === codigo && p.estado === 'Activo');

    if (exists) {
      if (isEdit) {
        setProductos((prev) =>
          prev.map((p) =>
            p.id === exists.id
              ? { ...p, desc, stock, stockMin, valor, venc, fechaIngreso: finalFechaIngreso }
              : p
          )
        );
        showToast(`Producto ${codigo} editado con éxito`);
      } else {
        setProductos((prev) =>
          prev.map((p) =>
            p.id === exists.id
              ? {
                  ...p,
                  stock: p.stock + stock,
                  valor: valor > 0 ? valor : p.valor,
                  stockMin: stockMin > 0 ? stockMin : p.stockMin,
                  venc: venc || p.venc,
                  fechaIngreso: finalFechaIngreso,
                }
              : p
          )
        );
        // Add Kardex movement
        const nuevoKardex: KardexMovimiento = {
          id: genId('k'),
          fecha: new Date().toLocaleString('es-CL'),
          fechaIngreso: finalFechaIngreso,
          tipo: 'ENTRADA',
          codigo,
          producto: desc,
          guia: inGuia || '—',
          factura: inFactura || '—',
          oc: inOC || '—',
          unidad: 'Bodega de Tránsito HAH',
          persona: usuario || 'Arturo Gómez E.',
          cantidad: stock,
          adjuntos: adjuntosEntrada,
        };
        setKardex((prev) => [nuevoKardex, ...prev]);
        showToast(`Stock actualizado para ${codigo}`);
      }
    } else {
      updatedProd = {
        id: Date.now(),
        codigo: codigo || `ALI-${productos.length + 1}`,
        desc,
        familia,
        tipo: ['ALI', 'GOB'].includes(familia) ? 'Fijo' : 'Variable',
        stock,
        stockMin,
        valor,
        venc,
        fechaIngreso: finalFechaIngreso,
        estado: 'Activo',
      };
      setProductos((prev) => [...prev, updatedProd]);
      if (stock > 0) {
        const nuevoKardex: KardexMovimiento = {
          id: genId('k'),
          fecha: new Date().toLocaleString('es-CL'),
          fechaIngreso: finalFechaIngreso,
          tipo: 'ENTRADA',
          codigo: updatedProd.codigo,
          producto: desc,
          guia: inGuia || '—',
          factura: inFactura || '—',
          oc: inOC || '—',
          unidad: 'Bodega de Tránsito HAH',
          persona: usuario || 'Arturo Gómez E.',
          cantidad: stock,
          adjuntos: adjuntosEntrada,
        };
        setKardex((prev) => [nuevoKardex, ...prev]);
      }
      showToast(`Producto ${updatedProd.codigo} creado`);
    }

    setModalOpen(null);
    setInOC('');
    setInFactura('');
    setInGuia('');
    setArchivos({ Factura: null, Guia: null, OC: null });
  };

  // Generate Dispatch Acta
  const handleGenerarActa = (
    servicio: string,
    solicitud: string,
    responsable: string,
    items: ItemDespacho[] = [],
    nota?: string
  ) => {
    const safeItems = Array.isArray(items) ? items : [];
    let curNum = actaCorrelativo > 0 ? actaCorrelativo : 1;
    while (
      actas.some(
        (a) =>
          a?.id === String(curNum).padStart(2, '0') ||
          a?.id === String(curNum) ||
          a?.id === `HAH-SAL-${String(curNum).padStart(2, '0')}`
      )
    ) {
      curNum++;
    }
    const id = String(curNum).padStart(2, '0');
    const finalNota = (nota && nota.trim())
      ? nota.trim()
      : `ENTREGADOS : ${(solicitud ? solicitud + ' , ' : '')}${servicio}`.toUpperCase();

    const lineas = safeItems
      .map(
        (i) =>
          `  ${(i?.codigo || '—').padEnd(10)}  ${(i?.familia || '—').padEnd(8)}  ${(i?.desc || '—').padEnd(35).substring(0, 35)}  ${String(i?.cantidad || 1).padStart(6)}    Uds.`
      )
      .join('\n');
    const totalUds = safeItems.reduce((s, i) => s + (i?.cantidad || 0), 0);

    const txt = `============================================================================================
  HOSPITAL ALTO HOSPICIO                                       N° ACTA CORRELATIVO INTERNO: ${id}
  BODEGA DE TRÁNSITO                                           FECHA EGRESO: ${today()}
============================================================================================

                                     . ACTA DE EGRESO

--------------------------------------------------------------------------------------------
1. DATOS DEL DESTINO Y AUTORIZACIÓN
--------------------------------------------------------------------------------------------
SERVICIO DESTINO:        ${servicio || 'Urgencia'}
N° SOLICITUD INTERNA:    ${solicitud || id}
RESPONSABLE BODEGA:      Arturo Gómez Echegoyen – Bodega de Tránsito (HAH)
FUNCIONARIO QUE RECIBE:  ${responsable || '______________'}
NOTA:                    ${finalNota}

--------------------------------------------------------------------------------------------
2. DETALLE DE INSUMOS DESPACHADOS
--------------------------------------------------------------------------------------------
CÓDIGO      FAMILIA     DESCRIPCIÓN                             CANTIDAD    U. MEDIDA
----------  ----------  ------------------------------------  ----------  -----------
${lineas}
----------  ----------  ------------------------------------  ----------  -----------
TOTAL ARTÍCULOS DESPACHADOS: ${totalUds} unidades.

--------------------------------------------------------------------------------------------
3. VALIDACIÓN Y FIRMAS REQUISITAS
--------------------------------------------------------------------------------------------


  ________________________________________      ________________________________________
       RESPONSABLE BODEGA DE TRÁNSITO                    FUNCIONARIO QUE RECIBE
           Arturo Gómez Echegoyen                        ${responsable || '______________'}
           Hospital Alto Hospicio                        RUT:

--------------------------------------------------------------------------------------------
SERVICIO DE SALUD TARAPACÁ · Hospital Alto Hospicio · www.saludiquique.gob.cl
============================================================================================`;

    // Deduct stock from products
    setProductos((prev) =>
      prev.map((p) => {
        const desp = safeItems.find((it) => it.codigo === p.codigo);
        if (desp) {
          return { ...p, stock: Math.max(0, p.stock - desp.cantidad) };
        }
        return p;
      })
    );

    // Update Trazabilidad Equipos (TRZ-EQ) if included in dispatch
    setTrazabilidad((prev) =>
      prev.map((eq) => {
        const desp = safeItems.find((it) => it.codigo === eq.codigo || it.itemId === eq.id);
        if (desp) {
          const currentCant = typeof eq.cantidad === 'number' ? eq.cantidad : 1;
          return {
            ...eq,
            cantidad: Math.max(0, currentCant - desp.cantidad),
            ingresoRetiro: 'Egreso / Despachado',
            servClinico: servicio || eq.servClinico,
            quienRecibe: responsable || eq.quienRecibe || usuario || '',
          };
        }
        return eq;
      })
    );

    // Update Herramientas (TRZ-HER) if included in dispatch
    setHerramientas((prev) =>
      prev.map((her) => {
        const desp = safeItems.find((it) => it.codigo === her.codigo || it.itemId === her.id);
        if (desp) {
          const currentCant = typeof her.cantidad === 'number' ? her.cantidad : 1;
          return {
            ...her,
            cantidad: Math.max(0, currentCant - desp.cantidad),
            servicioDestino: servicio || her.servicioDestino,
            personaRecibe: responsable || her.personaRecibe || usuario || '',
          };
        }
        return her;
      })
    );

    // Update Equipos Menores (TRZ-EQM) if included in dispatch
    setEquiposMenores((prev) =>
      prev.map((eqm) => {
        const desp = safeItems.find((it) => it.codigo === eqm.codigo || it.itemId === eqm.id);
        if (desp) {
          const currentCant = typeof eqm.cantidad === 'number' ? eqm.cantidad : 1;
          return {
            ...eqm,
            cantidad: Math.max(0, currentCant - desp.cantidad),
            servicioDestino: servicio || eqm.servicioDestino,
            quienRecibe: responsable || eqm.quienRecibe || usuario || '',
          };
        }
        return eqm;
      })
    );

    // Add Kardex entries SOLO para Insumos de Catálogo (Trazabilidad no ingresa a Kardex)
    const insumosDespacho = safeItems.filter((it) => !it.origenModulo || it.origenModulo === 'producto');
    if (insumosDespacho.length > 0) {
      const newKardexEntries: KardexMovimiento[] = insumosDespacho.map((it) => ({
        id: genId('k'),
        fecha: new Date().toLocaleString('es-CL'),
        tipo: 'SALIDA',
        codigo: it.codigo,
        producto: it.desc,
        guia: '—',
        factura: '—',
        oc: solicitud || id,
        unidad: servicio,
        persona: responsable || usuario || '—',
        cantidad: it.cantidad,
      }));
      setKardex((prev) => [...newKardexEntries, ...prev]);
    }

    // Save Acta
    const nuevaActa: ActaSalida = {
      id,
      fecha: today(),
      servicio,
      nroSolicitud: solicitud || id,
      responsable,
      nota: finalNota,
      items: safeItems,
    };
    setActas((prev) => [nuevaActa, ...prev]);
    setActaCorrelativo(curNum + 1);
    safeLocalStorageSetItem('hah_actaCorrelativo', String(curNum + 1));

    const htmlActa = buildActaDespachoTemplate(nuevaActa);
    setActaContent(htmlActa);
    setModalOpen('modalActa');
    showToast(`✅ Acta ${id} generada y stock descontado`);
  };

  // Open Terminal Pistola in specified mode
  const handleOpenTerminalPistola = (modo: TerminalMode = 'despacho') => {
    setTerminalPistolaMode(modo);
    setTerminalInitialCode(null);
    setTerminalPistolaOpen(true);
  };

  // Open Terminal Pistola with scanned code from physical gun scanner - UN SOLO SISTEMA
  const handleOpenTerminalWithCode = (code: string, modo?: TerminalMode) => {
    if (modo) setTerminalPistolaMode(modo);
    setTerminalInitialCode(code);
    setTerminalPistolaOpen(true);
    setScanResultModalData(null);
  };

  // Process Continuous Gun Reception (Ingreso con Pistola)
  const handleFinalizarIngresoPistola = (
    docData: {
      guia: string;
      factura: string;
      oc: string;
      proveedor: string;
      fechaIngreso: string;
      observacion?: string;
    },
    items: ItemIngresoPistola[]
  ) => {
    if (!items || items.length === 0) {
      showToast('No hay ítems para registrar en el ingreso', true);
      return;
    }

    const nowStr = new Date().toLocaleString('es-CL');
    const fechaIng = docData.fechaIngreso || today();
    const guiaFinal = docData.guia?.trim() || '—';
    const facturaFinal = docData.factura?.trim() || '—';
    const ocFinal = docData.oc?.trim() || '—';
    const provFinal = docData.proveedor?.trim() || 'Bodega Central';
    const obsFinal = docData.observacion?.trim() || '';

    // 1. Insumos (Catálogo Maestro)
    const insumos = items.filter((i) => !i.origenModulo || i.origenModulo === 'producto');
    if (insumos.length > 0) {
      setProductos((prev) =>
        prev.map((prod) => {
          const match = insumos.find((it) => it.codigo.toLowerCase() === prod.codigo.toLowerCase());
          if (match) {
            return {
              ...prod,
              stock: prod.stock + match.cantidad,
              fechaIngreso: todayIso(),
            };
          }
          return prod;
        })
      );

      const nuevosKardex: KardexMovimiento[] = insumos.map((it) => ({
        id: genId('k'),
        fecha: nowStr,
        fechaIngreso: todayIso(),
        tipo: 'ENTRADA',
        codigo: it.codigo,
        producto: it.desc,
        guia: guiaFinal,
        factura: facturaFinal,
        oc: ocFinal,
        unidad: `Bodega de Tránsito (${provFinal})`,
        persona: usuario || 'Arturo Gómez E.',
        cantidad: it.cantidad,
      }));
      setKardex((prev) => [...nuevosKardex, ...prev]);
    }

    // 2. Trazabilidad Equipos Médicos (Retorno o Ingreso) - Actualiza stock y disponibilidad (SIN Kardex)
    const equiposItems = items.filter((i) => i.origenModulo === 'equipos');
    if (equiposItems.length > 0) {
      setTrazabilidad((prev) =>
        prev.map((eq) => {
          const match = equiposItems.find(
            (it) =>
              (it.itemId && it.itemId === eq.id) ||
              (it.codigo && eq.codigo && it.codigo.toLowerCase() === eq.codigo.toLowerCase())
          );
          if (match) {
            const currentCant = typeof eq.cantidad === 'number' ? eq.cantidad : 1;
            return {
              ...eq,
              cantidad: currentCant + (match.cantidad || 1),
              ingresoRetiro: 'Ingreso / Disponible en Bodega',
              servClinico: 'Bodega de Tránsito',
              quienRecibe: usuario || 'Arturo Gómez E.',
              guia: guiaFinal !== '—' ? guiaFinal : eq.guia,
              factura: facturaFinal !== '—' ? facturaFinal : eq.factura,
              oc: ocFinal !== '—' ? ocFinal : eq.oc,
              fecha: fechaIng,
              observaciones: obsFinal ? `${eq.observaciones || ''} | Ingreso Pistola: ${obsFinal}` : eq.observaciones,
            };
          }
          return eq;
        })
      );
    }

    // 3. Herramientas (Retorno o Ingreso) - Actualiza stock y disponibilidad (SIN Kardex)
    const herItems = items.filter((i) => i.origenModulo === 'herramientas');
    if (herItems.length > 0) {
      setHerramientas((prev) =>
        prev.map((her) => {
          const match = herItems.find(
            (it) =>
              (it.itemId && it.itemId === her.id) ||
              (it.codigo && her.codigo && it.codigo.toLowerCase() === her.codigo.toLowerCase())
          );
          if (match) {
            const currentCant = typeof her.cantidad === 'number' ? her.cantidad : 1;
            return {
              ...her,
              cantidad: currentCant + (match.cantidad || 1),
              servicioDestino: 'Bodega de Tránsito (Disponible)',
              personaRecibe: usuario || 'Arturo Gómez E.',
              guia: guiaFinal !== '—' ? guiaFinal : her.guia,
              factura: facturaFinal !== '—' ? facturaFinal : her.factura,
              oc: ocFinal !== '—' ? ocFinal : her.oc,
            };
          }
          return her;
        })
      );
    }

    // 4. Equipos Menores - Actualiza stock y disponibilidad (SIN Kardex)
    const eqmItems = items.filter((i) => i.origenModulo === 'equiposmenores');
    if (eqmItems.length > 0) {
      setEquiposMenores((prev) =>
        prev.map((eqm) => {
          const match = eqmItems.find(
            (it) =>
              (it.itemId && it.itemId === eqm.id) ||
              (it.codigo && eqm.codigo && it.codigo.toLowerCase() === eqm.codigo.toLowerCase())
          );
          if (match) {
            const currentCant = typeof eqm.cantidad === 'number' ? eqm.cantidad : 1;
            return {
              ...eqm,
              cantidad: currentCant + (match.cantidad || 1),
              servicioDestino: 'Bodega de Tránsito (Disponible)',
              quienRecibe: usuario || 'Arturo Gómez E.',
              guia: guiaFinal !== '—' ? guiaFinal : eqm.guia,
              factura: facturaFinal !== '—' ? facturaFinal : eqm.factura,
              oc: ocFinal !== '—' ? ocFinal : eqm.oc,
            };
          }
          return eqm;
        })
      );
    }

    // 5. Cargas Sin Costo - Actualiza stock (SIN Kardex)
    const scItems = items.filter((i) => i.origenModulo === 'sincosto');
    if (scItems.length > 0) {
      setSinCostoList((prev) =>
        prev.map((sc) => {
          const match = scItems.find(
            (it) =>
              (it.itemId && it.itemId === sc.id) ||
              (it.codigo && sc.codigo && it.codigo.toLowerCase() === sc.codigo.toLowerCase())
          );
          if (match) {
            const currentCant = typeof sc.cantidad === 'number' ? sc.cantidad : 1;
            return {
              ...sc,
              cantidad: currentCant + (match.cantidad || 1),
            };
          }
          return sc;
        })
      );
    }

    playScannerBeep(true);
    const totalUds = items.reduce((sum, it) => sum + it.cantidad, 0);
    showToast(`✅ Recepción completada: ${totalUds} uds. ingresadas con éxito a Bodega (Guía: ${guiaFinal})`);
  };

  const handleUpdateNotaActa = (actaId: string, nuevaNota: string) => {
    setActas((prev) =>
      prev.map((a) => (a.id === actaId ? { ...a, nota: nuevaNota } : a))
    );
    if (detalleActa && detalleActa.id === actaId) {
      setDetalleActa((prev) => (prev ? { ...prev, nota: nuevaNota } : null));
    }
    showToast('Nota de entrega actualizada con éxito');
  };

  // Export Excel CSV
  const handleExportCSV = () => {
    if (typeof XLSX === 'undefined') {
      showToast('Descargando archivo CSV...', false);
    }
    const wb = XLSX.utils.book_new();
    const rows = [
      ['INVENTARIO BODEGA TRÁNSITO HAH — ' + today()],
      [],
      ['Código', 'Descripción', 'Familia', 'Tipo', 'Stock Actual', 'Stock Mínimo', 'Valor Unit.', 'Total Neto'],
    ];
    productos.forEach((p) => {
      rows.push([p.codigo, p.desc, p.familia, p.tipo, String(p.stock), String(p.stockMin), String(p.valor), String(p.stock * p.valor)]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `Inventario_HAH_${today().replace(/\//g, '-')}.xlsx`);
    showToast('✅ Archivo Excel descargado correctamente');
  };

  // Export CSV Trazabilidad de Equipos
  const handleExportTrazabilidadCSV = () => {
    const headers = [
      'Fecha',
      'N° Guía',
      'N° Factura',
      'N° OC',
      'Nombre Equipo',
      'Marca',
      'Modelo',
      'N° Serie',
      'Lote',
      'Cantidad',
      'Institución Externa / Proveedor',
      'Servicio Clínico',
      'Quién Recibe',
      'Finalidad / Motivo',
      'Mantención Preventiva',
      'Accesorios',
      'Estado / Movimiento',
      'Valor Unitario ($)',
      'Costo Total ($)',
      'Observaciones',
    ];
    const rows = trazabilidad.map((t) => [
      t.fecha || '',
      t.guia || '',
      t.factura || '',
      t.oc || '',
      t.nombreEquipo || '',
      t.marca || '',
      t.modelo || '',
      t.nSerie || '',
      t.lote || '',
      t.cantidad || 1,
      t.institucionExterna || '',
      t.servClinico || '',
      t.quienRecibe || '',
      t.finalidad || '',
      t.mantPreventivo || '',
      t.accesorios || '',
      t.ingresoRetiro || 'Ingreso',
      t.valorUnitario || 0,
      t.costoTotal || (t.cantidad || 1) * (t.valorUnitario || 0),
      t.observaciones || '',
    ]);
    downloadExcelOrCSV(
      'Trazabilidad_Equipos_HAH',
      'Equipos',
      'TRAZABILIDAD DE EQUIPOS — HOSPITAL ALTO HOSPICIO',
      headers,
      rows
    );
    showToast(`✅ Respaldo descargado (${trazabilidad.length} equipos registrados)`);
  };

  // Export CSV Trazabilidad de Herramientas
  const handleExportHerramientasCSV = () => {
    const headers = [
      'Fecha',
      'Descripción',
      'N° Guía',
      'N° Factura',
      'N° OC',
      'Cantidad',
      'Servicio Destino',
      'Persona que Recibe',
      'Valor Unitario ($)',
      'Costo Total ($)',
    ];
    const rows = herramientas.map((h) => [
      h.fecha || '',
      h.descripcion || '',
      h.guia || '',
      h.factura || '',
      h.oc || '',
      h.cantidad || 1,
      h.servicioDestino || '',
      h.personaRecibe || '',
      h.valorUnitario || 0,
      h.costoTotal || (h.cantidad || 1) * (h.valorUnitario || 0),
    ]);
    downloadExcelOrCSV(
      'Trazabilidad_Herramientas_HAH',
      'Herramientas',
      'TRAZABILIDAD DE HERRAMIENTAS — HOSPITAL ALTO HOSPICIO',
      headers,
      rows
    );
    showToast(`✅ Respaldo descargado (${herramientas.length} herramientas registradas)`);
  };

  // Export CSV Trazabilidad de Equipos Menores
  const handleExportEquiposMenoresCSV = () => {
    const headers = [
      'Fecha',
      'Nombre Equipo / Descripción',
      'Marca',
      'Modelo',
      'N° Serie',
      'Lote',
      'N° Guía',
      'N° Factura',
      'N° OC',
      'Cantidad',
      'Servicio Destino',
      'Quién Recibe',
      'Valor Unitario ($)',
      'Costo Total ($)',
    ];
    const rows = equiposMenores.map((eq) => [
      eq.fecha || '',
      eq.nombreEquipo || '',
      eq.marca || '',
      eq.modelo || '',
      eq.serie || '',
      eq.lote || '',
      eq.guia || '',
      eq.factura || '',
      eq.oc || '',
      eq.cantidad || 1,
      eq.servicioDestino || '',
      eq.quienRecibe || '',
      eq.valorUnitario || 0,
      eq.costoTotal || (eq.cantidad || 1) * (eq.valorUnitario || 0),
    ]);
    downloadExcelOrCSV(
      'Trazabilidad_Equipos_Menores_HAH',
      'Equipos Menores',
      'TRAZABILIDAD DE EQUIPOS MENORES — HOSPITAL ALTO HOSPICIO',
      headers,
      rows
    );
    showToast(`✅ Respaldo descargado (${equiposMenores.length} equipos menores registrados)`);
  };

  // Reporte Oficial Trazabilidad de Equipos
  const handleGenerarReporteTrazabilidad = () => {
    setReporteFam('TRAZ-EQUIPOS');
    const html = buildReporteTrazabilidadEquiposTemplate(trazabilidad, usuario || 'Arturo Gómez Echegoyen', today());
    setReporteContent(html);
    setModalOpen('modalReporte');
  };

  // Reporte Oficial Trazabilidad de Herramientas
  const handleGenerarReporteHerramientas = () => {
    setReporteFam('TRAZ-HERRAMIENTAS');
    const html = buildReporteTrazabilidadHerramientasTemplate(herramientas, usuario || 'Arturo Gómez Echegoyen', today());
    setReporteContent(html);
    setModalOpen('modalReporte');
  };

  // Reporte Oficial Trazabilidad de Equipos Menores
  const handleGenerarReporteEquiposMenores = () => {
    setReporteFam('TRAZ-EQUIPOS-MENORES');
    const html = buildReporteTrazabilidadEquiposMenoresTemplate(equiposMenores, usuario || 'Arturo Gómez Echegoyen', today());
    setReporteContent(html);
    setModalOpen('modalReporte');
  };

  // ── DESKTOP FILE ATTACHMENT HANDLER (FOR ALL 3 TRAZABILIDADES) ──
  const handleAdjuntarDesktop = async (
    item: any,
    modulo: 'equipos' | 'herramientas' | 'equiposmenores'
  ) => {
    try {
      const file = await pickDesktopFile('.pdf,image/*');
      if (!file) return;

      const adjuntoObj = {
        nombre: file.nombre,
        tipo: file.tipo,
        data: file.data,
      };

      if (modulo === 'equipos') {
        setTrazabilidad((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, adjunto: adjuntoObj } : x))
        );
      } else if (modulo === 'herramientas') {
        setHerramientas((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, adjunto: adjuntoObj } : x))
        );
      } else if (modulo === 'equiposmenores') {
        setEquiposMenores((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, adjunto: adjuntoObj } : x))
        );
      }

      showToast(`📎 Archivo "${file.nombre}" adjuntado con éxito desde el escritorio`);
    } catch (err) {
      showToast('Error al seleccionar el archivo del escritorio', true);
    }
  };

  // ── IMPRESIÓN DIRECTA DE DOCUMENTOS ADJUNTOS (SIN MODAL) ──
  const handleImprimirAdjunto = async (
    adjunto?: { id?: string; fileId?: string; nombre: string; tipo: string; data?: string } | null
  ) => {
    if (!adjunto) {
      showToast('No hay documento seleccionado para imprimir', true);
      return;
    }
    let data = adjunto.data;
    const key = adjunto.id || adjunto.fileId;
    if (!data && key) {
      const fromMem = getMemoryAttachment(key);
      if (fromMem?.data) {
        data = fromMem.data;
      } else {
        const fromDB = await getAttachmentFromDB(key);
        if (fromDB?.data) {
          data = fromDB.data;
        }
      }
    }
    if (!data) {
      showToast('No hay datos en el documento vinculado para imprimir', true);
      return;
    }
    showToast(`🖨️ Mandando a imprimir: ${adjunto.nombre}...`);
    try {
      await printAttachedDocument({ ...adjunto, data });
    } catch (e) {
      console.error('Error al imprimir documento vinculado:', e);
      showToast('Error al imprimir el documento adjunto', true);
    }
  };

  const handleDesvincularAdjuntoModulo = (
    item: any,
    modulo: 'equipos' | 'herramientas' | 'equiposmenores'
  ) => {
    if (modulo === 'equipos') {
      setTrazabilidad((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, adjunto: null } : x))
      );
    } else if (modulo === 'herramientas') {
      setHerramientas((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, adjunto: null } : x))
      );
    } else if (modulo === 'equiposmenores') {
      setEquiposMenores((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, adjunto: null } : x))
      );
    }
    showToast('🗑️ Documento desvinculado con éxito');
  };

  const handleVerAdjunto = (
    item: any,
    modulo: 'equipos' | 'herramientas' | 'equiposmenores'
  ) => {
    if (item.adjunto) {
      handleImprimirAdjunto(item.adjunto);
    } else {
      handleAdjuntarDesktop(item, modulo);
    }
  };

  // ── DESKTOP FILE ATTACHMENT FOR KARDEX MOVEMENTS ──
  const handleAdjuntarKardex = async (mov: KardexMovimiento, idx?: number) => {
    try {
      const file = await pickDesktopFile('.pdf,image/*');
      if (!file) return;

      const adjuntoObj = {
        nombre: file.nombre,
        tipo: file.tipo,
        data: file.data,
      };

      setKardex((prev) =>
        prev.map((m, i) => {
          if (m.id === mov?.id || (mov?.id ? m.id === mov.id : i === idx)) {
            return {
              ...m,
              adjunto: adjuntoObj,
              adjuntos: [adjuntoObj],
            };
          }
          return m;
        })
      );
      showToast(`📎 Documento "${file.nombre}" vinculado con éxito al movimiento ${mov?.codigo || ''}`);
    } catch (err) {
      showToast('Error al vincular el archivo al movimiento', true);
    }
  };

  const handleDesvincularAdjuntoKardex = (mov: KardexMovimiento, idx?: number) => {
    setKardex((prev) =>
      prev.map((m, i) => {
        if (m.id === mov?.id || (mov?.id ? m.id === mov.id : i === idx)) {
          return {
            ...m,
            adjunto: undefined,
            adjuntos: [],
          };
        }
        return m;
      })
    );
    showToast(`🗑️ Documento desvinculado del movimiento ${mov?.codigo || ''}`);
  };

  const handleVerAdjuntoKardex = (mov: KardexMovimiento, idx?: number) => {
    const currentAdj = mov?.adjunto || (mov?.adjuntos && mov.adjuntos[0]) || null;
    if (currentAdj) {
      handleImprimirAdjunto(currentAdj);
    } else {
      handleAdjuntarKardex(mov, idx);
    }
  };

  // ── DESKTOP FILE ATTACHMENT FOR CONTROL DESPACHO (REFLEJA DOCUMENTO Y DATOS) ──
  const handleAdjuntarArchivoSinCosto = (
    targetItem: SinCostoMovimiento,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      showToast('❌ Error al leer el archivo seleccionado');
    };
    reader.onload = async (ev) => {
      try {
        const base64Data = ev.target?.result as string;
        const fileId = `att_sc_${targetItem.id || targetItem.codigo}_${Date.now()}`;
        const fileData = {
          id: fileId,
          fileId,
          nombre: file.name,
          tipo: file.type || 'application/pdf',
          data: base64Data,
        };

        // Guardar en memoria e IndexedDB de forma persistente y segura sin límite de 5MB
        setMemoryAttachment(fileId, fileData);
        saveAttachmentToDB(fileData).catch(console.warn);

        // Detectar automáticamente tipo de documento y número desde el nombre del archivo
        const cleanName = file.name.replace(/\.[^/.]+$/, '').trim();
        let detectedGuia = '';
        let detectedFactura = '';
        let detectedOC = '';

        // 1. Detección de Guía de Despacho (ej. GUIA-1404 GONZALO PAR, GD-1234, Guia_45678)
        const guiaMatch = cleanName.match(/\b(?:GUIA|GUÍA|GD|G|DESPACHO)[-_ #N°.]*([0-9A-Za-z-]{2,12})\b/i);
        if (guiaMatch && guiaMatch[1]) {
          detectedGuia = guiaMatch[1].toUpperCase();
        }

        // 2. Detección de Factura (ej. FACTURA-10582, FAC_456, F-883)
        const facMatch = cleanName.match(/\b(?:FACTURA|FAC|F|FE|FEL)[-_ #N°.]*([0-9]{2,12})\b/i);
        if (facMatch && facMatch[1]) {
          detectedFactura = facMatch[1];
        }

        // 3. Detección de Orden de Compra (ej. OC-2026-0001, 1057482-12-CM24)
        const ocMatch = cleanName.match(/\b(?:OC|ORDEN|ORDEN[-_ ]DE[-_ ]COMPRA)[-_ #N°.]*([A-Za-z0-9-]+)\b/i);
        if (ocMatch && ocMatch[1]) {
          detectedOC = ocMatch[1].toUpperCase();
        }

        // 4. Si no tiene palabra clave pero tiene número (ej: 1404 o 84920), vincular a Guía si está vacía
        if (!detectedGuia && !detectedFactura && !detectedOC) {
          const anyNum = cleanName.match(/\b\d{3,10}\b/);
          if (anyNum) {
            detectedGuia = anyNum[0];
          }
        }

        setSinCostoList((prev) =>
          prev.map((item) => {
            const isMatch = item.id === targetItem.id || (item.codigo === targetItem.codigo && item.fecha === targetItem.fecha);
            if (isMatch) {
              const newAdjuntos = [fileData, ...(item.adjuntos || []).filter((a) => a.nombre !== file.name)];
              return {
                ...item,
                adjunto: fileData,
                adjuntos: newAdjuntos,
                guia: detectedGuia ? (item.guia && item.guia !== '—' ? item.guia : detectedGuia) : item.guia,
                factura: detectedFactura ? (item.factura && item.factura !== '—' ? item.factura : detectedFactura) : item.factura,
                oc: detectedOC ? (item.oc && item.oc !== '—' ? item.oc : detectedOC) : item.oc,
              };
            }
            return item;
          })
        );

        const infoArr = [];
        if (detectedGuia) infoArr.push(`Guía: ${detectedGuia}`);
        if (detectedFactura) infoArr.push(`Factura: ${detectedFactura}`);
        if (detectedOC) infoArr.push(`OC: ${detectedOC}`);
        const infoReflejo = infoArr.length > 0 ? ` ➔ Reflejado en ${infoArr.join(', ')}` : '';

        showToast(`📎 Documento "${file.name}" vinculado${infoReflejo}`);

        // Reflejar inmediatamente el documento en el visor para visualización directa
        setPreviewDoc({
          nombre: file.name,
          tipo: file.type || 'application/pdf',
          data: base64Data,
          codigoItem: targetItem.codigo,
          descItem: targetItem.desc,
          guia: detectedGuia || targetItem.guia,
          factura: detectedFactura || targetItem.factura,
          oc: detectedOC || targetItem.oc,
        });
        setIsPreviewDocOpen(true);
      } catch (err: any) {
        console.error('Error procesando adjunto:', err);
        showToast('❌ Ocurrió un error al procesar el archivo');
      }
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDesvincularAdjuntoSinCosto = (targetItem: SinCostoMovimiento) => {
    setSinCostoList((prev) =>
      prev.map((item) => {
        const isMatch = item.id === targetItem.id || (item.codigo === targetItem.codigo && item.fecha === targetItem.fecha);
        if (isMatch) {
          return {
            ...item,
            adjunto: undefined,
            adjuntos: [],
          };
        }
        return item;
      })
    );
    showToast(`🗑️ Documento desvinculado de ${targetItem.codigo}`);
  };

  const handleVerPreviewDocumentoSinCosto = async (
    item: SinCostoMovimiento,
    adj: { id?: string; fileId?: string; nombre: string; tipo: string; data?: string }
  ) => {
    let data = adj.data;
    const key = adj.id || adj.fileId;
    if (!data && key) {
      const fromMem = getMemoryAttachment(key);
      if (fromMem?.data) {
        data = fromMem.data;
      } else {
        const fromDB = await getAttachmentFromDB(key);
        if (fromDB?.data) {
          data = fromDB.data;
        }
      }
    }
    setPreviewDoc({
      nombre: adj.nombre,
      tipo: adj.tipo,
      data: data,
      codigoItem: item.codigo,
      descItem: item.desc,
      guia: item.guia,
      factura: item.factura,
      oc: item.oc,
    });
    setIsPreviewDocOpen(true);
  };

  // ── PRINT SINGLE LABEL (QR & CODE 128 - 50x25 MM O CAJA) ──
  const handleImprimirEtiqueta = (
    item: any,
    modulo: 'equipos' | 'herramientas' | 'equiposmenores' | 'producto',
    mode: 'barra' | 'qr' | 'combinada' | 'caja' = 'barra'
  ) => {
    if (modulo === 'producto') {
      setEtiquetaModalData({
        item: {
          tipo: 'producto',
          codigo: item.codigo || 'INS-01',
          nombre: item.desc || item.nombre || 'Insumo de Bodega',
          familia: item.familia || 'ALI',
          stock: item.stock,
          valor: item.valor,
          fecha: new Date().toLocaleDateString('es-CL'),
        },
        defaultMode: mode,
      });
      return;
    }
    const cod = item.codigo || (modulo === 'equipos' ? 'TRZ-EQ-001' : modulo === 'herramientas' ? 'TRZ-HER-001' : 'TRZ-EQM-001');
    setEtiquetaModalData({
      item: {
        tipo: modulo,
        codigo: cod,
        nombre: item.nombreEquipo || item.descripcion || 'Ítem de Trazabilidad',
        marca: item.marca,
        modelo: item.modelo,
        serie: item.nSerie || item.serie,
        guia: item.guia,
        servicioDestino: item.servicioDestino || item.servClinico,
        personaRecibe: item.personaRecibe || item.quienRecibe,
        fecha: item.fecha,
      },
      defaultMode: mode,
    });
  };

  // ── PRINT BATCH OF LABELS ──
  const handleImprimirLote = (
    items: any[],
    modulo: 'equipos' | 'herramientas' | 'equiposmenores'
  ) => {
    if (!items || items.length === 0) {
      showToast('No hay ítems para imprimir etiquetas', true);
      return;
    }
    const mapped: EtiquetaItemData[] = items.map((item, idx) => ({
      tipo: modulo,
      codigo: item.codigo || (modulo === 'equipos' ? `TRZ-EQ-${String(idx + 1).padStart(3, '0')}` : modulo === 'herramientas' ? `TRZ-HER-${String(idx + 1).padStart(3, '0')}` : `TRZ-EQM-${String(idx + 1).padStart(3, '0')}`),
      nombre: item.nombreEquipo || item.descripcion || 'Ítem de Trazabilidad',
      marca: item.marca,
      modelo: item.modelo,
      serie: item.nSerie || item.serie,
      guia: item.guia,
      servicioDestino: item.servicioDestino || item.servClinico,
      personaRecibe: item.personaRecibe || item.quienRecibe,
      fecha: item.fecha,
    }));
    setEtiquetaModalData({ items: mapped });
  };

  // ── UNIFIED PRINT HANDLERS (ACTAS, REPORTES, ETIQUETAS) ──
  const handlePrintActa = () => {
    printActaSalidaDocument(actaContent, 'Acta de Salida y Despacho - Hospital Alto Hospicio');
  };

  const handlePrintReporte = () => {
    const isKdx = reporteFam.startsWith('KARDEX_FAMILIAS');
    const title =
      isKdx
        ? 'INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH — Resumen de Kardex por Familias'
        : reporteFam === 'TRAZ-EQUIPOS'
        ? 'INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH — Reporte de Trazabilidad de Equipos'
        : reporteFam === 'TRAZ-HERRAMIENTAS'
        ? 'INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH — Reporte de Trazabilidad de Herramientas'
        : reporteFam === 'TRAZ-EQUIPOS-MENORES'
        ? 'INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH — Reporte de Trazabilidad de Equipos Menores'
        : `INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH — Reporte Inventario Valorizado (${reporteFam})`;
    if (reporteContent.includes('<')) {
      printDocument({
        title,
        htmlContent: reporteContent,
        pageOrientation: 'portrait',
      });
    } else {
      printReporteTexto(reporteContent, title);
    }
  };

  const handlePrintQREtiqueta = () => {
    if (qrProducto) {
      handleImprimirEtiqueta(qrProducto, 'producto', 'barra');
    } else {
      window.print();
    }
  };

  const handlePrintDetalleActa = () => {
    if (detalleActa) {
      printActaSalidaDocument(detalleActa, `INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH — Acta ${detalleActa.id}`);
    } else {
      window.print();
    }
  };

  // ── BARCODE / QR SCANNER DISPATCHER (PISTOLA LECTORA Y CÁMARA) ──
  // Enrutamiento directo al Terminal Pistola Unificado (Ingreso / Despacho) - UN SOLO SISTEMA
  const handleScanPistola = (rawInput: string, forcedType?: 'BARRA' | 'QR' | 'AUTO') => {
    if (!rawInput) return;
    let code = rawInput.trim();

    // Check if scan is JSON format from 2D QR Code
    if (code.startsWith('{') && code.endsWith('}')) {
      try {
        const parsed = JSON.parse(code);
        if (parsed.cod) code = parsed.cod.trim();
        else if (parsed.codigo) code = parsed.codigo.trim();
        else if (parsed.sku) code = parsed.sku.trim();
        else if (parsed.sn) code = parsed.sn.trim();
      } catch (e) {}
    }

    // Abre directamente el Terminal de Pistola y procesa el código en lote de ingreso/despacho
    handleOpenTerminalWithCode(code);
  };

  // ── GLOBAL KEYBOARD WEDGE LISTENER FOR PHYSICAL GUN SCANNERS ──
  useEffect(() => {
    let scanBuffer = '';
    let lastKeyTime = Date.now();

    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (!e || typeof e.key !== 'string') return;

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.getAttribute('contenteditable') === 'true';

      if (e.key === 'Enter') {
        if (scanBuffer && scanBuffer.length >= 3 && (!isInput || diff < 65)) {
          e.preventDefault();
          handleScanPistola(scanBuffer, 'AUTO');
          scanBuffer = '';
        } else {
          scanBuffer = '';
        }
        return;
      }

      if (e.key.length === 1) {
        if (diff > 140 && !isInput) {
          scanBuffer = e.key;
        } else {
          scanBuffer = (scanBuffer || '') + e.key;
        }
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [productos, trazabilidad, herramientas, equiposMenores, actas]);

  // Generate Report View
  const handleGenerarReporte = (fam = 'TOTAL') => {
    setReporteFam(fam);
    if (fam.startsWith('KARDEX_FAMILIAS')) {
      const famFiltro = fam.includes(':') ? fam.split(':')[1] : undefined;
      const html = buildKardexResumenTemplate(kardex, productos, today(), familias, famFiltro);
      setReporteContent(html);
      setModalOpen('modalReporte');
      return;
    }
    const html = buildReporteInventarioValorizadoTemplate(productos, fam, usuario || 'Arturo Gómez Echegoyen', today());
    setReporteContent(html);
    setModalOpen('modalReporte');
  };

  const handleEnviarReporteCorreo = async (
    email: string,
    mode: 'gmail' | 'outlook' | 'mailto' | 'copy' | 'appsscript' = 'gmail'
  ) => {
    const destino = (email || '').trim() || 'arturo.gomez@hah.gob.cl';
    const asunto = buildReportEmailSubject(reporteFam, today());
    const cuerpoTexto = buildReportEmailBody({
      destino,
      reporteFam,
      reporteHtmlOrText: reporteContent,
      usuario: usuario || 'Arturo Gómez Echegoyen',
      fecha: today(),
    });
    const cuerpoUrl = buildReportEmailBodyForUrl({
      destino,
      reporteFam,
      reporteHtmlOrText: reporteContent,
      usuario: usuario || 'Arturo Gómez Echegoyen',
      fecha: today(),
    });

    if (mode === 'copy') {
      const ok = await copyReportToClipboard(cuerpoTexto, reporteContent);
      if (ok) {
        showToast('📋 Reporte oficial con tablas y diseño visual copiado al portapapeles');
      } else {
        showToast('No se pudo copiar automáticamente', true);
      }
      return;
    }

    if (mode === 'gmail') {
      await copyReportToClipboard(cuerpoTexto, reporteContent);
      openGmailWebComposer(destino, asunto, cuerpoUrl);
      showToast(`✉️ Gmail Web abierto para ${destino}. ¡Presiona Ctrl+V para pegar el diseño oficial!`);
      return;
    }

    if (mode === 'outlook') {
      await copyReportToClipboard(cuerpoTexto, reporteContent);
      openOutlookWebComposer(destino, asunto, cuerpoUrl);
      showToast(`🏢 Outlook Web abierto para ${destino}`);
      return;
    }

    if (mode === 'mailto') {
      await copyReportToClipboard(cuerpoTexto, reporteContent);
      openDefaultMailClient(destino, asunto, cuerpoUrl);
      showToast(`💻 Abriendo cliente de correo para ${destino}`);
      return;
    }

    if (mode === 'appsscript') {
      const scriptUrl = getStoredAppsScriptUrl();
      if (!scriptUrl) {
        showToast('⚠️ Configura el URL de Google Apps Script en la barra superior para enviar vía Cloud', true);
        return;
      }
      try {
        showToast('🚀 Enviando correo oficial vía Google Apps Script...');
        const res = await sendEmailViaAppsScript(scriptUrl, {
          to: destino,
          subject: asunto,
          body: cuerpoTexto,
          htmlBody: reporteContent.includes('<') ? reporteContent : undefined,
        });
        showToast(res.message || `Correo oficial despachado a ${destino}`);
      } catch (err: any) {
        showToast(`Error al enviar por Apps Script: ${err.message}`, true);
      }
      return;
    }
  };

  // Render main screen
  if (!usuario) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (isMobile) {
    return (
      <>
        <MobileView
          productos={productos}
          kardex={kardex}
          actas={actas}
          usuario={usuario}
          onOpenQRScanner={() => handleOpenTerminalPistola('consulta')}
          onOpenDespachoContinuo={() => handleOpenTerminalPistola('despacho')}
          onOpenEntrada={() => {
            setModalProductoTitulo('▼ Entrada Rápida');
            setModalProdData({
              id: 0,
              familia: 'ALI',
              codigo: 'ALI-01',
              desc: 'Bowl Kraft 500 cc con tapa',
              stock: 1,
              stockMin: 50,
              valor: 145,
              venc: '',
              fechaIngreso: todayIso(),
              isEdit: false,
            });
            setModalOpen('modalProducto');
          }}
          onOpenSalida={() => {
            handleOpenTerminalPistola('despacho');
          }}
          onOpenProductQR={(p) => {
            handleOpenTerminalWithCode(p.codigo, 'consulta');
          }}
          onSwitchToPC={() => setIsMobile(false)}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        <Modals
          modalOpen={modalOpen}
          onClose={() => setModalOpen(null)}
          familias={familias}
          productos={productos}
          onPrintEtiquetaSeparada={(p, mode) => handleImprimirEtiqueta(p, 'producto', mode)}
          modalProductoTitulo={modalProductoTitulo}
          modalProdData={modalProdData}
          setModalProdData={setModalProdData}
          onSaveProducto={handleSaveProducto}
          inOC={inOC}
          inFactura={inFactura}
          inGuia={inGuia}
          actaContent={actaContent}
          onPrintActa={handlePrintActa}
          reporteContent={reporteContent}
          reporteFam={reporteFam}
          setReporteFam={handleGenerarReporte}
          onPrintReporte={handlePrintReporte}
          onEnviarReporteCorreo={handleEnviarReporteCorreo}
          corrProd={corrProd}
          onConfirmarCorreccion={(nuevo, motivo, obs) => {
            if (corrProd) {
              setProductos((prev) =>
                prev.map((p) => (p.id === corrProd.id ? { ...p, stock: nuevo } : p))
              );
              showToast(`Stock de ${corrProd.codigo} corregido a ${nuevo}`);
              setModalOpen(null);
            }
          }}
          qrProducto={qrProducto}
          onQREntrada={(cant) => {
            if (qrProducto) {
              setProductos((prev) =>
                prev.map((p) => (p.id === qrProducto.id ? { ...p, stock: p.stock + cant } : p))
              );
              showToast(`+${cant} uds. ingresadas a ${qrProducto.codigo}`);
              setModalOpen(null);
            }
          }}
          onQRSalida={(cant, svc) => {
            if (qrProducto) {
              setProductos((prev) =>
                prev.map((p) => (p.id === qrProducto.id ? { ...p, stock: Math.max(0, p.stock - cant) } : p))
              );
              showToast(`-${cant} uds. despachadas a ${svc || 'Urgencia'}`);
              setModalOpen(null);
            }
          }}
          onQRUpdateValor={(val) => {
            if (qrProducto) {
              setProductos((prev) =>
                prev.map((p) => (p.id === qrProducto.id ? { ...p, valor: val } : p))
              );
              showToast(`Valor de ${qrProducto.codigo} actualizado`);
            }
          }}
          onPrintQREtiqueta={handlePrintQREtiqueta}
          onOpenCorreccionFromQR={() => {
            setCorrProd(qrProducto);
            setModalOpen('modalCorreccion');
          }}
          kardex={kardex}
          onCodigoDetectado={(code) => {
            const f = productos.find((p) => p.codigo.toLowerCase() === code.toLowerCase());
            if (f) {
              setQrProducto(f);
              setModalOpen('modalQR');
            } else {
              showToast(`Código ${code} no encontrado`, true);
            }
          }}
          confirmData={confirmData}
          editKardexData={editKardexData}
          setEditKardexData={setEditKardexData}
          onGuardarEditKardex={() => setModalOpen(null)}
          despachoSCItem={despachoSCItem}
          onConfirmarDespachoSC={() => setModalOpen(null)}
          detalleActa={detalleActa}
          onImprimirDetalleActa={handlePrintDetalleActa}
          onUpdateNotaActa={handleUpdateNotaActa}
          trazData={trazData}
          setTrazData={setTrazData}
          onGuardarTrazabilidad={() => setModalOpen(null)}
          herData={herData}
          setHerData={setHerData}
          onGuardarHerramienta={() => setModalOpen(null)}
          eqmData={eqmData}
          setEqmData={setEqmData}
          onGuardarEquipoMenor={() => setModalOpen(null)}
        />
      </>
    );
  }

  return (
    <div className="app">
      {toastMsg && (
        <div className={`toast show ${toastMsg.isError ? 'error' : ''}`}>
          {toastMsg.text}
        </div>
      )}

      <Topbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        usuario={usuario}
        sheetsStatus={sheetsStatus}
        onOpenSheetsModal={() => setSheetsModalOpen(true)}
        onOpenTerminalPistola={handleOpenTerminalPistola}
        onScanQR={() => handleOpenTerminalPistola('consulta')}
        onOpenDespachoContinuo={() => handleOpenTerminalPistola('despacho')}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {currentTab === 'dashboard' && (
          <DashboardView
            productos={productos}
            kardex={kardex}
            familias={familias}
            onOpenFamilias={() => setFamiliasModalOpen(true)}
            onImprimirEtiquetaProducto={(p, mode) => handleImprimirEtiqueta(p, 'producto', mode)}
            onOpenNuevoRegistro={() => {
              setModalProductoTitulo('➕ Nuevo Registro de Entrada (Camión)');
              setModalProdData({
                id: 0,
                familia: 'ALI',
                codigo: 'ALI-01',
                desc: 'Bowl Kraft 500 cc con tapa',
                stock: 0,
                stockMin: 50,
                valor: 145,
                venc: '',
                fechaIngreso: todayIso(),
                isEdit: false,
              });
              setModalOpen('modalProducto');
            }}
            onOpenMaestroNuevo={() => {
              setModalProductoTitulo('📦 Crear Insumo Base (Maestro)');
              setModalProdData({
                id: 0,
                familia: 'ALI',
                codigo: `ALI-${productos.length + 1}`,
                desc: '',
                stock: 0,
                stockMin: 0,
                valor: 0,
                venc: '',
                fechaIngreso: todayIso(),
                isEdit: false,
              });
              setModalOpen('modalProducto');
            }}
            onEditarProducto={(p) => {
              setModalProductoTitulo('✏️ Editar Datos de Insumo');
              setModalProdData({
                id: p.id,
                familia: p.familia,
                codigo: p.codigo,
                desc: p.desc,
                stock: p.stock,
                stockMin: p.stockMin,
                valor: p.valor,
                venc: p.venc || '',
                fechaIngreso: p.fechaIngreso || todayIso(),
                isEdit: true,
              });
              setModalOpen('modalProducto');
            }}
            onAbrirQR={(p) => {
              setQrProducto(p);
              setModalOpen('modalQR');
            }}
            onCorregirStock={(p) => {
              setCorrProd(p);
              setModalOpen('modalCorreccion');
            }}
            onEliminarProducto={(p) => {
              setConfirmData({
                icono: '🗑️',
                titulo: 'Eliminar Producto',
                mensaje: `¿Deseas eliminar el producto <b>${p.codigo}</b> - ${p.desc}?`,
                textoOk: 'Eliminar',
                colorOk: 'btn-red',
                onOk: () => {
                  setProductos((prev) => prev.filter((x) => x.id !== p.id));
                  showToast(`${p.codigo} eliminado`);
                },
              });
              setModalOpen('modalConfirm');
            }}
            onExportCSV={handleExportCSV}
            onImportCSV={() => showToast('Importando archivo CSV...')}
            onGenerarReporte={handleGenerarReporte}
            onImprimirResumenKardex={() => {
              printKardexResumenDocument(kardex, productos, undefined, familias);
            }}
            onGenerarActa={handleGenerarActa}
            actas={actas}
            inOC={inOC}
            setInOC={setInOC}
            inFactura={inFactura}
            setInFactura={setInFactura}
            inGuia={inGuia}
            setInGuia={setInGuia}
            archivos={archivos}
            onHandleClip={handleClip}
            onVerAdjuntoDoc={handleImprimirAdjuntoEntrada}
            onImprimirAdjuntoDoc={handleImprimirAdjuntoEntrada}
            onRemoverAdjuntoDoc={handleRemoverAdjuntoEntrada}
            onOpenDespachoContinuo={() => setDespachoContinuoOpen(true)}
            itemsDespacho={itemsDespacho}
            setItemsDespacho={setItemsDespacho}
            svcDestino={svcDestino}
            setSvcDestino={setSvcDestino}
            nroSolicitud={nroSolicitud}
            setNroSolicitud={setNroSolicitud}
            responsableRecep={responsableRecep}
            setResponsableRecep={setResponsableRecep}
            notaEntrega={notaEntrega}
            setNotaEntrega={setNotaEntrega}
          />
        )}

        {currentTab === 'kardex' && (
          <KardexView
            kardex={kardex}
            productos={productos}
            familias={familias}
            onImprimirResumen={(famFiltro) =>
              printKardexResumenDocument(kardex, productos, undefined, familias, famFiltro)
            }
            onDownloadPDF={(famFiltro) =>
              downloadKardexResumenPDF(kardex, productos, undefined, familias, famFiltro)
            }
            onBorrarKardex={() => {
              setConfirmData({
                icono: '🗑️',
                titulo: 'Limpiar Historial Kardex',
                mensaje: '¿Eliminar todos los movimientos del Kardex?',
                textoOk: 'Limpiar',
                colorOk: 'btn-red',
                onOk: () => {
                  setKardex([]);
                  showToast('Historial Kardex limpiado');
                },
              });
              setModalOpen('modalConfirm');
            }}
            onBackToDashboard={() => setCurrentTab('dashboard')}
            onEditarKardex={(mov, idx) => {
              setEditKardexData({ idx, ...mov });
              setModalOpen('modalEditKardex');
            }}
            onEliminarKardex={(idx) => {
              setKardex((prev) => prev.filter((_, i) => i !== idx));
              showToast('Movimiento eliminado');
            }}
            onAdjuntarPdf={(idx) => handleAdjuntarKardex(kardex[idx], idx)}
            onAdjuntarDocumento={(mov, idx) => handleAdjuntarKardex(mov, idx)}
            onVerAdjuntoDocumento={(mov) => mov.adjunto && handleImprimirAdjunto(mov.adjunto)}
            onImprimirAdjunto={handleImprimirAdjunto}
            onDesvincularAdjunto={(mov, idx) => handleDesvincularAdjuntoKardex(mov, idx)}
          />
        )}

        {currentTab === 'actas' && (
          <ActasView
            actas={actas}
            onVerDetalle={(a) => {
              setDetalleActa(a);
              setModalOpen('modalDetalleActa');
            }}
            onImprimirActa={(a) => {
              printActaSalidaDocument(a, `Acta ${a.id} - Hospital Alto Hospicio`);
            }}
            onDownloadPDF={(a) => {
              downloadActaSalidaPDF(a, `Acta_${a.id}`);
            }}
            onEliminarActa={(idx) => {
              setActas((prev) => prev.filter((_, i) => i !== idx));
              showToast('Acta eliminada');
            }}
            onExportCSV={handleExportCSV}
            onBorrarActas={() => {
              setActas([]);
              showToast('Historial de actas limpiado');
            }}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'sincosto' && (
          <SinCostoView
            sinCostoList={sinCostoList}
            onDespacharSC={(item) => {
              setDespachoSCItem(item);
              setModalOpen('modalDespachoSC');
            }}
            onAdjuntarArchivo={handleAdjuntarArchivoSinCosto}
            onDesvincularAdjunto={handleDesvincularAdjuntoSinCosto}
            onVerPreviewDocumento={handleVerPreviewDocumentoSinCosto}
            onVerAdjuntos={(item) => {
              const adj = item.adjunto || (item.adjuntos && item.adjuntos[0]);
              if (adj) handleVerPreviewDocumentoSinCosto(item, adj);
            }}
            onImprimirAdjunto={handleImprimirAdjunto}
            onVerDespachos={() => showToast('Visualizando historial de despachos')}
            onExportCSV={handleExportCSV}
            onImprimirReporte={() => printSinCostoReporte(sinCostoList)}
            onDownloadPDF={() => downloadSinCostoPDF(sinCostoList)}
            onBorrarSinCosto={() => {
              setSinCostoList([]);
              showToast('Registros de Tránsito Despacho eliminados');
            }}
            onBackToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'trazabilidad' && (
          <TrazabilidadView
            trazabilidad={trazabilidad}
            onNuevo={() => {
              setTrazData({ fecha: today(), cantidad: 1, ingresoRetiro: 'Ingreso' });
              setModalOpen('modalTrazabilidad');
            }}
            onEditar={(item) => {
              setTrazData(item);
              setModalOpen('modalTrazabilidad');
            }}
            onEliminar={(idx) => {
              setTrazabilidad((prev) => prev.filter((_, i) => i !== idx));
              showToast('Equipo eliminado');
            }}
            onExportCSV={handleExportTrazabilidadCSV}
            onReporte={handleGenerarReporteTrazabilidad}
            onLimpiar={() => {
              setConfirmData({
                icono: '🗑️',
                titulo: 'Vaciar Trazabilidad Equipos',
                mensaje: '¿Estás seguro de vaciar todos los registros de <b>Trazabilidad Equipos Médicos</b>? La tabla quedará limpia para registrar tus documentos oficiales.',
                textoOk: 'Vaciar Todo',
                colorOk: 'btn-red',
                onOk: () => {
                  setTrazabilidad([]);
                  safeLocalStorageSetItem('hah_trazabilidad', JSON.stringify([]));
                  showToast('🗑️ Registros de Trazabilidad Equipos vaciados');
                },
              });
              setModalOpen('modalConfirm');
            }}
            onBackToDashboard={() => setCurrentTab('dashboard')}
            onVerAdjunto={(item) => item.adjunto ? handleImprimirAdjunto(item.adjunto) : handleAdjuntarDesktop(item, 'equipos')}
            onAdjuntarDesktop={(item) => handleAdjuntarDesktop(item, 'equipos')}
            onImprimirAdjunto={handleImprimirAdjunto}
            onDesvincularAdjunto={(item) => handleDesvincularAdjuntoModulo(item, 'equipos')}
            onImprimirEtiqueta={(item) => handleImprimirEtiqueta(item, 'equipos')}
            onImprimirLote={(items) => handleImprimirLote(items, 'equipos')}
            onScanPistola={handleScanPistola}
            onSaveEquipoDirect={(item) => {
              const cod = item.codigo || getNextTrazCode('TRZ-EQ', trazabilidad);
              const nuevo: TrazabilidadEquipo = {
                id: item.id || genId('trz'),
                codigo: cod,
                fecha: item.fecha || today(),
                guia: item.guia || '',
                factura: item.factura || '',
                oc: item.oc || '',
                nombreEquipo: item.nombreEquipo || 'Equipo Médico',
                marca: item.marca || '—',
                modelo: item.modelo || '—',
                nSerie: item.nSerie || '—',
                cantidad: item.cantidad || 1,
                institucionExterna: item.institucionExterna || 'GHC Global Health Care SpA',
                servClinico: (item as any).servicioDestino || item.servClinico || 'UPC Adulto / Pabellón Central',
                servicioDestino: (item as any).servicioDestino || item.servClinico || 'UPC Adulto / Pabellón Central',
                quienRecibe: (item as any).personaRecibe || item.quienRecibe || usuario || '',
                personaRecibe: (item as any).personaRecibe || item.quienRecibe || usuario || '',
                finalidad: item.finalidad || 'Comodato Clínico / Demostración',
                mantPreventivo: item.mantPreventivo || 'Vigente',
                accesorios: item.accesorios || '',
                ingresoRetiro: item.ingresoRetiro || 'Ingreso',
                valorUnitario: item.valorUnitario || 0,
                costoTotal: item.costoTotal || 0,
                observaciones: item.observaciones || '',
                adjunto: item.adjunto || null,
              };
              setTrazabilidad((prev) => [nuevo, ...prev]);
              showToast(`✅ Equipo "${nuevo.nombreEquipo}" [${nuevo.codigo}] guardado en Trazabilidad`);
            }}
            onSaveMultipleEquiposDirect={(items) => {
              const currentList = [...trazabilidad];
              const nuevos: TrazabilidadEquipo[] = items.map((item) => {
                const cod = item.codigo || getNextTrazCode('TRZ-EQ', currentList);
                const svc = (item as any).servicioDestino || item.servClinico || 'UPC Adulto / Pabellón Central';
                const rec = (item as any).personaRecibe || item.quienRecibe || usuario || '';
                const nuevoItem: TrazabilidadEquipo = {
                  id: item.id || genId('trz'),
                  codigo: cod,
                  fecha: item.fecha || today(),
                  guia: item.guia || '',
                  factura: item.factura || '',
                  oc: item.oc || '',
                  nombreEquipo: item.nombreEquipo || 'Equipo Médico',
                  marca: item.marca || '—',
                  modelo: item.modelo || '—',
                  nSerie: item.nSerie || (item as any).serie || '—',
                  lote: item.lote || '',
                  cantidad: item.cantidad || 1,
                  institucionExterna: item.institucionExterna || 'GHC Global Health Care SpA',
                  servClinico: svc,
                  servicioDestino: svc,
                  quienRecibe: rec,
                  personaRecibe: rec,
                  finalidad: item.finalidad || 'Comodato Clínico / Demostración',
                  mantPreventivo: item.mantPreventivo || 'Vigente',
                  accesorios: item.accesorios || '',
                  ingresoRetiro: item.ingresoRetiro || 'Ingreso',
                  valorUnitario: item.valorUnitario || 0,
                  costoTotal: (item.cantidad || 1) * (item.valorUnitario || 0),
                  observaciones: item.observaciones || '',
                  adjunto: item.adjunto || null,
                };
                currentList.unshift(nuevoItem);
                return nuevoItem;
              });
              setTrazabilidad((prev) => [...nuevos, ...prev]);
              showToast(`✅ Se guardaron ${nuevos.length} equipos con sus códigos locales QR/Barras`);
            }}
          />
        )}

        {currentTab === 'herramientas' && (
          <HerramientasView
            herramientas={herramientas}
            onNuevo={() => {
              setHerData({ fecha: today(), cantidad: 1, valorUnitario: 0 });
              setModalOpen('modalHerramienta');
            }}
            onEditar={(item) => {
              setHerData(item);
              setModalOpen('modalHerramienta');
            }}
            onEliminar={(idx) => {
              setHerramientas((prev) => prev.filter((_, i) => i !== idx));
              showToast('Herramienta eliminada');
            }}
            onExportCSV={handleExportHerramientasCSV}
            onReporte={handleGenerarReporteHerramientas}
            onLimpiar={() => {
              setConfirmData({
                icono: '🗑️',
                titulo: 'Vaciar Trazabilidad Herramientas',
                mensaje: '¿Estás seguro de vaciar todos los registros de <b>Trazabilidad Herramientas</b>? La tabla quedará limpia para registrar tus documentos oficiales.',
                textoOk: 'Vaciar Todo',
                colorOk: 'btn-red',
                onOk: () => {
                  setHerramientas([]);
                  safeLocalStorageSetItem('hah_herramientas', JSON.stringify([]));
                  showToast('🗑️ Registros de Trazabilidad Herramientas vaciados');
                },
              });
              setModalOpen('modalConfirm');
            }}
            onBackToDashboard={() => setCurrentTab('dashboard')}
            onVerAdjunto={(item) => item.adjunto ? handleImprimirAdjunto(item.adjunto) : handleAdjuntarDesktop(item, 'herramientas')}
            onAdjuntarDesktop={(item) => handleAdjuntarDesktop(item, 'herramientas')}
            onImprimirAdjunto={handleImprimirAdjunto}
            onDesvincularAdjunto={(item) => handleDesvincularAdjuntoModulo(item, 'herramientas')}
            onImprimirEtiqueta={(item) => handleImprimirEtiqueta(item, 'herramientas')}
            onImprimirLote={(items) => handleImprimirLote(items, 'herramientas')}
            onScanPistola={handleScanPistola}
            onSaveHerramientaDirect={(item) => {
              const cant = item.cantidad || 1;
              const val = item.valorUnitario || 0;
              const cod = item.codigo || getNextTrazCode('TRZ-HER', herramientas);
              const nuevo: Herramienta = {
                id: item.id || genId('her'),
                codigo: cod,
                fecha: item.fecha || today(),
                descripcion: item.descripcion || 'Herramienta',
                guia: item.guia || '—',
                factura: item.factura || '—',
                oc: item.oc || '—',
                cantidad: cant,
                servicioDestino: item.servicioDestino || (item as any).servClinico || 'Mantención',
                servClinico: item.servicioDestino || (item as any).servClinico || 'Mantención',
                personaRecibe: item.personaRecibe || (item as any).quienRecibe || usuario || '',
                quienRecibe: item.personaRecibe || (item as any).quienRecibe || usuario || '',
                valorUnitario: val,
                costoTotal: cant * val,
                adjunto: item.adjunto || null,
              };
              setHerramientas((prev) => [nuevo, ...prev]);
              showToast(`✅ Herramienta "${nuevo.descripcion}" [${nuevo.codigo}] guardada`);
            }}
            onSaveMultipleHerramientasDirect={(items) => {
              const currentList = [...herramientas];
              const nuevos: Herramienta[] = items.map((item) => {
                const cant = item.cantidad || 1;
                const val = item.valorUnitario || 0;
                const cod = item.codigo || getNextTrazCode('TRZ-HER', currentList);
                const svc = item.servicioDestino || (item as any).servClinico || 'Mantención';
                const rec = item.personaRecibe || (item as any).quienRecibe || usuario || '';
                const nuevoItem: Herramienta = {
                  id: item.id || genId('her'),
                  codigo: cod,
                  fecha: item.fecha || today(),
                  descripcion: item.descripcion || (item as any).nombreEquipo || 'Herramienta',
                  guia: item.guia || '—',
                  factura: item.factura || '—',
                  oc: item.oc || '—',
                  cantidad: cant,
                  servicioDestino: svc,
                  servClinico: svc,
                  personaRecibe: rec,
                  quienRecibe: rec,
                  valorUnitario: val,
                  costoTotal: cant * val,
                  adjunto: item.adjunto || null,
                };
                currentList.unshift(nuevoItem);
                return nuevoItem;
              });
              setHerramientas((prev) => [...nuevos, ...prev]);
              showToast(`✅ Se guardaron ${nuevos.length} herramientas con sus códigos locales QR/Barras`);
            }}
          />
        )}

        {currentTab === 'equiposmenores' && (
          <EquiposMenoresView
            equiposMenores={equiposMenores}
            onNuevo={() => {
              setEqmData({ fecha: today(), cantidad: 1, valorUnitario: 0 });
              setModalOpen('modalEquipoMenor');
            }}
            onEditar={(item) => {
              setEqmData(item);
              setModalOpen('modalEquipoMenor');
            }}
            onEliminar={(idx) => {
              setEquiposMenores((prev) => prev.filter((_, i) => i !== idx));
              showToast('Equipo menor eliminado');
            }}
            onExportCSV={handleExportEquiposMenoresCSV}
            onReporte={handleGenerarReporteEquiposMenores}
            onLimpiar={() => {
              setConfirmData({
                icono: '🗑️',
                titulo: 'Vaciar Trazabilidad Equipos Menores',
                mensaje: '¿Estás seguro de vaciar todos los registros de <b>Trazabilidad Equipos Menores</b>? La tabla quedará limpia para registrar tus documentos oficiales.',
                textoOk: 'Vaciar Todo',
                colorOk: 'btn-red',
                onOk: () => {
                  setEquiposMenores([]);
                  safeLocalStorageSetItem('hah_equiposmenores', JSON.stringify([]));
                  showToast('🗑️ Registros de Trazabilidad Equipos Menores vaciados');
                },
              });
              setModalOpen('modalConfirm');
            }}
            onBackToDashboard={() => setCurrentTab('dashboard')}
            onVerAdjunto={(item) => item.adjunto ? handleImprimirAdjunto(item.adjunto) : handleAdjuntarDesktop(item, 'equiposmenores')}
            onAdjuntarDesktop={(item) => handleAdjuntarDesktop(item, 'equiposmenores')}
            onImprimirAdjunto={handleImprimirAdjunto}
            onDesvincularAdjunto={(item) => handleDesvincularAdjuntoModulo(item, 'equiposmenores')}
            onImprimirEtiqueta={(item) => handleImprimirEtiqueta(item, 'equiposmenores')}
            onImprimirLote={(items) => handleImprimirLote(items, 'equiposmenores')}
            onScanPistola={handleScanPistola}
            onSaveEquipoMenorDirect={(item) => {
              const cant = item.cantidad || 1;
              const val = item.valorUnitario || 0;
              const cod = item.codigo || getNextTrazCode('TRZ-EQM', equiposMenores);
              const nuevo: EquipoMenor = {
                id: item.id || genId('eqm'),
                codigo: cod,
                fecha: item.fecha || today(),
                nombreEquipo: item.nombreEquipo || 'Equipo Menor',
                marca: item.marca || '—',
                modelo: item.modelo || '—',
                serie: item.serie || '—',
                lote: item.lote || '—',
                guia: item.guia || '—',
                factura: item.factura || '—',
                oc: item.oc || '—',
                cantidad: cant,
                servicioDestino: item.servicioDestino || (item as any).servClinico || 'UCI',
                servClinico: item.servicioDestino || (item as any).servClinico || 'UCI',
                quienRecibe: item.quienRecibe || (item as any).personaRecibe || usuario || '',
                personaRecibe: item.quienRecibe || (item as any).personaRecibe || usuario || '',
                valorUnitario: val,
                costoTotal: cant * val,
                adjunto: item.adjunto || null,
              };
              setEquiposMenores((prev) => [nuevo, ...prev]);
              showToast(`✅ Equipo menor "${nuevo.nombreEquipo}" [${nuevo.codigo}] guardado`);
            }}
            onSaveMultipleEquiposMenoresDirect={(items) => {
              const currentList = [...equiposMenores];
              const nuevos: EquipoMenor[] = items.map((item) => {
                const cant = item.cantidad || 1;
                const val = item.valorUnitario || 0;
                const cod = item.codigo || getNextTrazCode('TRZ-EQM', currentList);
                const svc = item.servicioDestino || (item as any).servClinico || 'HOSPITAL DE ALTO HOSPICIO';
                const rec = item.quienRecibe || (item as any).personaRecibe || usuario || '';
                const nuevoItem: EquipoMenor = {
                  id: item.id || genId('eqm'),
                  codigo: cod,
                  fecha: item.fecha || today(),
                  nombreEquipo: item.nombreEquipo || 'Equipo Menor',
                  marca: item.marca || '—',
                  modelo: item.modelo || '—',
                  serie: item.serie || '—',
                  lote: item.lote || '—',
                  guia: item.guia || '—',
                  factura: item.factura || '—',
                  oc: item.oc || '—',
                  cantidad: cant,
                  servicioDestino: svc,
                  servClinico: svc,
                  quienRecibe: rec,
                  personaRecibe: rec,
                  valorUnitario: val,
                  costoTotal: cant * val,
                  adjunto: item.adjunto || null,
                };
                currentList.unshift(nuevoItem);
                return nuevoItem;
              });
              setEquiposMenores((prev) => [...nuevos, ...prev]);
              showToast(`✅ Se guardaron ${nuevos.length} equipos menores con sus códigos locales QR/Barras`);
            }}
          />
        )}
      </div>

      <Modals
        modalOpen={modalOpen}
        onClose={() => setModalOpen(null)}
        familias={familias}
        productos={productos}
        onPrintEtiquetaSeparada={(p, mode) => handleImprimirEtiqueta(p, 'producto', mode)}
        modalProductoTitulo={modalProductoTitulo}
        modalProdData={modalProdData}
        setModalProdData={setModalProdData}
        onSaveProducto={handleSaveProducto}
        inOC={inOC}
        inFactura={inFactura}
        inGuia={inGuia}
        actaContent={actaContent}
        onPrintActa={handlePrintActa}
        reporteContent={reporteContent}
        reporteFam={reporteFam}
        setReporteFam={handleGenerarReporte}
        onPrintReporte={handlePrintReporte}
        onEnviarReporteCorreo={handleEnviarReporteCorreo}
        corrProd={corrProd}
        onConfirmarCorreccion={(nuevo, motivo, obs) => {
          if (corrProd) {
            setProductos((prev) =>
              prev.map((p) => (p.id === corrProd.id ? { ...p, stock: nuevo } : p))
            );
            // Register movement in Kardex
            const mov: KardexMovimiento = {
              id: genId('k'),
              fecha: new Date().toLocaleString('es-CL'),
              tipo: nuevo >= corrProd.stock ? 'ENTRADA' : 'SALIDA',
              codigo: corrProd.codigo,
              producto: corrProd.desc,
              guia: 'AJUSTE',
              factura: '—',
              oc: motivo || 'Ajuste',
              unidad: `AJUSTE · ${motivo}${obs ? ' · ' + obs : ''}`,
              persona: usuario || 'Arturo Gómez E.',
              cantidad: Math.abs(nuevo - corrProd.stock),
            };
            setKardex((prev) => [mov, ...prev]);
            showToast(`✅ Stock de ${corrProd.codigo} corregido a ${nuevo} uds.`);
            setModalOpen(null);
          }
        }}
        qrProducto={qrProducto}
        onQREntrada={(cant) => {
          if (qrProducto) {
            setProductos((prev) =>
              prev.map((p) => (p.id === qrProducto.id ? { ...p, stock: p.stock + cant } : p))
            );
            const mov: KardexMovimiento = {
              id: genId('k'),
              fecha: new Date().toLocaleString('es-CL'),
              tipo: 'ENTRADA',
              codigo: qrProducto.codigo,
              producto: qrProducto.desc,
              guia: '—',
              factura: '—',
              oc: '—',
              unidad: 'Bodega de Tránsito HAH',
              persona: usuario || 'Arturo Gómez E.',
              cantidad: cant,
            };
            setKardex((prev) => [mov, ...prev]);
            showToast(`✅ +${cant} uds. ingresadas a ${qrProducto.codigo}`);
            setModalOpen(null);
          }
        }}
        onQRSalida={(cant, svc) => {
          if (qrProducto) {
            setProductos((prev) =>
              prev.map((p) => (p.id === qrProducto.id ? { ...p, stock: Math.max(0, p.stock - cant) } : p))
            );
            const mov: KardexMovimiento = {
              id: genId('k'),
              fecha: new Date().toLocaleString('es-CL'),
              tipo: 'SALIDA',
              codigo: qrProducto.codigo,
              producto: qrProducto.desc,
              guia: '—',
              factura: '—',
              oc: '—',
              unidad: svc || 'Urgencia',
              persona: usuario || 'Arturo Gómez E.',
              cantidad: cant,
            };
            setKardex((prev) => [mov, ...prev]);
            showToast(`📤 ${cant} uds. despachadas a ${svc || 'Urgencia'}`);
            setModalOpen(null);
          }
        }}
        onQRUpdateValor={(val) => {
          if (qrProducto) {
            setProductos((prev) =>
              prev.map((p) => (p.id === qrProducto.id ? { ...p, valor: val } : p))
            );
            showToast(`Valor de ${qrProducto.codigo} actualizado`);
          }
        }}
        onPrintQREtiqueta={handlePrintQREtiqueta}
        onOpenCorreccionFromQR={() => {
          setCorrProd(qrProducto);
          setModalOpen('modalCorreccion');
        }}
        kardex={kardex}
        onCodigoDetectado={(code) => {
          handleOpenTerminalWithCode(code, 'consulta');
        }}
        confirmData={confirmData}
        editKardexData={editKardexData}
        setEditKardexData={setEditKardexData}
        onGuardarEditKardex={() => {
          if (editKardexData) {
            setKardex((prev) =>
              prev.map((m, i) => (i === editKardexData.idx ? editKardexData : m))
            );
            showToast('Kardex actualizado');
            setModalOpen(null);
          }
        }}
        despachoSCItem={despachoSCItem}
        onConfirmarDespachoSC={(cant, svc, resp, obs) => {
          if (despachoSCItem) {
            setSinCostoList((prev) =>
              prev.map((sc) => {
                if (sc.id === despachoSCItem.id) {
                  const nuevos = sc.despachos || [];
                  return {
                    ...sc,
                    despachos: [
                      ...nuevos,
                      {
                        id: genId('dsc'),
                        fecha: today(),
                        cantidad: cant,
                        servicio: svc,
                        responsable: resp,
                        observacion: obs,
                      },
                    ],
                  };
                }
                return sc;
              })
            );
            showToast(`Despacho de ${cant} uds. de ${despachoSCItem.codigo} registrado`);
            setModalOpen(null);
          }
        }}
        detalleActa={detalleActa}
        onImprimirDetalleActa={handlePrintDetalleActa}
        trazData={trazData}
        setTrazData={setTrazData}
        onGuardarTrazabilidad={() => {
          if (!trazData.nombreEquipo) {
            showToast('Ingresa el nombre del equipo', true);
            return;
          }
          const cod = trazData.codigo || getNextTrazCode('TRZ-EQ', trazabilidad);
          const item: TrazabilidadEquipo = {
            id: trazData.id || genId('trz'),
            codigo: cod,
            fecha: trazData.fecha || today(),
            guia: trazData.guia || '',
            factura: trazData.factura || '',
            oc: trazData.oc || '',
            nombreEquipo: trazData.nombreEquipo || '',
            marca: trazData.marca || '',
            modelo: trazData.modelo || '',
            nSerie: trazData.nSerie || '',
            cantidad: trazData.cantidad || 1,
            finalidad: trazData.finalidad || '',
            institucionExterna: trazData.institucionExterna || '',
            servClinico: (trazData as any).servicioDestino || trazData.servClinico || 'UPC Adulto / Pabellón Central',
            servicioDestino: (trazData as any).servicioDestino || trazData.servClinico || 'UPC Adulto / Pabellón Central',
            quienRecibe: (trazData as any).personaRecibe || trazData.quienRecibe || usuario || '',
            personaRecibe: (trazData as any).personaRecibe || trazData.quienRecibe || usuario || '',
            mantPreventivo: trazData.mantPreventivo || '',
            accesorios: trazData.accesorios || '',
            ingresoRetiro: trazData.ingresoRetiro || 'Ingreso',
            valorUnitario: trazData.valorUnitario || 0,
            costoTotal: trazData.costoTotal || 0,
            observaciones: trazData.observaciones || '',
            adjunto: trazData.adjunto || null,
          };
          setTrazabilidad((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
          setModalOpen(null);
          showToast(`✅ Equipo "${item.nombreEquipo}" [${item.codigo}] guardado en Trazabilidad`);
        }}
        herData={herData}
        setHerData={setHerData}
        onGuardarHerramienta={() => {
          if (!herData.descripcion) {
            showToast('Ingresa la descripción de la herramienta', true);
            return;
          }
          const cant = herData.cantidad !== undefined ? herData.cantidad : 1;
          const val = herData.valorUnitario !== undefined ? herData.valorUnitario : 0;
          const cod = herData.codigo || getNextTrazCode('TRZ-HER', herramientas);
          const svc = herData.servicioDestino || (herData as any).servClinico || 'Mantención';
          const rec = herData.personaRecibe || (herData as any).quienRecibe || usuario || '';
          const item: Herramienta = {
            id: herData.id || genId('her'),
            codigo: cod,
            fecha: herData.fecha || today(),
            descripcion: herData.descripcion,
            guia: herData.guia || '—',
            factura: herData.factura || '—',
            oc: herData.oc || '—',
            cantidad: cant,
            servicioDestino: svc,
            servClinico: svc,
            personaRecibe: rec,
            quienRecibe: rec,
            valorUnitario: val,
            costoTotal: cant * val,
            adjunto: herData.adjunto || null,
          };
          setHerramientas((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
          setModalOpen(null);
          showToast(`✅ Herramienta "${item.descripcion}" [${item.codigo}] guardada`);
        }}
        eqmData={eqmData}
        setEqmData={setEqmData}
        onGuardarEquipoMenor={() => {
          const nombre = eqmData.nombreEquipo || (eqmData as any).descripcion;
          if (!nombre) {
            showToast('Ingresa la descripción del equipo menor', true);
            return;
          }
          const cant = eqmData.cantidad !== undefined ? eqmData.cantidad : 1;
          const val = eqmData.valorUnitario !== undefined ? eqmData.valorUnitario : 0;
          const cod = eqmData.codigo || getNextTrazCode('TRZ-EQM', equiposMenores);
          const svc = eqmData.servicioDestino || (eqmData as any).servClinico || 'Mantención';
          const rec = eqmData.quienRecibe || (eqmData as any).personaRecibe || usuario || '';
          const item: EquipoMenor = {
            id: eqmData.id || genId('eqm'),
            codigo: cod,
            fecha: eqmData.fecha || today(),
            nombreEquipo: nombre,
            marca: eqmData.marca || '—',
            modelo: eqmData.modelo || '—',
            serie: eqmData.serie || '—',
            lote: eqmData.lote || '—',
            guia: eqmData.guia || '—',
            factura: eqmData.factura || '—',
            oc: eqmData.oc || '—',
            cantidad: cant,
            servicioDestino: svc,
            servClinico: svc,
            quienRecibe: rec,
            personaRecibe: rec,
            valorUnitario: val,
            costoTotal: cant * val,
            adjunto: eqmData.adjunto || null,
          };
          setEquiposMenores((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
          setModalOpen(null);
          showToast(`✅ Equipo menor "${item.nombreEquipo}" [${item.codigo}] guardado`);
        }}
      />

      {/* ── MODAL ETIQUETA QR Y CÓDIGO DE BARRAS (INDIVIDUAL Y LOTE) ── */}
      {etiquetaModalData && (
        <EtiquetaTrazabilidadModal
          item={etiquetaModalData.item}
          items={etiquetaModalData.items}
          defaultMode={etiquetaModalData.defaultMode || 'barra'}
          onClose={() => setEtiquetaModalData(null)}
        />
      )}

      {/* ── MODAL MAESTRO DE FAMILIAS DEL CATÁLOGO ── */}
      <FamiliasModal
        isOpen={familiasModalOpen}
        onClose={() => setFamiliasModalOpen(false)}
        familias={familias}
        productos={productos}
        onAddFamilia={(nueva) => {
          setFamilias((prev) => {
            if (prev.some((f) => f.id.toUpperCase() === nueva.id.toUpperCase())) return prev;
            return [...prev, nueva];
          });
          // Incorpora automáticamente el registro al final del Maestro de Inventario y Maestro de Productos
          setProductos((prev) => {
            const exists = prev.some((p) => p.familia.toUpperCase() === nueva.id.toUpperCase());
            if (!exists) {
              const nuevoProd: Producto = {
                id: Date.now(),
                codigo: `${nueva.id}-01`,
                desc: `${nueva.nombre} (Ítem Inicial)`,
                familia: nueva.id,
                tipo: 'Variable',
                stock: 0,
                stockMin: 10,
                valor: 15000,
                venc: '',
                estado: 'Activo',
              };
              return [...prev, nuevoProd];
            }
            return prev;
          });
          showToast(`✅ Familia "${nueva.id} - ${nueva.nombre}" creada e incorporada al final del inventario`);
        }}
        onDeleteFamilia={(id) => {
          const count = productos.filter((p) => p.familia === id && p.estado === 'Activo').length;
          if (count > 0) {
            showToast(`⚠️ No se puede eliminar: hay ${count} productos en la familia ${id}`, true);
            return;
          }
          setFamilias((prev) => prev.filter((f) => f.id !== id));
          showToast(`Familia "${id}" eliminada`);
        }}
      />

      {/* ── TERMINAL PISTOLA LECTORA UNIFICADA (INGRESO, DESPACHO Y CONSULTA RÁPIDA) ── */}
      <TerminalPistolaModal
        isOpen={terminalPistolaOpen || despachoContinuoOpen || scannerModalOpen}
        onClose={() => {
          setTerminalPistolaOpen(false);
          setDespachoContinuoOpen(false);
          setScannerModalOpen(false);
          setTerminalInitialCode(null);
        }}
        initialMode={terminalPistolaMode}
        initialCode={terminalInitialCode}
        productos={productos}
        trazabilidad={trazabilidad}
        herramientas={herramientas}
        equiposMenores={equiposMenores}
        sinCostoList={sinCostoList}
        initialItems={itemsDespacho}
        usuario={usuario}
        onFinalizarDespacho={(svc, nro, resp, items, nota) => {
          handleGenerarActa(svc, nro, resp, items, nota);
          setItemsDespacho([]);
        }}
        onFinalizarIngreso={handleFinalizarIngresoPistola}
        onTraspasarADashboard={(items, svc, nro, resp) => {
          setItemsDespacho(items);
          setSvcDestino(svc);
          setNroSolicitud(nro);
          setResponsableRecep(resp);
          showToast(`📋 Se traspasaron ${items.length} insumos al panel de despacho del dashboard`);
        }}
      />

      {/* ── MODAL RESULTADO DE LECTURA DE PISTOLA Y CÁMARA (QR Y BARRAS) ── */}
      {scanResultModalData && (
        <ScanResultModal
          scanResult={scanResultModalData}
          onClose={() => setScanResultModalData(null)}
          onPrintEtiqueta={(item, modulo, mode) => {
            handleImprimirEtiqueta(item, modulo as any, mode || 'barra');
          }}
          onVerAdjunto={(item) => {
            if (scanResultModalData.modulo === 'equipos' || scanResultModalData.modulo === 'herramientas' || scanResultModalData.modulo === 'equiposmenores') {
              handleVerAdjunto(item, scanResultModalData.modulo);
            }
          }}
          onAdjuntarItem={(item, modulo) => {
            if (modulo === 'equipos' || modulo === 'herramientas' || modulo === 'equiposmenores') {
              handleAdjuntarDesktop(item, modulo);
            }
          }}
          onEntradaRapida={(item) => {
            handleOpenTerminalWithCode(item.codigo || item.id, 'ingreso');
          }}
          onSalidaRapida={(item) => {
            handleOpenTerminalWithCode(item.codigo || item.id, 'despacho');
          }}
          onEditarItem={(item, modulo) => {
            if (modulo === 'producto') {
              setModalProductoTitulo('✏️ Editar Insumo');
              setModalProdData({
                id: item.id,
                familia: item.familia,
                codigo: item.codigo,
                desc: item.desc,
                stock: item.stock,
                stockMin: item.stockMin,
                valor: item.valor,
                venc: item.venc || '',
                fechaIngreso: item.fechaIngreso || todayIso(),
                isEdit: true,
              });
              setModalOpen('modalProducto');
            } else if (modulo === 'equipos') {
              setTrazData(item);
              setModalOpen('modalTrazabilidad');
            } else if (modulo === 'herramientas') {
              setHerData(item);
              setModalOpen('modalHerramienta');
            } else if (modulo === 'equiposmenores') {
              setEqmData(item);
              setModalOpen('modalEquipoMenor');
            }
          }}
        />
      )}

      {/* Visualizador de Documento Reflejado (PDF / Imagen) */}
      <DocumentPreviewModal
        isOpen={isPreviewDocOpen}
        documentData={previewDoc}
        onClose={() => setIsPreviewDocOpen(false)}
        onPrint={handleImprimirAdjunto}
      />

      <GoogleSheetsModal
        isOpen={sheetsModalOpen}
        onClose={() => setSheetsModalOpen(false)}
        status={sheetsStatus}
        user={googleUser}
        onSignIn={handleGoogleSignIn}
        onSignOut={handleGoogleSignOut}
        onCreateSpreadsheet={handleCreateOfficialSpreadsheet}
        onSyncAll={handleSyncAllSheets}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
        onPushAppsScript={handlePushAppsScript}
        onPullAppsScript={handlePullAppsScript}
        onSaveAppsScriptUrl={(url) => {
          setSheetsStatus((prev) => ({ ...prev, spreadsheetId: prev.spreadsheetId || url }));
          pushServerCloudState({ appsScriptUrl: url });
        }}
      />
    </div>
  );
}
