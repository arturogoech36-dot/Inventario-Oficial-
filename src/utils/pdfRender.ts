import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (e) {
    console.warn('Could not set workerSrc:', e);
  }
}

/**
 * Converts a base64 or data URL string into a Uint8Array.
 */
export function base64ToUint8Array(dataOrBase64: string): Uint8Array {
  const base64Clean = dataOrBase64.includes(',') ? dataOrBase64.split(',')[1] : dataOrBase64;
  const binaryString = atob(base64Clean.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a base64 or data URL string into a Blob URL.
 */
export function base64ToBlobUrl(dataOrBase64: string, defaultMime = 'application/pdf'): string | null {
  try {
    if (!dataOrBase64) return null;
    if (dataOrBase64.startsWith('blob:')) return dataOrBase64;
    const parts = dataOrBase64.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : defaultMime;
    const bytes = base64ToUint8Array(dataOrBase64);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Error converting to Blob URL:', err);
    return null;
  }
}

/**
 * Renders all pages of a PDF document to high-resolution PNG data URLs.
 * Scale 1.8 provides crisp readability on all screen resolutions and prevents Edge iframe blocking.
 */
export async function renderPdfToPageImages(dataOrBase64: string, scale = 1.8): Promise<string[]> {
  try {
    const bytes = base64ToUint8Array(dataOrBase64);
    let pdfDoc;

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: bytes,
      });
      pdfDoc = await loadingTask.promise;
    } catch (workerErr: any) {
      console.warn('Primary worker load failed, trying CDN worker fallback:', workerErr);
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '6.4.299'}/build/pdf.worker.min.mjs`;
      }
      const fallbackTask = pdfjsLib.getDocument({
        data: bytes,
      });
      pdfDoc = await fallbackTask.promise;
    }

    const pageImages: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // Fill white background before rendering
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await (page.render as any)({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      pageImages.push(canvas.toDataURL('image/png'));
    }

    return pageImages;
  } catch (error) {
    console.error('Error rendering PDF to images with pdfjs:', error);
    throw error;
  }
}
