import React, { useState } from 'react';
import { TrazabilidadEquipo } from '../types';
import { OCRExtractor } from './OCRExtractor';

interface TrazabilidadViewProps {
  trazabilidad: TrazabilidadEquipo[];
  onNuevo: () => void;
  onEditar: (item: TrazabilidadEquipo, idx: number) => void;
  onEliminar: (idx: number) => void;
  onExportCSV: () => void;
  onReporte: () => void;
  onLimpiar?: () => void;
  onBackToDashboard: () => void;
  onVerAdjunto: (item: TrazabilidadEquipo, idx?: number) => void;
  onAdjuntarDesktop: (item: TrazabilidadEquipo, idx: number) => void;
  onImprimirAdjunto?: (adjunto: { nombre: string; tipo: string; data?: string }) => void;
  onDesvincularAdjunto?: (item: TrazabilidadEquipo, idx?: number) => void;
  onImprimirEtiqueta: (item: TrazabilidadEquipo) => void;
  onImprimirLote?: (items: TrazabilidadEquipo[]) => void;
  onScanPistola?: (code: string) => void;
  onSaveEquipoDirect?: (item: Partial<TrazabilidadEquipo>) => void;
  onSaveMultipleEquiposDirect?: (items: Partial<TrazabilidadEquipo>[]) => void;
  onDespacharEquipo?: (item: TrazabilidadEquipo, idx: number) => void;
}

export const TrazabilidadView: React.FC<TrazabilidadViewProps> = ({
  trazabilidad,
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
  onSaveEquipoDirect,
  onSaveMultipleEquiposDirect,
  onDespacharEquipo,
}) => {
  const [filtro, setFiltro] = useState('');
  const [showOCR, setShowOCR] = useState(false);
  const [vistaModo, setVistaModo] = useState<'guia' | 'clinica'>('guia');
  const [pistolaInput, setPistolaInput] = useState('');

  const handleAdministrarAdjunto = (r: TrazabilidadEquipo, idx?: number) => {
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

  const lista = trazabilidad.filter(
    (r) =>
      !filtro ||
      (r.codigo || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.nombreEquipo || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.marca || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.nSerie || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.guia || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.institucionExterna || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (r.oc || '').toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
      {/* OCR EXTRACTOR SECTION */}
      {showOCR && (
        <div style={{ marginBottom: '6px' }}>
          <OCRExtractor
            initialModule="equipos"
            onSaveEquipo={(eq) => {
              if (onSaveEquipoDirect) onSaveEquipoDirect(eq);
              setShowOCR(false);
            }}
            onSaveMultipleEquipos={(eqs) => {
              if (onSaveMultipleEquiposDirect) {
                onSaveMultipleEquiposDirect(eqs);
              } else if (onSaveEquipoDirect) {
                eqs.forEach(onSaveEquipoDirect);
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
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🔧 Trazabilidad de Equipos (Guías de Despacho y Préstamos)</span>
            <span
              style={{
                fontSize: '11px',
                background: '#0940cd',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              {lista.length} equipos
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'var(--panel2)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border)' }}>
              <button
                className={`btn btn-sm ${vistaModo === 'guia' ? 'btn-cyan' : ''}`}
                style={{ padding: '3px 8px', fontSize: '11px', border: 'none' }}
                onClick={() => setVistaModo('guia')}
                title="Ver columnas de Guía de Despacho, OC y Proveedor"
              >
                📑 Vista Guía & Despacho
              </button>
              <button
                className={`btn btn-sm ${vistaModo === 'clinica' ? 'btn-cyan' : ''}`}
                style={{ padding: '3px 8px', fontSize: '11px', border: 'none' }}
                onClick={() => setVistaModo('clinica')}
                title="Ver columnas clínicas de Préstamos y Mantención"
              >
                🏥 Vista Clínica
              </button>
            </div>

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
                title="Imprimir etiquetas con QR y Código de Barras de todos los equipos mostrados"
              >
                🏷️ Imprimir Etiquetas ({lista.length})
              </button>
            )}
            <button className="btn btn-cyan btn-sm" onClick={onExportCSV} title="Descargar respaldo de todos los equipos en Excel/CSV">
              📥 Respaldo CSV
            </button>
            <button className="btn btn-cyan btn-sm" onClick={onReporte} title="Generar reporte oficial imprimible de equipos">
              📋 Reporte Oficial
            </button>
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
          <input
            className="field-input"
            value={filtro}
            placeholder="Buscar por Código, Guía, Equipo, Serie, Proveedor (ej. GHC Global), OC..."
            style={{ width: '380px', fontSize: '12px' }}
            onChange={(e) => setFiltro(e.target.value)}
          />
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Mostrando {lista.length} de {(trazabilidad || []).length} registros
          </span>
        </div>

        {/* ── TABLE VIEW (GUÍA & DESPACHO) ── */}
        {vistaModo === 'guia' ? (
          <div style={{ overflowX: 'auto' }}>
            <div
              className="sincosto-hdr"
              style={{
                minWidth: '1280px',
                gridTemplateColumns: '105px 85px 100px 95px 1.4fr 115px 105px 45px 150px 125px 110px 120px',
              }}
            >
              <span>Código</span>
              <span>Fecha</span>
              <span>N° Guía</span>
              <span>OC / Fact.</span>
              <span>Nombre Equipo</span>
              <span>Marca / Mod.</span>
              <span>N° Serie</span>
              <span style={{ textAlign: 'center' }}>Cant.</span>
              <span>Institución / Proveedor</span>
              <span>Servicio Clínico</span>
              <span>Receptor</span>
              <span style={{ textAlign: 'center' }}>Acciones</span>
            </div>

            <div className="kardex-wrap" style={{ minWidth: '1280px' }}>
              {lista.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  No hay equipos registrados con los filtros actuales.
                </div>
              ) : (
                lista.map((r, itemIdx) => {
                  const idx = trazabilidad.indexOf(r);
                  const realIdx = idx >= 0 ? idx : itemIdx;
                  const cod = r.codigo || `TRZ-EQ-${String(realIdx + 1).padStart(3, '0')}`;
                  return (
                    <div
                      key={`${r.id || 'trz'}-${realIdx}`}
                      className="sincosto-row"
                      style={{
                        minWidth: '1280px',
                        gridTemplateColumns: '105px 85px 100px 95px 1.4fr 115px 105px 45px 150px 125px 110px 120px',
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
                      <span style={{ fontSize: '11px', color: '#8ab0cc' }}>{r.fecha || '—'}</span>
                      <span>
                        {r.guia ? (
                          <span
                            style={{
                              background: '#0940cd',
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {r.guia}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>—</span>
                        )}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {r.oc || r.factura || '—'}
                      </span>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{r.nombreEquipo || '—'}</span>
                      <span style={{ fontSize: '11px' }}>
                        {r.marca || ''} {r.modelo ? `· ${r.modelo}` : ''}
                      </span>
                      <span style={{ color: 'var(--cyan)', fontSize: '11px', fontWeight: 600 }}>
                        {r.nSerie || '—'}
                      </span>
                      <span style={{ textAlign: 'center', fontWeight: 700, color: '#fff' }}>
                        {r.cantidad ?? 1}
                      </span>
                      <span style={{ fontSize: '11.5px', color: '#ffcc00', fontWeight: 600 }}>
                        {r.institucionExterna || '—'}
                      </span>
                      <span style={{ fontSize: '11px' }}>{r.servClinico || '—'}</span>
                      <span style={{ fontSize: '11px', color: '#c8daf0' }}>{r.quienRecibe || '—'}</span>

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

                        {/* DESPACHAR / ENTREGAR EQUIPO */}
                        {onDespacharEquipo && (
                          <button
                            className="btn btn-sm"
                            onClick={() => onDespacharEquipo(r, realIdx)}
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
                          title="Editar equipo"
                        >
                          ✏️
                        </button>

                        {/* ELIMINAR */}
                        <button
                          className="btn btn-red btn-sm"
                          onClick={() => onEliminar(idx)}
                          style={{ padding: '2px 5px', fontSize: '11px', borderRadius: '4px' }}
                          title="Eliminar equipo"
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
        ) : (
          /* ── TABLE VIEW (CLÍNICA TRADICIONAL) ── */
          <div style={{ overflowX: 'auto' }}>
            <div className="sincosto-hdr" style={{ minWidth: '1280px', gridTemplateColumns: '105px repeat(10, 1fr) 120px' }}>
              <span>Código</span>
              <span>Nombre Equipo</span>
              <span>Marca</span>
              <span>Modelo</span>
              <span>N° Serie</span>
              <span>Finalidad</span>
              <span>Institución ext.</span>
              <span>Serv. Clínico HAH</span>
              <span>Mant. preventivo</span>
              <span>Accesorios</span>
              <span>Estado</span>
              <span style={{ textAlign: 'center' }}>Acciones</span>
            </div>

            <div className="kardex-wrap" style={{ minWidth: '1280px' }}>
              {lista.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  No hay equipos registrados todavía.
                </div>
              ) : (
                lista.map((r, itemIdx) => {
                  const idx = trazabilidad.indexOf(r);
                  const realIdx = idx >= 0 ? idx : itemIdx;
                  const cod = r.codigo || `TRZ-EQ-${String(realIdx + 1).padStart(3, '0')}`;
                  return (
                    <div
                      key={`${r.id || 'trz'}-${realIdx}`}
                      className="sincosto-row"
                      style={{ minWidth: '1280px', gridTemplateColumns: '105px repeat(10, 1fr) 120px', alignItems: 'center' }}
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
                      <span style={{ fontWeight: 600, color: '#fff' }}>{r.nombreEquipo || '—'}</span>
                      <span>{r.marca || '—'}</span>
                      <span>{r.modelo || '—'}</span>
                      <span style={{ color: 'var(--cyan)' }}>{r.nSerie || '—'}</span>
                      <span>{r.finalidad || '—'}</span>
                      <span style={{ color: '#ffcc00' }}>{r.institucionExterna || '—'}</span>
                      <span>{r.servClinico || '—'}</span>
                      <span>{r.mantPreventivo || '—'}</span>
                      <span style={{ fontSize: '11px', color: '#8ab0cc' }}>{r.accesorios || '—'}</span>
                      <span>{r.ingresoRetiro || '—'}</span>
                      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                        {/* ADJUNTAR / IMPRIMIR / ADMINISTRAR DOCUMENTO */}
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

                        {/* DESPACHAR / ENTREGAR EQUIPO */}
                        {onDespacharEquipo && (
                          <button
                            className="btn btn-sm"
                            onClick={() => onDespacharEquipo(r, realIdx)}
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

                        {/* ETIQUETA QR & BARRA */}
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
                          title="Editar"
                        >
                          ✏️
                        </button>

                        {/* ELIMINAR */}
                        <button
                          className="btn btn-red btn-sm"
                          onClick={() => onEliminar(idx)}
                          style={{ padding: '2px 5px', fontSize: '11px', borderRadius: '4px' }}
                          title="Eliminar"
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
        )}
      </div>
    </div>
  );
};
