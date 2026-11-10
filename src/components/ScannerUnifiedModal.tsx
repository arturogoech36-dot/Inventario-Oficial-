import React, { useState, useEffect, useRef } from 'react';
import { playScannerBeep } from '../utils/barcodeHelpers';

declare const jsQR: any;

interface ScannerUnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned: (code: string, mode: 'BARRA' | 'QR' | 'AUTO') => void;
  onOpenDespachoContinuo?: () => void;
  defaultMode?: 'AUTO' | 'BARRA' | 'QR';
}

export const ScannerUnifiedModal: React.FC<ScannerUnifiedModalProps> = ({
  isOpen,
  onClose,
  onCodeScanned,
  onOpenDespachoContinuo,
  defaultMode = 'AUTO',
}) => {
  const [readingMode, setReadingMode] = useState<'AUTO' | 'BARRA' | 'QR'>(defaultMode);
  const [activeTab, setActiveTab] = useState<'pistola' | 'camara' | 'manual'>('pistola');
  const [manualCode, setManualCode] = useState('');
  const [pistolaInput, setPistolaInput] = useState('');
  const [scanHistory, setScanHistory] = useState<{ code: string; type: string; time: string }[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const pistolaInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Focus input automatically when modal opens in pistola mode
  useEffect(() => {
    if (isOpen && activeTab === 'pistola') {
      setTimeout(() => {
        pistolaInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeTab]);

  // Camera stream handler
  useEffect(() => {
    if (isOpen && activeTab === 'camara') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        scanCameraFrame();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('No se pudo acceder a la cámara. Conecta una cámara web o usa la pistola de escáner USB.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const scanCameraFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanCameraFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (typeof jsQR !== 'undefined') {
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (qrCode && qrCode.data) {
        handleTriggerCode(qrCode.data, 'QR');
        stopCamera();
        return;
      }
    }

    animationFrameId.current = requestAnimationFrame(scanCameraFrame);
  };

  const handleTriggerCode = (code: string, detectedType: 'BARRA' | 'QR' | 'AUTO') => {
    if (!code || !code.trim()) return;
    const clean = code.trim();
    const effectiveType: 'BARRA' | 'QR' =
      detectedType === 'QR' || clean.startsWith('{')
        ? 'QR'
        : readingMode === 'QR'
        ? 'QR'
        : 'BARRA';

    playScannerBeep(true);
    setScanHistory((prev) => [
      { code: clean, type: effectiveType, time: new Date().toLocaleTimeString('es-CL') },
      ...prev.slice(0, 9),
    ]);
    setPistolaInput('');
    setManualCode('');
    onCodeScanned(clean, effectiveType);
  };

  const handlePistolaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = pistolaInput.trim();
      if (code) {
        const isJsonQR = code.startsWith('{') && code.endsWith('}');
        const type: 'BARRA' | 'QR' = isJsonQR ? 'QR' : readingMode === 'QR' ? 'QR' : 'BARRA';
        handleTriggerCode(code, type);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1140 }}>
      <div
        className="modal"
        style={{
          width: '640px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a1329',
          border: '1.5px solid #00d4ff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 25px 60px -10px rgba(0, 212, 255, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid #1a2d54',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📡</span>
            <div>
              <div style={{ color: '#00e5ff', fontSize: '18px', fontWeight: 800 }}>
                Escáner y Lector Óptico — QR y Códigos de Barra
              </div>
              <div style={{ color: '#8ab0cc', fontSize: '12px' }}>
                Sistema unificado para Pistola Láser USB y Cámara en Vivo — Hospital Alto Hospicio
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8ab0cc',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* ── BANNER ACCESO RÁPIDO A OPCIÓN 2: DESPACHO CONTINUO ── */}
        {onOpenDespachoContinuo && (
          <div
            style={{
              background: 'linear-gradient(90deg, #041d33 0%, #062b48 100%)',
              border: '1.5px solid #00d4ff',
              borderRadius: '8px',
              padding: '9px 14px',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 0 12px rgba(0, 212, 255, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔫</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#00d4ff' }}>
                  ¿ESTÁS PREPARANDO UN EGRESO / DESPACHO DE BODEGA?
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                  Activa la Opción 2 para escanear productos en ráfaga continua con conteo automático de unidades.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDespachoContinuo();
              }}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #00d4ff 100%)',
                border: 'none',
                color: '#001a2a',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Ir a Despacho Continuo ➔
            </button>
          </div>
        )}

        {/* ── SELECTOR SEPARADO DE LECTURA: QR vs BARRA vs AUTO ── */}
        <div
          style={{
            background: '#0d1830',
            border: '1px solid #1a2f58',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
            MODO DE LECTURA:
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setReadingMode('AUTO')}
              style={{
                background: readingMode === 'AUTO' ? '#0284c7' : '#07152b',
                color: readingMode === 'AUTO' ? '#ffffff' : '#94a3b8',
                border: readingMode === 'AUTO' ? '1.5px solid #38bdf8' : '1px solid #1a2c4e',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⚡ AUTO (QR y Barra)
            </button>
            <button
              type="button"
              onClick={() => setReadingMode('BARRA')}
              style={{
                background: readingMode === 'BARRA' ? '#059669' : '#07152b',
                color: readingMode === 'BARRA' ? '#ffffff' : '#94a3b8',
                border: readingMode === 'BARRA' ? '1.5px solid #34d399' : '1px solid #1a2c4e',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🏷️ Solo Códigos de Barra (1D)
            </button>
            <button
              type="button"
              onClick={() => setReadingMode('QR')}
              style={{
                background: readingMode === 'QR' ? '#4f46e5' : '#07152b',
                color: readingMode === 'QR' ? '#ffffff' : '#94a3b8',
                border: readingMode === 'QR' ? '1.5px solid #818cf8' : '1px solid #1a2c4e',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📱 Solo Códigos QR (2D)
            </button>
          </div>
        </div>

        {/* Input Method Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #172a50', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pistola')}
            style={{
              flex: 1,
              background: activeTab === 'pistola' ? '#072448' : '#081224',
              color: activeTab === 'pistola' ? '#00e5ff' : '#64748b',
              border: activeTab === 'pistola' ? '1.5px solid #00d4ff' : '1px solid #1a2c4e',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            🔫 Pistola de Escáner (USB / Bluetooth)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('camara')}
            style={{
              flex: 1,
              background: activeTab === 'camara' ? '#072448' : '#081224',
              color: activeTab === 'camara' ? '#00e5ff' : '#64748b',
              border: activeTab === 'camara' ? '1.5px solid #00d4ff' : '1px solid #1a2c4e',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            📷 Cámara en Vivo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            style={{
              flex: 1,
              background: activeTab === 'manual' ? '#072448' : '#081224',
              color: activeTab === 'manual' ? '#00e5ff' : '#64748b',
              border: activeTab === 'manual' ? '1.5px solid #00d4ff' : '1px solid #1a2c4e',
              borderRadius: '8px',
              padding: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            ⌨️ Ingreso Manual
          </button>
        </div>

        {/* Tab 1: PISTOLA LECTORA */}
        {activeTab === 'pistola' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
            <div
              style={{
                background: '#070f22',
                border: '1.5px dashed #00d4ff',
                borderRadius: '12px',
                padding: '24px 18px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Simulated laser beam scan line animation */}
              <div
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #ef4444, #ff0000, transparent)',
                  boxShadow: '0 0 12px #ff0000',
                  animation: 'laserScan 2.2s infinite ease-in-out',
                }}
              />
              <style>{`
                @keyframes laserScan {
                  0% { top: 10%; opacity: 0.3; }
                  50% { top: 85%; opacity: 1; }
                  100% { top: 10%; opacity: 0.3; }
                }
              `}</style>

              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔫</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>
                Pistola Lista para Lectura Directa
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 16px' }}>
                Apunta la pistola al código de barras o QR y presiona el gatillo.
              </div>

              {/* Hidden or active high-priority input field for keyboard wedge scanner */}
              <div style={{ maxWidth: '340px', margin: '0 auto' }}>
                <input
                  ref={pistolaInputRef}
                  value={pistolaInput}
                  onChange={(e) => setPistolaInput(e.target.value)}
                  onKeyDown={handlePistolaKeyDown}
                  placeholder="Esperando disparo de pistola..."
                  autoFocus
                  style={{
                    width: '100%',
                    background: '#040916',
                    border: '1.5px solid #0284c7',
                    borderRadius: '8px',
                    color: '#00e5ff',
                    padding: '10px 14px',
                    fontSize: '15px',
                    fontWeight: 800,
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)',
                  }}
                />
              </div>

              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
                Atajo: También puedes disparar la pistola desde cualquier pantalla sin abrir este modal.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: CÁMARA EN VIVO */}
        {activeTab === 'camara' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', flex: 1 }}>
            {cameraError ? (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '16px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  fontSize: '13px',
                }}
              >
                ⚠️ {cameraError}
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  maxWidth: '440px',
                  height: '270px',
                  background: '#000000',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '2px solid #00d4ff',
                }}
              >
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }}></video>
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

                {/* Viewfinder Reticle */}
                <div
                  style={{
                    position: 'absolute',
                    top: '20%',
                    left: '15%',
                    right: '15%',
                    bottom: '20%',
                    border: '2px solid #00e5ff',
                    borderRadius: '8px',
                    boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 800, background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px' }}>
                    Enfoca el Código QR o Barra aquí
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: INGRESO MANUAL */}
        {activeTab === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
              Ingresa cualquier código de producto (ej. <strong style={{ color: '#38bdf8' }}>ALI-01</strong> a <strong style={{ color: '#38bdf8' }}>ALI-21</strong>, <strong style={{ color: '#38bdf8' }}>GOB-22</strong>, <strong style={{ color: '#38bdf8' }}>EQM-24</strong>, <strong style={{ color: '#38bdf8' }}>BOT-28</strong>), código de trazabilidad (<strong style={{ color: '#38bdf8' }}>TRZ-EQ-001</strong>), serie o número de acta:
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="field-input"
                value={manualCode}
                placeholder="ej. ALI-01, GOB-22, TRZ-EQ-001, HAH-SAL-01"
                style={{ flex: 1, fontSize: '14px', textTransform: 'uppercase', fontFamily: 'monospace' }}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTriggerCode(manualCode, 'AUTO');
                  }
                }}
              />
              <button
                className="btn btn-cyan"
                onClick={() => handleTriggerCode(manualCode, 'AUTO')}
                style={{ padding: '8px 20px', fontWeight: 800 }}
              >
                🔍 Buscar
              </button>
            </div>
          </div>
        )}

        {/* Scan History in Session */}
        {scanHistory.length > 0 && (
          <div
            style={{
              marginTop: '14px',
              borderTop: '1px solid #1a2d54',
              paddingTop: '10px',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>
              ÚLTIMOS CÓDIGOS LEÍDOS EN ESTA SESIÓN:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {scanHistory.map((h, i) => (
                <button
                  key={`${h.code}-${i}`}
                  type="button"
                  onClick={() => onCodeScanned(h.code, h.type as any)}
                  style={{
                    background: '#0d1d3a',
                    border: '1px solid #1e3a6e',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                  }}
                  title={`Leído a las ${h.time}`}
                >
                  {h.type === 'QR' ? '📱' : '🏷️'} {h.code}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '16px',
            borderTop: '1px solid #1a2d54',
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Búsqueda uniforme en: Catálogo de Productos · Trazabilidad · Kardex · Actas
          </div>
          <button className="btn btn-red btn-sm" onClick={onClose}>
            Cerrar Escáner
          </button>
        </div>
      </div>
    </div>
  );
};
