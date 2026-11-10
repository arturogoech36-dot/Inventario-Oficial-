/**
 * Helper para el despacho y redacción de reportes oficiales de Bodega HAH por correo electrónico.
 * Soporta Gmail Web, Outlook Web Institucional, Cliente de Correo local (mailto:),
 * copiado al portapapeles en formato visual enriquecido (HTML) y texto plano,
 * y despacho automático en segundo plano mediante Google Apps Script.
 */

export interface EmailReportParams {
  destino: string;
  reporteFam?: string;
  reporteTitulo?: string;
  reporteHtmlOrText: string;
  usuario?: string;
  fecha?: string;
}

/**
 * Convierte una tabla HTML en formato tabular texto plano monoespaciado y alineado
 * asegurando que cada fila sea UNA SOLA LÍNEA horizontal y no se rompan las celdas verticalmente.
 */
function convertHtmlTableToPlainText(table: Element): string {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return '';

  const tableData: { isHeader: boolean; isFooter: boolean; cells: string[] }[] = [];

  rows.forEach((tr) => {
    const isHeader = !!tr.closest('thead') || tr.querySelectorAll('th').length > 0;
    const isFooter = !!tr.closest('tfoot');
    const cellElements = Array.from(tr.querySelectorAll('th, td'));
    if (cellElements.length === 0) return;

    const cells = cellElements.map((c) => {
      return (c.textContent || '').replace(/\s+/g, ' ').trim();
    });

    tableData.push({ isHeader, isFooter, cells });
  });

  if (tableData.length === 0) return '';

  // Determinar número estándar de columnas
  const maxCols = Math.max(...tableData.map((r) => r.cells.length));

  // Determinar anchos de columna óptimos
  const colWidths: number[] = new Array(maxCols).fill(0);
  tableData.forEach((row) => {
    if (row.isFooter && row.cells.length < maxCols) return;
    row.cells.forEach((text, i) => {
      const len = Math.min(text.length, 36);
      if (len > colWidths[i]) {
        colWidths[i] = len;
      }
    });
  });

  for (let i = 0; i < colWidths.length; i++) {
    colWidths[i] = Math.max(colWidths[i], 3);
  }

  const lines: string[] = [];

  tableData.forEach((row, idx) => {
    // Si es pie de página con menos columnas (como totales agrupados)
    if (row.isFooter && row.cells.length < maxCols) {
      const totalWidth = colWidths.reduce((a, b) => a + b, 0) + (maxCols - 1) * 3;
      lines.push('-'.repeat(totalWidth));
      lines.push(row.cells.filter(Boolean).join('   |   '));
      return;
    }

    const formattedRow = row.cells.map((text, cIdx) => {
      const w = colWidths[cIdx] || 10;
      let val = text;
      if (val.length > 36) {
        val = val.slice(0, 33) + '...';
      }
      return val.padEnd(w, ' ');
    });

    lines.push(formattedRow.join(' | '));

    // Separador tras encabezado
    if (row.isHeader && idx === 0) {
      const sep = colWidths.map((w) => '-'.repeat(w)).join('-+-');
      lines.push(sep);
    }
  });

  return lines.join('\n');
}

/**
 * Convierte el HTML institucional en texto plano limpio y ordenado para correos,
 * preservando las tablas completas en formato horizontal alineado.
 */
export function extractCleanTextFromHtml(html: string): string {
  if (!html) return '';
  if (!html.includes('<')) return html.trim();

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remover scripts o estilos si existen
    doc.querySelectorAll('script, style').forEach((s) => s.remove());

    // 1. Extraer y formatear todas las tablas a bloques de texto monoespaciado alineado
    const tables = Array.from(doc.querySelectorAll('table'));
    const tableReplacements: { placeholder: string; text: string }[] = [];

    tables.forEach((tbl, idx) => {
      const text = convertHtmlTableToPlainText(tbl);
      const placeholder = `___REPORTE_TABLA_${idx}___`;
      tableReplacements.push({ placeholder, text });
      const textNode = doc.createTextNode(`\n\n${placeholder}\n\n`);
      tbl.parentNode?.replaceChild(textNode, tbl);
    });

    // 2. Formatear encabezados y metadatos
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      h.insertAdjacentText('beforebegin', '\n');
      h.insertAdjacentText('afterend', '\n');
    });

    // Separar bloques de datos de metadata
    doc.querySelectorAll('div').forEach((el) => {
      if (!el.querySelector('div, table, p, h1, h2, h3, h4')) {
        el.insertAdjacentText('afterend', '\n');
      }
    });

    doc.querySelectorAll('p').forEach((p) => {
      p.insertAdjacentText('afterend', '\n');
    });

    // Usar textContent para no disparar las particiones forzadas de línea de innerText
    const rawContent = doc.body.textContent || '';

    // Limpiar saltos de línea repetidos
    const lines = rawContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l, i, arr) => {
        if (l.length === 0 && (i === 0 || arr[i - 1].length === 0)) return false;
        return true;
      });

    let result = lines.join('\n');

    // 3. Reinsertar las tablas estructuradas en su lugar exacto
    tableReplacements.forEach(({ placeholder, text }) => {
      result = result.replace(placeholder, text);
    });

    return result.trim();
  } catch (err) {
    console.warn('Error al formatear texto limpio:', err);
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Genera el asunto oficial del correo según el tipo de reporte
 */
export function buildReportEmailSubject(reporteFam?: string, fechaStr?: string): string {
  const f = fechaStr || new Date().toLocaleDateString('es-CL');
  const fam = reporteFam || 'Inventario';

  if (fam.startsWith('KARDEX_FAMILIAS')) {
    const sub = fam.includes(':') ? ` (Familia ${fam.split(':')[1]})` : ' (Consolidado)';
    return `[HAH Bodega] Resumen Oficial Kardex${sub} — ${f}`;
  }
  if (fam === 'TRAZ-EQUIPOS') {
    return `[HAH Bodega] Reporte Oficial Trazabilidad de Equipos — ${f}`;
  }
  if (fam === 'TRAZ-HERRAMIENTAS') {
    return `[HAH Bodega] Reporte Oficial Trazabilidad de Herramientas — ${f}`;
  }
  if (fam === 'TRAZ-EQUIPOS-MENORES') {
    return `[HAH Bodega] Reporte Oficial Trazabilidad Equipos Menores — ${f}`;
  }
  if (fam === 'TOTAL') {
    return `[HAH Bodega] Reporte General Inventario Valorizado — ${f}`;
  }
  return `[HAH Bodega] Reporte Inventario Familia ${fam} — ${f}`;
}

/**
 * Construye el cuerpo del correo en texto formal y estructurado
 */
export function buildReportEmailBody(params: EmailReportParams): string {
  const fecha = params.fecha || new Date().toLocaleDateString('es-CL');
  const usuario = params.usuario || 'Arturo Gómez Echegoyen (Bodega HAH)';
  const titulo = params.reporteTitulo || buildReportEmailSubject(params.reporteFam, fecha);
  const cleanContent = extractCleanTextFromHtml(params.reporteHtmlOrText);

  // Límite seguro para URLs de clientes web (Gmail URL query param ~3800 chars)
  const MAX_PREVIEW_LEN = 3200;
  let previewText = cleanContent;
  let isTruncated = false;

  if (cleanContent.length > MAX_PREVIEW_LEN) {
    previewText =
      cleanContent.slice(0, MAX_PREVIEW_LEN) +
      '\n\n[... CONTENIDO EXTENSO: El listado completo supera el límite de vista previa por enlace. La nómina íntegra oficial está copiada en su portapapeles y archivada en Google Sheets / PDF ...]';
    isTruncated = true;
  }

  return `Estimada Jefatura y Equipo Directivo,

Se remite el ${titulo} generado desde el Sistema Oficial de Bodega de Tránsito del Hospital de Alto Hospicio (HAH).

════════════════════════════════════════════════════════════
DATOS DE EMISIÓN OFICIAL
════════════════════════════════════════════════════════════
• Fecha: ${fecha}
• Emitido por: ${usuario}
• Plataforma: Sistema Web Bodega HAH (Sincronizado con Google Sheets)
${isTruncated ? '• Nota: A continuación se presenta el resumen de datos. El reporte con diseño visual completo, tablas y colores ha sido copiado a su portapapeles.' : ''}

💡 FORMATO OFICIAL:
El reporte con su diseño gráfico completo, tablas oficiales y colores institucionales se ha copiado a su portapapeles.
👉 ¡Presione Ctrl + V (Pegar) en este correo para insertar la versión oficial idéntica a la pantalla!

════════════════════════════════════════════════════════════
TABLA DE DATOS Y REGISTROS
════════════════════════════════════════════════════════════

${previewText}

════════════════════════════════════════════════════════════
Hospital de Alto Hospicio — Servicio de Salud Tarapacá
Bodega de Tránsito y Control de Insumos / Kardex
Documento institucional generado automáticamente.`;
}

/**
 * Construye un cuerpo conciso y seguro para URLs de clientes web (Gmail, Outlook, mailto).
 * Mantiene la longitud de la URL estrictamente por debajo de los límites de Google Frontend (~1,500 chars),
 * evitando de raíz el error HTTP 400 Bad Request.
 */
export function buildReportEmailBodyForUrl(params: EmailReportParams): string {
  const fecha = params.fecha || new Date().toLocaleDateString('es-CL');
  const usuario = params.usuario || 'Arturo Gómez Echegoyen (Bodega HAH)';
  const titulo = params.reporteTitulo || buildReportEmailSubject(params.reporteFam, fecha);

  return `Estimada Jefatura y Equipo Directivo,

Se remite el ${titulo} generado desde el Sistema Oficial de Bodega de Tránsito del Hospital de Alto Hospicio (HAH).

════════════════════════════════════════════════════════════
DATOS DE EMISIÓN:
• Fecha: ${fecha}
• Emitido por: ${usuario}
• Plataforma: Bodega HAH (Sincronizado con Google Sheets)
════════════════════════════════════════════════════════════

📋 FORMATO INSTITUCIONAL COMPLETO:
El reporte oficial con su diseño gráfico, tablas completas y colores institucionales YA ha sido copiado a su portapapeles.

👉 Presione [ Ctrl + V ] (o clic derecho ➔ Pegar) aquí abajo para insertar la tabla oficial completa:

════════════════════════════════════════════════════════════
Hospital de Alto Hospicio — Servicio de Salud Tarapacá
Documento oficial generado automáticamente.`;
}

/**
 * Abre el redactor de Gmail Web con todos los campos pre-cargados de forma segura,
 * garantizando que la URL jamás sobrepase los 1,600 caracteres para evitar el error "Bad Request Error 400".
 */
export function openGmailWebComposer(to: string, subject: string, body: string): { success: boolean; url: string } {
  const cleanTo = to.trim();
  const safeSubject = subject.length > 90 ? subject.slice(0, 87) + '...' : subject;

  // Límite de seguridad estricto para Google GFE (Google Frontend)
  let safeBody = body;
  let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanTo)}&su=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}`;

  if (gmailUrl.length > 1600) {
    // Si excede el límite de Google, usamos una plantilla compacta ultra-segura
    safeBody = `Estimada Jefatura,\n\nSe remite el ${safeSubject}.\n\n📋 El reporte completo con diseño visual, tablas y colores oficiales ha sido copiado a su portapapeles.\n👉 Presione [Ctrl + V] (Pegar) aquí para insertar la tabla oficial.\n\nBodega de Tránsito — Hospital de Alto Hospicio`;
    gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanTo)}&su=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}`;
  }

  try {
    const win = window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = gmailUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 300);
    }
    return { success: true, url: gmailUrl };
  } catch (e) {
    console.warn('Error al abrir Gmail Web:', e);
    return { success: false, url: gmailUrl };
  }
}

/**
 * Abre el redactor de Outlook Web / Microsoft 365 (correo institucional @hah.gob.cl / @redsalud.gob.cl)
 */
export function openOutlookWebComposer(to: string, subject: string, body: string): boolean {
  const cleanTo = to.trim();
  const safeSubject = subject.length > 90 ? subject.slice(0, 87) + '...' : subject;
  let safeBody = body;
  let outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(cleanTo)}&subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}`;

  if (outlookUrl.length > 1600) {
    safeBody = `Estimada Jefatura,\n\nSe remite el ${safeSubject}.\n\n📋 El reporte con diseño visual completo está copiado en su portapapeles.\n👉 Presione [Ctrl + V] para pegarlo.\n\nHospital de Alto Hospicio`;
    outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(cleanTo)}&subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}`;
  }

  const win = window.open(outlookUrl, '_blank', 'noopener,noreferrer');
  if (!win || win.closed || typeof win.closed === 'undefined') {
    const a = document.createElement('a');
    a.href = outlookUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  return true;
}

/**
 * Abre el cliente de correo predeterminado del sistema operativo (mailto:)
 */
export function openDefaultMailClient(to: string, subject: string, body: string): void {
  const cleanTo = to.trim();
  // Para mailto recortamos el body para evitar errores del protocolo en clientes de escritorio
  const shortBody = body.length > 1200 ? body.slice(0, 1200) + '...' : body;
  const mailtoUrl = `mailto:${encodeURIComponent(cleanTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shortBody)}`;

  const a = document.createElement('a');
  a.href = mailtoUrl;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) document.body.removeChild(a);
  }, 500);
}

/**
 * Copia el reporte al portapapeles en formato visual enriquecido (text/html)
 * y texto plano estructurado (text/plain). Al pegar en Gmail, Outlook o Word,
 * se inserta la tabla con diseño, colores y bordes idéntica a la vista en pantalla.
 */
export async function copyReportToClipboard(plainText: string, htmlContent?: string): Promise<boolean> {
  // 1. Intentar API moderna de portapapeles asíncrona con ClipboardItem (soporta text/html y text/plain)
  try {
    if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
      const items: Record<string, Blob> = {
        'text/plain': new Blob([plainText], { type: 'text/plain;charset=utf-8' }),
      };
      if (htmlContent) {
        // Envolver en contenedor HTML con estilos inline limpios para compatibilidad total con Gmail / Outlook
        const fullHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000000; background: #ffffff; margin: 0; padding: 12px; }
      table { border-collapse: collapse; width: 100%; font-size: 9pt; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
      th { background-color: #f1f5f9; font-weight: bold; }
    </style>
  </head>
  <body>
    ${htmlContent}
  </body>
</html>`.trim();
        items['text/html'] = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      }
      await navigator.clipboard.write([new ClipboardItem(items)]);
      return true;
    }
  } catch (err) {
    console.warn('Async ClipboardItem write falló, utilizando método fallback:', err);
  }

  // 2. Fallback enriquecido: selección DOM con execCommand('copy')
  if (typeof document !== 'undefined' && htmlContent) {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.opacity = '0';
      tempDiv.style.pointerEvents = 'none';
      document.body.appendChild(tempDiv);

      const range = document.createRange();
      range.selectNode(tempDiv);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        const ok = document.execCommand('copy');
        selection.removeAllRanges();
        document.body.removeChild(tempDiv);
        if (ok) return true;
      }
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    } catch (e) {
      console.warn('Fallback execCommand HTML falló:', e);
    }
  }

  // 3. Fallback de texto plano con textarea
  if (typeof document !== 'undefined') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(plainText);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = plainText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.warn('Fallback execCommand texto falló:', err);
      return false;
    }
  }

  return false;
}
