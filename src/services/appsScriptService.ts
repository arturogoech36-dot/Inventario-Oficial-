/**
 * Servicio para interactuar con la API REST de Google Apps Script (Web App)
 * Permite sincronizar y probar la conexión con el Backend desplegado en Google Sheets.
 */

const STORAGE_KEY_APPS_SCRIPT_URL = 'hah_apps_script_url';

export const getStoredAppsScriptUrl = (): string => {
  return localStorage.getItem(STORAGE_KEY_APPS_SCRIPT_URL) || '';
};

export const setStoredAppsScriptUrl = (url: string): void => {
  if (url) {
    localStorage.setItem(STORAGE_KEY_APPS_SCRIPT_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_APPS_SCRIPT_URL);
  }
};

export interface AppsScriptPingResult {
  success: boolean;
  message: string;
  spreadsheetTitle?: string;
  spreadsheetId?: string;
  version?: string;
}

function formatAppsScriptError(err: any): string {
  const raw = err?.message || String(err || '');
  if (
    raw.includes('no ha podido acceder al documento') ||
    raw.includes('failed while accessing document') ||
    raw.includes('El servicio Hojas de cálculo no ha podido acceder')
  ) {
    return (
      '⚠️ Error de Permisos en Google Apps Script:\n' +
      'Google Apps Script no tiene autorización para acceder a la planilla de Google Sheets.\n\n' +
      'SOLUCIÓN RÁPIDA (en 30 segundos):\n' +
      '1. En la pestaña de Apps Script, ve al botón azul "Implementar" ➔ "Administrar implementaciones".\n' +
      '2. Haz clic en el icono del lápiz ✏️ (Editar).\n' +
      '3. Revisa atentamente:\n' +
      '   • "Ejecutar como": DEBE ser "Yo (tu correo de Gmail)" (¡NUNCA "El usuario que accede"!).\n' +
      '   • "Quién tiene acceso": "Cualquier usuario" (Anyone).\n' +
      '   • "Versión": Selecciona "Nueva versión".\n' +
      '4. Haz clic en "Implementar" y luego "Listo".\n' +
      '5. En el editor presiona el botón "▶️ Ejecutar" (en cualquier función) para conceder permisos si Google te lo solicita.'
    );
  }
  if (
    raw.includes('agotado el tiempo de espera') ||
    raw.includes('timed out') ||
    raw.includes('timeout')
  ) {
    return '⏱️ Google Sheets ocupado (tiempo de espera). La sincronización automática reintentará consolidar los datos sin pérdida de información.';
  }
  if (
    raw.includes('número de filas de los datos no coincide') ||
    raw.includes('number of rows in the data does not match') ||
    raw.includes('El número de filas')
  ) {
    return (
      '⚠️ Es necesario actualizar el código en Google Apps Script:\n' +
      'El script desplegado en tu Google Spreadsheet tiene una versión anterior con discrepancia en el rango de los gráficos (3 filas vs 4).\n\n' +
      'PASOS PARA RESOLVER EN 30 SEGUNDOS:\n' +
      '1. Ve a la pestaña "Google Sheets" en esta app y pulsa "📋 Copiar Código Apps Script".\n' +
      '2. En tu Google Spreadsheet, abre Extensiones > Apps Script.\n' +
      '3. Reemplaza todo el código con el copiado y presiona Guardar (Ctrl + S).\n' +
      '4. Haz clic en "Implementar" > "Administrar implementaciones" > ✏️ (Editar) > Selecciona "Nueva versión" > Haz clic en "Implementar".\n' +
      '5. Regresa y pulsa "Sincronizar". Todo sincronizará de inmediato con los 4 gráficos.'
    );
  }
  return raw;
}

/**
 * Prueba la conectividad con la URL del Web App de Apps Script mediante acción PING
 */
export async function pingAppsScript(url: string): Promise<AppsScriptPingResult> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('Debes ingresar la URL de la Aplicación Web de Apps Script.');
  }

  // Comprobar que sea una URL de script.google.com
  if (!cleanUrl.includes('script.google.com')) {
    throw new Error('La URL debe provenir de Google Apps Script (script.google.com/macros/s/.../exec)');
  }

  const storedId = localStorage.getItem('hah_google_sheets_id') || '';
  const sep = cleanUrl.includes('?') ? '&' : '?';
  const endpoint = `${cleanUrl}${sep}action=ping${storedId ? `&spreadsheetId=${encodeURIComponent(storedId)}` : ''}`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`El servidor respondió con código HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success || data.status === 'online') {
      return {
        success: true,
        message: 'Conexión exitosa con el Backend de Google Apps Script',
        spreadsheetTitle: data.spreadsheetTitle,
        spreadsheetId: data.spreadsheetId,
        version: data.version,
      };
    } else {
      throw new Error(data.error || 'Respuesta no válida del Backend.');
    }
  } catch (err: any) {
    console.error('Error al probar Apps Script:', err);
    throw new Error(formatAppsScriptError(err));
  }
}

/**
 * Mutex y cola para asegurar que nunca se disparen peticiones concurrentes a Apps Script
 * que puedan bloquear Google Sheets y producir "tiempo de espera agotado".
 */
let activeSyncPromise: Promise<{ success: boolean; message: string }> | null = null;
let pendingSyncPayload: { url: string; data: any } | null = null;

async function executeSyncRequest(url: string, data: any): Promise<{ success: boolean; message: string }> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('No hay URL de Google Apps Script configurada.');
  }

  const storedSpreadsheetId = localStorage.getItem('hah_google_sheets_id') || undefined;
  const payload = {
    action: 'SYNC_ALL',
    spreadsheetId: storedSpreadsheetId,
    data: {
      ...data,
      spreadsheetId: storedSpreadsheetId,
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout guard

    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status} al sincronizar con Apps Script`);
    }

    const json = await res.json();
    if (!json.success && !json.deferred) {
      throw new Error(json.error || 'Fallo en la sincronización del Backend');
    }

    return {
      success: true,
      message: json.message || 'Sincronizado exitosamente con Google Apps Script',
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: true,
        message: 'Sincronización en curso en segundo plano en Google Sheets.',
      };
    }
    console.warn('Sync notice via Apps Script:', err?.message || err);
    throw new Error(formatAppsScriptError(err));
  }
}

/**
 * Envía datos de sincronización completa al backend de Google Apps Script.
 * Usa un despachador serializado para evitar saturación de Apps Script y bloqueos de tiempo de espera.
 */
export async function syncToAppsScriptBackend(url: string, data: {
  productos: any[];
  kardex: any[];
  actas: any[];
  sinCostoList: any[];
  equipos: any[];
  herramientas: any[];
  equiposMenores: any[];
  familias?: any[];
}): Promise<{ success: boolean; message: string }> {
  if (activeSyncPromise) {
    pendingSyncPayload = { url, data };
    return activeSyncPromise.then(async () => {
      if (pendingSyncPayload) {
        const next = pendingSyncPayload;
        pendingSyncPayload = null;
        return syncToAppsScriptBackend(next.url, next.data);
      }
      return { success: true, message: 'Sincronizado' };
    });
  }

  activeSyncPromise = (async () => {
    try {
      return await executeSyncRequest(url, data);
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

/**
 * Descarga todos los datos desde Google Apps Script (action=getAll) para mantener
 * sincronizados el PC del trabajo, el PC de la casa y la Tablet.
 */
export async function fetchFromAppsScriptBackend(url: string): Promise<{
  success: boolean;
  appState?: {
    productos?: any[];
    kardex?: any[];
    actas?: any[];
    sinCostoList?: any[];
    equipos?: any[];
    herramientas?: any[];
    equiposMenores?: any[];
    familias?: any[];
    updatedAt?: string;
  };
  timestamp?: string;
}> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('No hay URL de Google Apps Script configurada.');
  }

  const storedId = localStorage.getItem('hah_google_sheets_id') || '';
  const sep = cleanUrl.includes('?') ? '&' : '?';
  const endpoint = `${cleanUrl}${sep}action=getAll${storedId ? `&spreadsheetId=${encodeURIComponent(storedId)}` : ''}`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status} al consultar datos desde Apps Script`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Error al obtener datos desde Apps Script');
    }

    // Si existe appState directo desde _DB_SYNC_HAH lo usamos; si no, reconstruimos desde las pestañas si tienen filas
    if (json.appState && typeof json.appState === 'object') {
      return {
        success: true,
        appState: json.appState,
        timestamp: json.timestamp,
      };
    }

    const reconstructedProductos = Array.isArray(json.inventario) && json.inventario.length > 0
      ? json.inventario
          .filter((r: any) => r['CÓDIGO'] && r['DESCRIPCIÓN'])
          .map((r: any, idx: number) => ({
            id: idx + 1,
            codigo: String(r['CÓDIGO'] || ''),
            desc: String(r['DESCRIPCIÓN'] || ''),
            familia: String(r['FAMILIA'] || 'ALI'),
            tipo: String(r['TIPO'] || 'Variable'),
            stock: Number(r['STOCK ACTUAL'] || 0),
            stockMin: Number(r['STOCK MÍNIMO'] || 0),
            valor: Number(r['VALOR UNITARIO ($)'] || 0),
            venc: '',
            estado: 'Activo',
          }))
      : undefined;

    return {
      success: true,
      appState: reconstructedProductos ? { productos: reconstructedProductos } : undefined,
      timestamp: json.timestamp,
    };
  } catch (err: any) {
    console.error('Error fetching from Apps Script:', err);
    throw new Error(formatAppsScriptError(err));
  }
}

/**
 * Sincroniza el estado y la URL de Apps Script con el servidor propio (/api/cloud-state)
 * para que todos los dispositivos (PC Trabajo, PC Casa, Tablet) compartan configuración y datos automáticamente.
 */
export async function fetchServerCloudState(): Promise<any | null> {
  try {
    const res = await fetch('/api/cloud-state');
    if (!res.ok) return null;
    const json = await res.json();
    return json?.state || null;
  } catch {
    return null;
  }
}

export async function pushServerCloudState(payload: any): Promise<void> {
  try {
    await fetch('/api/cloud-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silencioso en caso de modo offline
  }
}

/**
 * Envía un correo oficial con el reporte a través del backend de Google Apps Script (MailApp / GmailApp)
 */
export async function sendEmailViaAppsScript(
  url: string,
  emailData: {
    to: string;
    subject: string;
    body: string;
    htmlBody?: string;
  }
): Promise<{ success: boolean; message: string }> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('No hay URL de Google Apps Script configurada.');
  }

  const payload = {
    action: 'SEND_EMAIL',
    to: emailData.to,
    subject: emailData.subject,
    body: emailData.body,
    htmlBody: emailData.htmlBody || '',
  };

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status} al enviar correo por Apps Script`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'No se pudo enviar el correo desde Apps Script');
    }

    return {
      success: true,
      message: json.message || `Correo enviado exitosamente a ${emailData.to}`,
    };
  } catch (err: any) {
    console.error('Error sending email via Apps Script:', err);
    throw new Error(err.message || 'Error de comunicación al enviar correo');
  }
}


