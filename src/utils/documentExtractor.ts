/**
 * Utilidades para extracción automática de números de documentos
 * (Orden de Compra, Factura y Guía de Despacho) al adjuntar archivos PDF
 * desde el escritorio.
 */

export interface ExtractedDocResult {
  docNumber?: string;
  oc?: string;
  factura?: string;
  guia?: string;
  origen?: 'filename' | 'pdf-text' | 'ai-ocr';
}

/**
 * Extrae con alta precisión el número o folio de un documento
 * a partir del nombre del archivo cargado desde el escritorio.
 */
export function extractDocNumberFromFileName(
  fileName: string,
  tipo: 'OC' | 'Factura' | 'Guia'
): string {
  if (!fileName) return '';

  // Quitar extensión .pdf, .jpg, etc.
  const cleanName = fileName.replace(/\.[^/.]+$/, '').trim();

  if (tipo === 'OC') {
    // 1. Formato Mercado Público Chile (ej. 1057482-12-CM24, 72491-10-LP23)
    const mp = cleanName.match(/\b\d{4,8}-\d{1,4}-[A-Za-z0-9]{2,6}\b/);
    if (mp) return mp[0].toUpperCase();

    // 2. Formato OC-2026-00001, OC_2026_00001, OC 2026 00001
    const ocWithYear = cleanName.match(/\b(?:OC|ORDEN|ORDEN[-_ ]DE[-_ ]COMPRA)[-_ ]*(\d{4}[-_ ]\d+)\b/i);
    if (ocWithYear && ocWithYear[1]) {
      return `OC-${ocWithYear[1].replace(/[_ ]/g, '-')}`;
    }

    // 3. Formato OC-00001 o OC 4500123891 o OC-12345
    const ocSimple = cleanName.match(/\b(?:OC|ORDEN|ORDEN[-_ ]DE[-_ ]COMPRA)[-_ #N°.]*([A-Za-z0-9-]+)\b/i);
    if (ocSimple && ocSimple[1]) {
      const raw = ocSimple[1].replace(/[^0-9A-Za-z-]/g, '');
      if (raw.length >= 2) {
        if (/^\d{1,6}$/.test(raw)) {
          const year = new Date().getFullYear();
          return `OC-${year}-${raw.padStart(5, '0')}`;
        }
        return raw.toUpperCase().startsWith('OC-') ? raw.toUpperCase() : `OC-${raw}`;
      }
    }

    // 4. Si el archivo es puramente un número largo o corto (ej. 4500123891.pdf o 12345.pdf)
    const justNum = cleanName.match(/\b\d{3,12}\b/);
    if (justNum) {
      if (justNum[0].length <= 5) {
        const year = new Date().getFullYear();
        return `OC-${year}-${justNum[0].padStart(5, '0')}`;
      }
      return justNum[0];
    }
  }

  if (tipo === 'Factura') {
    // 1. Formato Factura 10582, Fac-10582, FAC_0000456, F-12345, Factura_Electronica_123456
    const facMatch = cleanName.match(/\b(?:FACTURA|FAC|F|FE|FEL)[-_ #N°.]*([0-9]{2,12})\b/i);
    if (facMatch && facMatch[1]) {
      return facMatch[1];
    }

    // 2. Si no viene la palabra "Factura", buscar secuencia numérica destacada (3 a 10 dígitos)
    const anyNum = cleanName.match(/\b\d{3,10}\b/);
    if (anyNum) {
      return anyNum[0];
    }
  }

  if (tipo === 'Guia') {
    // 1. Formato Guia 00046950, GD-46950, Guia_Despacho_12345, G-46950
    const guiaMatch = cleanName.match(/\b(?:GUIA|GUÍA|GD|G|DESPACHO)[-_ #N°.]*([0-9]{2,12})\b/i);
    if (guiaMatch && guiaMatch[1]) {
      return guiaMatch[1];
    }

    // 2. Buscar secuencia numérica de folio (3 a 10 dígitos)
    const anyNum = cleanName.match(/\b\d{3,10}\b/);
    if (anyNum) {
      return anyNum[0];
    }
  }

  return '';
}

/**
 * Intenta extraer texto y folios desde el binario del PDF en el navegador
 */
export function extractDocNumberFromPdfBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  tipo: 'OC' | 'Factura' | 'Guia'
): ExtractedDocResult {
  try {
    const uint8 = new Uint8Array(buffer);
    let str = '';
    // Leer los primeros 32KB del archivo que suelen contener cabecera y metadatos
    const limit = Math.min(uint8.length, 32768);
    for (let i = 0; i < limit; i++) {
      const code = uint8[i];
      if (code >= 32 && code <= 126) {
        str += String.fromCharCode(code);
      } else if (code === 10 || code === 13) {
        str += ' ';
      }
    }

    const res: ExtractedDocResult = { origen: 'pdf-text' };

    // Buscar Folio
    const folioMatch = str.match(/(?:Folio|N[°º.]|N[uú]mero)\s*[:#]?\s*([0-9]{2,12})/i);
    const guiaMatch = str.match(/(?:Gu[ií]a|GD)[^0-9\n\r]{0,15}([0-9]{3,12})/i);
    const facMatch = str.match(/(?:Factura|FAC)[^0-9\n\r]{0,15}([0-9]{3,12})/i);
    const ocMatch = str.match(/(?:Orden\s*de\s*Compra|O\/?C)[^0-9\n\r]{0,15}([A-Za-z0-9-]{3,20})/i);

    if (guiaMatch && guiaMatch[1]) res.guia = guiaMatch[1];
    if (facMatch && facMatch[1]) res.factura = facMatch[1];
    if (ocMatch && ocMatch[1]) res.oc = ocMatch[1];

    if (tipo === 'OC') {
      res.docNumber = res.oc || (folioMatch ? folioMatch[1] : undefined);
    } else if (tipo === 'Factura') {
      res.docNumber = res.factura || (folioMatch ? folioMatch[1] : undefined);
    } else if (tipo === 'Guia') {
      res.docNumber = res.guia || (folioMatch ? folioMatch[1] : undefined);
    }

    if (res.docNumber) return res;
  } catch (e) {
    // Continuar con extracción de nombre de archivo
  }

  const fromName = extractDocNumberFromFileName(fileName, tipo);
  return {
    docNumber: fromName || undefined,
    origen: 'filename',
  };
}

/**
 * Consulta al backend con Gemini para reconocimiento inteligente de folios en el documento
 */
export async function extractDocNumberFromBackend(
  fileBase64: string,
  fileName: string,
  tipo: 'OC' | 'Factura' | 'Guia'
): Promise<ExtractedDocResult> {
  const tipoDocumento =
    tipo === 'OC' ? 'ORDEN COMPRA' : tipo === 'Factura' ? 'FACTURA' : 'GUÍA DESPACHO';

  try {
    const res = await fetch('/api/ocr-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipoTrazabilidad: 'equipos',
        tipoDocumento,
        fileBase64,
        mimeType: 'application/pdf',
        fileName,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    const result: ExtractedDocResult = {
      origen: 'ai-ocr',
      oc: data.oc,
      factura: data.factura,
      guia: data.guia,
    };

    if (tipo === 'OC' && data.oc) {
      result.docNumber = data.oc;
    } else if (tipo === 'Factura' && data.factura) {
      result.docNumber = data.factura;
    } else if (tipo === 'Guia' && data.guia) {
      result.docNumber = data.guia;
    }

    return result;
  } catch (err) {
    // Si falla el backend, fallback a extracción de nombre
    const fromName = extractDocNumberFromFileName(fileName, tipo);
    return {
      docNumber: fromName || undefined,
      origen: 'filename',
    };
  }
}
