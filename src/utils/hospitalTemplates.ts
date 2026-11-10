import { fmtMoney, today } from './format';
import {
  Producto,
  KardexMovimiento,
  ActaSalida,
  SinCostoMovimiento,
  TrazabilidadEquipo,
  Herramienta,
  EquipoMenor,
  FamiliaCatalogo,
} from '../types';
import { INITIAL_FAMILIAS } from '../data/initialData';

/**
 * Escapes HTML characters for safe template interpolation.
 */
export function escapeHtml(text?: string | number | null): string {
  if (text === undefined || text === null) return '—';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Common Base Document Wrapper matching Hospital Alto Hospicio official institutional design.
 */
export function wrapHospitalDocument({
  idDocumento,
  subtitulo,
  fecha = today(),
  camposMetadata,
  tituloSeccion,
  tablaHtml,
  observaciones,
  firmaIzquierda = {
    cargo: 'Entregado Conforme',
    nombre: 'Arturo Gómez Echegoyen',
    entidad: 'INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH',
    aclaracion: 'Firma y Timbre',
  },
  firmaDerecha = {
    cargo: 'Recibido Conforme',
    nombre: '',
    entidad: 'Servicio Clínico / Unidad Receptora',
    aclaracion: 'Nombre, Firma y Rut',
  },
}: {
  idDocumento: string;
  subtitulo: string;
  fecha?: string;
  camposMetadata: { label: string; value: string | number }[];
  tituloSeccion: string;
  tablaHtml: string;
  observaciones?: string;
  firmaIzquierda?: { cargo: string; nombre?: string; entidad: string; aclaracion: string };
  firmaDerecha?: { cargo: string; nombre?: string; entidad: string; aclaracion: string };
}): string {
  const metadataHtml = camposMetadata
    .map(
      (c) =>
        `<div><span style="font-weight: 700; color: #0f172a;">${escapeHtml(c.label)}:</span> <span style="color: #334155;">${escapeHtml(c.value)}</span></div>`
    )
    .join('');

  const obsHtml = observaciones
    ? `
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-top: 14px; font-size: 8.5pt; color: #334155;">
        <strong style="color: #0f172a;">Observaciones:</strong><br/>
        ${escapeHtml(observaciones)}
      </div>
    `
    : '';

  return `
    <div class="hah-official-sheet" style="font-family: Arial, Helvetica, sans-serif; background: #ffffff !important; color: #000000 !important; width: 100%; max-width: 820px; margin: 0 auto; padding: 14px 20px; box-sizing: border-box; line-height: 1.4;">
      
      <!-- Encabezado Institucional -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div>
          <div style="font-weight: 900; font-size: 15pt; color: #003366; letter-spacing: 0.5px; text-transform: uppercase;">
            HOSPITAL ALTO HOSPICIO
          </div>
          <div style="font-size: 8.5pt; color: #475569; font-weight: 700; margin-top: 2px; text-transform: uppercase;">
            INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH · ${escapeHtml(subtitulo)}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14pt; font-weight: 900; color: #003366; letter-spacing: 0.5px;">
            ${escapeHtml(idDocumento)}
          </div>
          <div style="font-size: 9pt; color: #64748b; font-weight: 600; margin-top: 2px;">
            Fecha: ${escapeHtml(fecha)}
          </div>
        </div>
      </div>

      <!-- Línea divisoria azul oscuro -->
      <div style="height: 2.5px; background: #003366; width: 100%; margin: 6px 0 14px 0;"></div>

      <!-- Cuadro de Metadatos -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 9.5pt; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
        ${metadataHtml}
      </div>

      <!-- Título de sección -->
      <div style="font-weight: 700; font-size: 11pt; color: #0f172a; margin-bottom: 8px;">
        ${escapeHtml(tituloSeccion)}
      </div>

      <!-- Contenedor de Tabla Oficial -->
      <div style="width: 100%; overflow-x: auto; margin-bottom: 14px;">
        ${tablaHtml}
      </div>

      ${obsHtml}

      <!-- Cuadro de Firmas Oficiales -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 38px; page-break-inside: avoid; break-inside: avoid;">
        <div style="border-top: 1.5px solid #000000; padding-top: 6px; text-align: center; font-size: 9pt; line-height: 1.35; color: #000000;">
          <strong>${escapeHtml(firmaIzquierda.cargo)}</strong><br/>
          ${firmaIzquierda.nombre ? `${escapeHtml(firmaIzquierda.nombre)}<br/>` : ''}
          ${escapeHtml(firmaIzquierda.entidad)}<br/>
          <span style="font-size: 8pt; color: #475569;">${escapeHtml(firmaIzquierda.aclaracion)}</span>
        </div>
        <div style="border-top: 1.5px solid #000000; padding-top: 6px; text-align: center; font-size: 9pt; line-height: 1.35; color: #000000;">
          <strong>${escapeHtml(firmaDerecha.cargo)}</strong><br/>
          ${firmaDerecha.nombre ? `${escapeHtml(firmaDerecha.nombre)}<br/>` : ''}
          ${escapeHtml(firmaDerecha.entidad)}<br/>
          <span style="font-size: 8pt; color: #475569;">${escapeHtml(firmaDerecha.aclaracion)}</span>
        </div>
      </div>

    </div>
  `;
}

/**
 * Helper to parse plain text Acta into structured data
 */
export function parseActaText(text: string): any {
  if (!text || typeof text !== 'string') return {};

  const idMatch =
    text.match(/N°\s*Acta\s*Correlativo\s*Interno:\s*([^\n\r<]+)/i) ||
    text.match(/N°\s*CORRELATIVO\s*INTERNO:\s*([^\n\r<]+)/i) ||
    text.match(/ID ACTA:\s*([^\n\r<]+)/i) ||
    text.match(/ACTA(?:\s+DE\s+EGRESO)?\s+N°?\s*([^\n\r<]+)/i) ||
    text.match(/Acta\s+(\d+)/i);
  const fechaMatch =
    text.match(/FECHA(?: DE EMISIÓN| EGRESO)?:\s*([^\n\r<]+)/i) ||
    text.match(/Iquique,\s*([^<]+)/i);
  const servicioMatch =
    text.match(/SERVICIO DESTINO:\s*([^\n\r<]+)/i) ||
    text.match(/Destino:\s*([^\n\r<]+)/i) ||
    text.match(/Establecimiento:\s*[^<]*?-\s*([^\n\r<]+)/i);
  const solicitudMatch =
    text.match(/N° SOLICITUD(?: INTERNA)?:\s*([^\n\r<]+)/i) ||
    text.match(/ENTREGADOS\s*:\s*([^,\n\r<]+)/i);
  const encargadoMatch =
    text.match(/RESPONSABLE BODEGA(?: DE TRÁNSITO)?:\s*([^\n\r<]+)/i) ||
    text.match(/ENCARGADO DESPACHO:\s*([^\n\r<]+)/i) ||
    text.match(/Arturo G[oó]mez Echegoyen/i);
  const responsableMatch =
    text.match(/FUNCIONARIO QUE RECIBE[\s\S]*?<div[^>]*>([^\n\r<]+)<\/div>/i) ||
    text.match(/RESPONSABLE RECEPCIÓN:\s*([^\n\r<]+)/i) ||
    text.match(/FUNCIONARIO QUE RECIBE:\s*([^\n\r<]+)/i) ||
    text.match(/Firma Funcionario Receptor[\s\S]*?Nombre:\s*([^\n\r<]+)/i);
  const notaMatch =
    text.match(/Nota:\s*([^\n\r<]+)/i) ||
    text.match(/NOTA:\s*([^\n\r<]+)/i);

  const items: any[] = [];

  // 1. If text is an HTML table or fragment, extract rows directly
  if (text.includes('<tr') && text.includes('<td')) {
    const rowMatches = text.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    for (const row of rowMatches) {
      if (row.includes('<th') || row.includes('No hay insumos')) continue;
      const cells = Array.from(row.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)).map((m) =>
        m[1].replace(/<[^>]+>/g, '').trim()
      );
      if (cells.length >= 3) {
        items.push({
          codigo: cells[0] || '—',
          cantidad: parseInt(cells[1], 10) || 1,
          desc: cells[2] || '—',
          fecha: cells[3] || today(),
        });
      }
    }
  }

  // 2. Plain text parsing (e.g. legacy text format)
  if (items.length === 0) {
    const lines = text.split('\n');
    let inItems = false;

    for (const line of lines) {
      if (line.includes('DETALLE DE MATERIALES') || line.includes('DETALLE DE INSUMOS') || (line.includes('CÓDIGO') && line.includes('DESCRIPCIÓN'))) {
        inItems = true;
        continue;
      }
      if (inItems && (line.includes('TOTAL ARTÍCULOS') || line.includes('VALIDACIÓN') || line.startsWith('==='))) {
        inItems = false;
        break;
      }
      if (inItems) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('===')) continue;
        
        // Match bullet format: • [COD] Descripcion - Cantidad uds.
        const bulletMatch = trimmed.match(/•?\s*\[([^\]]+)\]\s*([^-]+)-\s*(\d+)\s*(.*)/);
        if (bulletMatch) {
          items.push({
            codigo: bulletMatch[1].trim(),
            desc: bulletMatch[2].trim(),
            cantidad: parseInt(bulletMatch[3], 10) || 1,
            unidad: bulletMatch[4].trim() || 'uds.',
          });
          continue;
        }

        // Match tabular columns format: CODIGO  FAMILIA  DESCRIPCION  CANTIDAD  U.MEDIDA
        const parts = trimmed.split(/\s{2,}/);
        if (parts.length >= 4) {
          items.push({
            codigo: parts[0]?.trim(),
            familia: parts[1]?.trim(),
            desc: parts[2]?.trim(),
            cantidad: parseInt(parts[3], 10) || 1,
            unidad: parts[4]?.trim() || 'uds.',
          });
        } else if (parts.length === 3) {
          items.push({
            codigo: parts[0]?.trim(),
            desc: parts[1]?.trim(),
            cantidad: parseInt(parts[2], 10) || 1,
          });
        }
      }
    }
  }

  let rawId = idMatch ? idMatch[1].trim() : '01';
  const rawIdNum = rawId.match(/(\d+)/);
  if (rawIdNum && rawIdNum[1]) {
    const parsedNum = parseInt(rawIdNum[1], 10);
    if (!isNaN(parsedNum) && parsedNum < 100) {
      rawId = String(parsedNum).padStart(2, '0');
    }
  }

  return {
    id: rawId,
    fecha: fechaMatch ? fechaMatch[1].trim() : today(),
    servicio: servicioMatch ? servicioMatch[1].trim() : 'Urgencia',
    nroSolicitud: solicitudMatch ? solicitudMatch[1].trim() : 'Solicitud Interna',
    encargado: encargadoMatch ? (typeof encargadoMatch === 'string' ? encargadoMatch : encargadoMatch[1]?.trim() || 'Arturo Gómez Echegoyen') : 'Arturo Gómez Echegoyen',
    responsable: responsableMatch ? (typeof responsableMatch === 'string' ? responsableMatch : responsableMatch[1]?.trim() || '') : '',
    nota: notaMatch ? (typeof notaMatch === 'string' ? notaMatch : notaMatch[1]?.trim() || '') : '',
    items,
  };
}

/**
 * Formats Chilean long date e.g. "Iquique, 7 de septiembre del 2026"
 */
export function formatChileanLongDate(dateInput?: string): string {
  let d = new Date();
  if (dateInput) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const parts = dateInput.split('-');
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else if (dateInput.includes('/')) {
      const parts = dateInput.split('/');
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        if (p2 > 1000) {
          d = new Date(p2, p1 - 1, p0);
        } else {
          d = new Date(p0 > 1000 ? p0 : p2, p1 - 1, p0 > 1000 ? p2 : p0);
        }
      }
    }
  }
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const dia = d.getDate();
  const mes = meses[d.getMonth()] || 'septiembre';
  const anio = d.getFullYear();
  return `Iquique, ${dia} de ${mes} del ${anio}`;
}

/**
 * 1. Template: Acta de Egreso y Despacho (Exact Match Institutional Design - Servicio de Salud Tarapacá)
 */
export function buildActaDespachoTemplate(actaOrData: any, dateStr = today()): string {
  // If input is ALREADY the fully generated official sheet HTML, do not re-parse and destroy items!
  if (typeof actaOrData === 'string') {
    if (
      actaOrData.includes('hah-official-sheet') ||
      (actaOrData.includes('ACTA DE EGRESO') && actaOrData.includes('<table'))
    ) {
      return actaOrData;
    }
  }

  let a: any = {};
  if (typeof actaOrData === 'string') {
    a = parseActaText(actaOrData);
  } else if (typeof actaOrData === 'object' && actaOrData !== null) {
    a = actaOrData;
  }
  const items = Array.isArray(a.items)
    ? a.items
    : Array.isArray(a.articulos)
    ? a.articulos
    : Array.isArray(a.insumos)
    ? a.insumos
    : Array.isArray(a.lineas)
    ? a.lineas
    : Array.isArray(a.productos)
    ? a.productos
    : Array.isArray(a.itemsDespacho)
    ? a.itemsDespacho
    : [];

  // Extract clean Acta number (Correlativo Interno: 01, 02, etc.)
  const numMatch = String(a.id || '').match(/(\d+)/);
  let numActa = '01';
  if (numMatch && numMatch[1]) {
    const rawVal = parseInt(numMatch[1], 10);
    numActa = isNaN(rawVal)
      ? numMatch[1]
      : (numMatch[1].length < 2 ? String(rawVal).padStart(2, '0') : numMatch[1]);
  } else if (a.id) {
    numActa = String(a.id);
  }

  const fechaDoc = a.fecha || dateStr || today();
  const fechaLarga = formatChileanLongDate(fechaDoc);

  const bodega = a.bodega || 'INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH';
  const anio = new Date().getFullYear();
  const programa = a.programa || `${anio} - BIENES Y SERVICIOS (AREA TRANSACCIONAL HOSPITAL ALTO HOSPICIO)`;
  const tipoEgreso = a.tipoEgreso || 'Egreso Interno';
  const servicio = a.servicio || a.servicioDestino || 'Urgencia';
  const establecimiento = a.establecimiento || `Hospital Alto Hospicio - ${servicio}`;
  const nota = a.nota || `ENTREGADOS : ${(a.nroSolicitud ? a.nroSolicitud + ' , ' : '')}${servicio}`.toUpperCase();

  // Vinculación Automática del Funcionario que Recibe
  const funcionarioRecibe =
    a.responsable ||
    a.responsableRecep ||
    a.funcionarioRecibe ||
    a.personaRecibe ||
    a.quienRecibe ||
    a.persona ||
    '';

  const now = new Date();
  const horaMin = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  const fechaHoraImpresion = `${now.getDate()}/${now.getMonth() + 1}/${String(now.getFullYear()).slice(-2)}, ${horaMin}`;

  const rows = items.length > 0 ? items.map((it: any) => {
    const cod = it.codigo || it.cod || it.code || '—';
    const cant = it.cantidad ?? it.cant ?? it.qty ?? it.cantDespacho ?? 1;
    const nombre = it.desc || it.descripcion || it.producto || it.nombre || '—';
    const detalle = it.detalle || it.observacion || (it.marca ? `${it.marca} ${it.modelo || ''} ${it.serie ? 'ID/Serie: ' + it.serie : ''}` : '');
    const fechaItem = it.fecha || it.fechaDespacho || fechaDoc;

    return `
      <tr style="border-bottom: 1px solid #000000;">
        <td style="border: 1px solid #000000; padding: 7px 8px; vertical-align: top; font-family: monospace; font-size: 15px;">
          ${escapeHtml(cod)}
        </td>
        <td style="border: 1px solid #000000; padding: 7px 8px; vertical-align: top; text-align: center; font-weight: 700; font-size: 16px;">
          ${escapeHtml(cant)}
        </td>
        <td style="border: 1px solid #000000; padding: 7px 8px; vertical-align: top;">
          <div style="font-weight: 600; color: #000000; font-size: 15px;">${escapeHtml(nombre)}</div>
          ${detalle ? `<div style="font-size: 13px; color: #1e293b; margin-top: 3px; line-height: 1.3;">${escapeHtml(detalle)}</div>` : ''}
        </td>
        <td style="border: 1px solid #000000; padding: 7px 8px; vertical-align: top; text-align: center; font-size: 15px;">
          ${escapeHtml(fechaItem)}
        </td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="4" style="border: 1px solid #000000; padding: 18px; text-align: center; color: #64748b; font-size: 14px;">
        No hay insumos registrados en esta acta
      </td>
    </tr>
  `;

  return `
    <div class="hah-official-sheet" style="font-family: Arial, Helvetica, sans-serif; background: #ffffff !important; color: #000000 !important; width: 100%; max-width: 800px; min-height: 250mm; margin: 0 auto; padding: 20px 28px; box-sizing: border-box; line-height: 1.35; font-size: 14px; display: flex; flex-direction: column;">
      
      <!-- Encabezado superior navegador / PDF -->
      <div style="display: flex; justify-content: space-between; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: normal; color: #000000; margin-bottom: 22px;">
        <span>${fechaHoraImpresion}</span>
        <span>. ACTA DE EGRESO</span>
      </div>

      <!-- Cabecera Institucional: Hospital Alto Hospicio + Correo + Fecha a la derecha (sin logo) -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div>
          <div style="font-size: 20px; font-weight: 800; color: #1e293b; line-height: 1.15;">
            Hospital<br/><span style="font-size: 18px; font-weight: 800;">Alto Hospicio</span>
          </div>
          <div style="font-size: 14px; color: #1e293b; margin-top: 10px; line-height: 1.35;">
            Servicio de Salud Tarapacá<br/>
            <span style="color: #0284c7; text-decoration: underline;">correo@redsalud.gob.cl</span>
          </div>
        </div>

        <div style="text-align: right; font-size: 14px; color: #000000; padding-top: 24px;">
          ${escapeHtml(fechaLarga)}
        </div>
      </div>

      <!-- Título Principal Centrado y Destacado -->
      <div style="text-align: center; margin: 24px 0 20px 0;">
        <div style="font-size: 20px; font-weight: 800; color: #000000; letter-spacing: 0.5px; text-transform: uppercase;">
          . ACTA DE EGRESO
        </div>
      </div>

      <!-- Bloque de Metadatos y Detalle (14px - 15px) -->
      <div style="font-size: 14px; line-height: 1.55; color: #000000; margin-bottom: 16px;">
        <div><strong>Bodega:</strong> ${escapeHtml(bodega)}</div>
        <div><strong>Programa:</strong> ${escapeHtml(programa)}</div>
        <div><strong>Tipo de Egreso:</strong> ${escapeHtml(tipoEgreso)}</div>
        <div><strong>Establecimiento:</strong> ${escapeHtml(establecimiento)}</div>
        <div><strong>Nota:</strong> ${escapeHtml(nota)}</div>
      </div>

      <!-- Tabla Oficial de Insumos con Bordes Negros -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-bottom: 50px;">
        <thead>
          <tr style="background: #ffffff; color: #000000;">
            <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left; width: 90px; font-weight: 700; font-size: 14px;">Código</th>
            <th style="border: 1px solid #000000; padding: 6px 8px; text-align: center; width: 60px; font-weight: 700; font-size: 14px;">Cant.</th>
            <th style="border: 1px solid #000000; padding: 6px 8px; text-align: center; font-weight: 700; font-size: 14px;">Detalle de Insumos / Producto</th>
            <th style="border: 1px solid #000000; padding: 6px 8px; text-align: center; width: 100px; font-weight: 700; font-size: 14px;">Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Área de Firmas Oficiales: Responsable Bodega de Tránsito y Funcionario que Recibe (11px letra simple) -->
      <div style="display: flex; justify-content: space-around; margin-top: 50px; margin-bottom: 40px; page-break-inside: avoid; break-inside: avoid;">
        <div style="width: 280px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: normal; color: #000000; line-height: 1.45;">
          <div style="border-top: 1px solid #000000; margin-bottom: 8px;"></div>
          <div style="font-size: 11px; font-weight: normal;">RESPONSABLE BODEGA DE TRÁNSITO</div>
          <div style="font-size: 11px; font-weight: normal;">Arturo Gómez Echegoyen</div>
        </div>
        <div style="width: 280px; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: normal; color: #000000; line-height: 1.45;">
          <div style="border-top: 1px solid #000000; margin-bottom: 8px;"></div>
          <div style="font-size: 11px; font-weight: normal;">FUNCIONARIO QUE RECIBE</div>
          <div style="font-size: 11px; font-weight: normal;">${escapeHtml(funcionarioRecibe || '__________________________')}</div>
        </div>
      </div>

      <!-- Pie de Página Institucional Destacado al Final de la Hoja Tamaño Carta (11px letra simple, sin línea) -->
      <div style="text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: normal; color: #000000; line-height: 1.45; margin-top: auto; padding-top: 24px;">
        <div style="font-size: 11px; font-weight: normal; letter-spacing: 0.5px;">SERVICIO DE SALUD TARAPACÁ</div>
        <div style="font-size: 11px; font-weight: normal; color: #1e293b;">Aníbal Pinto #815, Iquique - Fono: 572409495 - www.saludiquique.gob.cl</div>
        <div style="font-size: 11px; font-weight: normal; color: #475569;">Hospital Alto Hospicio · Red Asistencial Tarapacá</div>
        <div style="font-size: 11px; font-weight: normal; color: #475569; margin-top: 6px; text-align: center;">
          https://i.saludtarapaca.gob.cl/warehouse/store/5/control/${escapeHtml(numActa)}/pdf
        </div>
      </div>

    </div>
  `;
}

/**
 * 2. Template: Reporte Oficial de Trazabilidad de Equipos (Médicos e Industriales / Préstamos)
 */
export function buildReporteTrazabilidadEquiposTemplate(
  equipos: TrazabilidadEquipo[] = [],
  usuario = 'Arturo Gomez Echegoyen',
  dateStr = today()
): string {
  const eqList = Array.isArray(equipos) ? equipos : [];
  const totalEquipos = eqList.reduce((acc, t) => acc + (t?.cantidad || 1), 0);
  const totalVal = eqList.reduce(
    (acc, t) => acc + (t?.costoTotal || (t?.cantidad || 1) * (t?.valorUnitario || 0)),
    0
  );

  const rows = eqList
    .map(
      (t, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; width: 30px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; width: 75px; color: #475569;">${escapeHtml(t?.fecha || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 700; color: #003366; width: 85px;">${escapeHtml(t?.codigo || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 600; color: #0f172a;">${escapeHtml(t?.nombreEquipo || 'Equipo')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #334155; width: 90px;">${escapeHtml(t?.marca || '—')} / ${escapeHtml(t?.modelo || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-family: monospace; font-size: 8pt; width: 80px;">${escapeHtml(t?.nSerie || 'S/N')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; font-weight: 700; width: 45px;">${t?.cantidad || 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #334155;">${escapeHtml(t?.institucionExterna || t?.servClinico || 'HAH')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; font-weight: 700; color: #0f172a; width: 80px;">${fmtMoney(t?.costoTotal || (t?.cantidad || 1) * (t?.valorUnitario || 0))}</td>
      </tr>
    `
    )
    .join('');

  const tablaHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1px solid #cbd5e1;">
      <thead>
        <tr style="background: #f1f5f9; color: #0f172a; border-bottom: 1.5px solid #cbd5e1;">
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 30px;">N°</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 75px;">Fecha</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 85px;">Código</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Equipo / Descripción</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 90px;">Marca / Mod</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 80px;">N° Serie</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 45px;">Cant.</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Destino / Servicio</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; width: 80px;">Total Neto</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="9" style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; color: #64748b;">(No hay equipos registrados en el sistema actualmente)</td></tr>'}
      </tbody>
      ${
        eqList.length > 0
          ? `
        <tfoot>
          <tr style="background: #f8fafc; font-weight: 700; border-top: 1.5px solid #cbd5e1;">
            <td colspan="6" style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">TOTAL GENERAL CONTROLADO:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${totalEquipos} uds.</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;"></td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: #003366;">${fmtMoney(totalVal)}</td>
          </tr>
        </tfoot>
      `
          : ''
      }
    </table>
  `;

  return wrapHospitalDocument({
    idDocumento: 'REP-TRAZ-EQ',
    subtitulo: 'SUBDIRECCIÓN ADMINISTRATIVA · CONTROL DE TRAZABILIDAD DE EQUIPOS',
    fecha: dateStr,
    camposMetadata: [
      { label: 'Responsable / Encargado', value: usuario },
      { label: 'Total Documentos / Fichas', value: `${eqList.length} registros` },
      { label: 'Total Unidades Registradas', value: `${totalEquipos} unidades` },
      { label: 'Valorización Total Estimada', value: fmtMoney(totalVal) },
    ],
    tituloSeccion: 'Inventario Oficial de Equipos en Préstamo y Control Patrimonial:',
    tablaHtml,
    observaciones:
      'Control de ingreso y egreso bajo control estricto de Guías de Despacho y Órdenes de Compra. Equipos en préstamo, comodato o ingreso patrimonial del Hospital Alto Hospicio.',
    firmaIzquierda: {
      cargo: 'Emitido Conforme',
      nombre: usuario,
      entidad: 'Bodega de Tránsito · HAH',
      aclaracion: 'Firma y Timbre Encargado',
    },
    firmaDerecha: {
      cargo: 'V°B° Jefatura',
      entidad: 'Subdirección Administrativa / Operaciones',
      aclaracion: 'Firma, Timbre y V°B°',
    },
  });
}

/**
 * 3. Template: Reporte Oficial de Trazabilidad de Herramientas
 */
export function buildReporteTrazabilidadHerramientasTemplate(
  herramientas: Herramienta[] = [],
  usuario = 'Arturo Gomez Echegoyen',
  dateStr = today()
): string {
  const herList = Array.isArray(herramientas) ? herramientas : [];
  const totalCant = herList.reduce((acc, h) => acc + (h?.cantidad || 1), 0);
  const totalVal = herList.reduce(
    (acc, h) => acc + (h?.costoTotal || (h?.cantidad || 1) * (h?.valorUnitario || 0)),
    0
  );

  const rows = herList
    .map(
      (h, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; width: 30px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; width: 75px; color: #475569;">${escapeHtml(h?.fecha || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 700; color: #003366; width: 85px;">${escapeHtml(h?.codigo || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 600; color: #0f172a;">${escapeHtml(h?.descripcion || 'Herramienta')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; font-weight: 700; width: 45px;">${h?.cantidad || 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #334155; width: 110px;">${escapeHtml(h?.servicioDestino || 'Mantención')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #334155; width: 110px;">${escapeHtml(h?.personaRecibe || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; width: 75px;">${fmtMoney(h?.valorUnitario || 0)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; font-weight: 700; color: #0f172a; width: 80px;">${fmtMoney(h?.costoTotal || (h?.cantidad || 1) * (h?.valorUnitario || 0))}</td>
      </tr>
    `
    )
    .join('');

  const tablaHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1px solid #cbd5e1;">
      <thead>
        <tr style="background: #f1f5f9; color: #0f172a; border-bottom: 1.5px solid #cbd5e1;">
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 30px;">N°</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 75px;">Fecha</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 85px;">Código</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Descripción Herramienta</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 45px;">Cant.</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 110px;">Servicio Destino</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 110px;">Persona que Recibe</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; width: 75px;">Val. Unit.</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; width: 80px;">Total Neto</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="9" style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; color: #64748b;">(No hay herramientas registradas en el sistema actualmente)</td></tr>'}
      </tbody>
      ${
        herList.length > 0
          ? `
        <tfoot>
          <tr style="background: #f8fafc; font-weight: 700; border-top: 1.5px solid #cbd5e1;">
            <td colspan="4" style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">TOTAL GENERAL HERRAMIENTAS:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${totalCant} uds.</td>
            <td colspan="3" style="border: 1px solid #cbd5e1; padding: 6px;"></td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: #003366;">${fmtMoney(totalVal)}</td>
          </tr>
        </tfoot>
      `
          : ''
      }
    </table>
  `;

  return wrapHospitalDocument({
    idDocumento: 'REP-TRAZ-HER',
    subtitulo: 'UNIDAD DE MANTENCIÓN · CONTROL DE TRAZABILIDAD DE HERRAMIENTAS',
    fecha: dateStr,
    camposMetadata: [
      { label: 'Responsable / Encargado', value: usuario },
      { label: 'Total Ítems en Registro', value: `${herList.length} ítems` },
      { label: 'Total Unidades en Control', value: `${totalCant} unidades` },
      { label: 'Valorización Total Estimada', value: fmtMoney(totalVal) },
    ],
    tituloSeccion: 'Detalle de Herramientas en Control y Asignación Institucional:',
    tablaHtml,
    observaciones:
      'Herramientas entregadas bajo cargo de recepción estricto para mantención y servicios del Hospital Alto Hospicio.',
    firmaIzquierda: {
      cargo: 'Entregado por',
      nombre: usuario,
      entidad: 'Bodega de Tránsito · HAH',
      aclaracion: 'Firma y Timbre',
    },
    firmaDerecha: {
      cargo: 'Recibido por',
      entidad: 'Unidad de Mantención / Servicios HAH',
      aclaracion: 'Firma, Nombre y V°B°',
    },
  });
}

/**
 * 4. Template: Reporte Oficial de Trazabilidad de Equipos Menores
 */
export function buildReporteTrazabilidadEquiposMenoresTemplate(
  equiposMenores: EquipoMenor[] = [],
  usuario = 'Arturo Gomez Echegoyen',
  dateStr = today()
): string {
  const eqmList = Array.isArray(equiposMenores) ? equiposMenores : [];
  const totalCant = eqmList.reduce((acc, eq) => acc + (eq?.cantidad || 1), 0);
  const totalVal = eqmList.reduce(
    (acc, eq) => acc + (eq?.costoTotal || (eq?.cantidad || 1) * (eq?.valorUnitario || 0)),
    0
  );

  const rows = eqmList
    .map(
      (eq, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; width: 30px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; width: 75px; color: #475569;">${escapeHtml(eq?.fecha || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 700; color: #003366; width: 85px;">${escapeHtml(eq?.codigo || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 600; color: #0f172a;">${escapeHtml(eq?.nombreEquipo || 'Equipo Menor')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #334155; width: 90px;">${escapeHtml(eq?.marca || '—')} / ${escapeHtml(eq?.modelo || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-family: monospace; font-size: 8pt; width: 75px;">${escapeHtml(eq?.serie || 'S/N')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; font-weight: 700; width: 45px;">${eq?.cantidad || 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #334155; width: 100px;">${escapeHtml(eq?.servicioDestino || 'UCI')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #334155; width: 100px;">${escapeHtml(eq?.quienRecibe || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; font-weight: 700; color: #0f172a; width: 80px;">${fmtMoney(eq?.costoTotal || (eq?.cantidad || 1) * (eq?.valorUnitario || 0))}</td>
      </tr>
    `
    )
    .join('');

  const tablaHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1px solid #cbd5e1;">
      <thead>
        <tr style="background: #f1f5f9; color: #0f172a; border-bottom: 1.5px solid #cbd5e1;">
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 30px;">N°</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 75px;">Fecha</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 85px;">Código</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Nombre Equipo / Descripción</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 90px;">Marca / Mod</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 75px;">N° Serie</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 45px;">Cant.</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 100px;">Servicio Destino</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 100px;">Persona que Recibe</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; width: 80px;">Total Neto</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="10" style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; color: #64748b;">(No hay equipos menores registrados en el sistema actualmente)</td></tr>'}
      </tbody>
      ${
        eqmList.length > 0
          ? `
        <tfoot>
          <tr style="background: #f8fafc; font-weight: 700; border-top: 1.5px solid #cbd5e1;">
            <td colspan="6" style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">TOTAL GENERAL EQUIPOS MENORES:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${totalCant} uds.</td>
            <td colspan="2" style="border: 1px solid #cbd5e1; padding: 6px;"></td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: #003366;">${fmtMoney(totalVal)}</td>
          </tr>
        </tfoot>
      `
          : ''
      }
    </table>
  `;

  return wrapHospitalDocument({
    idDocumento: 'REP-TRAZ-EQM',
    subtitulo: 'BODEGA GENERAL / CONTROL DE ACTIVOS MENORES',
    fecha: dateStr,
    camposMetadata: [
      { label: 'Responsable / Encargado', value: usuario },
      { label: 'Total Registros de Equipos', value: `${eqmList.length} fichas` },
      { label: 'Total Unidades Registradas', value: `${totalCant} unidades` },
      { label: 'Valorización Total Estimada', value: fmtMoney(totalVal) },
    ],
    tituloSeccion: 'Inventario de Equipos Menores Entregados en Servicios del HAH:',
    tablaHtml,
    observaciones:
      'Equipos menores registrados mediante Guía de Despacho o ingreso directo para servicios del Hospital Alto Hospicio.',
    firmaIzquierda: {
      cargo: 'Entregado Conforme',
      nombre: usuario,
      entidad: 'Bodega de Tránsito · HAH',
      aclaracion: 'Firma y Timbre',
    },
    firmaDerecha: {
      cargo: 'Recibido Conforme',
      entidad: 'Servicio Clínico / Unidad Receptora',
      aclaracion: 'Firma, Nombre y Rut',
    },
  });
}

/**
 * 5. Template: Reporte de Inventario Valorizado (Total, ALI, GOB, EQM, BOT)
 */
export function buildReporteInventarioValorizadoTemplate(
  productos: Producto[] = [],
  fam = 'TOTAL',
  usuario = 'Arturo Gomez Echegoyen',
  dateStr = today()
): string {
  const prodList = Array.isArray(productos) ? productos : [];
  const activos = prodList.filter((p) => p && p.estado === 'Activo');
  const filtrados = fam === 'TOTAL' ? activos : activos.filter((p) => p && p.familia === fam);
  const totalVal = filtrados.reduce((acc, p) => acc + (p?.stock || 0) * (p?.valor || 0), 0);
  const totalStock = filtrados.reduce((acc, p) => acc + (p?.stock || 0), 0);

  const rows = filtrados
    .map(
      (p, idx) => `
      <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; width: 30px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 700; color: #003366; width: 95px;">${escapeHtml(p?.codigo || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 600; color: #0f172a;">${escapeHtml(p?.desc || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; color: #475569; width: 80px;">${escapeHtml(p?.familia || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; font-weight: 700; width: 65px; color: ${(p?.stock || 0) <= (p?.stockMin || 0) ? '#dc2626' : '#0f172a'};">${p?.stock || 0}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; color: #64748b; width: 65px;">${p?.stockMin || 0}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; width: 85px;">${fmtMoney(p?.valor || 0)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: right; font-weight: 700; color: #0f172a; width: 95px;">${fmtMoney((p?.stock || 0) * (p?.valor || 0))}</td>
      </tr>
    `
    )
    .join('');

  const tablaHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1px solid #cbd5e1;">
      <thead>
        <tr style="background: #f1f5f9; color: #0f172a; border-bottom: 1.5px solid #cbd5e1;">
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 30px;">N°</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 95px;">Código</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Descripción del Insumo / Material</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 80px;">Familia</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 65px;">Stock</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 65px;">Mín.</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; width: 85px;">Val. Unit.</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; width: 95px;">Total Neto</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="8" style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; color: #64748b;">(No hay productos en esta familia actualmente)</td></tr>'}
      </tbody>
      ${
        filtrados.length > 0
          ? `
        <tfoot>
          <tr style="background: #f8fafc; font-weight: 700; border-top: 1.5px solid #cbd5e1;">
            <td colspan="4" style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">VALOR TOTAL NETO EN BODEGA (${fam}):</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${totalStock}</td>
            <td colspan="2" style="border: 1px solid #cbd5e1; padding: 6px;"></td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: #003366;">${fmtMoney(totalVal)}</td>
          </tr>
        </tfoot>
      `
          : ''
      }
    </table>
  `;

  return wrapHospitalDocument({
    idDocumento: `INV-VAL-${fam}`,
    subtitulo: `BODEGA GENERAL · REPORTE OFICIAL DE INVENTARIO VALORIZADO (${fam})`,
    fecha: dateStr,
    camposMetadata: [
      { label: 'Encargado de Bodega', value: usuario },
      { label: 'Familia / Categoría', value: fam === 'TOTAL' ? 'Total Bodega' : fam },
      { label: 'Total Ítems en Catálogo', value: `${filtrados.length} productos` },
      { label: 'Valor Total Neto en Bodega', value: fmtMoney(totalVal) },
    ],
    tituloSeccion: 'Detalle de Insumos y Existencias Valorizadas:',
    tablaHtml,
    observaciones:
      'Valores calculados al costo neto vigente sin IVA. Reporte generado directamente desde la base de datos de Bodega de Tránsito HAH.',
    firmaIzquierda: {
      cargo: 'Emitido por',
      nombre: usuario,
      entidad: 'Encargado Bodega de Tránsito · HAH',
      aclaracion: 'Firma y Timbre',
    },
    firmaDerecha: {
      cargo: 'V°B° Jefatura',
      entidad: 'Abastecimiento y Logística HAH',
      aclaracion: 'V°B° y Timbre Institucional',
    },
  });
}

/**
 * 6. Template: Resumen de Movimientos Kardex por Familias
 * Genera un informe institucional ordenado, estructurado y consolidado por familias de insumos.
 */
export function buildKardexResumenTemplate(
  kardex: any[] = [],
  productos: any[] = [],
  dateStr = today(),
  familias: FamiliaCatalogo[] = INITIAL_FAMILIAS,
  familiaFiltro?: string
): string {
  const kList: KardexMovimiento[] = Array.isArray(kardex) ? kardex : [];
  const pList: Producto[] = Array.isArray(productos) ? productos : [];

  // Mapear familias base conocidas
  const knownFamMap = new Map<string, FamiliaCatalogo>();
  const baseFam = Array.isArray(familias) && familias.length > 0 ? familias : INITIAL_FAMILIAS;
  baseFam.forEach((f) => {
    if (f && f.id) knownFamMap.set(f.id.toUpperCase(), f);
  });

  // Agregar familias presentes en el catálogo de productos
  pList.forEach((p) => {
    if (p && p.familia) {
      const fid = String(p.familia).toUpperCase();
      if (!knownFamMap.has(fid)) {
        knownFamMap.set(fid, {
          id: fid,
          nombre: `Familia ${fid}`,
          descripcion: `Insumos clasificados bajo código ${fid}`,
          color: 'blue',
        });
      }
    }
  });

  // Mapa de productos para búsqueda rápida por código
  const prodMap = new Map<string, Producto>();
  pList.forEach((p) => {
    if (p && p.codigo) prodMap.set(p.codigo.trim().toUpperCase(), p);
  });

  // Función para determinar la familia de cada movimiento
  const getMovFam = (m: KardexMovimiento): string => {
    if (!m) return 'OTR';
    const code = (m.codigo || '').trim().toUpperCase();
    if (prodMap.has(code)) {
      return (prodMap.get(code)?.familia || 'OTR').toUpperCase();
    }
    const prefix = code.split('-')[0];
    if (prefix && knownFamMap.has(prefix)) return prefix;
    return 'OTR';
  };

  // Agregar familias presentes en movimientos
  kList.forEach((m) => {
    const f = getMovFam(m);
    if (f !== 'OTR' && !knownFamMap.has(f)) {
      knownFamMap.set(f, {
        id: f,
        nombre: `Familia ${f}`,
        descripcion: `Movimientos registrados para ${f}`,
        color: 'yellow',
      });
    }
  });

  const allActiveFamilies = Array.from(knownFamMap.values());

  // Manejo del filtro por familia (solo la familia filtrada si se especifica)
  const filtroLimpio = (familiaFiltro || '').trim().toUpperCase();
  const isFiltered = Boolean(
    filtroLimpio && filtroLimpio !== 'TODAS' && filtroLimpio !== 'TOTAL'
  );
  const matchedFamilies = allActiveFamilies.filter((f) => f.id.toUpperCase() === filtroLimpio);
  const activeFamilies = isFiltered
    ? matchedFamilies.length > 0
      ? matchedFamilies
      : [
          {
            id: filtroLimpio,
            nombre: `Familia ${filtroLimpio}`,
            descripcion: `Insumos clasificados bajo ${filtroLimpio}`,
            color: 'blue',
          },
        ]
    : allActiveFamilies;

  // Calcular métricas por cada familia
  const familyDataList = activeFamilies.map((fam) => {
    const famProducts = pList.filter((p) => (p?.familia || '').toUpperCase() === fam.id);
    const famMovs = kList.filter((m) => getMovFam(m) === fam.id);

    const totalStock = famProducts.reduce((sum, p) => sum + (p?.stock || 0), 0);
    const totalValor = famProducts.reduce((sum, p) => sum + (p?.stock || 0) * (p?.valor || 0), 0);

    const entradasCount = famMovs.filter((m) => m?.tipo === 'ENTRADA').length;
    const salidasCount = famMovs.filter((m) => m?.tipo === 'SALIDA').length;

    const entradasUds = famMovs
      .filter((m) => m?.tipo === 'ENTRADA')
      .reduce((sum, m) => sum + (m?.cantidad || 0), 0);
    const salidasUds = famMovs
      .filter((m) => m?.tipo === 'SALIDA')
      .reduce((sum, m) => sum + (m?.cantidad || 0), 0);

    return {
      fam,
      productos: famProducts,
      movimientos: famMovs,
      totalStock,
      totalValor,
      entradasCount,
      salidasCount,
      entradasUds,
      salidasUds,
    };
  });

  // Totales Globales Consolidados (o de la familia filtrada)
  const targetProducts = isFiltered
    ? pList.filter((p) => (p?.familia || '').toUpperCase() === filtroLimpio)
    : pList;
  const targetMovs = isFiltered
    ? kList.filter((m) => getMovFam(m) === filtroLimpio)
    : kList;

  const grandTotalStock = targetProducts.reduce((acc, p) => acc + (p?.stock || 0), 0);
  const grandTotalValor = targetProducts.reduce((acc, p) => acc + (p?.stock || 0) * (p?.valor || 0), 0);
  const grandTotalEntradasUds = targetMovs
    .filter((m) => m?.tipo === 'ENTRADA')
    .reduce((sum, m) => sum + (m?.cantidad || 0), 0);
  const grandTotalSalidasUds = targetMovs
    .filter((m) => m?.tipo === 'SALIDA')
    .reduce((sum, m) => sum + (m?.cantidad || 0), 0);
  const grandTotalEntradasCount = targetMovs.filter((m) => m?.tipo === 'ENTRADA').length;
  const grandTotalSalidasCount = targetMovs.filter((m) => m?.tipo === 'SALIDA').length;

  // ── 1. Filas de la Tabla 1 (Consolidado Ejecutivo por Familias) ──
  const resumenEjecutivoRows = familyDataList
    .map((item, idx) => {
      const porcentaje =
        grandTotalValor > 0 ? ((item.totalValor / grandTotalValor) * 100).toFixed(1) : '0.0';
      const colorBadge =
        item.fam.id === 'ALI'
          ? '#0284c7'
          : item.fam.id === 'GOB'
          ? '#9333ea'
          : item.fam.id === 'EQM'
          ? '#2563eb'
          : item.fam.id === 'BOT'
          ? '#d97706'
          : '#475569';

      return `
      <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: 700; width: 35px; color: #475569;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 800; text-align: center; width: 85px;">
          <span style="display: inline-block; background: ${colorBadge}15; color: ${colorBadge}; border: 1px solid ${colorBadge}40; padding: 2px 7px; border-radius: 4px; font-size: 8.5pt;">
            ${escapeHtml(item.fam.id)}
          </span>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 700; color: #0f172a;">
          ${escapeHtml(item.fam.nombre)}
          <div style="font-size: 7.5pt; font-weight: 400; color: #64748b;">${escapeHtml(item.fam.descripcion || 'Sin descripción')}</div>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: 700; width: 75px; color: #0f172a;">
          ${item.productos.length} ítems
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 90px; color: #16a34a; font-weight: 700;">
          +${item.entradasUds} uds
          <div style="font-size: 7.5pt; color: #64748b; font-weight: 400;">(${item.entradasCount} movs)</div>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 90px; color: #dc2626; font-weight: 700;">
          -${item.salidasUds} uds
          <div style="font-size: 7.5pt; color: #64748b; font-weight: 400;">(${item.salidasCount} movs)</div>
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: 800; width: 85px; color: #003366; font-size: 9.5pt;">
          ${item.totalStock} uds
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-weight: 700; width: 110px; color: #0f172a;">
          ${fmtMoney(item.totalValor)}
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 70px; font-weight: 600; color: #475569;">
          ${porcentaje}%
        </td>
      </tr>
    `;
    })
    .join('');

  // ── 2. Secciones Detalladas por Cada Familia ──
  const detalleFamiliasHtml = familyDataList
    .map((item, famIdx) => {
      const colorBadge =
        item.fam.id === 'ALI'
          ? '#0284c7'
          : item.fam.id === 'GOB'
          ? '#9333ea'
          : item.fam.id === 'EQM'
          ? '#2563eb'
          : item.fam.id === 'BOT'
          ? '#d97706'
          : '#003366';

      // Subtabla A: Insumos de la Familia
      const prodRows =
        item.productos.length === 0
          ? `<tr><td colspan="8" style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #94a3b8; font-style: italic;">No hay insumos registrados en el catálogo para esta familia.</td></tr>`
          : item.productos
              .map((p, pIdx) => {
                const pMovs = kList.filter((m) => (m?.codigo || '').trim().toUpperCase() === p.codigo.trim().toUpperCase());
                const pEntradas = pMovs
                  .filter((m) => m?.tipo === 'ENTRADA')
                  .reduce((sum, m) => sum + (m?.cantidad || 0), 0);
                const pSalidas = pMovs
                  .filter((m) => m?.tipo === 'SALIDA')
                  .reduce((sum, m) => sum + (m?.cantidad || 0), 0);
                const valorTot = (p?.stock || 0) * (p?.valor || 0);
                const isCritico = (p?.stock || 0) <= (p?.stockMin || 0);

                return `
              <tr style="border-bottom: 1px solid #cbd5e1; background: ${pIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; width: 30px; color: #64748b;">${pIdx + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; font-weight: 700; color: #003366; width: 85px;">${escapeHtml(p?.codigo || '—')}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; font-weight: 600; color: #0f172a;">${escapeHtml(p?.desc || '—')}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; color: #16a34a; font-weight: 600; width: 65px;">${pEntradas > 0 ? `+${pEntradas}` : '—'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; color: #dc2626; font-weight: 600; width: 65px;">${pSalidas > 0 ? `-${pSalidas}` : '—'}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; font-weight: 800; width: 75px; color: ${isCritico ? '#dc2626' : '#003366'};">
                  ${p?.stock || 0}
                  <span style="font-size: 7pt; font-weight: 400; color: #64748b;">(Mín:${p?.stockMin || 0})</span>
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; width: 85px; color: #334155;">${fmtMoney(p?.valor || 0)}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; font-weight: 700; width: 95px; color: #0f172a;">${fmtMoney(valorTot)}</td>
              </tr>
            `;
              })
              .join('');

      // Subtabla B: Movimientos de la Familia
      const movRows =
        item.movimientos.length === 0
          ? `<tr><td colspan="7" style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #94a3b8; font-style: italic;">Sin movimientos de Kardex registrados para esta familia.</td></tr>`
          : item.movimientos
              .slice(0, 25)
              .map((m, mIdx) => {
                const esEntrada = m?.tipo === 'ENTRADA';
                return `
              <tr style="border-bottom: 1px solid #cbd5e1; background: ${mIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="border: 1px solid #cbd5e1; padding: 4px 5px; text-align: center; width: 28px; color: #64748b;">${mIdx + 1}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; width: 80px; color: #475569; font-size: 7.8pt;">${escapeHtml(m?.fecha || '—')}</td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; font-weight: 700; width: 68px; color: ${esEntrada ? '#16a34a' : '#dc2626'};">
                  ${esEntrada ? '▼ ENTRADA' : '▲ SALIDA'}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; color: #0f172a;">
                  <strong style="color: #003366;">${escapeHtml(m?.codigo || '—')}</strong> - ${escapeHtml(m?.producto || '—')}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; font-weight: 700; width: 60px; color: ${esEntrada ? '#16a34a' : '#dc2626'};">
                  ${esEntrada ? `+${m?.cantidad || 0}` : `-${m?.cantidad || 0}`}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; color: #334155; font-size: 7.8pt; width: 140px;">
                  ${escapeHtml(m?.unidad || m?.persona || '—')}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 4px 6px; color: #475569; font-size: 7.8pt; width: 90px;">
                  ${escapeHtml(m?.guia || m?.factura || m?.oc || '—')}
                </td>
              </tr>
            `;
              })
              .join('');

      return `
      <div style="margin-top: 18px; border: 1.5px solid ${colorBadge}40; border-radius: 6px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; background: #ffffff;">
        <!-- Header de la Familia -->
        <div style="background: linear-gradient(90deg, #002244 0%, #003366 100%); color: #ffffff; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: ${colorBadge}; color: #ffffff; font-weight: 900; font-size: 9pt; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;">
                ${escapeHtml(item.fam.id)}
              </span>
              <span style="font-size: 11pt; font-weight: 800; letter-spacing: 0.3px;">
                ${escapeHtml(item.fam.nombre.toUpperCase())}
              </span>
            </div>
            <div style="font-size: 8pt; color: #cbd5e1; margin-top: 2px;">
              ${escapeHtml(item.fam.descripcion || 'Insumos clasificados')}
            </div>
          </div>
          <div style="display: flex; gap: 12px; font-size: 8pt; background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
            <div>Ítems: <strong>${item.productos.length}</strong></div>
            <div>Stock: <strong style="color: #38bdf8;">${item.totalStock} uds</strong></div>
            <div>Entradas: <strong style="color: #4ade80;">+${item.entradasUds}</strong></div>
            <div>Salidas: <strong style="color: #f87171;">-${item.salidasUds}</strong></div>
            <div>Valorizado: <strong style="color: #fde047;">${fmtMoney(item.totalValor)}</strong></div>
          </div>
        </div>

        <div style="padding: 10px 12px;">
          <!-- Subtítulo Catálogo -->
          <div style="font-size: 8.5pt; font-weight: 700; color: #003366; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
            <span>📦 Catálogo de Insumos y Balance de Existencias (${escapeHtml(item.fam.id)})</span>
            <span style="font-size: 7.5pt; color: #64748b; font-weight: 400;">Total ${item.productos.length} insumos catalogados</span>
          </div>

          <!-- Tabla de Insumos -->
          <table style="width: 100%; border-collapse: collapse; font-size: 8pt; border: 1px solid #cbd5e1; margin-bottom: 12px;">
            <thead>
              <tr style="background: #f1f5f9; color: #0f172a; border-bottom: 1px solid #cbd5e1;">
                <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; width: 30px;">N°</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; width: 85px;">Código</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left;">Descripción del Insumo</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; width: 65px; color: #16a34a;">Entradas</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; width: 65px; color: #dc2626;">Salidas</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; width: 75px;">Stock</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; width: 85px;">P. Unit.</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: right; width: 95px;">Total Neto</th>
              </tr>
            </thead>
            <tbody>
              ${prodRows}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 700; border-top: 1.5px solid #cbd5e1; font-size: 8pt;">
                <td colspan="3" style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; color: #003366;">
                  SUBTOTAL FAMILIA ${escapeHtml(item.fam.id)}:
                </td>
                <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center; color: #16a34a;">+${item.entradasUds}</td>
                <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center; color: #dc2626;">-${item.salidasUds}</td>
                <td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center; color: #003366; font-weight: 800;">${item.totalStock}</td>
                <td style="border: 1px solid #cbd5e1; padding: 5px;"></td>
                <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; color: #003366; font-weight: 800;">${fmtMoney(item.totalValor)}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Subtítulo Movimientos -->
          <div style="font-size: 8.5pt; font-weight: 700; color: #003366; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
            <span>📋 Movimientos Registrados en Kardex (${escapeHtml(item.fam.id)})</span>
            <span style="font-size: 7.5pt; color: #64748b; font-weight: 400;">${item.movimientos.length} movimientos en período</span>
          </div>

          <!-- Tabla Movimientos -->
          <table style="width: 100%; border-collapse: collapse; font-size: 7.8pt; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background: #f1f5f9; color: #0f172a; border-bottom: 1px solid #cbd5e1;">
                <th style="border: 1px solid #cbd5e1; padding: 4px; text-align: center; width: 28px;">N°</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; width: 80px;">Fecha</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; width: 68px;">Tipo</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left;">Insumo / Detalle</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: center; width: 60px;">Cant.</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; width: 140px;">Destino / Solicitante</th>
                <th style="border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; width: 90px;">Doc. Respaldo</th>
              </tr>
            </thead>
            <tbody>
              ${movRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
    })
    .join('');

  // ── Construcción del Documento Completo ──
  return `
    <div class="hah-official-sheet hah-kardex-resumen" style="font-family: Arial, Helvetica, sans-serif; background: #ffffff !important; color: #000000 !important; width: 100%; max-width: 800px; margin: 0 auto; padding: 14px 20px; box-sizing: border-box; line-height: 1.35;">

      <!-- ── ENCABEZADO INSTITUCIONAL OFICIAL ── -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div>
          <div style="font-weight: 900; font-size: 15pt; color: #003366; letter-spacing: 0.5px; text-transform: uppercase;">
            HOSPITAL ALTO HOSPICIO
          </div>
          <div style="font-size: 8.5pt; color: #475569; font-weight: 700; margin-top: 2px; text-transform: uppercase;">
            SERVICIO DE SALUD TARAPACÁ · RED ASISTENCIAL TARAPACÁ
          </div>
          <div style="font-size: 8pt; color: #0284c7; font-weight: 700; margin-top: 1px;">
            DEPARTAMENTO DE LOGÍSTICA Y ABASTECIMIENTO · BODEGA DE TRÁNSITO GENERAL
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13pt; font-weight: 900; color: #003366; letter-spacing: 0.5px;">
            ${isFiltered ? `KDX-RES-${escapeHtml(activeFamilies[0].id)}` : 'KDX-RES-FAM'}
          </div>
          <div style="font-size: 8.5pt; color: #64748b; font-weight: 600; margin-top: 2px;">
            Fecha de Emisión: <strong>${escapeHtml(dateStr)}</strong>
          </div>
          <div style="font-size: 7.5pt; color: #0f766e; font-weight: 700; margin-top: 1px;">
            SISTEMA HOSPITALARIO HAH-CGI5
          </div>
        </div>
      </div>

      <!-- Línea Divisoria Institucional -->
      <div style="height: 2.5px; background: #003366; width: 100%; margin: 6px 0 12px 0;"></div>

      <!-- TÍTULO PRINCIPAL DEL DOCUMENTO -->
      <div style="text-align: center; margin-bottom: 12px;">
        <div style="font-size: 13.5pt; font-weight: 900; color: #003366; letter-spacing: 0.3px; text-transform: uppercase;">
          ${isFiltered ? `RESUMEN OFICIAL DE KARDEX · FAMILIA ${escapeHtml(activeFamilies[0].id)}` : 'RESUMEN OFICIAL DE KARDEX POR FAMILIAS DE INSUMOS'}
        </div>
        <div style="font-size: 8.5pt; color: #475569; font-weight: 600; margin-top: 2px;">
          ${isFiltered ? `Consolidado de Insumos, Saldos Físicos y Movimientos — ${escapeHtml(activeFamilies[0].nombre)}` : 'Consolidado Periódico de Movimientos, Saldos Físicos y Existencias Valorizadas'}
        </div>
        ${isFiltered ? `
          <div style="margin-top: 5px;">
            <span style="display: inline-block; background: #003366; color: #ffffff; font-weight: 800; font-size: 8pt; padding: 2px 10px; border-radius: 4px; letter-spacing: 0.4px;">
              FILTRO APLICADO: FAMILIA ${escapeHtml(activeFamilies[0].id)} (${escapeHtml(activeFamilies[0].nombre)})
            </span>
          </div>
        ` : ''}
      </div>

      <!-- ── BLOQUE DE INDICADORES GLOBALES (KPIs) ── -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px;">
        <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">
            ${isFiltered ? 'Familia Seleccionada' : 'Familias de Insumos'}
          </div>
          <div style="font-size: 14pt; font-weight: 900; color: #003366; margin-top: 2px;">
            ${isFiltered ? escapeHtml(activeFamilies[0].id) : activeFamilies.length}
          </div>
          <div style="font-size: 7.5pt; color: #475569;">
            ${isFiltered ? `${targetProducts.length} ítems de la familia` : `${pList.length} ítems en catálogo`}
          </div>
        </div>
        <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">Stock Físico en Bodega</div>
          <div style="font-size: 14pt; font-weight: 900; color: #0284c7; margin-top: 2px;">${grandTotalStock} uds</div>
          <div style="font-size: 7.5pt; color: #475569;">Existencias auditadas</div>
        </div>
        <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">Movimientos Totales</div>
          <div style="font-size: 14pt; font-weight: 900; color: #0f172a; margin-top: 2px;">${targetMovs.length}</div>
          <div style="font-size: 7.5pt; color: #16a34a; font-weight: 700;">+${grandTotalEntradasUds} E <span style="color:#64748b;">|</span> <span style="color:#dc2626;">-${grandTotalSalidasUds} S</span></div>
        </div>
        <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Inventario Neto</div>
          <div style="font-size: 14pt; font-weight: 900; color: #16a34a; margin-top: 2px;">${fmtMoney(grandTotalValor)}</div>
          <div style="font-size: 7.5pt; color: #475569;">Valorizado al costo neto</div>
        </div>
      </div>

      <!-- ── METADATOS DE RESPONSABILIDAD ── -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; font-size: 8.5pt; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px;">
        <div><span style="font-weight: 700; color: #0f172a;">Responsable de Bodega:</span> <span style="color: #334155;">Arturo Gómez Echegoyen (Bodega de Tránsito · HAH)</span></div>
        <div><span style="font-weight: 700; color: #0f172a;">Período / Fecha Emisión:</span> <span style="color: #334155;">${escapeHtml(dateStr)} (Vigencia 24/7)</span></div>
        <div><span style="font-weight: 700; color: #0f172a;">Unidad Administrativa:</span> <span style="color: #334155;">Servicio de Salud Tarapacá · Red Hospitalaria</span></div>
        <div><span style="font-weight: 700; color: #0f172a;">Criterio de Organización:</span> <span style="color: #0284c7; font-weight: 700;">${isFiltered ? `Filtro Específico: Familia ${escapeHtml(activeFamilies[0].id)} (${escapeHtml(activeFamilies[0].nombre)})` : 'Agrupación Estructurada por Familias de Insumos'}</span></div>
      </div>

      <!-- ── TABLA 1: CUADRO CONSOLIDADO EJECUTIVO POR FAMILIAS ── -->
      <div style="margin-bottom: 18px;">
        <div style="font-weight: 800; font-size: 10pt; color: #003366; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
          <span>📊 ${isFiltered ? `TABLA 1: CUADRO RESUMEN DE LA FAMILIA ${escapeHtml(activeFamilies[0].id)}` : 'TABLA 1: CUADRO RESUMEN CONSOLIDADO POR FAMILIAS DE INSUMOS'}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1.5px solid #003366;">
          <thead>
            <tr style="background: #003366; color: #ffffff;">
              <th style="border: 1px solid #002244; padding: 6px; text-align: center; width: 35px;">N°</th>
              <th style="border: 1px solid #002244; padding: 6px; text-align: center; width: 85px;">Cód. Familia</th>
              <th style="border: 1px solid #002244; padding: 6px 8px; text-align: left;">Denominación de la Familia</th>
              <th style="border: 1px solid #002244; padding: 6px; text-align: center; width: 75px;">N° Insumos</th>
              <th style="border: 1px solid #002244; padding: 6px; text-align: center; width: 90px;">Total Entradas</th>
              <th style="border: 1px solid #002244; padding: 6px; text-align: center; width: 90px;">Total Salidas</th>
              <th style="border: 1px solid #002244; padding: 6px; text-align: center; width: 85px;">Stock Físico</th>
              <th style="border: 1px solid #002244; padding: 6px 8px; text-align: right; width: 110px;">Valor Total ($)</th>
              <th style="border: 1px solid #002244; padding: 6px; text-align: center; width: 70px;">% Part.</th>
            </tr>
          </thead>
          <tbody>
            ${resumenEjecutivoRows}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #003366; font-size: 8.5pt;">
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; color: #003366;">
                ${isFiltered ? `TOTAL CONSOLIDADO FAMILIA ${escapeHtml(activeFamilies[0].id)}:` : 'TOTAL GENERAL CONSOLIDADO BODEGA HAH:'}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #003366;">
                ${targetProducts.length} ítems
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #16a34a;">
                +${grandTotalEntradasUds} uds
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #dc2626;">
                -${grandTotalSalidasUds} uds
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #003366; font-size: 10pt;">
                ${grandTotalStock} uds
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; color: #003366; font-size: 9.5pt;">
                ${fmtMoney(grandTotalValor)}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; color: #003366;">
                100.0%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- ── SECCIÓN 2: DESGLOSE Y DETALLE POR FAMILIA ── -->
      <div style="margin-top: 14px;">
        <div style="font-weight: 800; font-size: 10pt; color: #003366; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <span>📦 SECCIÓN 2: DESGLOSE DETALLADO Y CONTROL INDIVIDUAL POR FAMILIAS</span>
        </div>
        <div style="font-size: 8pt; color: #64748b; margin-bottom: 10px;">
          Detalle exhaustivo de insumos, rotación y trazabilidad de movimientos registrado por cada familia de insumos.
        </div>
        ${detalleFamiliasHtml}
      </div>

      <!-- ── OBSERVACIONES Y RESPALDO INSTITUCIONAL ── -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-top: 18px; font-size: 8pt; color: #334155; page-break-inside: avoid; break-inside: avoid;">
        <strong style="color: #003366;">Observaciones y Control de Auditoría:</strong><br/>
        1. Resumen oficial estructurado conforme a la clasificación por familias del Hospital Alto Hospicio (Alimentación, Gineco Obstetricia, Equipos Médicos, Producto en Tránsito y familias autorizadas).<br/>
        2. Toda salida registrada cuenta con su respectiva Acta de Egreso y Despacho correlativa debidamente suscrita por el funcionario receptor.<br/>
        3. Valores monetarios calculados al costo neto unitario de adquisición sin IVA.<br/>
        4. Documento respaldado para procesos de inventario físico, auditoría interna y conciliación con el Servicio de Salud Tarapacá.
      </div>

      <!-- ── CUADRO DE FIRMAS OFICIALES ── -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 34px; page-break-inside: avoid; break-inside: avoid;">
        <div style="border-top: 1.5px solid #000000; padding-top: 6px; text-align: center; font-size: 9pt; line-height: 1.35; color: #000000;">
          <strong>RESPONSABLE BODEGA DE TRÁNSITO</strong><br/>
          Arturo Gómez Echegoyen<br/>
          Bodega de Tránsito · Hospital Alto Hospicio<br/>
          <span style="font-size: 8pt; color: #475569;">Firma y Timbre Oficial</span>
        </div>
        <div style="border-top: 1.5px solid #000000; padding-top: 6px; text-align: center; font-size: 9pt; line-height: 1.35; color: #000000;">
          <strong>V°B° JEFATURA DE LOGÍSTICA Y ABASTECIMIENTO</strong><br/>
          Servicio de Salud Tarapacá<br/>
          Hospital Alto Hospicio<br/>
          <span style="font-size: 8pt; color: #475569;">Firma, Timbre y V°B° Institucional</span>
        </div>
      </div>

      <!-- ── PIE DE PÁGINA INSTITUCIONAL ── -->
      <div style="margin-top: 28px; padding-top: 8px; text-align: center; font-size: 11px; color: #475569; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-weight: 700; color: #003366; letter-spacing: 0.5px;">HOSPITAL ALTO HOSPICIO · SERVICIO DE SALUD TARAPACÁ</div>
        <div style="color: #64748b; margin-top: 2px;">Red Asistencial Tarapacá · Bodega de Tránsito General</div>
        <div style="color: #0284c7; font-weight: 600; margin-top: 2px;">www.saludtarapaca.gob.cl</div>
      </div>

    </div>
  `;
}

/**
 * 7. Template: Reporte Tránsito Despacho
 */
export function buildSinCostoTemplate(sinCostoList: any[] = [], dateStr = today()): string {
  const scList = Array.isArray(sinCostoList) ? sinCostoList : [];
  const rows = scList
    .map(
      (sc, idx) => {
        const despachos = sc?.despachos || [];
        const ultimo = despachos.length ? despachos[despachos.length - 1] : null;
        const unidadDestino = ultimo?.servicio || sc?.unidad || sc?.servicio || '—';
        const funcionarioRecibe = ultimo?.responsable || sc?.persona || sc?.responsable || '—';
        const cant = sc?.cantidad || sc?.stock || 0;

        return `
      <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; width: 28px;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; width: 75px; color: #475569;">${escapeHtml(sc?.fecha || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 700; color: #003366; width: 85px;">${escapeHtml(sc?.codigo || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; font-weight: 600; color: #0f172a;">${escapeHtml(sc?.desc || '—')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; font-weight: 700; width: 45px;">${cant}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #334155;">${escapeHtml(unidadDestino)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #334155;">${escapeHtml(funcionarioRecibe)}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 6px; color: #475569;">${escapeHtml(sc?.obs || ultimo?.observacion || '—')}</td>
      </tr>
    `;
      }
    )
    .join('');

  const tablaHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1px solid #cbd5e1;">
      <thead>
        <tr style="background: #f1f5f9; color: #0f172a; border-bottom: 1.5px solid #cbd5e1;">
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 28px;">N°</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 75px;">Fecha</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 85px;">Código</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Descripción del Insumo</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; width: 45px;">Cant.</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 125px;">Unidad de Destino</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 125px;">Funcionario Recibe</th>
          <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; width: 90px;">Observaciones</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="8" style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; color: #64748b;">(No hay registros en Tránsito Despacho)</td></tr>'}
      </tbody>
    </table>
  `;

  return wrapHospitalDocument({
    idDocumento: 'TRANSITO-DESPACHO',
    subtitulo: 'BODEGA GENERAL · TRÁNSITO DESPACHO',
    fecha: dateStr,
    camposMetadata: [
      { label: 'Total Registros', value: `${scList.length} ítems` },
      { label: 'Responsable Bodega', value: 'Arturo Gómez Echegoyen' },
    ],
    tituloSeccion: 'Detalle de Insumos / Despachos:',
    tablaHtml,
    firmaIzquierda: {
      cargo: 'Encargado de Bodega HAH',
      nombre: 'Arturo Gómez Echegoyen',
      entidad: 'Bodega de Tránsito · HAH',
      aclaracion: 'Firma y Timbre',
    },
    firmaDerecha: {
      cargo: 'V°B° Jefatura',
      entidad: 'Abastecimiento y Logística HAH',
      aclaracion: 'V°B° y Timbre Institucional',
    },
  });
}

/**
 * 8. Template: Documento de Respaldo Adjunto (Imágenes y Fichas Oficiales)
 */
export function buildAttachedDocumentTemplate(
  adjunto: { nombre?: string; tipo?: string; data?: string } = {},
  dateStr = today(),
  renderedPages?: string[]
): string {
  const adj = adjunto || {};
  const isPDF =
    adj.tipo === 'application/pdf' ||
    (adj.nombre || '').toLowerCase().endsWith('.pdf') ||
    (adj.data || '').startsWith('data:application/pdf');

  let contentHtml = '';
  if (renderedPages && renderedPages.length > 0) {
    contentHtml = `
      <div style="text-align: center; padding: 6px 0;">
        ${renderedPages
          .map(
            (pageImg, idx) => `
          <div style="${idx > 0 ? 'page-break-before: always; margin-top: 20px;' : ''} text-align: center;">
            ${renderedPages.length > 1 ? `<div style="font-size: 8pt; color: #64748b; margin-bottom: 4px; text-align: right; font-weight: 600;">Página ${idx + 1} de ${renderedPages.length}</div>` : ''}
            <img
              src="${pageImg}"
              alt="${escapeHtml(adj.nombre || 'Página')} ${idx + 1}"
              style="max-width: 100%; max-height: 840px; width: auto; height: auto; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); background: #ffffff;"
            />
          </div>
        `
          )
          .join('')}
      </div>
    `;
  } else if (isPDF) {
    contentHtml = `
      <div style="text-align: center; padding: 40px 20px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px;">
        <div style="font-size: 38pt; color: #003366; margin-bottom: 12px;">📄</div>
        <div style="font-size: 13pt; font-weight: 700; color: #0f172a;">${escapeHtml(adj.nombre || 'Documento PDF')}</div>
        <div style="font-size: 9.5pt; color: #64748b; margin-top: 6px;">Documento Digital PDF Adjunto al Registro Oficial</div>
        <div style="font-size: 8.5pt; color: #0284c7; margin-top: 10px; font-weight: 600;">Archivo verificado y resguardado en Bodega General HAH</div>
      </div>
    `;
  } else {
    contentHtml = `
      <div style="text-align: center; padding: 12px 0;">
        <img
          src="${adj.data || ''}"
          alt="${escapeHtml(adj.nombre || 'Imagen Adjunta')}"
          style="max-width: 100%; max-height: 700px; object-fit: contain; border: 1.5px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background: #ffffff;"
        />
      </div>
    `;
  }

  return wrapHospitalDocument({
    idDocumento: `DOC-ADJ-${Math.floor(1000 + Math.random() * 9000)}`,
    subtitulo: 'BODEGA GENERAL · DOCUMENTO DE RESPALDO ADJUNTO',
    fecha: dateStr,
    camposMetadata: [
      { label: 'Nombre Documento', value: adj.nombre || 'Respaldo Adjunto' },
      { label: 'Tipo de Formato', value: isPDF ? 'Documento Digital PDF' : 'Imagen de Respaldo' },
      { label: 'Unidad de Resguardo', value: 'Bodega de Tránsito · HAH' },
      { label: 'Estado del Respaldo', value: 'Verificado y Vinculado en Sistema' },
    ],
    tituloSeccion: 'Visualización Oficial del Documento / Comprobante:',
    tablaHtml: contentHtml,
    observaciones:
      'Copia fiel del documento o imagen adjunta al expediente institucional en la plataforma HAH-CGI5.',
    firmaIzquierda: {
      cargo: 'Archivado y Custodiado por',
      nombre: 'Arturo Gómez Echegoyen',
      entidad: 'Bodega de Tránsito · HAH',
      aclaracion: 'Firma y Timbre',
    },
    firmaDerecha: {
      cargo: 'V°B° Jefatura',
      entidad: 'Subdirección Administrativa HAH',
      aclaracion: 'Firma y Timbre Institucional',
    },
  });
}

/**
 * 9. Template: Ficha / Etiqueta de Insumo Valorizado
 */
export function buildProductoEtiquetaTemplate(prod: any, dateStr = today()): string {
  const contentHtml = `
    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 10px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #003366; padding-bottom: 10px; margin-bottom: 14px;">
        <div>
          <div style="font-family: monospace; font-size: 20pt; font-weight: 900; color: #003366; letter-spacing: 1px;">
            ${escapeHtml(prod.codigo || '—')}
          </div>
          <div style="font-size: 14pt; font-weight: 700; color: #0f172a; margin-top: 4px;">
            ${escapeHtml(prod.desc || '—')}
          </div>
        </div>
        <div style="background: #003366; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 11pt; text-align: right;">
          ${escapeHtml(prod.familia || 'INSUMO')}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 10pt;">
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
          <div style="font-size: 8pt; color: #64748b; font-weight: 700; text-transform: uppercase;">Stock Actual</div>
          <div style="font-size: 16pt; font-weight: 900; color: #003366; margin-top: 4px;">${prod.stock || 0}</div>
        </div>
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
          <div style="font-size: 8pt; color: #64748b; font-weight: 700; text-transform: uppercase;">Stock Mínimo</div>
          <div style="font-size: 16pt; font-weight: 900; color: #d97706; margin-top: 4px;">${prod.stockMin || 0}</div>
        </div>
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
          <div style="font-size: 8pt; color: #64748b; font-weight: 700; text-transform: uppercase;">Valor Unitario</div>
          <div style="font-size: 14pt; font-weight: 900; color: #0f172a; margin-top: 6px;">${fmtMoney(prod.valor || 0)}</div>
        </div>
        <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center;">
          <div style="font-size: 8pt; color: #64748b; font-weight: 700; text-transform: uppercase;">Valor Total</div>
          <div style="font-size: 14pt; font-weight: 900; color: #16a34a; margin-top: 6px;">${fmtMoney((prod.stock || 0) * (prod.valor || 0))}</div>
        </div>
      </div>
    </div>
  `;

  return wrapHospitalDocument({
    idDocumento: `ETQ-${prod.codigo || 'INS'}`,
    subtitulo: 'BODEGA GENERAL · FICHA TÉCNICA E IDENTIFICACIÓN DE INSUMO',
    fecha: dateStr,
    camposMetadata: [
      { label: 'Código Institucional', value: prod.codigo || '—' },
      { label: 'Familia / Clasificación', value: prod.familia || 'General' },
      { label: 'Tipo de Insumo', value: prod.tipo || 'Consumo Clínico' },
      { label: 'Ubicación Física', value: 'Bodega Central · HAH' },
    ],
    tituloSeccion: 'Detalle Técnico y Existencias en Bodega:',
    tablaHtml: contentHtml,
    firmaIzquierda: {
      cargo: 'Emitido por',
      nombre: 'Arturo Gómez Echegoyen',
      entidad: 'Bodega de Tránsito · HAH',
      aclaracion: 'Firma y Timbre',
    },
    firmaDerecha: {
      cargo: 'V°B° Jefatura',
      entidad: 'Abastecimiento y Farmacia HAH',
      aclaracion: 'Firma y Timbre',
    },
  });
}


