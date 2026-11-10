import React, { useState } from 'react';
import { ActaSalida } from '../types';

interface ActasViewProps {
  actas: ActaSalida[];
  onVerDetalle: (acta: ActaSalida, idx: number) => void;
  onImprimirActa: (acta: ActaSalida) => void;
  onDownloadPDF?: (acta: ActaSalida) => void;
  onEliminarActa: (idx: number) => void;
  onExportCSV: () => void;
  onBorrarActas: () => void;
  onBackToDashboard: () => void;
}

export const ActasView: React.FC<ActasViewProps> = ({
  actas,
  onVerDetalle,
  onImprimirActa,
  onDownloadPDF,
  onEliminarActa,
  onExportCSV,
  onBorrarActas,
  onBackToDashboard,
}) => {
  const [qServicio, setQServicio] = useState('');
  const [qFecha, setQFecha] = useState('');

  const safeActas = Array.isArray(actas) ? actas : [];
  const filtradas = safeActas.filter((a) => {
    if (!a) return false;
    const matchSvc = !qServicio || (a.servicio || '').toLowerCase().includes(qServicio.toLowerCase());
    const matchFecha = !qFecha || (a.fecha || '').toLowerCase().includes(qFecha.toLowerCase());
    return matchSvc && matchFecha;
  });

  return (
    <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel kardex-panel">
        <div
          className="panel-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>📤 Historial Oficial de Actas de Egreso y Despacho</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-cyan btn-sm" onClick={onExportCSV}>
              📥 Exportar CSV
            </button>
            <button className="btn btn-red btn-sm" onClick={onBorrarActas}>
              🗑️ Limpiar Historial
            </button>
            <button className="btn btn-cyan btn-sm" onClick={onBackToDashboard}>
              🏠 Volver al Panel
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
          <input
            className="field-input"
            value={qServicio}
            placeholder="Filtrar por servicio..."
            style={{ width: '200px', fontSize: '12px' }}
            onChange={(e) => setQServicio(e.target.value)}
          />
          <input
            className="field-input"
            value={qFecha}
            placeholder="Filtrar por fecha..."
            style={{ width: '200px', fontSize: '12px' }}
            onChange={(e) => setQFecha(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Total: {filtradas.length} actas
          </span>
        </div>

        <div className="actas-hdr">
          <span>N° Correlativo</span>
          <span>Fecha</span>
          <span>Servicio Destino</span>
          <span>N° Solicitud</span>
          <span>Funcionario que Recibe</span>
          <span style={{ textAlign: 'center' }}>Ítems</span>
          <span style={{ textAlign: 'center' }}>Total Uds.</span>
          <span style={{ textAlign: 'center' }}>Acciones</span>
        </div>

        <div className="actas-wrap">
          {filtradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              No hay actas de salida registradas aún.
            </div>
          ) : (
            filtradas.map((a, idx) => {
              const realIdx = safeActas.indexOf(a);
              const effectiveIdx = realIdx >= 0 ? realIdx : idx;
              const totalUds = (a?.items || []).reduce((s, i) => s + (i?.cantidad || 0), 0);
              return (
                <div key={`${a?.id || 'acta'}-${effectiveIdx}`} className="actas-row">
                  <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '11px' }}>
                    {a.id}
                  </span>
                  <span style={{ color: '#8ab0cc', fontSize: '11px' }}>{a.fecha}</span>
                  <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.servicio}
                  </span>
                  <span style={{ color: 'var(--cyan)', fontSize: '11px', fontWeight: 600 }}>
                    {a.nroSolicitud || a.id}
                  </span>
                  <span
                    style={{
                      color: '#b0cce0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '11px',
                    }}
                  >
                    {a.responsable || '______________'}
                  </span>
                  <span style={{ color: 'var(--yellow)', textAlign: 'center', fontWeight: 700 }}>
                    {(a.items || []).length}
                  </span>
                  <span style={{ color: 'var(--green)', textAlign: 'center', fontWeight: 700 }}>
                    {totalUds}
                  </span>
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
                    <button
                      className="btn btn-cyan btn-sm"
                      onClick={() => onVerDetalle(a, effectiveIdx)}
                      title="Ver detalle del acta"
                    >
                      👁 Ver
                    </button>
                    <button
                      className="btn btn-green btn-sm"
                      onClick={() => onImprimirActa(a)}
                      title="Imprimir Acta Oficial"
                    >
                      🖨️
                    </button>
                    {onDownloadPDF && (
                      <button
                        className="btn btn-sm"
                        onClick={() => onDownloadPDF(a)}
                        style={{ background: '#1a1005', border: '1px solid #d97706', color: '#fbbf24' }}
                        title="Descargar Acta en PDF institucional"
                      >
                        📥
                      </button>
                    )}
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => onEliminarActa(effectiveIdx)}
                      title="Eliminar acta"
                    >
                      🗑️
                    </button>
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
