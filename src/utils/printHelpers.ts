import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  escapeHtml,
  buildActaDespachoTemplate,
  buildReporteTrazabilidadEquiposTemplate,
  buildReporteTrazabilidadHerramientasTemplate,
  buildReporteTrazabilidadEquiposMenoresTemplate,
  buildReporteInventarioValorizadoTemplate,
  buildKardexResumenTemplate,
  buildSinCostoTemplate,
  buildAttachedDocumentTemplate,
  buildProductoEtiquetaTemplate,
} from './hospitalTemplates';
import { renderPdfToPageImages } from './pdfRender';

export interface PrintDocumentOptions {
  title: string;
  htmlContent: string;
  customStyles?: string;
  pageOrientation?: 'portrait' | 'landscape';
  elementToPdf?: HTMLElement | null;
  filename?: string;
}

/**
 * Converts a base64 data URI to a blob URL to prevent browser data-URI blocking.
 */
export function base64ToBlobUrl(dataUri?: string): string {
  if (!dataUri) return '';
  if (dataUri.startsWith('blob:')) return dataUri;
  if (!dataUri.startsWith('data:')) return dataUri;

  try {
    const parts = dataUri.split(';base64,');
    const contentType = parts[0]?.replace('data:', '') || 'application/pdf';
    const base64Str = parts[1] || '';
    const byteCharacters = atob(base64Str);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('base64ToBlobUrl failed, returning original URI:', err);
    return dataUri;
  }
}

/**
 * Extracts printable HTML from a container, converting any canvas elements
 * (such as QRCode canvas) into high-res images and stripping preview zoom scales.
 */
export function extractPrintableHtml(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;

  // 1. Remove preview zoom/scale transforms and extra margins
  const zoomNodes = clone.querySelectorAll('*');
  zoomNodes.forEach((node) => {
    const el = node as HTMLElement;
    if (el.style) {
      if (el.style.transform && el.style.transform.includes('scale')) {
        el.style.transform = 'none';
      }
      if (el.style.margin && (el.style.margin.includes('mm') || el.style.margin.includes('px'))) {
        // Clear spacing on outer wrappers
        if (!el.classList.contains('label-50x25-wrapper')) {
          el.style.margin = '0';
        }
      }
    }
  });

  // 2. Convert canvases to pixelated high-res images without duplicating existing imgs
  const origCanvases = element.querySelectorAll('canvas');
  const cloneCanvases = clone.querySelectorAll('canvas');

  origCanvases.forEach((orig, i) => {
    try {
      const target = cloneCanvases[i];
      if (target && target.parentNode) {
        const existingImg = target.parentNode.querySelector('img');
        if (existingImg && existingImg.src && existingImg.src.startsWith('data:image')) {
          existingImg.style.display = 'block';
          existingImg.style.maxWidth = '100%';
          existingImg.style.maxHeight = '100%';
          existingImg.style.objectFit = 'contain';
          existingImg.style.imageRendering = 'pixelated';
          existingImg.style.margin = '0 auto';
          target.parentNode.removeChild(target);
          return;
        }

        const img = document.createElement('img');
        img.src = orig.toDataURL('image/png');
        img.style.width = orig.style.width || `${orig.width}px`;
        img.style.height = orig.style.height || `${orig.height}px`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        img.style.imageRendering = 'pixelated';
        target.parentNode.replaceChild(img, target);
      }
    } catch (e) {
      console.warn('Canvas toDataURL failed:', e);
    }
  });

  return clone.innerHTML;
}

/**
 * Compiles a full, standalone, printable HTML document with official institutional styling.
 */
export function buildStandalonePrintHtml(
  htmlContent: string,
  title = 'Documento Oficial - Hospital Alto Hospicio',
  customStyles = '',
  pageOrientation: 'portrait' | 'landscape' = 'portrait'
): string {
  const is50x25 = customStyles.includes('50mm 25mm') || customStyles.includes('50x25');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    @page {
      size: ${is50x25 ? '50mm 25mm' : pageOrientation === 'landscape' ? 'landscape' : 'letter portrait'};
      margin: ${is50x25 ? '0mm' : '8mm'};
    }
    body {
      background: #ffffff !important;
      color: #000000 !important;
      font-family: Arial, Helvetica, sans-serif !important;
      font-size: ${is50x25 ? '6pt' : '10pt'};
      line-height: ${is50x25 ? '1.1' : '1.4'};
      padding: ${is50x25 ? '0px' : '16px'};
      margin: 0px !important;
    }
    .print-bar {
      background: #003366;
      color: #ffffff;
      padding: 12px 18px;
      display: ${is50x25 ? 'none' : 'flex'};
      justifyContent: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-radius: 6px;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .print-bar-title {
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-bar-buttons {
      display: flex;
      gap: 10px;
    }
    .print-bar-btn {
      background: #059669;
      color: #ffffff;
      border: none;
      border-radius: 4px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .print-bar-btn.close {
      background: #dc2626;
    }
    .print-document-content {
      width: ${is50x25 ? '50mm' : '100%'};
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    img, svg, canvas {
      max-width: 100% !important;
      display: block !important;
    }
    @media print {
      .no-print, .print-bar {
        display: none !important;
      }
      html, body {
        width: ${is50x25 ? '50mm !important' : 'auto'};
        height: ${is50x25 ? '25mm !important' : 'auto'};
        margin: 0 !important;
        padding: 0 !important;
      }
    }
    ${customStyles}
  </style>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.warn('Auto-print blocked or dismissed:', e);
        }
      }, 400);
    });
  </script>
</head>
<body>
  ${
    is50x25
      ? ''
      : `<div class="print-bar no-print">
    <div class="print-bar-title">🏥 Hospital Alto Hospicio · Documento Imprimible Oficial</div>
    <div class="print-bar-buttons">
      <button class="print-bar-btn" onclick="window.print()">🖨️ Mandar a Imprimir</button>
      <button class="print-bar-btn close" onclick="window.close()">✕ Cerrar Ventana</button>
    </div>
  </div>`
  }
  <div class="print-document-content">
    ${htmlContent}
  </div>
</body>
</html>`;
}

/**
 * Opens a standalone printable window/tab outside any sandboxed iframes.
 * Guarantees window.print() is unblocked and triggers the native printer dialog.
 */
export function openPrintableWindow(
  htmlContent: string,
  title = 'Documento Imprimible - Hospital Alto Hospicio',
  customStyles = '',
  pageOrientation: 'portrait' | 'landscape' = 'portrait'
): string {
  const fullHtml = buildStandalonePrintHtml(htmlContent, title, customStyles, pageOrientation);
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  // Trigger popup / new tab via anchor link
  const a = document.createElement('a');
  a.href = blobUrl;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
  }, 1000);

  return blobUrl;
}

/**
 * Downloads a standalone HTML file that self-triggers printing when opened.
 */
export function downloadPrintableHtml(
  htmlContent: string,
  filename: string,
  title = 'Documento Imprimible - Hospital Alto Hospicio',
  customStyles = '',
  pageOrientation: 'portrait' | 'landscape' = 'portrait'
) {
  const fullHtml = buildStandalonePrintHtml(htmlContent, title, customStyles, pageOrientation);
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Renders HTML directly into an ultra-clean, high-resolution official PDF.
 * Avoids any dark-mode or scrollbar interference by rendering in an isolated, pure-white offscreen container.
 */
export async function downloadHtmlAsPDF(
  htmlContent: string,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<boolean> {
  try {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-12000px';
    container.style.top = '0';
    container.style.width = orientation === 'landscape' ? '1120px' : '820px';
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = 'Arial, Helvetica, sans-serif';
    container.style.padding = '24px 30px';
    container.style.boxSizing = 'border-box';
    container.style.zIndex = '-99999';
    container.innerHTML = htmlContent;

    document.body.appendChild(container);

    // Wait for any images inside to load completely
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );

    // Short pause for subpixel layout stabilization
    await new Promise((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: orientation === 'landscape' ? 1200 : 900,
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const printWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * printWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, printWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, printWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
    }

    const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
    return true;
  } catch (err) {
    console.error('downloadHtmlAsPDF failed:', err);
    return false;
  }
}

/**
 * Legacy support: captures an on-screen element as a PDF file.
 */
export async function downloadElementAsPDF(
  element: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<boolean> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'letter',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const printWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * printWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, printWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, printWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
    }

    const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
    return true;
  } catch (err) {
    console.error('downloadElementAsPDF error:', err);
    return false;
  }
}

/**
 * Universal print executor:
 * 1. Mounts content into #print-mount-area for direct CSS print
 * 2. Waits for all images/assets to decode to avoid blank printouts
 * 3. Opens unblocked standalone print window in new tab
 * 4. Tries window.print() in current window
 */
export async function printDocument({
  title,
  htmlContent,
  customStyles = '',
  pageOrientation = 'portrait',
  elementToPdf,
  filename,
}: PrintDocumentOptions): Promise<boolean> {
  try {
    // 1. Mount content into #print-mount-area
    let mount = document.getElementById('print-mount-area');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'print-mount-area';
      document.body.appendChild(mount);
    }

    mount.innerHTML = `
      <style>
        @page {
          size: ${pageOrientation === 'landscape' ? 'landscape' : 'letter portrait'};
          margin: 8mm;
        }
        ${customStyles}
      </style>
      <div class="print-doc-body ${pageOrientation}">
        ${htmlContent}
      </div>
    `;

    // 2. Wait for images to decode completely so nothing prints blank
    const images = Array.from(mount.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );

    document.body.classList.add('printing-active');
    const prevTitle = document.title;
    if (title) document.title = title;

    // 3. Open standalone printable tab outside sandboxed iframe
    openPrintableWindow(htmlContent, title, customStyles, pageOrientation);

    // 4. Attempt direct print
    try {
      window.print();
    } catch (e) {
      console.warn('Direct print blocked by sandbox:', e);
    }

    // 5. Download PDF if requested
    if (filename) {
      downloadHtmlAsPDF(htmlContent, filename, pageOrientation);
    }

    // Cleanup active class
    setTimeout(() => {
      document.body.classList.remove('printing-active');
      document.title = prevTitle;
    }, 2500);

    return true;
  } catch (err) {
    console.error('printDocument error:', err);
    document.body.classList.remove('printing-active');
    return false;
  }
}

/**
 * Prints one or multiple labels cleanly with barcodes and QR codes.
 */
export function printEtiquetas(labelsContainer: HTMLElement | string, title = 'Etiquetas con QR y Código de Barras - HAH') {
  let content = '';
  if (typeof labelsContainer === 'string') {
    content = labelsContainer;
  } else if (labelsContainer instanceof HTMLElement) {
    content = extractPrintableHtml(labelsContainer);
  }

  const customStyles = `
    @page {
      margin: 6mm;
    }
    .etiqueta-item-card {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      border: 2px solid #003366 !important;
      border-radius: 6px !important;
      padding: 12px !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    .etiqueta-item-card * {
      color: #000000 !important;
    }
    svg, img, canvas {
      display: block !important;
      visibility: visible !important;
      max-width: 100% !important;
    }
  `;

  return printDocument({
    title,
    htmlContent: `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
        ${content}
      </div>
    `,
    customStyles,
    pageOrientation: 'portrait',
    filename: title.replace(/[^a-zA-Z0-9_-]/g, '_'),
  });
}

/**
 * Prints official . Acta de Egreso y Despacho with institutional formatting.
 */
export function printActaSalidaDocument(actaContentOrData: any, title = '. Acta de Egreso y Despacho - Hospital Alto Hospicio') {
  const html =
    typeof actaContentOrData === 'string' && actaContentOrData.includes('hah-official-sheet')
      ? actaContentOrData
      : buildActaDespachoTemplate(actaContentOrData);
  return printDocument({
    title,
    htmlContent: html,
    pageOrientation: 'portrait',
  });
}

/**
 * Downloads official . Acta de Egreso y Despacho directly as PDF.
 */
export async function downloadActaSalidaPDF(actaContentOrData: any, filename = 'Acta_Egreso_Despacho_HAH') {
  const html =
    typeof actaContentOrData === 'string' && actaContentOrData.includes('hah-official-sheet')
      ? actaContentOrData
      : buildActaDespachoTemplate(actaContentOrData);
  return downloadHtmlAsPDF(html, filename, 'portrait');
}

/**
 * Prints official report with institutional formatting.
 */
export function printReporteDocument(
  reporteFam: string,
  contextData: {
    trazabilidad?: any[];
    herramientas?: any[];
    equiposMenores?: any[];
    productos?: any[];
    usuario?: string;
  },
  title?: string
) {
  const usuario = contextData.usuario || 'Arturo Gómez Echegoyen';
  let html = '';
  let defaultTitle = 'Reporte Oficial - Hospital Alto Hospicio';

  if (reporteFam === 'TRAZ-EQUIPOS') {
    html = buildReporteTrazabilidadEquiposTemplate(contextData.trazabilidad || [], usuario);
    defaultTitle = 'Reporte Oficial de Trazabilidad de Equipos - HAH';
  } else if (reporteFam === 'TRAZ-HERRAMIENTAS') {
    html = buildReporteTrazabilidadHerramientasTemplate(contextData.herramientas || [], usuario);
    defaultTitle = 'Reporte Oficial de Trazabilidad de Herramientas - HAH';
  } else if (reporteFam === 'TRAZ-EQUIPOS-MENORES') {
    html = buildReporteTrazabilidadEquiposMenoresTemplate(contextData.equiposMenores || [], usuario);
    defaultTitle = 'Reporte Oficial de Trazabilidad de Equipos Menores - HAH';
  } else {
    html = buildReporteInventarioValorizadoTemplate(contextData.productos || [], reporteFam, usuario);
    defaultTitle = `Reporte Inventario Valorizado (${reporteFam}) - HAH`;
  }

  return printDocument({
    title: title || defaultTitle,
    htmlContent: html,
    pageOrientation: 'portrait',
  });
}

/**
 * Downloads official report directly as PDF with institutional formatting.
 */
export async function downloadReportePDF(
  reporteFam: string,
  contextData: {
    trazabilidad?: any[];
    herramientas?: any[];
    equiposMenores?: any[];
    productos?: any[];
    usuario?: string;
  },
  filename?: string
) {
  const usuario = contextData.usuario || 'Arturo Gómez Echegoyen';
  let html = '';
  let defaultFname = `Reporte_${reporteFam}_HAH`;

  if (reporteFam === 'TRAZ-EQUIPOS') {
    html = buildReporteTrazabilidadEquiposTemplate(contextData.trazabilidad || [], usuario);
    defaultFname = 'Reporte_Trazabilidad_Equipos_HAH';
  } else if (reporteFam === 'TRAZ-HERRAMIENTAS') {
    html = buildReporteTrazabilidadHerramientasTemplate(contextData.herramientas || [], usuario);
    defaultFname = 'Reporte_Trazabilidad_Herramientas_HAH';
  } else if (reporteFam === 'TRAZ-EQUIPOS-MENORES') {
    html = buildReporteTrazabilidadEquiposMenoresTemplate(contextData.equiposMenores || [], usuario);
    defaultFname = 'Reporte_Trazabilidad_Equipos_Menores_HAH';
  } else {
    html = buildReporteInventarioValorizadoTemplate(contextData.productos || [], reporteFam, usuario);
    defaultFname = `Reporte_Inventario_${reporteFam}_HAH`;
  }

  return downloadHtmlAsPDF(html, filename || defaultFname, 'portrait');
}

/**
 * Prints text reports with an institutional wrapper.
 */
export function printReporteTexto(reportText: string, title = 'Reporte Oficial - Hospital Alto Hospicio') {
  const dateStr = new Date().toLocaleDateString('es-CL');
  const html = `
    <div class="hah-official-sheet" style="font-family: Arial, Helvetica, sans-serif; background: #ffffff !important; color: #000000 !important; width: 100%; max-width: 820px; margin: 0 auto; padding: 14px 20px; box-sizing: border-box; line-height: 1.4;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div>
          <div style="font-weight: 900; font-size: 15pt; color: #003366; letter-spacing: 0.5px; text-transform: uppercase;">
            HOSPITAL ALTO HOSPICIO
          </div>
          <div style="font-size: 8.5pt; color: #475569; font-weight: 700; margin-top: 2px; text-transform: uppercase;">
            BODEGA GENERAL · INFORME OFICIAL
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14pt; font-weight: 900; color: #003366; letter-spacing: 0.5px;">
            INF-OFICIAL
          </div>
          <div style="font-size: 9pt; color: #64748b; font-weight: 600; margin-top: 2px;">
            Fecha: ${dateStr}
          </div>
        </div>
      </div>
      <div style="height: 2.5px; background: #003366; width: 100%; margin: 6px 0 14px 0;"></div>
      <pre style="font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; line-height: 1.35; white-space: pre-wrap; word-break: break-all; color: #000000; background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px;">${escapeHtml(reportText)}</pre>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 38px; page-break-inside: avoid; break-inside: avoid;">
        <div style="border-top: 1.5px solid #000000; padding-top: 6px; text-align: center; font-size: 9pt;">
          <strong>Arturo Gómez Echegoyen</strong><br/>
          Encargado Bodega de Tránsito · HAH<br/>
          Firma y Timbre
        </div>
        <div style="border-top: 1.5px solid #000000; padding-top: 6px; text-align: center; font-size: 9pt;">
          <strong>V°B° Jefatura</strong><br/>
          Subdirección Administrativa HAH<br/>
          Firma y Timbre Institucional
        </div>
      </div>
    </div>
  `;

  return printDocument({
    title,
    htmlContent: html,
    pageOrientation: 'portrait',
  });
}

/**
 * Prints Kardex movement and stock summary with institutional template (organized by families).
 * Supports printing only the filtered family if familiaFiltro is provided.
 */
export function printKardexResumenDocument(
  kardex: any[] = [],
  productos: any[] = [],
  title?: string,
  familias: any[] = [],
  familiaFiltro?: string
) {
  const dynamicTitle =
    title ||
    (familiaFiltro && familiaFiltro !== 'TODAS' && familiaFiltro !== 'TOTAL'
      ? `Resumen Oficial de Kardex - Familia ${familiaFiltro} - Hospital Alto Hospicio`
      : 'Resumen Oficial de Kardex por Familias - Hospital Alto Hospicio');
  const html = buildKardexResumenTemplate(kardex, productos, undefined, familias, familiaFiltro);
  return printDocument({
    title: dynamicTitle,
    htmlContent: html,
    pageOrientation: 'portrait',
  });
}

/**
 * Downloads Kardex summary directly as PDF with institutional template (organized by families).
 * Supports downloading only the filtered family if familiaFiltro is provided.
 */
export async function downloadKardexResumenPDF(
  kardex: any[] = [],
  productos: any[] = [],
  filename?: string,
  familias: any[] = [],
  familiaFiltro?: string
) {
  const dynamicFilename =
    filename ||
    (familiaFiltro && familiaFiltro !== 'TODAS' && familiaFiltro !== 'TOTAL'
      ? `Resumen_Kardex_Familia_${familiaFiltro}_HAH`
      : 'Resumen_Kardex_Por_Familias_HAH');
  const html = buildKardexResumenTemplate(kardex, productos, undefined, familias, familiaFiltro);
  return downloadHtmlAsPDF(html, dynamicFilename, 'portrait');
}

/**
 * Prints Tránsito Despacho report with institutional template.
 */
export function printSinCostoReporte(sinCostoList: any[] = [], title = 'Reporte Tránsito Despacho - Hospital Alto Hospicio') {
  const html = buildSinCostoTemplate(sinCostoList);
  return printDocument({
    title,
    htmlContent: html,
    pageOrientation: 'portrait',
  });
}

/**
 * Downloads Tránsito Despacho report directly as PDF with institutional template.
 */
export async function downloadSinCostoPDF(sinCostoList: any[] = [], filename = 'Transito_Despacho_HAH') {
  const html = buildSinCostoTemplate(sinCostoList);
  return downloadHtmlAsPDF(html, filename, 'portrait');
}

/**
 * Prints a single Product Insumo Label (Ficha Rápida).
 */
export function printProductoEtiqueta(prod: any, title = 'Etiqueta de Insumo - Hospital Alto Hospicio') {
  const html = buildProductoEtiquetaTemplate(prod);
  return printDocument({
    title,
    htmlContent: html,
    pageOrientation: 'portrait',
  });
}

/**
 * Downloads a single Product Insumo Label as PDF.
 */
export async function downloadProductoEtiquetaPDF(prod: any, filename?: string) {
  const html = buildProductoEtiquetaTemplate(prod);
  return downloadHtmlAsPDF(html, filename || `Ficha_Insumo_${prod.codigo || 'HAH'}`, 'portrait');
}

/**
 * Prints attached document (Image or PDF) with full institutional wrapping and asset preloading.
 */
export async function printAttachedDocument(adjunto: { nombre: string; tipo: string; data?: string }): Promise<boolean> {
  if (!adjunto.data) return false;

  const isPDF =
    adjunto.tipo === 'application/pdf' ||
    (adjunto.nombre || '').toLowerCase().endsWith('.pdf') ||
    adjunto.data.startsWith('data:application/pdf');

  if (isPDF) {
    try {
      // 1. Render all pages of the attached PDF to crisp high-res images
      const pageImages = await renderPdfToPageImages(adjunto.data, 2.0);

      if (pageImages && pageImages.length > 0) {
        const customStyles = `
          @page {
            size: letter portrait;
            margin: 8mm;
          }
          .pdf-print-container {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .pdf-print-sheet {
            page-break-after: always;
            break-after: page;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            min-height: 96vh;
            margin-bottom: 20px;
            box-sizing: border-box;
            width: 100%;
          }
          .pdf-print-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
            margin-bottom: 0;
          }
          .pdf-sheet-header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8pt;
            color: #475569;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
            margin-bottom: 8px;
            font-family: Arial, sans-serif;
          }
          .pdf-sheet-img {
            max-width: 100%;
            max-height: 94vh;
            width: auto;
            height: auto;
            object-fit: contain;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          @media print {
            .pdf-print-sheet {
              min-height: auto !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .pdf-sheet-img {
              border: none !important;
              box-shadow: none !important;
              max-width: 100% !important;
              max-height: 97vh !important;
            }
          }
        `;

        const htmlContent = `
          <div class="pdf-print-container">
            ${pageImages
              .map(
                (img, idx) => `
              <div class="pdf-print-sheet">
                <div class="pdf-sheet-header">
                  <span><strong>🏥 Hospital Alto Hospicio</strong> · Bodega General · ${escapeHtml(adjunto.nombre)}</span>
                  <span>Pág. ${idx + 1} de ${pageImages.length}</span>
                </div>
                <img class="pdf-sheet-img" src="${img}" alt="${escapeHtml(adjunto.nombre)} - Página ${idx + 1}" />
              </div>
            `
              )
              .join('')}
          </div>
        `;

        return printDocument({
          title: `Documento: ${adjunto.nombre} - Hospital Alto Hospicio`,
          htmlContent,
          customStyles,
          pageOrientation: 'portrait',
          filename: `Adjunto_${(adjunto.nombre || 'documento').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        });
      }
    } catch (err) {
      console.warn('PDF render via pdfjs failed, falling back to direct blob window:', err);
      // Fallback: Open blob URL directly in blank tab (which native browser PDF viewer can print)
      const blobUrl = base64ToBlobUrl(adjunto.data);
      if (blobUrl) {
        window.open(blobUrl, '_blank');
        return true;
      }
    }
  }

  // Image attachment: wraps into official institutional sheet and waits for decode
  const html = buildAttachedDocumentTemplate(adjunto);
  return printDocument({
    title: `Documento: ${adjunto.nombre} - Hospital Alto Hospicio`,
    htmlContent: html,
    pageOrientation: 'portrait',
    filename: `Adjunto_${adjunto.nombre.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
  });
}

/**
 * Downloads attached document as an official PDF wrapper or direct file download.
 */
export async function downloadAttachedDocumentPDF(adjunto: { nombre: string; tipo: string; data?: string }, filename?: string) {
  if (!adjunto.data) return false;
  const isPDF =
    adjunto.tipo === 'application/pdf' ||
    (adjunto.nombre || '').toLowerCase().endsWith('.pdf') ||
    adjunto.data.startsWith('data:application/pdf');

  if (isPDF) {
    const blobUrl = base64ToBlobUrl(adjunto.data);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || adjunto.nombre || 'documento.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1000);
    return true;
  }

  const html = buildAttachedDocumentTemplate(adjunto);
  return downloadHtmlAsPDF(html, filename || `Adjunto_${(adjunto.nombre || 'archivo').replace(/[^a-zA-Z0-9_-]/g, '_')}`, 'portrait');
}

/**
 * Special printer for 50x25 mm thermal adhesive label rolls (Label Printer / Zebra / Xprinter).
 */
export function printEtiquetas50x25(
  labelsContainer: HTMLElement | string,
  title = 'Etiquetas Térmicas 50x25mm - Hospital Alto Hospicio'
) {
  let content = '';
  if (typeof labelsContainer === 'string') {
    content = labelsContainer;
  } else if (labelsContainer instanceof HTMLElement) {
    content = extractPrintableHtml(labelsContainer);
  }

  const customStyles = `
    @page {
      size: 50mm 25mm !important;
      margin: 0mm !important;
    }
    @media print {
      html, body {
        width: 50mm !important;
        height: 25mm !important;
        margin: 0mm !important;
        padding: 0mm !important;
        background: #ffffff !important;
      }
      .no-print {
        display: none !important;
      }
      .label-50x25-wrapper {
        width: 50mm !important;
        height: 25mm !important;
        max-width: 50mm !important;
        max-height: 25mm !important;
        page-break-after: always !important;
        break-after: page !important;
        box-sizing: border-box !important;
        padding: 0.8mm 1.5mm !important;
        margin: 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      .label-50x25-wrapper.etiqueta-50x25-barra {
        display: flex !important;
        flex-direction: column !important;
        justifyContent: space-between !important;
      }
      .label-50x25-wrapper.etiqueta-50x25-qr {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justifyContent: space-between !important;
        gap: 2mm !important;
      }
      .label-50x25-wrapper.etiqueta-50x25-combinada {
        display: flex !important;
        flex-direction: column !important;
        justifyContent: space-between !important;
      }
    }
    .label-50x25-wrapper {
      width: 50mm;
      height: 25mm;
      box-sizing: border-box;
      background: #ffffff;
      color: #000000;
      page-break-after: always;
      break-after: page;
    }
    .label-50x25-wrapper.etiqueta-50x25-barra {
      display: flex;
      flex-direction: column;
      justifyContent: space-between;
    }
    .label-50x25-wrapper.etiqueta-50x25-qr {
      display: flex;
      flex-direction: row;
      align-items: center;
      justifyContent: space-between;
      gap: 2mm;
    }
    .label-50x25-wrapper.etiqueta-50x25-combinada {
      display: flex;
      flex-direction: column;
      justifyContent: space-between;
    }
    svg, img, canvas {
      display: block !important;
      visibility: visible !important;
      max-width: 100% !important;
    }
  `;

  return printDocument({
    title,
    htmlContent: `
      <div class="labels-50x25-print-container">
        ${content}
      </div>
    `,
    customStyles,
    pageOrientation: 'portrait',
    filename: title.replace(/[^a-zA-Z0-9_-]/g, '_'),
  });
}

/**
 * Downloads one or multiple thermal labels in an EXACT 50x25 mm per-page PDF.
 * Avoids any A4 conversion, eliminating page-overflow or split labels!
 */
export async function downloadLabels50x25PDF(
  containerOrElements: HTMLElement | HTMLElement[],
  filename = 'Etiquetas_50x25_HAH'
): Promise<boolean> {
  try {
    let cards: HTMLElement[] = [];
    if (Array.isArray(containerOrElements)) {
      cards = containerOrElements;
    } else if (containerOrElements instanceof HTMLElement) {
      cards = Array.from(
        containerOrElements.querySelectorAll('.label-50x25-wrapper')
      ) as HTMLElement[];
      if (cards.length === 0) {
        cards = [containerOrElements];
      }
    }

    if (cards.length === 0) return false;

    // In jsPDF, [25, 50] with 'landscape' creates a page 50mm wide x 25mm high
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [25, 50],
      compress: true,
    });

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (i > 0) {
        pdf.addPage([25, 50], 'landscape');
      }

      // Clone card into a clean offscreen element with strict 50x25 dimensions
      const offscreen = document.createElement('div');
      offscreen.style.position = 'fixed';
      offscreen.style.top = '-9999px';
      offscreen.style.left = '-9999px';
      offscreen.style.width = '50mm';
      offscreen.style.height = '25mm';
      offscreen.style.margin = '0';
      offscreen.style.padding = '0';
      offscreen.style.background = '#ffffff';

      const clonedCard = card.cloneNode(true) as HTMLElement;
      clonedCard.style.transform = 'none';
      clonedCard.style.margin = '0';
      clonedCard.style.width = '50mm';
      clonedCard.style.height = '25mm';
      clonedCard.style.minWidth = '50mm';
      clonedCard.style.maxWidth = '50mm';
      clonedCard.style.minHeight = '25mm';
      clonedCard.style.maxHeight = '25mm';
      clonedCard.style.boxSizing = 'border-box';
      clonedCard.style.overflow = 'hidden';

      // Enforce correct row vs column flex mode directly on clonedCard styles
      if (clonedCard.classList.contains('etiqueta-50x25-qr')) {
        clonedCard.style.display = 'flex';
        clonedCard.style.flexDirection = 'row';
        clonedCard.style.alignItems = 'center';
        clonedCard.style.justifyContent = 'space-between';
        clonedCard.style.gap = '2mm';
      } else {
        clonedCard.style.display = 'flex';
        clonedCard.style.flexDirection = 'column';
        clonedCard.style.justifyContent = 'space-between';
      }

      // Ensure no duplicate canvas element exists if an img is already present
      clonedCard.querySelectorAll('canvas').forEach((canv) => {
        if (canv.parentNode && canv.parentNode.querySelector('img')) {
          canv.parentNode.removeChild(canv);
        }
      });

      offscreen.appendChild(clonedCard);
      document.body.appendChild(offscreen);

      try {
        const canvas = await html2canvas(clonedCard, {
          scale: 4, // 4x scale for sharp barcode and QR lines
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 50, 25, undefined, 'FAST');
      } finally {
        if (offscreen.parentNode) {
          offscreen.parentNode.removeChild(offscreen);
        }
      }
    }

    const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
    return true;
  } catch (err) {
    console.error('downloadLabels50x25PDF failed:', err);
    return false;
  }
}

