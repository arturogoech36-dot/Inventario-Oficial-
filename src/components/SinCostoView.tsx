import React, { useState } from 'react';
import { SinCostoMovimiento } from '../types';

interface SinCostoViewProps {
  sinCostoList: SinCostoMovimiento[];
  onDespacharSC: (item: SinCostoMovimiento, idx: number) => void;
  onAdjuntarArchivo: (item: SinCostoMovimiento, e: React.ChangeEvent<HTMLInputElement>) => void;
  onVerAdjuntos: (item: SinCostoMovimiento) => void;
  onVerPreviewDocumento?: (item: SinCostoMovimiento, adj: { nombre: string; tipo: string; data?: string }) => void;
  onImprimirAdjunto?: (adjunto: { nombre: string; tipo: string; data?: string }) => void;
  onDesvincularAdjunto?: (item: SinCostoMovimiento) => void;
  onVerDespachos: (item: SinCostoMovimiento) => void;
  onExportCSV: () => void;
  onImprimirReporte: () => void;
  onDownloadPDF?: () => void;
  onBorrarSinCosto: () => void;
  onBackToDashboard: () => void;
}

export const SinCostoView: React.FC<SinCostoViewProps> = ({
  sinCostoList,
  onDespacharSC,
  onAdjuntarArchivo,
  onVerAdjuntos,
  onVerPreviewDocumento,
  onImprimirAdjunto,
  onDesvincularAdjunto,
  onVerDespachos,
  onExportCSV,
  onImprimirReporte,
  onDownloadPDF,
  onBorrarSinCosto,
  onBackToDashboard,
}) => {
  const [qFiltro, setQFiltro] = useState('');

  const entradas = sinCostoList.filter(
    (m) =>
      m.tipo === 'ENTRADA' &&
      (!qFiltro ||
        m.codigo.toLowerCase().includes(qFiltro.toLowerCase()) ||
        m.desc.toLowerCase().includes(qFiltro.toLowerCase()))
  );

  return (
    <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel kardex-panel">
        <div
          className="panel-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>📦 TRANSITO DESPACHO</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-cyan btn-sm" onClick={onExportCSV}>
              📥 Exportar CSV
            </button>
            <button className="btn btn-cyan btn-sm" onClick={onImprimirReporte} title="Abre ventana oficial para imprimir">
              🖨️ Imprimir
            </button>
            <button
              className="btn btn-sm"
              style={{ background: '#1a1005', border: '1px solid #d97706', color: '#fbbf24' }}
              onClick={onDownloadPDF || onImprimirReporte}
              title="Descargar reporte oficial en formato PDF institucional"
            >
              📥 Descargar PDF (.pdf)
            </button>
            <button className="btn btn-red btn-sm" onClick={onBorrarSinCosto}>
              🗑️ Limpiar
            </button>
            <button className="btn btn-cyan btn-sm" onClick={onBackToDashboard}>
              🏠 Volver al Panel
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
          <input
            className="field-input"
            value={qFiltro}
            placeholder="Filtrar por código o descripción..."
            style={{ width: '280px', fontSize: '12px' }}
            onChange={(e) => setQFiltro(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Total: {entradas.length} registros
          </span>
        </div>

        <div className="sincosto-hdr">
          <span>Fecha/Hora</span>
          <span>Código</span>
          <span>Descripción</span>
          <span style={{ textAlign: 'center' }}>Cant.</span>
          <span>Guía N°</span>
          <span>Factura N°</span>
          <span>OC N°</span>
          <span style={{ textAlign: 'center' }}>Adjuntar</span>
          <span style={{ textAlign: 'center' }}>Despachado</span>
          <span>Unidad Destino</span>
          <span>Funcionario Recibe</span>
          <span>Observación</span>
          <span style={{ textAlign: 'center' }}>Saldo</span>
          <span style={{ textAlign: 'center' }}>Acción</span>
        </div>

        <div className="sincosto-wrap">
          {entradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              No hay registros en Tránsito Despacho.
            </div>
          ) : (
            entradas.map((m, mapIdx) => {
              const realIdx = sinCostoList.indexOf(m);
              const adj = m.adjunto || (m.adjuntos && m.adjuntos[0]) || null;
              const tieneAdj = Boolean(adj && (adj.data || adj.nombre));
              const adjuntos = m.adjuntos || (adj ? [adj] : []);
              const despachos = m.despachos || [];
              const totalDespachado = despachos.reduce((s, d) => s + d.cantidad, 0);
              const saldo = m.cantidad - totalDespachado;
              const ultimo = despachos.length ? despachos[despachos.length - 1] : null;

              return (
                <div key={`${m?.id || 'sc'}-${realIdx >= 0 ? realIdx : mapIdx}`} className="sincosto-row">
                  <span style={{ color: '#8ab0cc', fontSize: '10px' }}>
                    {(m.fecha || '').split(',')[0]}
                  </span>
                  <span style={{ color: 'var(--yellow)', fontWeight: 700, fontSize: '11px' }}>
                    {m.codigo}
                  </span>
                  <span
                    style={{
                      color: '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={m.desc}
                  >
                    {m.desc}
                  </span>
                  <span style={{ color: 'var(--green)', textAlign: 'center', fontWeight: 700 }}>
                    {m.cantidad}
                  </span>

                  {/* Guía N° con indicador si tiene documento adjunto */}
                  <span
                    style={{
                      color: m.guia && m.guia !== '—' ? '#a0c8e8' : 'var(--muted)',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontWeight: m.guia && m.guia !== '—' ? 600 : 400 }}>
                      {m.guia || '—'}
                    </span>
                    {tieneAdj && (
                      <span
                        onClick={() => {
                          if (onVerPreviewDocumento && adj) {
                            onVerPreviewDocumento(m, adj);
                          } else if (onImprimirAdjunto && adj) {
                            onImprimirAdjunto(adj);
                          }
                        }}
                        style={{ cursor: 'pointer', fontSize: '11px', color: '#10b981' }}
                        title={`👁️ Clic para ver y reflejar documento: ${adj?.nombre}`}
                      >
                        📎
                      </span>
                    )}
                  </span>

                  {/* Factura N° */}
                  <span
                    style={{
                      color: m.factura && m.factura !== '—' ? '#a0c8e8' : 'var(--muted)',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontWeight: m.factura && m.factura !== '—' ? 600 : 400 }}>
                      {m.factura || '—'}
                    </span>
                    {m.factura && m.factura !== '—' && tieneAdj && (
                      <span
                        onClick={() => {
                          if (onVerPreviewDocumento && adj) {
                            onVerPreviewDocumento(m, adj);
                          } else if (onImprimirAdjunto && adj) {
                            onImprimirAdjunto(adj);
                          }
                        }}
                        style={{ cursor: 'pointer', fontSize: '11px', color: '#10b981' }}
                        title={`👁️ Clic para ver y reflejar documento: ${adj?.nombre}`}
                      >
                        📎
                      </span>
                    )}
                  </span>

                  {/* OC N° */}
                  <span
                    style={{
                      color: m.oc && m.oc !== '—' ? '#a0c8e8' : 'var(--muted)',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontWeight: m.oc && m.oc !== '—' ? 600 : 400 }}>
                      {m.oc || '—'}
                    </span>
                    {m.oc && m.oc !== '—' && tieneAdj && (
                      <span
                        onClick={() => {
                          if (onVerPreviewDocumento && adj) {
                            onVerPreviewDocumento(m, adj);
                          } else if (onImprimirAdjunto && adj) {
                            onImprimirAdjunto(adj);
                          }
                        }}
                        style={{ cursor: 'pointer', fontSize: '11px', color: '#10b981' }}
                        title={`👁️ Clic para ver y reflejar documento: ${adj?.nombre}`}
                      >
                        📎
                      </span>
                    )}
                  </span>

                  {/* Columna Adjuntar: Botones con forma y medida 100% uniformes */}
                  <div style={{ textAlign: 'center' }}>
                    {tieneAdj ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (onVerPreviewDocumento && adj) {
                                onVerPreviewDocumento(m, adj);
                              } else if (onImprimirAdjunto && adj) {
                                onImprimirAdjunto(adj);
                              }
                            }}
                            className="btn-doc-action"
                            style={{
                              background: '#042f2e',
                              border: '1px solid #14b8a6',
                              color: '#5eead4',
                              width: '24px',
                              height: '24px',
                              minWidth: '24px',
                              minHeight: '24px',
                              borderRadius: '5px',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              lineHeight: 1,
                              boxSizing: 'border-box',
                            }}
                            title={`👁️ Ver documento: ${adj?.nombre}`}
                          >
                            👁️
                          </button>
                          <button
                            type="button"
                            onClick={() => onImprimirAdjunto && adj && onImprimirAdjunto(adj)}
                            className="btn-doc-action"
                            style={{
                              background: '#042f2e',
                              border: '1px solid #10b981',
                              color: '#34d399',
                              width: '24px',
                              height: '24px',
                              minWidth: '24px',
                              minHeight: '24px',
                              borderRadius: '5px',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              lineHeight: 1,
                              boxSizing: 'border-box',
                            }}
                            title={`🖨️ Mandar a imprimir: ${adj?.nombre}`}
                          >
                            🖨️
                          </button>
                          <label
                            className="btn-doc-action"
                            style={{
                              background: '#062038',
                              border: '1px solid #0284c7',
                              color: '#38bdf8',
                              width: '24px',
                              height: '24px',
                              minWidth: '24px',
                              minHeight: '24px',
                              borderRadius: '5px',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              lineHeight: 1,
                              boxSizing: 'border-box',
                            }}
                            title="📎 Cambiar / reemplazar documento vinculado"
                          >
                            📎
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              style={{ display: 'none' }}
                              onChange={(e) => onAdjuntarArchivo(m, e)}
                            />
                          </label>
                          {onDesvincularAdjunto && (
                            <button
                              type="button"
                              onClick={() => onDesvincularAdjunto(m)}
                              className="btn-doc-action"
                              style={{
                                background: '#26080e',
                                border: '1px solid #ef4444',
                                color: '#f87171',
                                width: '24px',
                                height: '24px',
                                minWidth: '24px',
                                minHeight: '24px',
                                borderRadius: '5px',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                lineHeight: 1,
                                boxSizing: 'border-box',
                                fontWeight: 700,
                              }}
                              title="✖ Desvincular documento de este registro"
                            >
                              ✖
                            </button>
                          )}
                        </div>
                        <span
                          onClick={() => {
                            if (onVerPreviewDocumento && adj) {
                              onVerPreviewDocumento(m, adj);
                            } else if (onImprimirAdjunto && adj) {
                              onImprimirAdjunto(adj);
                            }
                          }}
                          style={{
                            fontSize: '9.5px',
                            color: '#6ee7b7',
                            maxWidth: '116px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            lineHeight: 1.2,
                          }}
                          title={`👁️ Clic para ver documento: ${adj?.nombre}`}
                        >
                          📄 {adj?.nombre}
                        </span>
                      </div>
                    ) : (
                      <label
                        style={{
                          background: '#00220f',
                          border: '1px solid var(--green)',
                          borderRadius: '5px',
                          height: '24px',
                          padding: '0 10px',
                          color: 'var(--green)',
                          fontSize: '10.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          lineHeight: 1,
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap',
                        }}
                        title="Adjuntar Guía, Factura u Orden de Compra (PDF o Imagen)"
                      >
                        📎 Adjuntar
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          style={{ display: 'none' }}
                          onChange={(e) => onAdjuntarArchivo(m, e)}
                        />
                      </label>
                    )}
                  </div>

                  <div style={{ textAlign: 'center', fontSize: '11px' }}>
                    {totalDespachado > 0 ? (
                      <b style={{ color: 'var(--cyan)' }}>{totalDespachado} uds.</b>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      color: '#b0cce0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ultimo ? ultimo.servicio : '—'}
                    {despachos.length > 1 && (
                      <button
                        onClick={() => onVerDespachos(m)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--cyan)',
                          fontSize: '9px',
                          cursor: 'pointer',
                          display: 'block',
                        }}
                      >
                        +{despachos.length - 1} más ▾
                      </button>
                    )}
                  </span>

                  <span
                    style={{
                      fontSize: '11px',
                      color: '#b0cce0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ultimo ? ultimo.responsable : '—'}
                  </span>

                  <span
                    style={{
                      fontSize: '11px',
                      color: '#b0cce0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ultimo?.observacion || '—'}
                  </span>

                  <div style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: saldo <= 0 ? 'var(--green)' : 'var(--yellow)',
                        background: saldo <= 0 ? '#001a0a' : '#1a1000',
                        border: `1px solid ${saldo <= 0 ? 'var(--green)' : 'var(--yellow)'}`,
                        borderRadius: '10px',
                        padding: '2px 7px',
                      }}
                    >
                      {saldo}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    {saldo > 0 ? (
                      <button
                        onClick={() => onDespacharSC(m, realIdx)}
                        style={{
                          background: 'rgba(0, 26, 42, 0.7)',
                          border: '1px solid var(--cyan)',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          color: 'var(--cyan)',
                          fontSize: '10px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        📤 Despachar
                      </button>
                    ) : (
                      <span style={{ fontSize: '9px', color: 'var(--green)', fontWeight: 700 }}>
                        ✅ Listo
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
