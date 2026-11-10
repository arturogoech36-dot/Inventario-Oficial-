import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Producto,
  KardexMovimiento,
  ActaSalida,
  SinCostoMovimiento,
  TrazabilidadEquipo,
  Herramienta,
  EquipoMenor,
} from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Provider with required Google Sheets & Drive scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token cache (never stored in localStorage for security compliance)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface GoogleSheetsSyncStatus {
  isConnected: boolean;
  user: User | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSyncTime: string | null;
  isSyncing: boolean;
  error: string | null;
}

export const SPREADSHEET_TITLE =
  'INVENTARIO OFICIAL BODEGA DE TRANSITO HAH - Registro Automático';

export const SHEET_NAMES = {
  INVENTARIO: 'Maestro de Inventario',
  KARDEX: 'Registro de Kardex',
  DESPACHO: 'Tránsito Despacho',
  EQUIPOS: 'Trazabilidad Equipos',
  HERRAMIENTAS: 'Trazabilidad Herramientas',
  EQUIPOS_MENORES: 'Trazabilidad Equipos Menores',
} as const;


export const SHEET_COLUMNS = {
  [SHEET_NAMES.INVENTARIO]: [
    'CÓDIGO',
    'DESCRIPCIÓN',
    'FAMILIA',
    'TIPO',
    'STOCK ACTUAL',
    'STOCK MÍNIMO',
    'VALOR UNITARIO ($)',
    'VALOR TOTAL ($)',
    'ESTADO',
  ],
  [SHEET_NAMES.KARDEX]: [
    'ID MOVIMIENTO',
    'FECHA',
    'CÓDIGO',
    'PRODUCTO',
    'ORDEN DE COMPRA (OC)',
    'FACTURA',
    'GUÍA DE DESPACHO',
    'ENTRADA',
    'SALIDA',
    'FUNCIONARIO QUE RECIBE',
    'UNIDAD',
  ],
  [SHEET_NAMES.DESPACHO]: [
    'FECHA',
    'CÓDIGO',
    'DESCRIPCIÓN',
    'FAMILIA',
    'CANTIDAD INGRESO',
    'CANTIDAD DESPACHADA',
    'SALDO DISPONIBLE',
    'GUÍA DE DESPACHO',
    'FACTURA',
    'ORDEN DE COMPRA (OC)',
    'SERVICIO / UNIDAD DESTINO',
    'FUNCIONARIO QUE RECIBE',
    'OBSERVACIONES',
  ],
  [SHEET_NAMES.EQUIPOS]: [
    'CÓDIGO LOCAL',
    'FECHA',
    'NOMBRE DE EQUIPO',
    'MARCA',
    'MODELO',
    'N° SERIE',
    'LOTE',
    'CANTIDAD',
    'SERVICIO DESTINO',
    'PERSONA QUE RECIBE',
    'MANT. PREVENTIVO',
    'ESTADO',
    'VALOR UNITARIO ($)',
    'COSTO TOTAL ($)',
    'OBSERVACIONES',
  ],
  [SHEET_NAMES.HERRAMIENTAS]: [
    'CÓDIGO LOCAL',
    'FECHA',
    'DESCRIPCIÓN HERRAMIENTA',
    'CANTIDAD',
    'SERVICIO DESTINO',
    'PERSONA QUE RECIBE',
    'ORDEN DE COMPRA (OC)',
    'FACTURA',
    'GUÍA DE DESPACHO',
    'VALOR UNITARIO ($)',
    'COSTO TOTAL ($)',
    'DOCUMENTO ADJUNTO',
  ],
  [SHEET_NAMES.EQUIPOS_MENORES]: [
    'CÓDIGO LOCAL',
    'FECHA',
    'NOMBRE EQUIPO MENOR',
    'MARCA',
    'MODELO',
    'N° SERIE',
    'LOTE',
    'CANTIDAD',
    'SERVICIO DESTINO',
    'PERSONA QUE RECIBE',
    'ORDEN DE COMPRA (OC)',
    'FACTURA',
    'GUÍA DE DESPACHO',
    'VALOR UNITARIO ($)',
    'COSTO TOTAL ($)',
    'DOCUMENTO ADJUNTO',
  ],
};

// Initialize Auth listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google (Firebase Auth + GoogleAuthProvider)
export const signInWithGoogle = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error al iniciar sesión con Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Helper: Extract date only without time
const extractDateOnly = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const firstPart = trimmed.split(/[\s,]+/)[0];
  return firstPart || trimmed;
};

// Formatters for row values
const formatRowForInventario = (p: Producto): any[] => [
  p.codigo,
  p.desc,
  p.familia,
  p.tipo,
  p.stock,
  p.stockMin,
  p.valor,
  p.stock * p.valor,
  p.estado,
];

const formatRowForKardex = (k: KardexMovimiento): any[] => {
  const fechaSolo = extractDateOnly(k.fechaIngreso || k.fecha);
  const entrada = k.tipo === 'ENTRADA' ? k.cantidad : '';
  const salida = k.tipo === 'SALIDA' ? k.cantidad : k.tipo === 'AJUSTE' ? k.cantidad : '';
  return [
    k.id,
    fechaSolo,
    k.codigo,
    k.producto,
    k.oc || '',
    k.factura || '',
    k.guia || '',
    entrada,
    salida,
    k.persona || '',
    k.unidad || '',
  ];
};

const formatRowsForTransitoDespacho = (
  sinCostoList: SinCostoMovimiento[] = []
): any[][] => {
  const rows: any[][] = [];
  (sinCostoList || []).forEach((sc) => {
    const despachos = sc.despachos || [];
    const totalDespachado = despachos.reduce((sum, d) => sum + (d.cantidad || 0), 0);
    const saldo = (sc.cantidad || 0) - totalDespachado;
    const fechaSolo = extractDateOnly(sc.fechaIngreso || sc.fecha);

    if (despachos.length === 0) {
      rows.push([
        fechaSolo,
        sc.codigo,
        sc.desc,
        sc.familia || '—',
        sc.cantidad || 0,
        0, // Cantidad Despachada
        saldo, // Saldo Disponible
        sc.guia && sc.guia !== '—' ? sc.guia : '—',
        sc.factura && sc.factura !== '—' ? sc.factura : '—',
        sc.oc && sc.oc !== '—' ? sc.oc : '—',
        sc.unidad || 'Bodega de Tránsito HAH',
        sc.persona || '—',
        sc.estado || 'En Tránsito (Sin Valor)',
      ]);
    } else {
      despachos.forEach((d) => {
        rows.push([
          extractDateOnly(d.fecha || sc.fecha),
          sc.codigo,
          sc.desc,
          sc.familia || '—',
          sc.cantidad || 0,
          d.cantidad || 0,
          saldo,
          sc.guia && sc.guia !== '—' ? sc.guia : '—',
          sc.factura && sc.factura !== '—' ? sc.factura : '—',
          sc.oc && sc.oc !== '—' ? sc.oc : '—',
          d.servicio || sc.unidad || '—',
          d.responsable || '—',
          d.observacion || 'Despachado a Servicio',
        ]);
      });
    }
  });
  return rows;
};

const formatRowsForActas = (actas: ActaSalida[]): any[][] => {
  const rows: any[][] = [];
  actas.forEach((acta) => {
    if (acta.items && acta.items.length > 0) {
      acta.items.forEach((item) => {
        rows.push([
          acta.id,
          acta.fecha,
          acta.servicio,
          acta.responsable || '',
          item.desc,
          item.cantidad,
          item.familia,
          acta.nota || '',
        ]);
      });
    } else {
      rows.push([
        acta.id,
        acta.fecha,
        acta.servicio,
        acta.responsable || '',
        '',
        0,
        '',
        acta.nota || '',
      ]);
    }
  });
  return rows;
};

const formatRowForEquipo = (eq: TrazabilidadEquipo): any[] => {
  const svc = eq.servClinico || (eq as any).servicioDestino || (eq as any).servicio || 'HOSPITAL DE ALTO HOSPICIO';
  const rec = eq.quienRecibe || (eq as any).personaRecibe || (eq as any).recibe || 'Erik Faundes';
  return [
    eq.codigo || '',
    extractDateOnly(eq.fecha) || eq.fecha || '',
    eq.nombreEquipo,
    eq.marca,
    eq.modelo,
    eq.nSerie,
    eq.lote || '',
    eq.cantidad || 1,
    svc,
    rec,
    eq.mantPreventivo,
    eq.ingresoRetiro || 'OPERATIVO',
    eq.valorUnitario || 0,
    eq.costoTotal || 0,
    eq.observaciones || '',
  ];
};

const formatRowForHerramienta = (h: Herramienta): any[] => {
  const svc = h.servicioDestino || (h as any).servClinico || (h as any).servicio || 'Mantención';
  const rec = h.personaRecibe || (h as any).quienRecibe || (h as any).recibe || '';
  return [
    h.codigo || '',
    extractDateOnly(h.fecha) || h.fecha || '',
    h.descripcion,
    h.cantidad,
    svc,
    rec,
    h.oc || '',
    h.factura || '',
    h.guia || '',
    h.valorUnitario,
    h.costoTotal,
    h.documentoAdjunto || h.adjunto ? 'Archivo Adjunto' : 'Sin Adjunto',
  ];
};

const formatRowForEquipoMenor = (eqm: EquipoMenor): any[] => {
  const svc = eqm.servicioDestino || (eqm as any).servClinico || (eqm as any).servicio || 'UCI';
  const rec = eqm.quienRecibe || (eqm as any).personaRecibe || (eqm as any).recibe || '';
  return [
    eqm.codigo || '',
    extractDateOnly(eqm.fecha) || eqm.fecha || '',
    eqm.nombreEquipo,
    eqm.marca,
    eqm.modelo,
    eqm.serie,
    eqm.lote || '',
    eqm.cantidad,
    svc,
    rec,
    eqm.oc || '',
    eqm.factura || '',
    eqm.guia || '',
    eqm.valorUnitario,
    eqm.costoTotal,
    eqm.documentoAdjunto || eqm.adjunto ? 'Archivo Adjunto' : 'Sin Adjunto',
  ];
};

// Helper: Call Google Sheets API with authorization
async function callSheetsApi(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: any
): Promise<any> {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('No hay sesión de Google activa o el token ha expirado. Inicia sesión con Google.');
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(
      errorJson?.error?.message ||
        `Error en Google Sheets API (${res.status}): ${res.statusText}`
    );
  }

  return res.json();
}

export interface SheetTabConfig {
  title: string;
  sheetId: number;
  columns: string[];
  isCurrency: boolean;
  currencyCols: number[];
}

export const SIX_SHEETS_CONFIG: SheetTabConfig[] = [
  {
    title: SHEET_NAMES.INVENTARIO,
    sheetId: 0,
    columns: SHEET_COLUMNS[SHEET_NAMES.INVENTARIO],
    isCurrency: true,
    currencyCols: [6, 7], // VALOR UNITARIO ($), VALOR TOTAL ($)
  },
  {
    title: SHEET_NAMES.KARDEX,
    sheetId: 1,
    columns: SHEET_COLUMNS[SHEET_NAMES.KARDEX],
    isCurrency: false,
    currencyCols: [],
  },
  {
    title: SHEET_NAMES.DESPACHO,
    sheetId: 2,
    columns: SHEET_COLUMNS[SHEET_NAMES.DESPACHO],
    isCurrency: false,
    currencyCols: [],
  },
  {
    title: SHEET_NAMES.EQUIPOS,
    sheetId: 3,
    columns: SHEET_COLUMNS[SHEET_NAMES.EQUIPOS],
    isCurrency: true,
    currencyCols: [11, 12], // VALOR UNITARIO ($), COSTO TOTAL ($)
  },
  {
    title: SHEET_NAMES.HERRAMIENTAS,
    sheetId: 4,
    columns: SHEET_COLUMNS[SHEET_NAMES.HERRAMIENTAS],
    isCurrency: true,
    currencyCols: [9, 10], // VALOR UNITARIO ($), COSTO TOTAL ($)
  },
  {
    title: SHEET_NAMES.EQUIPOS_MENORES,
    sheetId: 5,
    columns: SHEET_COLUMNS[SHEET_NAMES.EQUIPOS_MENORES],
    isCurrency: true,
    currencyCols: [13, 14], // VALOR UNITARIO ($), COSTO TOTAL ($)
  },
];

/**
 * Construye la estructura completa de 15 filas superiores inspirada en el Tracker Dashboard
 * para cada una de las 6 pestañas oficiales con datos reales:
 * - Filas 1-3: Banner institucional fusionado verde bosque (#1b4332)
 * - Filas 4-14: Panel Dashboard verde menta suave (#eef7ee)
 * - Filas 5-13: 4 Tarjetas Dashboard KPI idénticas a la imagen de referencia:
 *     * Tarjeta 1 (A5:B13): Destacada en verde menta (#a3d9a5) con fórmula =COUNTA(...) o =SUM(...)
 *     * Tarjeta 2 (C5:D13): Total Neto en blanco (#ffffff) con formato de moneda chilena "$"#,##0
 *     * Tarjeta 3 (E5:F13): Stock/Unidades en blanco (#ffffff)
 *     * Tarjeta 4 (G5:H13): Stock Crítico / Alerta en fondo suave (#fee2e2)
 * - Fila 14: Separador
 * - Fila 15: Encabezados de tabla en verde (#2d6a4f) con texto blanco
 * - Filas 16+: Datos reales de la bodega, limpios y listos para trabajar
 */
export function buildSheetTrackerRows(
  sheetName: string,
  columns: string[],
  dataRows: any[][]
): any[][] {
  const numCols = columns.length;
  const blankRow = () => new Array(numCols).fill('');

  const row1 = blankRow();
  row1[0] = `HOSPITAL ALTO HOSPICIO — ${sheetName.toUpperCase()}`;

  const row2 = blankRow();
  row2[0] = 'BODEGA DE TRÁNSITO Y CONTROL DE INSUMOS — PANEL EJECUTIVO DE GESTIÓN';

  const row3 = blankRow();
  const row4 = blankRow();
  const row5 = blankRow();
  const row6 = blankRow();
  const row7 = blankRow();

  if (sheetName === SHEET_NAMES.INVENTARIO) {
    row5[0] = 'TOTAL PRODUCTOS';
    row5[2] = 'VALOR TOTAL NETO';
    row5[4] = 'STOCK TOTAL';
    row5[6] = 'STOCK CRÍTICO';

    row7[0] = '=COUNTA(A16:A1000)';
    row7[2] = '=SUM(H16:H1000)';
    row7[4] = '=SUM(E16:E1000)';
    row7[6] = '=COUNTIF(I16:I1000; "*Crítico*") + COUNTIF(I16:I1000; "*CRÍTICO*") + COUNTIF(I16:I1000; "*AGOTADO*")';
  } else if (sheetName === SHEET_NAMES.KARDEX) {
    row5[0] = 'TOTAL MOVIMIENTOS';
    row5[2] = 'TOTAL ENTRADAS';
    row5[4] = 'TOTAL SALIDAS';
    row5[6] = 'SALDO KARDEX';

    row7[0] = '=COUNTA(A16:A1000)';
    row7[2] = '=SUM(H16:H1000)';
    row7[4] = '=SUM(I16:I1000)';
    row7[6] = '=SUM(H16:H1000)-SUM(I16:I1000)';
  } else if (sheetName === SHEET_NAMES.DESPACHO) {
    row5[0] = 'INSUMOS TRÁNSITO';
    row5[2] = 'CANTIDAD INGRESO';
    row5[4] = 'CANTIDAD DESPACHADA';
    row5[6] = 'SALDO DISPONIBLE';

    row7[0] = '=COUNTA(B16:B1000)';
    row7[2] = '=SUM(E16:E1000)';
    row7[4] = '=SUM(F16:F1000)';
    row7[6] = '=SUM(G16:G1000)';
  } else if (sheetName === SHEET_NAMES.EQUIPOS) {
    row5[0] = 'TOTAL EQUIPOS';
    row5[2] = 'COSTO TOTAL NETO';
    row5[4] = 'CANTIDAD UNIDADES';
    row5[6] = 'OPERATIVOS';

    row7[0] = '=COUNTA(A16:A1000)';
    row7[2] = '=SUM(N16:N1000)';
    row7[4] = '=SUM(H16:H1000)';
    row7[6] = '=COUNTIF(L16:L1000; "*Operativo*") + COUNTIF(L16:L1000; "*OPERATIVO*")';
  } else if (sheetName === SHEET_NAMES.HERRAMIENTAS) {
    row5[0] = 'TOTAL HERRAMIENTAS';
    row5[2] = 'COSTO TOTAL';
    row5[4] = 'CANTIDAD TOTAL';
    row5[6] = 'SERVICIOS DESTINO';

    row7[0] = '=COUNTA(A16:A1000)';
    row7[2] = '=SUM(K16:K1000)';
    row7[4] = '=SUM(D16:D1000)';
    row7[6] = '=COUNTA(E16:E1000)';
  } else if (sheetName === SHEET_NAMES.EQUIPOS_MENORES) {
    row5[0] = 'TOTAL EQ. MENORES';
    row5[2] = 'COSTO TOTAL';
    row5[4] = 'CANTIDAD TOTAL';
    row5[6] = 'SERVICIOS DESTINO';

    row7[0] = '=COUNTA(A16:A1000)';
    row7[2] = '=SUM(O16:O1000)';
    row7[4] = '=SUM(H16:H1000)';
    row7[6] = '=COUNTA(I16:I1000)';
  }

  const cardFillerRows = Array.from({ length: 6 }, () => blankRow());
  const row14 = blankRow();
  const row15 = [...columns];

  return [
    row1,
    row2,
    row3,
    row4,
    row5,
    row6,
    row7,
    ...cardFillerRows,
    row14,
    row15,
    ...dataRows,
  ];
}

/**
 * Genera el formato profesional tipo Tracker Dashboard para cada pestaña:
 * - Verde oscuro #1b4332 para el banner superior
 * - Verde suave #eef7ee para el contenedor de tarjetas KPI
 * - Tarjeta 1 en verde menta #a3d9a5 con número 26pt (idéntico a la imagen)
 * - Tarjetas 2, 3 en blanco #ffffff con bordes limpios
 * - Tarjeta 4 en alerta #fee2e2 si aplica
 * - Encabezado de tabla en fila 15 con verde #2d6a4f, texto blanco, altura 34px
 * - Inmovilización exacta en fila 15 (frozenRowCount: 15)
 * - Bordes #cbd5e1 y formatos de moneda en columnas requeridas
 */
export function generateSheetTrackerFormatRequests(
  sheetId: number,
  numCols: number,
  isCurrencySheet: boolean = false,
  currencyCols: number[] = [],
  rowCount: number = 100
): any[] {
  const requests: any[] = [];

  // 1. Inmovilizar 15 filas superiores y color institucional en pestaña (#1b4332)
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId,
        gridProperties: {
          frozenRowCount: 15,
        },
        tabColorStyle: {
          rgbColor: { red: 0.106, green: 0.263, blue: 0.196 },
        },
      },
      fields: 'gridProperties.frozenRowCount,tabColorStyle',
    },
  });

  // 2. Fusionar Banner de Título (Filas 0-3, A1 a última columna)
  requests.push({
    mergeCells: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 3,
        startColumnIndex: 0,
        endColumnIndex: numCols,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  // 3. Fusionar Tarjetas KPI (Filas 4-6 cabecera, Filas 6-13 valor):
  // Tarjeta 1 (Cols 0-2 / A-B)
  requests.push({
    mergeCells: {
      range: {
        sheetId,
        startRowIndex: 4,
        endRowIndex: 6,
        startColumnIndex: 0,
        endColumnIndex: 2,
      },
      mergeType: 'MERGE_ALL',
    },
  });
  requests.push({
    mergeCells: {
      range: {
        sheetId,
        startRowIndex: 6,
        endRowIndex: 13,
        startColumnIndex: 0,
        endColumnIndex: 2,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  // Tarjeta 2 (Cols 2-4 / C-D)
  requests.push({
    mergeCells: {
      range: {
        sheetId,
        startRowIndex: 4,
        endRowIndex: 6,
        startColumnIndex: 2,
        endColumnIndex: 4,
      },
      mergeType: 'MERGE_ALL',
    },
  });
  requests.push({
    mergeCells: {
      range: {
        sheetId,
        startRowIndex: 6,
        endRowIndex: 13,
        startColumnIndex: 2,
        endColumnIndex: 4,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  // Tarjeta 3 (Cols 4-6 / E-F)
  requests.push({
    mergeCells: {
      range: {
        sheetId,
        startRowIndex: 4,
        endRowIndex: 6,
        startColumnIndex: 4,
        endColumnIndex: 6,
      },
      mergeType: 'MERGE_ALL',
    },
  });
  requests.push({
    mergeCells: {
      range: {
        sheetId,
        startRowIndex: 6,
        endRowIndex: 13,
        startColumnIndex: 4,
        endColumnIndex: 6,
      },
      mergeType: 'MERGE_ALL',
    },
  });

  // Tarjeta 4 (Cols 6-8 / G-H)
  if (numCols >= 8) {
    requests.push({
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: 4,
          endRowIndex: 6,
          startColumnIndex: 6,
          endColumnIndex: Math.min(8, numCols),
        },
        mergeType: 'MERGE_ALL',
      },
    });
    requests.push({
      mergeCells: {
        range: {
          sheetId,
          startRowIndex: 6,
          endRowIndex: 13,
          startColumnIndex: 6,
          endColumnIndex: Math.min(8, numCols),
        },
        mergeType: 'MERGE_ALL',
      },
    });
  }

  // 4. Estilo Banner de Título (Filas 0-3): Verde bosque oscuro #1b4332, texto blanco en negrita 15pt
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 0,
        endRowIndex: 3,
        startColumnIndex: 0,
        endColumnIndex: numCols,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.106, green: 0.263, blue: 0.196 }, // #1b4332
          textFormat: {
            foregroundColor: { red: 1, green: 1, blue: 1 },
            bold: true,
            fontSize: 15,
            fontFamily: 'Roboto',
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    },
  });

  // 5. Fondo del área Dashboard (Filas 3-14): Verde menta suave #eef7ee
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 3,
        endRowIndex: 14,
        startColumnIndex: 0,
        endColumnIndex: numCols,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.933, green: 0.969, blue: 0.933 }, // #eef7ee
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  });

  // 6. Encabezados de Tarjetas KPI (Filas 4-6): Verde #2d6a4f, texto blanco en negrita 10pt
  const cardStartCols = [0, 2, 4, ...(numCols >= 8 ? [6] : [])];
  cardStartCols.forEach((startCol) => {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 4,
          endRowIndex: 6,
          startColumnIndex: startCol,
          endColumnIndex: startCol + 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.176, green: 0.416, blue: 0.31 }, // #2d6a4f
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10,
              fontFamily: 'Roboto',
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });
  });

  // 7. Valor Tarjeta KPI 1 (A7:B13): Verde menta destacado #a3d9a5 (idéntico a la imagen), 26pt negrita
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 6,
        endRowIndex: 13,
        startColumnIndex: 0,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.639, green: 0.851, blue: 0.647 }, // #a3d9a5
          textFormat: {
            foregroundColor: { red: 0.059, green: 0.239, blue: 0.141 }, // #0f3d24
            bold: true,
            fontSize: 26,
            fontFamily: 'Roboto',
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
    },
  });

  // 8. Valor Tarjetas KPI 2, 3, 4 (Fondo blanco o alerta):
  [2, 4, ...(numCols >= 8 ? [6] : [])].forEach((startCol) => {
    const isAlert = startCol === 6;
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 6,
          endRowIndex: 13,
          startColumnIndex: startCol,
          endColumnIndex: startCol + 2,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: isAlert
              ? { red: 0.996, green: 0.886, blue: 0.886 } // #fee2e2
              : { red: 1, green: 1, blue: 1 },
            textFormat: {
              foregroundColor: isAlert
                ? { red: 0.6, green: 0.106, blue: 0.106 } // #991b1b
                : { red: 0.059, green: 0.239, blue: 0.141 },
              bold: true,
              fontSize: startCol === 2 ? 18 : 22,
              fontFamily: 'Roboto',
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            ...(startCol === 2 && isCurrencySheet
              ? { numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0' } }
              : {}),
          },
        },
        fields:
          'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment' +
          (startCol === 2 && isCurrencySheet ? ',numberFormat' : '') +
          ')',
      },
    });
  });

  // 9. Encabezados de Tabla en Fila 15 (Index 14): Verde #2d6a4f, texto blanco en negrita 10pt
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 14,
        endRowIndex: 15,
        startColumnIndex: 0,
        endColumnIndex: numCols,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.176, green: 0.416, blue: 0.31 }, // #2d6a4f
          textFormat: {
            foregroundColor: { red: 1, green: 1, blue: 1 },
            bold: true,
            fontSize: 10,
            fontFamily: 'Roboto',
          },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          wrapStrategy: 'WRAP',
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
    },
  });

  // 10. Altura de filas: Banner (26px), Encabezado Tabla (34px)
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: 0,
        endIndex: 3,
      },
      properties: { pixelSize: 26 },
      fields: 'pixelSize',
    },
  });
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex: 14,
        endIndex: 15,
      },
      properties: { pixelSize: 34 },
      fields: 'pixelSize',
    },
  });

  // 11. Formato y bordes de las filas de datos reales (Fila 16+)
  const effectiveDataRows = Math.max(rowCount, 30);
  requests.push({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 15,
        endRowIndex: 15 + effectiveDataRows,
        startColumnIndex: 0,
        endColumnIndex: numCols,
      },
      cell: {
        userEnteredFormat: {
          textFormat: {
            fontSize: 9.5,
            fontFamily: 'Roboto',
          },
          verticalAlignment: 'MIDDLE',
        },
      },
      fields: 'userEnteredFormat(textFormat,verticalAlignment)',
    },
  });

  // Bordes limpios en toda la tabla de datos
  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: 14,
        endRowIndex: 15 + effectiveDataRows,
        startColumnIndex: 0,
        endColumnIndex: numCols,
      },
      top: { style: 'SOLID', color: { red: 0.796, green: 0.835, blue: 0.882 } },
      bottom: { style: 'SOLID', color: { red: 0.796, green: 0.835, blue: 0.882 } },
      left: { style: 'SOLID', color: { red: 0.796, green: 0.835, blue: 0.882 } },
      right: { style: 'SOLID', color: { red: 0.796, green: 0.835, blue: 0.882 } },
      innerHorizontal: { style: 'SOLID', color: { red: 0.878, green: 0.902, blue: 0.929 } },
      innerVertical: { style: 'SOLID', color: { red: 0.878, green: 0.902, blue: 0.929 } },
    },
  });

  // Formato de moneda para las columnas requeridas (CLP: "$"#,##0)
  currencyCols.forEach((colIdx) => {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 15,
          endRowIndex: 15 + effectiveDataRows,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'CURRENCY',
              pattern: '"$"#,##0',
            },
            horizontalAlignment: 'RIGHT',
          },
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
      },
    });
  });

  // Ajuste automático de ancho de columnas
  requests.push({
    autoResizeDimensions: {
      dimensions: {
        sheetId,
        dimension: 'COLUMNS',
        startIndex: 0,
        endIndex: numCols,
      },
    },
  });

  return requests;
}

/**
 * Prepara las filas de datos reales para cada una de las 6 pestañas oficiales
 */
function prepareDataRowsForSixSheets(data: {
  productos: Producto[];
  kardex: KardexMovimiento[];
  actas: ActaSalida[];
  sinCostoList?: SinCostoMovimiento[];
  equipos?: TrazabilidadEquipo[];
  herramientas?: Herramienta[];
  equiposMenores?: EquipoMenor[];
}): { [sheetTitle: string]: any[][] } {
  return {
    [SHEET_NAMES.INVENTARIO]: (data.productos || []).map(formatRowForInventario),
    [SHEET_NAMES.KARDEX]: (data.kardex || []).map(formatRowForKardex),
    [SHEET_NAMES.DESPACHO]: formatRowsForTransitoDespacho(data.sinCostoList || []),
    [SHEET_NAMES.EQUIPOS]: (data.equipos || []).map(formatRowForEquipo),
    [SHEET_NAMES.HERRAMIENTAS]: (data.herramientas || []).map(formatRowForHerramienta),
    [SHEET_NAMES.EQUIPOS_MENORES]: (data.equiposMenores || []).map(formatRowForEquipoMenor),
  };
}

/**
 * Crea la planilla oficial en Google Drive con las 6 pestañas reales formateadas con el Tracker Dashboard
 */
export async function createOfficialInventorySpreadsheet(data: {
  productos: Producto[];
  kardex: KardexMovimiento[];
  actas: ActaSalida[];
  sinCostoList?: SinCostoMovimiento[];
  equipos?: TrazabilidadEquipo[];
  herramientas?: Herramienta[];
  equiposMenores?: EquipoMenor[];
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  return deleteAndRecreateOfficialSpreadsheet(data);
}

/**
 * Crea o recrea la planilla de Google Sheets con las 6 pestañas oficiales del Hospital Alto Hospicio,
 * aplicando el diseño del Tracker Dashboard en todas ellas con datos reales.
 */
export async function deleteAndRecreateOfficialSpreadsheet(data: {
  productos: Producto[];
  kardex: KardexMovimiento[];
  actas: ActaSalida[];
  sinCostoList?: SinCostoMovimiento[];
  equipos?: TrazabilidadEquipo[];
  herramientas?: Herramienta[];
  equiposMenores?: EquipoMenor[];
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Crear nueva planilla con las 6 pestañas oficiales
  const sheetsPayload = SIX_SHEETS_CONFIG.map((cfg) => ({
    properties: {
      sheetId: cfg.sheetId,
      title: cfg.title,
      gridProperties: { frozenRowCount: 15 },
      tabColorStyle: { rgbColor: { red: 0.106, green: 0.263, blue: 0.196 } },
    },
  }));

  const createRes = await callSheetsApi('', 'POST', {
    properties: {
      title: SPREADSHEET_TITLE,
    },
    sheets: sheetsPayload,
  });

  const spreadsheetId = createRes.spreadsheetId;
  const spreadsheetUrl =
    createRes.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Preparar datos reales de cada pestaña con la estructura de 15 filas superiores
  const rawDataBySheet = prepareDataRowsForSixSheets(data);
  const dataPayload: any[] = [];

  SIX_SHEETS_CONFIG.forEach((cfg) => {
    const rawRows = rawDataBySheet[cfg.title] || [];
    const trackerRows = buildSheetTrackerRows(cfg.title, cfg.columns, rawRows);
    dataPayload.push({
      range: `'${cfg.title}'!A1`,
      values: trackerRows,
    });
  });

  await callSheetsApi(`/${spreadsheetId}/values:batchUpdate`, 'POST', {
    valueInputOption: 'USER_ENTERED',
    data: dataPayload,
  });

  // 3. Aplicar estilos Tracker Dashboard en las 6 pestañas
  const formatRequests: any[] = [];
  SIX_SHEETS_CONFIG.forEach((cfg) => {
    const rawRows = rawDataBySheet[cfg.title] || [];
    const reqs = generateSheetTrackerFormatRequests(
      cfg.sheetId,
      cfg.columns.length,
      cfg.isCurrency,
      cfg.currencyCols,
      rawRows.length
    );
    formatRequests.push(...reqs);
  });

  try {
    await callSheetsApi(`/${spreadsheetId}:batchUpdate`, 'POST', {
      requests: formatRequests,
    });
  } catch (formatErr) {
    console.warn('Advertencia al aplicar estilos visuales:', formatErr);
  }

  // Guardar ID y URL en localStorage
  localStorage.setItem('hah_google_sheets_id', spreadsheetId);
  localStorage.setItem('hah_google_sheets_url', spreadsheetUrl);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Reconcilia la existencia de las 6 pestañas oficiales
 */
export async function ensureSheetsStructure(spreadsheetId: string): Promise<void> {
  try {
    const meta = await callSheetsApi(`/${spreadsheetId}?fields=sheets.properties`, 'GET');
    const existingSheets: any[] = meta.sheets || [];
    const existingTitles: string[] = existingSheets.map((s) => s.properties?.title || '');

    const requests: any[] = [];

    SIX_SHEETS_CONFIG.forEach((cfg) => {
      if (!existingTitles.includes(cfg.title)) {
        requests.push({
          addSheet: {
            properties: {
              sheetId: cfg.sheetId,
              title: cfg.title,
              gridProperties: { frozenRowCount: 15 },
              tabColorStyle: { rgbColor: { red: 0.106, green: 0.263, blue: 0.196 } },
            },
          },
        });
      }
    });

    if (requests.length > 0) {
      await callSheetsApi(`/${spreadsheetId}:batchUpdate`, 'POST', { requests });
    }
  } catch (err) {
    console.warn('Advertencia al reconciliar estructura de pestañas:', err);
  }
}

/**
 * Sincroniza todas las 6 pestañas de Google Sheets con los datos reales y el diseño Tracker Dashboard.
 */
export async function syncAllToGoogleSheets(
  spreadsheetId: string,
  data: {
    productos: Producto[];
    kardex: KardexMovimiento[];
    actas: ActaSalida[];
    sinCostoList?: SinCostoMovimiento[];
    equipos?: TrazabilidadEquipo[];
    herramientas?: Herramienta[];
    equiposMenores?: EquipoMenor[];
  }
): Promise<void> {
  // 1. Asegurar existencia de las 6 pestañas
  await ensureSheetsStructure(spreadsheetId);

  // 2. Preparar datos reales de cada una de las 6 pestañas
  const rawDataBySheet = prepareDataRowsForSixSheets(data);
  const dataPayload: any[] = [];

  SIX_SHEETS_CONFIG.forEach((cfg) => {
    const rawRows = rawDataBySheet[cfg.title] || [];
    const trackerRows = buildSheetTrackerRows(cfg.title, cfg.columns, rawRows);
    dataPayload.push({
      range: `'${cfg.title}'!A1`,
      values: trackerRows,
    });
  });

  await callSheetsApi(`/${spreadsheetId}/values:batchUpdate`, 'POST', {
    valueInputOption: 'USER_ENTERED',
    data: dataPayload,
  });

  // 3. Re-aplicar formato Tracker Dashboard en las 6 pestañas
  try {
    const meta = await callSheetsApi(`/${spreadsheetId}?fields=sheets.properties`, 'GET');
    const existingSheets: any[] = meta.sheets || [];

    const formatRequests: any[] = [];
    SIX_SHEETS_CONFIG.forEach((cfg) => {
      const sheetObj = existingSheets.find((s) => s.properties?.title === cfg.title);
      const sheetId = sheetObj?.properties?.sheetId ?? cfg.sheetId;
      const rawRows = rawDataBySheet[cfg.title] || [];
      const reqs = generateSheetTrackerFormatRequests(
        sheetId,
        cfg.columns.length,
        cfg.isCurrency,
        cfg.currencyCols,
        rawRows.length
      );
      formatRequests.push(...reqs);
    });

    if (formatRequests.length > 0) {
      await callSheetsApi(`/${spreadsheetId}:batchUpdate`, 'POST', {
        requests: formatRequests,
      });
    }
  } catch (styleErr) {
    console.warn('Advertencia al refrescar estilos:', styleErr);
  }
}

/**
 * Agrega un movimiento en tiempo real al Registro de Kardex.
 */
export async function appendKardexMovementToSheet(
  spreadsheetId: string,
  movimiento: KardexMovimiento
): Promise<void> {
  const row = formatRowForKardex(movimiento);
  await callSheetsApi(
    `/${spreadsheetId}/values/'${SHEET_NAMES.KARDEX}'!A:K:append?valueInputOption=USER_ENTERED`,
    'POST',
    { values: [row] }
  );
}

/**
 * Agrega un producto en tiempo real a Tránsito Despacho.
 */
export async function appendSinCostoToSheet(
  spreadsheetId: string,
  item: SinCostoMovimiento
): Promise<void> {
  const rows = formatRowsForTransitoDespacho([item]);
  if (!rows.length) return;
  await callSheetsApi(
    `/${spreadsheetId}/values/'${SHEET_NAMES.DESPACHO}'!A:L:append?valueInputOption=USER_ENTERED`,
    'POST',
    { values: rows }
  );
}

/**
 * Agrega un acta de salida en tiempo real.
 */
export async function appendActaToSheet(
  spreadsheetId: string,
  acta: ActaSalida
): Promise<void> {
  const rows = formatRowsForActas([acta]);
  if (!rows.length) return;
  await callSheetsApi(
    `/${spreadsheetId}/values/'${SHEET_NAMES.DESPACHO}'!A:H:append?valueInputOption=USER_ENTERED`,
    'POST',
    { values: rows }
  );
}

/**
 * Agrega registros de trazabilidad en tiempo real.
 */
export async function appendTrazabilidadToSheet(
  spreadsheetId: string,
  tipo: 'equipos' | 'herramientas' | 'equiposmenores',
  item: TrazabilidadEquipo | Herramienta | EquipoMenor
): Promise<void> {
  let sheetName: string = SHEET_NAMES.EQUIPOS;
  let row: any[] = [];

  if (tipo === 'equipos') {
    sheetName = SHEET_NAMES.EQUIPOS;
    row = formatRowForEquipo(item as TrazabilidadEquipo);
  } else if (tipo === 'herramientas') {
    sheetName = SHEET_NAMES.HERRAMIENTAS;
    row = formatRowForHerramienta(item as Herramienta);
  } else if (tipo === 'equiposmenores') {
    sheetName = SHEET_NAMES.EQUIPOS_MENORES;
    row = formatRowForEquipoMenor(item as EquipoMenor);
  }

  await callSheetsApi(
    `/${spreadsheetId}/values/'${sheetName}'!A:Z:append?valueInputOption=USER_ENTERED`,
    'POST',
    { values: [row] }
  );
}

