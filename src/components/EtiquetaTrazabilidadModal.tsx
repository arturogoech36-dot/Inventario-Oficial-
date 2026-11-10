import React, { useEffect, useRef, useState } from 'react';
import { renderBarcode128, renderQRCode2D } from '../utils/barcodeHelpers';
import {
  printEtiquetas50x25,
  printEtiquetas,
  downloadElementAsPDF,
  downloadPrintableHtml,
  downloadLabels50x25PDF,
} from '../utils/printHelpers';
import { fmtMoney } from '../utils/format';

export interface EtiquetaItemData {
  tipo: 'producto' | 'equipos' | 'herramientas' | 'equiposmenores';
  codigo: string;
  nombre: string;
  familia?: string;
  stock?: number;
  valor?: number;
  marca?: string;
  modelo?: string;
  serie?: string;
  lote?: string;
  guia?: string;
  factura?: string;
  oc?: string;
  servicioDestino?: string;
  personaRecibe?: string;
  fecha?: string;
}

interface EtiquetaModalProps {
  item?: EtiquetaItemData | null;
  items?: EtiquetaItemData[] | null;
  onClose: () => void;
  defaultMode?: 'barra' | 'qr' | 'combinada' | 'caja';
}

/**
 * 1. ETIQUETA TERMOADHESIVA 50x25 mm — MODO CÓDIGO DE BARRAS (1D Code 128)
 * Calibrada milimétricamente para caber en exactamente 1 etiqueta adhesiva de 25mm de alto
 * sin desbordes ni saltos de página.
 */
const Thermal50x25BarcodeCard: React.FC<{ item: EtiquetaItemData; copyIndex?: number }> = ({ item }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current && item.codigo) {
      // Code 128 calibrado para 50x25mm: altura 28, texto legible integrado, sin desbordes
      renderBarcode128(barcodeRef.current, item.codigo, {
        width: 1.5,
        height: 28,
        displayValue: true,
        fontSize: 10,
        textMargin: 1,
        margin: 0,
        font: 'monospace',
      });
    }
  }, [item.codigo]);

  return (
    <div
      className="label-50x25-wrapper etiqueta-50x25-barra"
      style={{
        width: '50mm',
        height: '25mm',
        minWidth: '50mm',
        maxWidth: '50mm',
        minHeight: '25mm',
        maxHeight: '25mm',
        background: '#ffffff',
        color: '#000000',
        padding: '0.8mm 1.5mm',
        boxSizing: 'border-box',
        border: '1px solid #000000',
        borderRadius: '1px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'Arial, Helvetica, sans-serif',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Encabezado: Institución + Familia */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '0.6px solid #000',
          paddingBottom: '0.3mm',
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: '5pt', fontWeight: 900, letterSpacing: '0.2px', color: '#000' }}>
          HAH BODEGA DE TRANSITO
        </span>
        <span
          style={{
            fontSize: '4.8pt',
            fontWeight: 800,
            background: '#000',
            color: '#fff',
            padding: '0.2mm 0.8mm',
            borderRadius: '1px',
            textTransform: 'uppercase',
          }}
        >
          {item.familia || (item.tipo === 'equipos' ? 'EQ-MED' : item.tipo === 'herramientas' ? 'HERR' : item.tipo === 'equiposmenores' ? 'EQ-MEN' : 'INSUMO')}
        </span>
      </div>

      {/* Código de Barras SVG con código centrado legible abajo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          overflow: 'hidden',
          margin: '0.2mm 0',
        }}
      >
        <svg
          ref={barcodeRef}
          style={{
            width: '100%',
            height: '12mm',
            maxHeight: '12mm',
            display: 'block',
          }}
        ></svg>
      </div>

      {/* Pie: Descripción del producto limpia */}
      <div
        style={{
          borderTop: '0.5px solid #000',
          paddingTop: '0.3mm',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          lineHeight: 1.1,
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          <span style={{ fontSize: '5.5pt', fontWeight: 800, color: '#000' }}>
            {item.nombre}
          </span>
        </div>
        <span style={{ fontSize: '4.5pt', color: '#444', marginLeft: '1mm', flexShrink: 0 }}>
          HAH-BOD
        </span>
      </div>
    </div>
  );
};

/**
 * 2. ETIQUETA TERMOADHESIVA 50x25 mm — MODO CÓDIGO QR (2D)
 * Optimizada para lectura instantánea con pistola lectora 2D:
 * Codifica directamente el código (ej. ALI-01), generando matriz nítida
 * (Versión 1 de 21x21 módulos con zona blanca amplia de silencio),
 * exactamente un solo elemento QR y datos a la derecha sin solapamientos.
 */
const Thermal50x25QRCodeCard: React.FC<{ item: EtiquetaItemData; copyIndex?: number }> = ({ item }) => {
  const qrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (qrRef.current && item.codigo) {
      // Codificar directamente el código para que la pistola lo lea en milisegundos
      renderQRCode2D(qrRef.current, item.codigo, 68);
    }
  }, [item.codigo]);

  return (
    <div
      className="label-50x25-wrapper etiqueta-50x25-qr"
      style={{
        width: '50mm',
        height: '25mm',
        minWidth: '50mm',
        maxWidth: '50mm',
        minHeight: '25mm',
        maxHeight: '25mm',
        background: '#ffffff',
        color: '#000000',
        padding: '0.8mm 1.5mm',
        boxSizing: 'border-box',
        border: '1px solid #000000',
        borderRadius: '1px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '2mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Contenedor QR con zona de silencio blanca pura (exactamente 1 código QR) */}
      <div
        style={{
          width: '18mm',
          minWidth: '18mm',
          maxWidth: '18mm',
          height: '18mm',
          minHeight: '18mm',
          maxHeight: '18mm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          overflow: 'hidden',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <div
          ref={qrRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
          }}
        ></div>
      </div>

      {/* Columna derecha: Datos institucionales claros */}
      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          padding: '0.2mm 0',
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '4.8pt',
              fontWeight: 900,
              color: '#000',
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.1,
            }}
          >
            HAH BODEGA DE TRANSITO
          </div>
          <div
            style={{
              fontSize: '9.5pt',
              fontWeight: 900,
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
              color: '#000',
              marginTop: '0.3mm',
              lineHeight: 1,
            }}
          >
            {item.codigo}
          </div>
          <div
            style={{
              fontSize: '5.2pt',
              fontWeight: 700,
              color: '#111',
              marginTop: '0.3mm',
              lineHeight: 1.15,
              maxHeight: '6.5mm',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.nombre}
          </div>
        </div>

        <div style={{ borderTop: '0.5px solid #000', paddingTop: '0.3mm', fontSize: '4.5pt', color: '#333', lineHeight: 1 }}>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <strong>Fam:</strong> {item.familia || 'Bodega'}
            {item.serie ? ` · S/N: ${item.serie}` : item.stock !== undefined ? ` · Stk: ${item.stock}` : ''}
          </div>
          <div style={{ fontSize: '4pt', color: '#666', marginTop: '0.2mm' }}>
            {item.fecha || new Date().toLocaleDateString('es-CL')} · Bodega Tránsito
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 3. ETIQUETA TERMOADHESIVA 50x25 mm — MODO COMBINADO (QR + BARRA)
 */
const Thermal50x25CombinedCard: React.FC<{ item: EtiquetaItemData }> = ({ item }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const qrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current && item.codigo) {
      renderBarcode128(barcodeRef.current, item.codigo, {
        width: 1.2,
        height: 20,
        displayValue: false,
        margin: 0,
      });
    }
    if (qrRef.current && item.codigo) {
      renderQRCode2D(qrRef.current, item.codigo, { size: 52, correctLevel: 0 });
    }
  }, [item.codigo]);

  return (
    <div
      className="label-50x25-wrapper etiqueta-50x25-combinada"
      style={{
        width: '50mm',
        height: '25mm',
        minWidth: '50mm',
        maxWidth: '50mm',
        minHeight: '25mm',
        maxHeight: '25mm',
        background: '#ffffff',
        color: '#000000',
        padding: '0.8mm 1.2mm',
        boxSizing: 'border-box',
        border: '1px solid #000000',
        borderRadius: '1px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'Arial, Helvetica, sans-serif',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '4.8pt',
          fontWeight: 900,
          borderBottom: '0.5px solid #000',
          paddingBottom: '0.2mm',
        }}
      >
        <span>HAH BODEGA DE TRANSITO</span>
        <span style={{ fontFamily: 'monospace', fontSize: '6pt', fontWeight: 900 }}>{item.codigo}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '15mm 1fr', gap: '1mm', alignItems: 'center', flex: 1 }}>
        <div ref={qrRef} style={{ width: '14mm', height: '14mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', overflow: 'hidden' }}>
          <svg ref={barcodeRef} style={{ width: '100%', height: '7.5mm', maxHeight: '7.5mm' }}></svg>
          <div style={{ fontSize: '4.8pt', fontWeight: 700, color: '#111', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginTop: '0.2mm' }}>
            {item.nombre}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '0.5px solid #000', paddingTop: '0.2mm', fontSize: '4.2pt', display: 'flex', justifyContent: 'space-between' }}>
        <span>Fam: {item.familia || 'GENERAL'}</span>
        <span>{item.fecha || new Date().toLocaleDateString('es-CL')}</span>
      </div>
    </div>
  );
};

/**
 * 4. ETIQUETA INSTITUCIONAL PARA CAJAS DE PRODUCTOS (PDF A4 / Ficha Grande de Caja)
 * Para pegar en las cajas maestras de productos en bodega.
 */
const BoxLabelPDFCard: React.FC<{ item: EtiquetaItemData }> = ({ item }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const qrRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current && item.codigo) {
      renderBarcode128(barcodeRef.current, item.codigo, {
        width: 2,
        height: 48,
        displayValue: true,
        fontSize: 12,
        margin: 2,
      });
    }
    if (qrRef.current && item.codigo) {
      // Para cajas también codificamos el código directo para lectura rápida de la pistola
      renderQRCode2D(qrRef.current, item.codigo, { size: 100, correctLevel: 0 });
    }
  }, [item.codigo]);

  return (
    <div
      className="etiqueta-caja-card"
      style={{
        background: '#ffffff',
        color: '#000000',
        borderRadius: '8px',
        padding: '16px',
        border: '2px solid #003366',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontFamily: 'Arial, sans-serif',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        boxSizing: 'border-box',
        maxWidth: '520px',
        margin: '0 auto',
      }}
    >
      {/* Header Institucional Caja */}
      <div
        style={{
          borderBottom: '2.5px solid #003366',
          paddingBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: '13pt', color: '#003366', letterSpacing: '0.5px' }}>
            HAH BODEGA DE TRANSITO
          </div>
          <div style={{ fontSize: '9pt', color: '#475569', fontWeight: 700 }}>
            BODEGA GENERAL · ROTULACIÓN Y CONTROL DE CAJAS
          </div>
        </div>
        <div
          style={{
            background: '#003366',
            color: '#fff',
            fontSize: '9pt',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '4px',
            textTransform: 'uppercase',
          }}
        >
          {item.familia || 'CAJA INSUMO'}
        </div>
      </div>

      {/* Code & Title */}
      <div>
        <div style={{ fontSize: '22pt', fontWeight: 900, color: '#002244', letterSpacing: '1px', fontFamily: 'monospace' }}>
          {item.codigo}
        </div>
        <div style={{ fontSize: '14pt', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
          {item.nombre}
        </div>
      </div>

      {/* Barcodes section: Left 1D Barcode, Right 2D QR Code */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '12px',
          alignItems: 'center',
          background: '#f8fafc',
          border: '1.5px solid #cbd5e1',
          borderRadius: '8px',
          padding: '10px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
            CÓDIGO DE BARRAS (PISTOLA LÁSER)
          </div>
          <svg ref={barcodeRef} style={{ width: '100%', maxHeight: '55px' }}></svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
            CÓDIGO QR (2D)
          </div>
          <div ref={qrRef} style={{ width: '90px', height: '90px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></div>
        </div>
      </div>

      {/* Grid Metadata */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          background: '#f1f5f9',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '9pt',
        }}
      >
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '7.5pt', fontWeight: 700 }}>FAMILIA:</span>
          <strong>{item.familia || 'Bodega Central'}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '7.5pt', fontWeight: 700 }}>SERIE / LOTE:</span>
          <strong style={{ fontFamily: 'monospace' }}>{item.serie || item.lote || 'LOTE GENERAL'}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '7.5pt', fontWeight: 700 }}>FECHA INGRESO:</span>
          <strong>{item.fecha || new Date().toLocaleDateString('es-CL')}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '7.5pt', fontWeight: 700 }}>DESTINO / ÁREA:</span>
          <strong>{item.servicioDestino || 'Bodega de Tránsito'}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '7.5pt', fontWeight: 700 }}>DOC. REFERENCIA:</span>
          <strong>{item.guia || item.factura || item.oc || 'Sin Referencia'}</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block', fontSize: '7.5pt', fontWeight: 700 }}>STOCK EN BODEGA:</span>
          <strong style={{ color: '#003366', fontSize: '11pt' }}>{item.stock !== undefined ? `${item.stock} uds.` : '—'}</strong>
        </div>
      </div>
    </div>
  );
};

export const EtiquetaTrazabilidadModal: React.FC<EtiquetaModalProps> = ({
  item,
  items,
  onClose,
  defaultMode = 'barra',
}) => {
  const listaItems = items && items.length > 0 ? items : item ? [item] : [];

  if (listaItems.length === 0) return null;

  const isBatch = listaItems.length > 1;
  const [mode, setMode] = useState<'barra' | 'qr' | 'combinada' | 'caja'>(defaultMode);
  const [copies, setCopies] = useState<number>(1);
  const [zoom, setZoom] = useState<'100' | '150' | '200'>('150');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Generate array with copies if single item, or full list
  const displayItems = isBatch
    ? listaItems
    : Array.from({ length: Math.max(1, Math.min(copies, 100)) }, () => listaItems[0]);

  const handlePrint = () => {
    const container = document.getElementById('etiqueta-imprimible');
    if (!container) {
      window.print();
      return;
    }

    const title = isBatch
      ? `Etiquetas_Lote_${listaItems.length}_HAH`
      : `Etiqueta_${listaItems[0]?.codigo || 'HAH'}_${mode}`;

    if (mode === 'caja') {
      printEtiquetas(container, title);
    } else {
      printEtiquetas50x25(container, title);
    }
  };

  const handleDownloadPdf = async () => {
    const container = document.getElementById('etiqueta-imprimible');
    if (!container) return;
    setDownloadingPdf(true);
    try {
      const filename = isBatch
        ? `Etiquetas_Lote_${listaItems.length}_HAH`
        : `Etiqueta_${listaItems[0]?.codigo || 'HAH'}_${mode}_50x25`;
      if (mode === 'caja') {
        await downloadElementAsPDF(container, filename, 'portrait');
      } else {
        await downloadLabels50x25PDF(container, filename);
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadHtml = () => {
    const container = document.getElementById('etiqueta-imprimible');
    if (!container) return;
    const filename = isBatch
      ? `Etiquetas_Lote_${listaItems.length}_HAH`
      : `Etiqueta_${listaItems[0]?.codigo || 'HAH'}_${mode}`;
    downloadPrintableHtml(
      container.innerHTML,
      filename,
      `Etiqueta ${listaItems[0]?.codigo} (${mode.toUpperCase()}) - HAH`
    );
  };

  const zoomScale = zoom === '100' ? 1 : zoom === '150' ? 1.5 : 2;

  return (
    <div className="modal-overlay open printable-modal" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        style={{
          width: mode === 'caja' ? '820px' : isBatch ? '920px' : '640px',
          maxWidth: '96vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0a1329',
          border: '1.5px solid #00d4ff',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 25px 60px -10px rgba(0, 212, 255, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            borderBottom: '1px solid #1a2d54',
            paddingBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🏷️</span>
            <div>
              <div style={{ color: '#00e5ff', fontSize: '18px', fontWeight: 800 }}>
                Impresión de Etiquetas — Hospital Alto Hospicio
              </div>
              <div style={{ color: '#8ab0cc', fontSize: '12px' }}>
                Medida oficial: <strong style={{ color: '#38bdf8' }}>50x25 mm</strong> (Rollo Termoadhesivo LABEL) y Formato Cajas PDF
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

        {/* Format Selector Tabs */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px',
            background: '#0d1830',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid #1a2f58',
          }}
        >
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setMode('barra')}
              style={{
                background: mode === 'barra' ? '#0284c7' : '#0a1d37',
                color: mode === 'barra' ? '#ffffff' : '#94a3b8',
                border: mode === 'barra' ? '1.5px solid #38bdf8' : '1px solid #1e3a6e',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              🏷️ CÓDIGO BARRA (50x25)
            </button>
            <button
              type="button"
              onClick={() => setMode('qr')}
              style={{
                background: mode === 'qr' ? '#0284c7' : '#0a1d37',
                color: mode === 'qr' ? '#ffffff' : '#94a3b8',
                border: mode === 'qr' ? '1.5px solid #38bdf8' : '1px solid #1e3a6e',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              📱 CÓDIGO QR (50x25)
            </button>
            <button
              type="button"
              onClick={() => setMode('combinada')}
              style={{
                background: mode === 'combinada' ? '#0284c7' : '#0a1d37',
                color: mode === 'combinada' ? '#ffffff' : '#94a3b8',
                border: mode === 'combinada' ? '1.5px solid #38bdf8' : '1px solid #1e3a6e',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              🏷️📱 COMBINADA (50x25)
            </button>
            <button
              type="button"
              onClick={() => setMode('caja')}
              style={{
                background: mode === 'caja' ? '#059669' : '#062d22',
                color: mode === 'caja' ? '#ffffff' : '#a7f3d0',
                border: mode === 'caja' ? '1.5px solid #34d399' : '1px solid #065f46',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              📦 ETIQUETA CAJA (PDF)
            </button>
          </div>

          {/* Right Controls: Copies & Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isBatch && mode !== 'caja' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                <span>Copias:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '54px',
                    background: '#070f20',
                    border: '1px solid #1e3a6e',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '3px 6px',
                    fontSize: '12px',
                    textAlign: 'center',
                  }}
                />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
              <span>Vista:</span>
              <button
                type="button"
                onClick={() => setZoom('100')}
                style={{
                  background: zoom === '100' ? '#38bdf8' : '#0a1d37',
                  color: zoom === '100' ? '#000' : '#8ab0cc',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 5px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                1:1
              </button>
              <button
                type="button"
                onClick={() => setZoom('150')}
                style={{
                  background: zoom === '150' ? '#38bdf8' : '#0a1d37',
                  color: zoom === '150' ? '#000' : '#8ab0cc',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 5px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                150%
              </button>
              <button
                type="button"
                onClick={() => setZoom('200')}
                style={{
                  background: zoom === '200' ? '#38bdf8' : '#0a1d37',
                  color: zoom === '200' ? '#000' : '#8ab0cc',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 5px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                200%
              </button>
            </div>
          </div>
        </div>

        {/* ── PRINTABLE CONTAINER ── */}
        <div
          id="etiqueta-imprimible"
          style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: '62vh',
            padding: '12px',
            background: '#070e1e',
            borderRadius: '10px',
            border: '1px solid #172a50',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          {displayItems.map((it, idx) => (
            <div
              key={`${it.codigo}-${idx}`}
              className="label-card-zoom-wrapper"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                margin: zoomScale > 1 ? `${(zoomScale - 1) * 14}mm ${(zoomScale - 1) * 26}mm` : '4px',
              }}
            >
              {mode === 'barra' ? (
                <Thermal50x25BarcodeCard item={it} copyIndex={idx} />
              ) : mode === 'qr' ? (
                <Thermal50x25QRCodeCard item={it} copyIndex={idx} />
              ) : mode === 'combinada' ? (
                <Thermal50x25CombinedCard item={it} />
              ) : (
                <BoxLabelPDFCard item={it} />
              )}
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            borderTop: '1px solid #1a2d54',
            paddingTop: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '11.5px', color: '#38bdf8' }}>
            {mode === 'caja'
              ? '📦 Formato grande A4 institucional para pegar en cajas de productos'
              : '⚡ Formato calibrado para rollo 50x25 mm (Zebra, Brother, Xprinter, TSC)'}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#160b18',
                border: '1.5px solid #e11d48',
                color: '#fb7185',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              style={{
                background: '#0a1d37',
                border: '1.5px solid #0284c7',
                color: '#38bdf8',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Descargar HTML para abrir e imprimir en navegador externo"
            >
              🌐 HTML
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              style={{
                background: '#1a1005',
                border: '1.5px solid #d97706',
                color: '#fbbf24',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: downloadingPdf ? 'wait' : 'pointer',
              }}
              title="Descargar archivo PDF de alta definición"
            >
              {downloadingPdf ? '⏳ PDF...' : '📥 Descargar PDF'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: '#081a17',
                border: '1.5px solid #10b981',
                color: '#34d399',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Abre la ventana de impresión para impresora de etiquetas térmica"
            >
              🖨️ Imprimir {mode === 'caja' ? 'Etiqueta Caja' : `50x25 mm (${displayItems.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
