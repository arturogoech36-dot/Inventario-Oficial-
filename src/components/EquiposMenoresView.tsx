import React, { useState } from 'react';
import { EquipoMenor } from '../types';
import { fmtMoney } from '../utils/format';
import { OCRExtractor } from './OCRExtractor';

interface EquiposMenoresViewProps {
  equiposMenores: EquipoMenor[];
  onNuevo: () => void;
  onEditar: (item: EquipoMenor, idx: number) => void;
  onEliminar: (idx: number) => void;
  onExportCSV: () => void;
  onReporte?: () => void;
  onLimpiar?: () => void;
  onBackToDashboard: () => void;
  onVerAdjunto: (item: EquipoMenor, idx?: number) => void;
  onAdjuntarDesktop: (item: EquipoMenor, idx: number) => void;
  onImprimirAdjunto?: (adjunto: { nombre: string; tipo: string; data?: string }) => void;
  onDesvincularAdjunto?: (item: EquipoMenor, idx?: number) => void;
  onImprimirEtiqueta: (item: EquipoMenor) => void;
  onImprimirLote?: (items: EquipoMenor[]) => void;
  onScanPistola?: (code: string) => void;
  onSaveEquipoMenorDirect?: (item: Partial<EquipoMenor>) => void;
  onSaveMultipleEquiposMenoresDirect?: (items: Partial<EquipoMenor>[]) => void;
  onDespacharEquipoMenor?: (item: EquipoMenor, idx: number) => void;
}

export const EquiposMenoresView: React.FC<EquiposMenoresViewProps> = ({
  equiposMenores,
  onNuevo,
  onEditar,
  onEliminar,
  onExportCSV,
  onReporte,
  onLimpiar,
  onBackToDashboard,
  onVerAdjunto,
  onAdjuntarDesktop,
  onImprimirAdjunto,
  onDesvincularAdjunto,
  onImprimirEtiqueta,
  onImprimirLote,
  onScanPistola,
  onSaveEquipoMenorDirect,
  onSaveMultipleEquiposMenoresDirect,
  onDespacharEquipoMenor,
}) => {
  const [filtro, setFiltro] = useState('');
  const [showOCR, setShowOCR] = useState(false);
  const [pistolaInput, setPistolaInput] = useState('');

  const handleAdministrarAdjunto = (r: EquipoMenor, idx?: number) => {
    if (!r.adjunto) {
      onAdjuntarDesktop(r, idx ?? 0);
      return;
    }
    const opcion = window.confirm(
      `Documento actualmente vinculado:\n"${r.adjunto.nombre}"\n\n` +
      `• Para REEMPLAZAR con otro archivo desde tu equipo: Presiona [Aceptar].\n` +
      `• Para DESVINCULAR o cancelar: Presiona [Cancelar].`
    );
    if (opcion) {
      onAdjuntarDesktop(r, idx ?? 0);
    } else {
      if (window.confirm(`¿Deseas desvincular el documento "${r.adjunto.nombre}"?`)) {
        if (onDesvincularAdjunto) {
          onDesvincularAdjunto(r, idx);
        }
      }
    }
  };

  const lista = equiposMenores.filter(
    (r) =>
      !filtro ||
      (r.codigo || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.nombreEquipo || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.marca || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.serie || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.servicioDestino || '').toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
      {/* OCR EXTRACTOR SECTION */}
      {showOCR && (
        <div style={{ marginBottom: '6px' }}>
          <OCRExtractor
            initialModule="equiposmenores"
            onSaveEquipoMenor={(eqm) => {
              if (onSaveEquipoMenorDirect) onSaveEquipoMenorDirect(eqm);
              setShowOCR(false);
            }}
            onSaveMultipleEquiposMenores={(eqms) => {
              if (onSaveMultipleEquiposMenoresDirect) {
                onSaveMultipleEquiposMenoresDirect(eqms);
              } else if (onSaveEquipoMenorDirect) {
                eqms.forEach(onSaveEquipoMenorDirect);
              }
              setShowOCR(false);
            }}
            onClose={() => setShowOCR(false)}
            isModal={false}
          />
        </div>
      )}

      <div className="panel kardex-panel" style={{ flex: 1 }}>
        <div
          className="panel-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>⚙️ Trazabilidad de Equipos Menores</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-sm"
              style={{
                background: showOCR ? '#304c89' : 'linear-gradient(135deg, #0940cd, #1557ff)',
                color: '#fff',
                border: '1px solid #74a0ff',
                fontWeight: 700,
              }}
              onClick={() => setShowOCR(!showOCR)}
            >
              {showOCR ? '✕ Ocultar Escáner OCR' : '✨ Escaneo OCR con IA'}
            </button>
            <button className="btn btn-green btn-sm" onClick={onNuevo}>
              ➕ Nuevo Registro
            </button>
            {lista.length > 0 && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  if (onImprimirLote) {
                    onImprimirLote(lista);
                  } else {
                    onImprimirEtiqueta(lista[0]);
                  }
                }}
                style={{
                  background: '#0a241b',
                  border: '1.5px solid #059669',
                  color: '#34d399',
                  fontWeight: 700,
                }}
                title="Imprimir etiquetas con QR y Código de Barras de todos los equipos menores mostrados"
              >
                🏷️ Imprimir Etiquetas ({lista.length})
              </button>
            )}
            <button className="btn btn-cyan btn-sm" onClick={onExportCSV} title="Descargar respaldo de equipos menores en Excel/CSV">
              📥 Respaldo CSV
            </button>
            {onReporte && (
              <button className="btn btn-cyan btn-sm" onClick={onReporte} title="Generar reporte oficial imprimible de equipos menores">
                📋 Reporte Oficial
              </button>
            )}
            {onLimpiar && (
              <button
                className="btn btn-red btn-sm"
                onClick={onLimpiar}
                title="Vaciar tabla para iniciar con datos reales"
              >
                🗑️ Vaciar Datos
              </button>
            )}
            <button className="btn btn-cyan btn-sm" onClick={onBackToDashboard}>
              🏠 Volver al Panel
            </button>
          </div>
        </div>

        {/* SCANNER GUN INPUT BAR */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            background: '#09152b',
            border: '1.5px solid #1a3666',
            borderRadius: '8px',
            padding: '7px 12px',
            marginBottom: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '16px' }}>🔫</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
            Lector de Pistola (Barras / QR):
          </span>
          <input
            className="field-input"
            style={{
              flex: 1,
              maxWidth: '360px',
              fontSize: '12px',
              background: '#060e20',
              borderColor: '#244580',
              color: '#ffffff',
            }}
            placeholder="Apunta la pistola al código de barra o QR..."
            value={pistolaInput}
            onChange={(e) => setPistolaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pistolaInput.trim()) {
                if (onScanPistola) onScanPistola(pistolaInput.trim());
                setPistolaInput('');
              }
            }}
          />
          <span
            style={{
              fontSize: '11px',
              color: '#34d399',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
                display: 'inline-block',
              }}
            ></span>
            Pistola Lista para Escaneo
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
          <input
            className="field-input"
            value={filtro}
            placeholder="Filtrar por código, equipo, marca o serie..."
            style={{ width: '280px', fontSize: '12px' }}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Total: {lista.length} registros
          </span>
        </div>

        <div
          className="sincosto-hdr"
          style={{
            gridTemplateColumns:
              '105px 85px 1.3fr 90px 90px 90px 75px 80px 80px 50px 110px 110px 85px 85px 120px',
          }}
        >
          <span>Código</span>
          <span>Fecha</span>
          <span>Nombre Equipo</span>
          <span>Marca</span>
          <span>Modelo</span>
          <span>Serie</span>
          <span>Lote</span>
          <span>Guía</span>
          <span>Factura</span>
          <span style={{ textAlign: 'center' }}>Cant.</span>
          <span>Servicio Destino</span>
          <span>Quién Recibe</span>
          <span style={{ textAlign: 'right' }}>Val. Unit.</span>
          <span style={{ textAlign: 'right' }}>Costo Total</span>
          <span style={{ textAlign: 'center' }}>Acción</span>
        </div>

        <div className="kardex-wrap">
          {lista.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              No hay equipos menores registrados todavía.
            </div>
          ) : (
            lista.map((r, itemIdx) => {
              const idx = equiposMenores.indexOf(r);
              const realIdx = idx >= 0 ? idx : itemIdx;
              const cod = r.codigo || `TRZ-EQM-${String(realIdx + 1).padStart(3, '0')}`;
              return (
                <div
                  key={`${r.id || 'eqm'}-${realIdx}`}
                  className="sincosto-row"
                  style={{
                    gridTemplateColumns:
                      '105px 85px 1.3fr 90px 90px 90px 75px 80px 80px 50px 110px 110px 85px 85px 120px',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    <span
                      style={{
                        background: '#092548',
                        border: '1px solid #194a85',
                        color: '#38bdf8',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                      }}
                    >
                      {cod}
                    </span>
                  </span>
                  <span style={{ color: '#8ab0cc', fontSize: '11px' }}>{r.fecha}</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{r.nombreEquipo}</span>
                  <span>{r.marca || '—'}</span>
                  <span>{r.modelo || '—'}</span>
                  <span style={{ color: 'var(--cyan)', fontSize: '11px', fontWeight: 600 }}>{r.serie || '—'}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{r.lote || '—'}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{r.guia || '—'}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{r.factura || '—'}</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, color: 'var(--green)' }}>
                    {r.cantidad}
                  </span>
                  <span>{r.servicioDestino || '—'}</span>
                  <span>{r.quienRecibe || '—'}</span>
                  <span style={{ textAlign: 'right', color: 'var(--yellow)' }}>
                    {fmtMoney(r.valorUnitario)}
                  </span>
                  <span style={{ textAlign: 'right', color: 'var(--yellow)', fontWeight: 700 }}>
                    {fmtMoney(r.costoTotal)}
                  </span>
                  <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                    {/* ADJUNTAR / IMPRIMIR / ADMINISTRAR DOCUMENTO DESDE ESCRITORIO */}
                    {r.adjunto ? (
                      <>
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            if (onImprimirAdjunto && r.adjunto) onImprimirAdjunto(r.adjunto);
                            else onVerAdjunto(r, idx);
                          }}
                          style={{
                            background: '#042f2e',
                            border: '1px solid #10b981',
                            color: '#34d399',
                            padding: '2px 5px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            fontWeight: 700,
                          }}
                          title={`🖨️ Imprimir documento vinculado: ${r.adjunto.nombre}`}
                        >
                          🖨️
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleAdministrarAdjunto(r, idx)}
                          style={{
                            background: '#0b274a',
                            border: '1px solid #0284c7',
                            color: '#38bdf8',
                            padding: '2px 5px',
                            fontSize: '11px',
                            borderRadius: '4px',
                          }}
                          title={`📎 Documento vinculado: ${r.adjunto.nombre}. Clic para cambiar o desvincular`}
                        >
                          📎
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-sm"
                        onClick={() => onAdjuntarDesktop(r, idx)}
                        style={{
                          background: '#131e36',
                          border: '1px dashed #3a5682',
                          color: '#7ea0c8',
                          padding: '2px 5px',
                          fontSize: '11px',
                          borderRadius: '4px',
                        }}
                        title="Adjuntar documento desde el escritorio (PDF o Imagen)"
                      >
                        📎+
                      </button>
                    )}

                    {/* DESPACHAR / ENTREGAR EQUIPO MENOR */}
                    {onDespacharEquipoMenor && (
                      <button
                        className="btn btn-sm"
                        onClick={() => onDespacharEquipoMenor(r, realIdx)}
                        style={{
                          background: '#042848',
                          border: '1px solid #0284c7',
                          color: '#38bdf8',
                          padding: '2px 6px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title={`📤 Entregar/Despachar ${cod} a unidad y generar Acta Oficial`}
                      >
                        📤 Despachar
                      </button>
                    )}

                    {/* ETIQUETA QR & CÓDIGO DE BARRAS */}
                    <button
                      className="btn btn-sm"
                      onClick={() => onImprimirEtiqueta({ ...r, codigo: cod })}
                      style={{
                        background: '#0a231b',
                        border: '1px solid #059669',
                        color: '#34d399',
                        padding: '2px 5px',
                        fontSize: '11px',
                        borderRadius: '4px',
                      }}
                      title="Ver e imprimir etiqueta con QR y Código de Barras para pistola"
                    >
                      🏷️
                    </button>

                    {/* EDITAR */}
                    <button
                      className="btn btn-cyan btn-sm"
                      onClick={() => onEditar(r, idx)}
                      style={{ padding: '2px 5px', fontSize: '11px', borderRadius: '4px' }}
                      title="Editar equipo menor"
                    >
                      ✏️
                    </button>

                    {/* ELIMINAR */}
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => onEliminar(idx)}
                      style={{ padding: '2px 5px', fontSize: '11px', borderRadius: '4px' }}
                      title="Eliminar equipo menor"
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
