import React, { useState, useEffect } from 'react';
import { renderPdfToPageImages } from '../utils/pdfRender';

export interface DocumentPreviewData {
  nombre: string;
  tipo: string;
  data?: string;
  codigoItem?: string;
  descItem?: string;
  guia?: string;
  factura?: string;
  oc?: string;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  documentData: DocumentPreviewData | null;
  onClose: () => void;
  onPrint?: (doc: { nombre: string; tipo: string; data?: string }) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  documentData,
  onClose,
  onPrint,
}) => {
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [fitWidth, setFitWidth] = useState<boolean>(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const isPDF = Boolean(
    documentData &&
      (documentData.tipo === 'application/pdf' ||
        (documentData.nombre || '').toLowerCase().endsWith('.pdf') ||
        (documentData.data && documentData.data.startsWith('data:application/pdf')))
  );

  const isImage = Boolean(
    documentData &&
      (documentData.tipo.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(documentData.nombre) ||
        (documentData.data && documentData.data.startsWith('data:image/')))
  );

  // Helper to generate a clean Blob URL for downloading and opening in new tab
  useEffect(() => {
    if (!isOpen || !documentData?.data) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    try {
      if (documentData.data.startsWith('data:')) {
        const parts = documentData.data.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (isPDF ? 'application/pdf' : 'application/octet-stream');
        const bstr = atob(parts[1].replace(/\s/g, ''));
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }
        const blob = new Blob([u8arr], { type: mime });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        return () => {
          URL.revokeObjectURL(url);
        };
      }
    } catch (e) {
      console.warn('Error creating Blob URL:', e);
    }
  }, [isOpen, documentData?.data, isPDF]);

  // Load and render PDF pages directly into images to prevent Microsoft Edge / Chromium iframe blocking
  useEffect(() => {
    if (!isOpen || !documentData?.data || !isPDF) {
      setPdfPages([]);
      setIsLoadingPdf(false);
      setPdfError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingPdf(true);
    setPdfError(null);
    setPdfPages([]);

    const renderPages = async () => {
      try {
        // Render with scale 1.8 for sharp, crisp resolution on screens
        const pages = await renderPdfToPageImages(documentData.data!, 1.8);
        if (isMounted) {
          if (pages && pages.length > 0) {
            setPdfPages(pages);
            setPdfError(null);
          } else {
            setPdfError('No se encontraron páginas en el documento PDF.');
          }
          setIsLoadingPdf(false);
        }
      } catch (err: any) {
        console.error('Error al procesar PDF con pdfjs:', err);
        if (isMounted) {
          setPdfError(
            err?.message ||
              'No fue posible procesar la vista preliminar directa del archivo PDF. Puede descargarlo o abrirlo en una nueva pestaña.'
          );
          setIsLoadingPdf(false);
        }
      }
    };

    renderPages();

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentData?.data, isPDF]);

  if (!isOpen || !documentData) return null;

  const handleDownload = () => {
    if (!documentData.data) return;

    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = documentData.nombre || 'documento_adjunto.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Fallback direct download
    const a = document.createElement('a');
    a.href = documentData.data;
    a.download = documentData.nombre || 'documento_adjunto';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
      return;
    }
    if (documentData.data) {
      window.open(documentData.data, '_blank');
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 50));
  const handleResetZoom = () => {
    setZoomLevel(100);
    setFitWidth(false);
  };
  const toggleFitWidth = () => {
    setFitWidth((prev) => !prev);
    if (!fitWidth) {
      setZoomLevel(100);
    }
  };

  return (
    <div
      className="modal-overlay open"
      style={{
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(6px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{
          width: '96%',
          maxWidth: '1080px',
          height: '92vh',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* File Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '260px', flex: 1 }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>{isPDF ? '📄' : isImage ? '🖼️' : '📎'}</span>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#f8fafc',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '520px',
                }}
                title={documentData.nombre}
              >
                {documentData.nombre}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                <span style={{ backgroundColor: '#0f172a', padding: '1px 6px', borderRadius: '4px' }}>
                  {isPDF ? 'Documento PDF' : isImage ? 'Imagen' : documentData.tipo}
                </span>
                {documentData.codigoItem && (
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                    Insumo: {documentData.codigoItem}
                  </span>
                )}
                {documentData.guia && documentData.guia !== '—' && (
                  <span style={{ color: '#4ade80', fontWeight: 600, backgroundColor: 'rgba(74, 222, 128, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                    Guía: {documentData.guia}
                  </span>
                )}
                {documentData.factura && documentData.factura !== '—' && (
                  <span style={{ color: '#fbbf24', fontWeight: 600, backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                    Factura: {documentData.factura}
                  </span>
                )}
                {documentData.oc && documentData.oc !== '—' && (
                  <span style={{ color: '#c084fc', fontWeight: 600, backgroundColor: 'rgba(192, 132, 252, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                    OC: {documentData.oc}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Zoom Controls for PDF or Image */}
            {(isPDF || isImage) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#0f172a',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  padding: '2px',
                  marginRight: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Reducir zoom"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: '4px',
                  }}
                >
                  🔍−
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Restablecer tamaño normal"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {zoomLevel}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Aumentar zoom"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: '12px',
                    borderRadius: '4px',
                  }}
                >
                  🔍+
                </button>
                <button
                  type="button"
                  onClick={toggleFitWidth}
                  title={fitWidth ? 'Ver tamaño estándar' : 'Ajustar al ancho'}
                  style={{
                    background: fitWidth ? '#334155' : 'transparent',
                    border: 'none',
                    color: fitWidth ? '#38bdf8' : '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    marginLeft: '2px',
                  }}
                >
                  ↔ Ajustar
                </button>
              </div>
            )}

            {onPrint && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onPrint(documentData)}
                style={{
                  backgroundColor: '#047857',
                  borderColor: '#10b981',
                  color: '#ffffff',
                  fontSize: '12px',
                  padding: '5px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                }}
                title="Imprimir documento oficial"
              >
                🖨️ Imprimir
              </button>
            )}

            <button
              type="button"
              className="btn btn-sm"
              onClick={handleDownload}
              style={{
                backgroundColor: '#1e293b',
                borderColor: '#475569',
                color: '#e2e8f0',
                fontSize: '12px',
                padding: '5px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Descargar copia del documento"
            >
              ⬇️ Descargar
            </button>

            {blobUrl && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleOpenNewTab}
                style={{
                  backgroundColor: '#1e293b',
                  borderColor: '#475569',
                  color: '#93c5fd',
                  fontSize: '12px',
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Abrir en pestaña nueva del navegador"
              >
                ↗️ Pestaña
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                marginLeft: '4px',
              }}
              title="Cerrar visualizador"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#020617',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: pdfPages.length > 0 || isImage ? 'flex-start' : 'center',
            overflowY: 'auto',
            overflowX: 'auto',
            padding: '20px',
            position: 'relative',
          }}
        >
          {documentData.data ? (
            isPDF ? (
              // PDF Document View: Rendered page by page via canvas images (immune to Edge iframe blocking)
              isLoadingPdf ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 20px' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      width: '42px',
                      height: '42px',
                      border: '4px solid rgba(56, 189, 248, 0.2)',
                      borderTopColor: '#38bdf8',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '16px',
                    }}
                  />
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  <p style={{ fontSize: '15px', color: '#f1f5f9', fontWeight: 600 }}>
                    Cargando y procesando páginas del documento PDF...
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                    Renderizando de forma segura para evitar bloqueos del navegador.
                  </p>
                </div>
              ) : pdfError ? (
                <div
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '30px',
                    textAlign: 'center',
                    maxWidth: '520px',
                    margin: 'auto',
                  }}
                >
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>📄</div>
                  <h4 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '8px', fontWeight: 600 }}>
                    Vista previa directa no disponible
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
                    {pdfError}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleDownload}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      ⬇️ Descargar archivo PDF ({documentData.nombre})
                    </button>
                    {blobUrl && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleOpenNewTab}
                        style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#334155' }}
                      >
                        ↗️ Abrir en nueva pestaña
                      </button>
                    )}
                  </div>
                </div>
              ) : pdfPages.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px',
                    width: fitWidth ? '100%' : 'auto',
                    maxWidth: fitWidth ? '100%' : `${Math.round(850 * (zoomLevel / 100))}px`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {pdfPages.map((pageImg, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: fitWidth ? '100%' : 'auto',
                      }}
                    >
                      {/* Page Badge */}
                      <div
                        style={{
                          alignSelf: 'flex-start',
                          marginBottom: '6px',
                          fontSize: '11px',
                          color: '#94a3b8',
                          fontWeight: 600,
                          backgroundColor: '#1e293b',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #334155',
                        }}
                      >
                        Página {idx + 1} de {pdfPages.length}
                      </div>

                      {/* Sheet Rendering */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: '4px',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                          overflow: 'hidden',
                          width: fitWidth ? '100%' : 'auto',
                          maxWidth: fitWidth ? '950px' : 'none',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        <img
                          src={pageImg}
                          alt={`Documento ${documentData.nombre} - Página ${idx + 1}`}
                          style={{
                            width: fitWidth ? '100%' : `${Math.round(800 * (zoomLevel / 100))}px`,
                            height: 'auto',
                            display: 'block',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
                  No se pudo cargar páginas para previsualizar.
                </div>
              )
            ) : isImage ? (
              // Image Viewer
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  height: '100%',
                  padding: '10px',
                }}
              >
                <img
                  src={documentData.data}
                  alt={documentData.nombre}
                  style={{
                    maxWidth: fitWidth ? '100%' : `${Math.round(100 * (zoomLevel / 100))}%`,
                    maxHeight: fitWidth ? '80vh' : 'none',
                    objectFit: 'contain',
                    borderRadius: '6px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                    border: '1px solid #334155',
                  }}
                />
              </div>
            ) : (
              // Unsupported mime preview
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>
                <p style={{ fontSize: '16px', marginBottom: '12px' }}>
                  Vista previa directa no compatible para este tipo de archivo.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownload}
                  style={{ marginTop: '8px' }}
                >
                  ⬇️ Descargar archivo ({documentData.nombre})
                </button>
              </div>
            )
          ) : (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '40px' }}>
              ⚠️ No se pudo cargar el contenido del documento o el archivo está vacío.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Hospital Alto Hospicio · Tránsito Despacho</span>
            {pdfPages.length > 0 && (
              <span style={{ color: '#38bdf8' }}>
                · {pdfPages.length} {pdfPages.length === 1 ? 'Página procesada' : 'Páginas procesadas'}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onClose}
            style={{
              backgroundColor: '#334155',
              border: 'none',
              color: '#ffffff',
              padding: '5px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
