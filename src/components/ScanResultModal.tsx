import React from 'react';
import { fmtMoney } from '../utils/format';
import { ScanResultData } from '../types';

export type { ScanResultData };

interface ScanResultModalProps {
  scanResult: ScanResultData | null;
  onClose: () => void;
  onPrintEtiqueta: (item: any, modulo: string, mode?: 'barra' | 'qr' | 'combinada' | 'caja') => void;
  onVerAdjunto?: (item: any) => void;
  onEditarItem: (item: any, modulo: string) => void;
  onAdjuntarItem?: (item: any, modulo: string) => void;
  onEntradaRapida?: (producto: any) => void;
  onSalidaRapida?: (producto: any) => void;
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  scanResult,
  onClose,
  onPrintEtiqueta,
  onVerAdjunto,
  onEditarItem,
  onAdjuntarItem,
  onEntradaRapida,
  onSalidaRapida,
}) => {
  if (!scanResult) return null;
  const { modulo, item, tipoCodigo, codigoEscaneado } = scanResult;

  const isProducto = modulo === 'producto';
  const isActa = modulo === 'acta';

  const moduloTitle =
    modulo === 'producto'
      ? '📦 Maestro de Insumos y Productos'
      : modulo === 'equipos'
      ? '🔧 Trazabilidad de Equipos (Préstamos)'
      : modulo === 'herramientas'
      ? '🧰 Trazabilidad de Herramientas'
      : modulo === 'equiposmenores'
      ? '⚙️ Trazabilidad de Equipos Menores'
      : '📄 Acta Oficial de Despacho';

  const nombre = item.desc || item.nombreEquipo || item.descripcion || (isActa ? `Acta de Despacho ${item.id}` : 'Ítem');
  const codigo = item.codigo || item.id || codigoEscaneado || 'S/C';

  const tipoBadge =
    tipoCodigo === 'BARRA'
      ? { label: '🏷️ CÓDIGO DE BARRAS (1D)', bg: '#064e3b', color: '#6ee7b7', border: '#059669' }
      : tipoCodigo === 'QR'
      ? { label: '📱 CÓDIGO QR (2D)', bg: '#1e1b4b', color: '#a5b4fc', border: '#4f46e5' }
      : { label: '🔫 PISTOLA LECTORA', bg: '#082f49', color: '#7dd3fc', border: '#0284c7' };

  return (
    <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1150 }}>
      <div
        className="modal"
        style={{
          width: '620px',
          maxWidth: '95vw',
          background: '#0d172e',
          border: '1.5px solid #00d4ff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 25px 60px -10px rgba(0, 212, 255, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with scan badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>🔫</span>
              <span style={{ color: '#00e5ff', fontSize: '18px', fontWeight: 800 }}>
                ¡Lectura de Escáner Exitosa!
              </span>
            </div>
            <div style={{ color: '#8ab0cc', fontSize: '12px', marginTop: '3px' }}>
              {moduloTitle}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span
              style={{
                background: tipoBadge.bg,
                border: `1px solid ${tipoBadge.border}`,
                color: tipoBadge.color,
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.4px',
              }}
            >
              {tipoBadge.label}
            </span>
            <span
              style={{
                background: '#003366',
                border: '1px solid #0088cc',
                color: '#38bdf8',
                fontSize: '12px',
                fontWeight: 900,
                padding: '3px 10px',
                borderRadius: '6px',
                fontFamily: 'monospace',
              }}
            >
              {codigo}
            </span>
          </div>
        </div>

        {/* Item Card Details */}
        <div
          style={{
            background: '#070e1e',
            border: '1px solid #1a2c4e',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '10.5px', color: '#7a92b8', textTransform: 'uppercase', fontWeight: 700 }}>
              DESCRIPCIÓN / PRODUCTO
            </div>
            <div style={{ fontSize: '16.5px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              {nombre}
            </div>
          </div>

          {/* Conditional layout for Product vs Trazabilidad vs Acta */}
          {isProducto ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12.5px' }}>
              <div style={{ background: '#0a162e', padding: '8px 10px', borderRadius: '8px', border: '1px solid #172849' }}>
                <span style={{ color: '#7a92b8', display: 'block', fontSize: '10.5px' }}>Familia:</span>
                <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '14px' }}>{item.familia}</span>
              </div>
              <div style={{ background: '#0a162e', padding: '8px 10px', borderRadius: '8px', border: '1px solid #172849' }}>
                <span style={{ color: '#7a92b8', display: 'block', fontSize: '10.5px' }}>Stock Actual:</span>
                <span
                  style={{
                    color: item.stock <= item.stockMin ? '#ef4444' : '#10b981',
                    fontWeight: 900,
                    fontSize: '16px',
                  }}
                >
                  {item.stock} uds.
                </span>
              </div>
              <div style={{ background: '#0a162e', padding: '8px 10px', borderRadius: '8px', border: '1px solid #172849' }}>
                <span style={{ color: '#7a92b8', display: 'block', fontSize: '10.5px' }}>Stock Mínimo:</span>
                <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '14px' }}>{item.stockMin} uds.</span>
              </div>
              <div style={{ background: '#0a162e', padding: '8px 10px', borderRadius: '8px', border: '1px solid #172849' }}>
                <span style={{ color: '#7a92b8', display: 'block', fontSize: '10.5px' }}>Tipo:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{item.tipo || 'Fijo'}</span>
              </div>
              <div style={{ background: '#0a162e', padding: '8px 10px', borderRadius: '8px', border: '1px solid #172849' }}>
                <span style={{ color: '#7a92b8', display: 'block', fontSize: '10.5px' }}>Valor Unitario:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{fmtMoney(item.valor || 0)}</span>
              </div>
              <div style={{ background: '#0a162e', padding: '8px 10px', borderRadius: '8px', border: '1px solid #172849' }}>
                <span style={{ color: '#7a92b8', display: 'block', fontSize: '10.5px' }}>Valor Total:</span>
                <span style={{ color: '#10b981', fontWeight: 800 }}>{fmtMoney((item.stock || 0) * (item.valor || 0))}</span>
              </div>
            </div>
          ) : isActa ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
              <div>
                <span style={{ color: '#7a92b8' }}>Servicio Destino:</span>{' '}
                <span style={{ color: '#facc15', fontWeight: 700 }}>{item.servicio}</span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>N° Solicitud:</span>{' '}
                <span style={{ color: '#fff', fontFamily: 'monospace' }}>{item.nroSolicitud}</span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>Fecha Despacho:</span>{' '}
                <span style={{ color: '#fff' }}>{item.fecha}</span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>Responsable:</span>{' '}
                <span style={{ color: '#fff' }}>{item.responsable}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: '#7a92b8' }}>Total Ítems Despachados:</span>{' '}
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                  {(item.items || []).reduce((acc: number, it: any) => acc + (it.cantidad || 0), 0)} unidades
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
              <div>
                <span style={{ color: '#7a92b8' }}>Marca / Mod:</span>{' '}
                <span style={{ color: '#fff', fontWeight: 600 }}>
                  {item.marca || '—'} {item.modelo ? `· ${item.modelo}` : ''}
                </span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>N° Serie:</span>{' '}
                <span style={{ color: '#00d4ff', fontWeight: 700, fontFamily: 'monospace' }}>
                  {item.nSerie || item.serie || 'S/N'}
                </span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>Guía / Factura:</span>{' '}
                <span style={{ color: '#fff' }}>{item.guia || item.factura || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>Fecha:</span>{' '}
                <span style={{ color: '#fff' }}>{item.fecha || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>Servicio Destino:</span>{' '}
                <span style={{ color: '#facc15', fontWeight: 600 }}>
                  {item.servicioDestino || item.servClinico || 'Mantención'}
                </span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>Persona que Recibe:</span>{' '}
                <span style={{ color: '#fff', fontWeight: 600 }}>
                  {item.personaRecibe || item.quienRecibe || '—'}
                </span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>Cantidad:</span>{' '}
                <span style={{ color: '#4ade80', fontWeight: 700 }}>
                  {item.cantidad || 1} uds.
                </span>
              </div>
              <div>
                <span style={{ color: '#7a92b8' }}>Valor Total:</span>{' '}
                <span style={{ color: '#facc15', fontWeight: 700 }}>
                  {fmtMoney(item.costoTotal || (item.cantidad || 1) * (item.valorUnitario || 0))}
                </span>
              </div>
            </div>
          )}

          {/* Adjunto Status if available */}
          {!isProducto && !isActa && (
            <div
              style={{
                borderTop: '1px solid #162540',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '12px' }}>
                <span style={{ color: '#7a92b8' }}>Documento adjunto: </span>
                {item.adjunto ? (
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>📎 {item.adjunto.nombre}</span>
                ) : (
                  <span style={{ color: '#64748b' }}>Sin documento vinculado</span>
                )}
              </div>
              {item.adjunto && onVerAdjunto ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#0c2747', border: '1px solid #0284c7', color: '#38bdf8', fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => onVerAdjunto(item)}
                >
                  👁️ Ver Documento
                </button>
              ) : onAdjuntarItem ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#081d33', border: '1px dashed #0284c7', color: '#38bdf8', fontSize: '11px', padding: '3px 8px' }}
                  onClick={() => onAdjuntarItem(item, modulo)}
                >
                  📎+ Adjuntar desde Escritorio
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Action Buttons for Label Printing & Operations */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onPrintEtiqueta(item, modulo, 'barra')}
              style={{
                background: '#081c16',
                border: '1.5px solid #10b981',
                color: '#34d399',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Imprimir Etiqueta Termoadhesiva de Código de Barras 50x25 mm"
            >
              🏷️ Barra 50x25
            </button>
            <button
              type="button"
              onClick={() => onPrintEtiqueta(item, modulo, 'qr')}
              style={{
                background: '#092540',
                border: '1.5px solid #0284c7',
                color: '#38bdf8',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Imprimir Etiqueta Termoadhesiva de Código QR 50x25 mm"
            >
              📱 QR 50x25
            </button>
            <button
              type="button"
              onClick={() => onPrintEtiqueta(item, modulo, 'caja')}
              style={{
                background: '#1a1005',
                border: '1.5px solid #d97706',
                color: '#fbbf24',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Imprimir Etiqueta Institucional para Cajas de Productos (PDF)"
            >
              📦 Etiqueta Caja
            </button>
            {onEntradaRapida && !isActa && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEntradaRapida(item);
                }}
                style={{
                  background: 'linear-gradient(135deg, #064e3b, #047857)',
                  border: '1.5px solid #10b981',
                  color: '#6ee7b7',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                }}
                title="Abrir Terminal Pistola en Modo Ingreso (Recepción)"
              >
                📥 Ingreso Pistola
              </button>
            )}
            {onSalidaRapida && !isActa && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSalidaRapida(item);
                }}
                style={{
                  background: 'linear-gradient(135deg, #0c4a6e, #0284c7)',
                  border: '1.5px solid #00d4ff',
                  color: '#7dd3fc',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(0, 212, 255, 0.3)',
                }}
                title="Abrir Terminal Pistola en Modo Despacho (Egreso)"
              >
                📤 Despacho Pistola
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditarItem(item, modulo);
              }}
              style={{
                background: '#1e293b',
                border: '1px solid #475569',
                color: '#e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✏️ Ver Ficha
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#150d1a',
              border: '1.5px solid #e11d48',
              color: '#fb7185',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Listo / Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
