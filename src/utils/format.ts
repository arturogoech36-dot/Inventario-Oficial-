export function fmtMoney(n: number | string): string {
  const num = typeof n === 'number' ? n : parseFloat(n) || 0;
  return '$' + Math.round(num).toLocaleString('es-CL');
}

export function today(): string {
  return new Date().toLocaleDateString('es-CL');
}

export function todayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extracts and formats document number from attached file name (OC, Factura, Guía).
 */
export function extractDocNumberFromFilename(
  filename: string,
  tipo: 'OC' | 'Factura' | 'Guia'
): string {
  if (!filename) return '';
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();

  if (tipo === 'OC') {
    // 1. Matches OC-2026-00001, OC_2026_45, OC 2026 00045
    const ocFullMatch = nameWithoutExt.match(/OC[-_\s]?(\d{4})[-_\s]?(\d+)/i);
    if (ocFullMatch) {
      return `OC-${ocFullMatch[1]}-${ocFullMatch[2].padStart(5, '0')}`;
    }
    // 2. Matches OC-1234, OC_45, OC 500
    const ocShortMatch = nameWithoutExt.match(/OC[-_\s]?(\d+)/i);
    if (ocShortMatch) {
      const year = new Date().getFullYear();
      return `OC-${year}-${ocShortMatch[1].padStart(5, '0')}`;
    }
    // 3. Fallback: extract digits
    const digits = nameWithoutExt.replace(/[^0-9]/g, '');
    if (digits.length > 0) {
      const year = new Date().getFullYear();
      return `OC-${year}-${digits.slice(-5).padStart(5, '0')}`;
    }
    return `OC-${new Date().getFullYear()}-00001`;
  }

  if (tipo === 'Factura') {
    // 1. Matches Factura 123456, FAC-1234, F_9876, N° 1234
    const facMatch = nameWithoutExt.match(/(?:factura|fact|fac|f|nro|n°|n)?[-_\s]*(\d+)/i);
    if (facMatch && facMatch[1]) {
      return `N°. ${facMatch[1].padStart(7, '0')}`;
    }
    const digits = nameWithoutExt.replace(/[^0-9]/g, '');
    if (digits.length > 0) {
      return `N°. ${digits.padStart(7, '0')}`;
    }
    return `N°. 0000001`;
  }

  if (tipo === 'Guia') {
    // 1. Matches Guia 12345, GD-1234, GDP 554, Guía Despacho 7890
    const guiaMatch = nameWithoutExt.match(/(?:guia|guía|gd|gdp|despacho|nro|n°|n)?[-_\s]*(\d+)/i);
    if (guiaMatch && guiaMatch[1]) {
      return `N°. ${guiaMatch[1].padStart(7, '0')}`;
    }
    const digits = nameWithoutExt.replace(/[^0-9]/g, '');
    if (digits.length > 0) {
      return `N°. ${digits.padStart(7, '0')}`;
    }
    return `N°. 0000002`;
  }

  return nameWithoutExt;
}

export function padNum(n: number | string, len = 2): string {
  return String(n).padStart(len, '0');
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
