declare const JsBarcode: any;
declare const QRCode: any;

/**
 * Plays an authentic POS barcode scanner gun beep using Web Audio API.
 */
export function playScannerBeep(isSuccess = true) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isSuccess ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(isSuccess ? 1800 : 400, ctx.currentTime);
    if (!isSuccess) {
      osc.frequency.setValueAtTime(300, ctx.currentTime + 0.1);
    }

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (isSuccess ? 0.12 : 0.25));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + (isSuccess ? 0.12 : 0.25));
  } catch (e) {
    // Audio might be blocked by browser policy until interaction
  }
}

/**
 * Calculates next correlative tracking code (e.g. TRZ-EQ-001, TRZ-HER-002, TRZ-EQM-005).
 */
export function getNextTrazCode(prefix: 'TRZ-EQ' | 'TRZ-HER' | 'TRZ-EQM', existingItems: { codigo?: string }[] = []): string {
  const items = Array.isArray(existingItems) ? existingItems : [];
  let maxNum = 0;
  items.forEach((it) => {
    if (it && it.codigo && it.codigo.startsWith(prefix)) {
      const match = it.codigo.match(new RegExp(`${prefix}-(\\d+)`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  const nextNum = maxNum > 0 ? maxNum + 1 : items.length + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

export interface Barcode128Options {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textMargin?: number;
  margin?: number;
  font?: string;
}

/**
 * Renders Code 128 barcode onto an SVG or canvas element.
 * Defaults are optimized for 50x25 mm thermal labels.
 */
export function renderBarcode128(
  element: SVGElement | HTMLCanvasElement | null,
  text: string,
  options?: Barcode128Options
) {
  if (!element || !text) return;
  try {
    if (typeof JsBarcode !== 'undefined') {
      JsBarcode(element, text.trim(), {
        format: 'CODE128',
        lineColor: '#000000',
        width: options?.width ?? 1.5,
        height: options?.height ?? 30,
        displayValue: options?.displayValue ?? true,
        fontSize: options?.fontSize ?? 10,
        textMargin: options?.textMargin ?? 1,
        margin: options?.margin ?? 0,
        font: options?.font ?? 'monospace',
        background: '#ffffff',
      });
    }
  } catch (err) {
    console.warn('JsBarcode render error:', err);
  }
}

export interface QRCode2DOptions {
  size?: number;
  correctLevel?: number; // 0 = M (15%), 1 = L (7%), 2 = H (30%), 3 = Q (25%)
}

/**
 * Renders 2D QR Code inside container element as a pristine, single-element SVG (or crisp Image).
 * Includes a mandatory 2-module white quiet zone so scanner guns can detect finder patterns instantly,
 * with zero left/right clipping and zero duplicate canvas/img elements.
 */
export function renderQRCode2D(
  container: HTMLElement | null,
  text: string,
  sizeOrOptions: number | QRCode2DOptions = 80
) {
  if (!container || !text) return;
  const size = typeof sizeOrOptions === 'number' ? sizeOrOptions : (sizeOrOptions.size ?? 80);
  const correctLevel =
    typeof sizeOrOptions === 'object' && sizeOrOptions.correctLevel !== undefined
      ? sizeOrOptions.correctLevel
      : 0; // Default Level M (0)

  try {
    container.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      // 1. Generate QR model via offscreen instance
      const tempDiv = document.createElement('div');
      const qr = new QRCode(tempDiv, {
        text: text.trim(),
        width: 120,
        height: 120,
        correctLevel,
      });

      // 2. Build razor-sharp vector SVG directly from modules with quiet zone
      if (qr && qr._oQRCode && typeof qr._oQRCode.getModuleCount === 'function') {
        const count = qr._oQRCode.getModuleCount();
        const quietZone = 2; // 2 modules white margin prevents edge clipping
        const totalSize = count + quietZone * 2;
        let paths = '';
        for (let row = 0; row < count; row++) {
          for (let col = 0; col < count; col++) {
            if (qr._oQRCode.isDark(row, col)) {
              paths += `M${col + quietZone},${row + quietZone}h1v1h-1z `;
            }
          }
        }

        container.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges" style="width: 100%; height: 100%; max-width: ${size}px; max-height: ${size}px; display: block; margin: 0 auto;">
            <rect width="100%" height="100%" fill="#ffffff"/>
            <path d="${paths}" fill="#000000"/>
          </svg>
        `;
        return;
      }

      // 3. Fallback: single canvas with quiet zone converted to image
      const canvas = tempDiv.querySelector('canvas');
      if (canvas) {
        const quietCanvas = document.createElement('canvas');
        const qz = 10;
        quietCanvas.width = canvas.width + qz * 2;
        quietCanvas.height = canvas.height + qz * 2;
        const ctx = quietCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, quietCanvas.width, quietCanvas.height);
          ctx.drawImage(canvas, qz, qz);
          const img = document.createElement('img');
          img.src = quietCanvas.toDataURL('image/png');
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.maxWidth = `${size}px`;
          img.style.maxHeight = `${size}px`;
          img.style.objectFit = 'contain';
          img.style.imageRendering = 'pixelated';
          img.style.display = 'block';
          img.style.margin = '0 auto';
          container.appendChild(img);
        }
      }
    }
  } catch (err) {
    console.warn('renderQRCode2D error:', err);
  }
}

/**
 * Opens desktop file dialog and returns base64 file data.
 */
export function pickDesktopFile(accept = '.pdf,image/*'): Promise<{ nombre: string; tipo: string; data: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    input.onchange = (e: any) => {
      const file: File | undefined = e.target?.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          nombre: file.name,
          tipo: file.type || 'application/octet-stream',
          data: reader.result as string,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    document.body.appendChild(input);
    input.click();
    setTimeout(() => {
      document.body.removeChild(input);
    }, 1000);
  });
}
