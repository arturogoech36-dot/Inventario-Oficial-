import React, { useState } from 'react';
import { KardexMovimiento, Producto, FamiliaCatalogo } from '../types';
import { INITIAL_FAMILIAS } from '../data/initialData';
import { fmtMoney } from '../utils/format';

interface KardexViewProps {
  kardex: KardexMovimiento[];
  productos: Producto[];
  familias?: FamiliaCatalogo[];
  onImprimirResumen: (familiaFiltro?: string) => void;
  onDownloadPDF?: (familiaFiltro?: string) => void;
  onBorrarKardex: () => void;
  onBackToDashboard: () => void;
  onEditarKardex: (mov: KardexMovimiento, idx: number) => void;
  onEliminarKardex: (idx: number) => void;
  onAdjuntarPdf?: (idx: number) => void;
  onAdjuntarDocumento?: (mov: KardexMovimiento, idx: number) => void;
  onVerAdjuntoDocumento?: (mov: KardexMovimiento, idx: number) => void;
  onImprimirAdjunto?: (adjunto: { nombre: string; tipo: string; data?: string }) => void;
  onDesvincularAdjunto?: (mov: KardexMovimiento, idx: number) => void;
}

export const KardexView: React.FC<KardexViewProps> = ({
  kardex,
  productos,
  familias = INITIAL_FAMILIAS,
  onImprimirResumen,
  onDownloadPDF,
  onBorrarKardex,
  onBackToDashboard,
  onEditarKardex,
  onEliminarKardex,
  onAdjuntarPdf,
  onAdjuntarDocumento,
  onVerAdjuntoDocumento,
  onImprimirAdjunto,
  onDesvincularAdjunto,
}) => {
  const [qCodigo, setQCodigo] = useState('');
  const [qTipo, setQTipo] = useState('');
  const [qFamilia, setQFamilia] = useState('');
  const [qDesde, setQDesde] = useState('');
  const [qHasta, setQHasta] = useState('');
  const [vistaModo, setVistaModo] = useState<'cronologica' | 'por_familias'>('cronologica');

  const valorMap: { [code: string]: number } = {};
  const famProdMap: { [code: string]: string } = {};
  productos.forEach((p) => {
    valorMap[p.codigo] = p.valor;
    if (p.familia) {
      famProdMap[p.codigo.trim().toUpperCase()] = p.familia;
    }
  });

  const getMovFam = (m: KardexMovimiento): string => {
    const code = (m?.codigo || '').trim().toUpperCase();
    if (famProdMap[code]) return famProdMap[code];
    const prefix = code.split('-')[0];
    return prefix || 'OTR';
  };

  // Calculate chronological balances across whole kardex
  const saldos: { [code: string]: number } = {};
  const reversed = [...kardex].reverse();
  reversed.forEach((m) => {
    if (!(m.codigo in saldos)) saldos[m.codigo] = 0;
    if (m.tipo === 'ENTRADA') saldos[m.codigo] += m.cantidad || 0;
    if (m.tipo === 'SALIDA')
      saldos[m.codigo] = Math.max(0, saldos[m.codigo] - (m.cantidad || 0));
    m._saldoHistorico = saldos[m.codigo];
  });

  const filtrados = kardex.filter((m) => {
    if (
      qCodigo &&
      !m.codigo.toLowerCase().includes(qCodigo.toLowerCase()) &&
      !m.producto.toLowerCase().includes(qCodigo.toLowerCase())
    ) {
      return false;
    }
    if (qTipo && m.tipo !== qTipo) return false;
    if (qFamilia && getMovFam(m).toUpperCase() !== qFamilia.toUpperCase()) return false;
    return true;
  });

  // Estadísticas rápidas por familia para el resumen superior
  const catalogoFamilias = familias && familias.length > 0 ? familias : INITIAL_FAMILIAS;
  const famSeleccionada = catalogoFamilias.find(
    (f) => f.id.toUpperCase() === qFamilia.toUpperCase()
  );

  const famStats = catalogoFamilias.map((f) => {
    const movsFam = kardex.filter((m) => getMovFam(m).toUpperCase() === f.id.toUpperCase());
    const prodsFam = productos.filter((p) => (p?.familia || '').toUpperCase() === f.id.toUpperCase());
    const stockFam = prodsFam.reduce((sum, p) => sum + (p.stock || 0), 0);
    return {
      fam: f,
      movsCount: movsFam.length,
      prodsCount: prodsFam.length,
      stockFam,
    };
  });

  const handleTriggerAdjuntar = (mov: KardexMovimiento, idx: number) => {
    if (onAdjuntarDocumento) {
      onAdjuntarDocumento(mov, idx);
    } else if (onAdjuntarPdf) {
      onAdjuntarPdf(idx);
    }
  };

  const handleTriggerImprimirAdjunto = (adj: { nombre: string; tipo: string; data?: string }) => {
    if (onImprimirAdjunto) {
      onImprimirAdjunto(adj);
    }
  };

  const handleTriggerAdministrarAdjunto = (mov: KardexMovimiento, idx: number) => {
    const adj = mov.adjunto || (mov.adjuntos && mov.adjuntos[0]);
    if (!adj) {
      handleTriggerAdjuntar(mov, idx);
      return;
    }
    const opcion = window.confirm(
      `Documento vinculado actualmente:\n"${adj.nombre}"\n\n` +
      `• Para REEMPLAZAR con otro archivo desde tu equipo: Haz clic en [Aceptar].\n` +
      `• Para DESVINCULAR o cancelar: Haz clic en [Cancelar].`
    );
    if (opcion) {
      handleTriggerAdjuntar(mov, idx);
    } else {
      if (window.confirm(`¿Confirmas que deseas desvincular el documento "${adj.nombre}" de este movimiento?`)) {
        if (onDesvincularAdjunto) {
          onDesvincularAdjunto(mov, idx);
        }
      }
    }
  };

  return (
    <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel kardex-panel">
        <div
          className="panel-title"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>📋 Historial de Movimientos Automatizado (Kardex por Familias)</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-cyan btn-sm"
              onClick={() => onImprimirResumen(qFamilia || undefined)}
              title={
                qFamilia
                  ? `Imprimir reporte oficial exclusivamente de la familia ${qFamilia} (${famSeleccionada?.nombre || ''})`
                  : 'Abre el informe oficial organizado por familias listo para imprimir'
              }
            >
              🖨️ {qFamilia ? `Imprimir: Familia ${qFamilia}` : 'Imprimir Resumen por Familias'}
            </button>
            <button
              className="btn btn-sm"
              style={{ background: '#1a1005', border: '1px solid #d97706', color: '#fbbf24' }}
              onClick={() =>
                onDownloadPDF
                  ? onDownloadPDF(qFamilia || undefined)
                  : onImprimirResumen(qFamilia || undefined)
              }
              title={
                qFamilia
                  ? `Descargar PDF oficial exclusivamente de la familia ${qFamilia} (${famSeleccionada?.nombre || ''})`
                  : 'Descargar resumen oficial de Kardex por familias en PDF institucional'
              }
            >
              📥 {qFamilia ? `Descargar PDF: ${qFamilia}` : 'Descargar PDF (.pdf)'}
            </button>
            {qFamilia && (
              <button
                className="btn btn-sm"
                style={{
                  background: 'var(--input)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)',
                  fontSize: '11px',
                }}
                onClick={() => onImprimirResumen(undefined)}
                title="Imprimir resumen consolidado de TODAS las familias sin filtrar"
              >
                🖨️ Todas
              </button>
            )}
            <button
              className="btn btn-sm"
              style={{
                background: vistaModo === 'por_familias' ? '#003366' : 'var(--input)',
                border: '1px solid var(--cyan)',
                color: vistaModo === 'por_familias' ? '#38bdf8' : 'var(--text)',
              }}
              onClick={() =>
                setVistaModo((prev) => (prev === 'por_familias' ? 'cronologica' : 'por_familias'))
              }
              title="Alternar entre vista cronológica y vista agrupada por familias"
            >
              {vistaModo === 'por_familias' ? '📂 Vista: Por Familias' : '⏱️ Vista: Cronológica'}
            </button>
            <button className="btn btn-red btn-sm" onClick={onBorrarKardex}>
              🗑️ Limpiar Historial
            </button>
            <button className="btn btn-cyan btn-sm" onClick={onBackToDashboard}>
              🏠 Volver al Panel
            </button>
          </div>
        </div>

        {/* ── BARRA SUPERIOR DE RESUMEN POR FAMILIAS ── */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            overflowX: 'auto',
            padding: '6px 0',
            borderBottom: '1px solid var(--border)',
            marginBottom: '6px',
          }}
        >
          <div
            onClick={() => setQFamilia('')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              background: qFamilia === '' ? 'var(--cyan)' : 'var(--input)',
              color: qFamilia === '' ? '#000000' : 'var(--text)',
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Mostrar todos los movimientos sin filtro de familia"
          >
            <span>🌐 Todas las Familias</span>
            <span style={{ fontSize: '10px', opacity: 0.85 }}>({kardex.length} movs)</span>
          </div>

          {famStats.map((fs) => {
            const isSelected = qFamilia.toUpperCase() === fs.fam.id.toUpperCase();
            return (
              <div
                key={fs.fam.id}
                onClick={() => setQFamilia(isSelected ? '' : fs.fam.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--cyan)' : 'var(--input)',
                  color: isSelected ? '#000000' : 'var(--text)',
                  fontSize: '11px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title={`Filtrar por ${fs.fam.id} - ${fs.fam.nombre}`}
              >
                <span
                  style={{
                    fontWeight: 800,
                    color: isSelected ? '#000000' : '#38bdf8',
                  }}
                >
                  {fs.fam.id}
                </span>
                <span>{fs.fam.nombre}</span>
                <span
                  style={{
                    fontSize: '9.5px',
                    background: isSelected ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                    padding: '1px 5px',
                    borderRadius: '3px',
                  }}
                >
                  {fs.movsCount} movs | {fs.stockFam} uds
                </span>
              </div>
            );
          })}
        </div>

        {/* ── BARRA DE FILTROS ── */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '4px 0',
            borderBottom: '1px solid var(--border)',
            marginBottom: '6px',
          }}
        >
          <input
            className="field-input"
            value={qCodigo}
            placeholder="🔍 Código o producto..."
            style={{ width: '180px', fontSize: '11px' }}
            onChange={(e) => setQCodigo(e.target.value)}
          />
          <select
            className="field-select"
            value={qFamilia}
            style={{ width: '150px', fontSize: '11px' }}
            onChange={(e) => setQFamilia(e.target.value)}
          >
            <option value="">📁 Todas las familias</option>
            {catalogoFamilias.map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} - {f.nombre}
              </option>
            ))}
          </select>
          <select
            className="field-select"
            value={qTipo}
            style={{ width: '120px', fontSize: '11px' }}
            onChange={(e) => setQTipo(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="ENTRADA">▼ ENTRADA</option>
            <option value="SALIDA">▲ SALIDA</option>
          </select>
          <input
            className="field-input"
            type="date"
            value={qDesde}
            style={{ width: '130px', fontSize: '11px' }}
            title="Desde"
            onChange={(e) => setQDesde(e.target.value)}
          />
          <input
            className="field-input"
            type="date"
            value={qHasta}
            style={{ width: '130px', fontSize: '11px' }}
            title="Hasta"
            onChange={(e) => setQHasta(e.target.value)}
          />
          <button
            className="btn btn-sm"
            style={{
              background: 'var(--input)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              fontSize: '11px',
              padding: '4px 8px',
            }}
            onClick={() => {
              setQCodigo('');
              setQTipo('');
              setQFamilia('');
              setQDesde('');
              setQHasta('');
            }}
          >
            ✖ Limpiar
          </button>
          <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>
            Total: {filtrados.length} movimientos
            {qFamilia && <strong style={{ color: 'var(--cyan)' }}> (Familia {qFamilia})</strong>}
          </span>
        </div>

        <div className="kardex-hdr">
          <span>Fecha/Hora</span>
          <span>Familia / Cód</span>
          <span>Producto</span>
          <span style={{ color: 'var(--green)' }}>▼ ENTRADA</span>
          <span style={{ color: 'var(--red)' }}>▲ SALIDA</span>
          <span>Guía N°</span>
          <span>Factura N°</span>
          <span>OC N°</span>
          <span style={{ textAlign: 'center' }}>Saldo</span>
          <span style={{ color: 'var(--yellow)', textAlign: 'right' }}>$ Unit.</span>
          <span style={{ color: 'var(--yellow)', textAlign: 'right' }}>$ Total</span>
          <span style={{ textAlign: 'center' }}>Acciones</span>
        </div>

        <div className="kardex-wrap">
          {filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              No hay movimientos registrados para este filtro.
            </div>
          ) : vistaModo === 'por_familias' ? (
            /* ── VISTA AGRUPADA POR FAMILIAS ── */
            catalogoFamilias.map((fam) => {
              const movsDeFam = filtrados.filter(
                (m) => getMovFam(m).toUpperCase() === fam.id.toUpperCase()
              );
              if (movsDeFam.length === 0 && qFamilia !== '') return null;

              const entradasUds = movsDeFam
                .filter((m) => m.tipo === 'ENTRADA')
                .reduce((s, m) => s + (m.cantidad || 0), 0);
              const salidasUds = movsDeFam
                .filter((m) => m.tipo === 'SALIDA')
                .reduce((s, m) => s + (m.cantidad || 0), 0);

              return (
                <div key={fam.id} style={{ marginBottom: '16px' }}>
                  {/* Encabezado de la Familia */}
                  <div
                    style={{
                      background: 'rgba(2, 132, 199, 0.15)',
                      border: '1px solid rgba(2, 132, 199, 0.4)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {fam.id}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>
                        {fam.nombre}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        ({fam.descripcion})
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--green)' }}>Entradas: +{entradasUds} uds</span>
                      <span style={{ color: 'var(--red)' }}>Salidas: -{salidasUds} uds</span>
                      <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                        {movsDeFam.length} movs
                      </span>
                      <button
                        className="btn btn-cyan btn-sm"
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onImprimirResumen(fam.id);
                        }}
                        title={`Imprimir reporte oficial exclusivamente de la familia ${fam.id}`}
                      >
                        🖨️ Imprimir {fam.id}
                      </button>
                      <button
                        className="btn btn-sm"
                        style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          background: '#1a1005',
                          border: '1px solid #d97706',
                          color: '#fbbf24',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadPDF ? onDownloadPDF(fam.id) : onImprimirResumen(fam.id);
                        }}
                        title={`Descargar PDF oficial exclusivamente de la familia ${fam.id}`}
                      >
                        📥 PDF {fam.id}
                      </button>
                    </div>
                  </div>

                  {movsDeFam.length === 0 ? (
                    <div
                      style={{
                        padding: '10px',
                        fontSize: '11px',
                        color: 'var(--muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      Sin movimientos registrados para esta familia.
                    </div>
                  ) : (
                    movsDeFam.map((mov) => {
                      const idx = kardex.indexOf(mov);
                      const esEntrada = mov.tipo === 'ENTRADA';
                      const esSalida = mov.tipo === 'SALIDA';
                      const saldo = mov._saldoHistorico ?? 0;
                      const costoUnit = valorMap[mov.codigo] || 0;
                      const costoTotal = costoUnit * saldo;
                      const adj = mov.adjunto || (mov.adjuntos && mov.adjuntos[0]) || null;
                      const tieneAdj = Boolean(adj && (adj.data || adj.nombre));

                      return (
                        <div key={`${mov?.id || 'mov'}-${idx}`} className="kardex-row">
                          <span style={{ color: '#8ab0cc', fontSize: '11px', lineHeight: 1.2 }}>
                            {mov.fechaIngreso ? (
                              <div>
                                <div style={{ color: 'var(--cyan)', fontWeight: 600 }}>
                                  {mov.fechaIngreso}
                                </div>
                                <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                                  Reg: {mov.fecha.split(',')[0]}
                                </div>
                              </div>
                            ) : (
                              mov.fecha
                            )}
                          </span>
                          <span style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>
                              {mov.codigo}
                            </span>
                            <span style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                              [{fam.id}]
                            </span>
                          </span>
                          <span
                            style={{
                              color: '#fff',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={mov.producto}
                          >
                            {mov.producto}
                          </span>

                          {esEntrada ? (
                            <div className="kardex-entrada">
                              <div className="k-val-entrada">+{mov.cantidad || 0} uds</div>
                              <div className="k-sub">{mov.fecha.split(',')[1]?.trim()}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--muted)', textAlign: 'center' }}>—</span>
                          )}

                          {esSalida ? (
                            <div className="kardex-salida">
                              <div className="k-val-salida">-{mov.cantidad || 0} uds</div>
                              <div className="k-sub-salida">{mov.unidad || 'Despacho'}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--muted)', textAlign: 'center' }}>—</span>
                          )}

                          <span style={{ color: '#a0c8e8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>{mov.guia || '—'}</span>
                            {mov.guia && tieneAdj && (
                              <span
                                onClick={() => adj && handleTriggerImprimirAdjunto(adj)}
                                style={{ cursor: 'pointer', fontSize: '10px' }}
                                title={`🖨️ Clic para imprimir documento vinculado: ${adj?.nombre}`}
                              >
                                📎
                              </span>
                            )}
                          </span>
                          <span style={{ color: '#a0c8e8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>{mov.factura || '—'}</span>
                            {mov.factura && tieneAdj && (
                              <span
                                onClick={() => adj && handleTriggerImprimirAdjunto(adj)}
                                style={{ cursor: 'pointer', fontSize: '10px' }}
                                title={`🖨️ Clic para imprimir documento vinculado: ${adj?.nombre}`}
                              >
                                📎
                              </span>
                            )}
                          </span>
                          <span style={{ color: '#a0c8e8', fontSize: '11px' }}>
                            {mov.oc || '—'}
                          </span>
                          <span
                            style={{
                              color:
                                saldo <= 0
                                    ? 'var(--red)'
                                    : saldo <= 20
                                    ? 'var(--yellow)'
                                    : 'var(--green)',
                              fontWeight: 700,
                              fontSize: '13px',
                              textAlign: 'center',
                            }}
                          >
                            {saldo}
                          </span>
                          <span
                            style={{ color: 'var(--yellow)', fontSize: '11px', textAlign: 'right' }}
                          >
                            {costoUnit ? fmtMoney(costoUnit) : '—'}
                          </span>
                          <span
                            style={{
                              color: 'var(--yellow)',
                              fontSize: '11px',
                              fontWeight: 700,
                              textAlign: 'right',
                            }}
                          >
                            {costoTotal ? fmtMoney(costoTotal) : '—'}
                          </span>

                          <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', alignItems: 'center' }}>
                            {tieneAdj ? (
                              <>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => adj && handleTriggerImprimirAdjunto(adj)}
                                  style={{
                                    background: '#042f2e',
                                    border: '1px solid #10b981',
                                    color: '#34d399',
                                    padding: '2px 5px',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                  }}
                                  title={`🖨️ Imprimir documento vinculado: ${adj?.nombre || 'Documento'}`}
                                >
                                  🖨️
                                </button>
                                <button
                                  className="btn btn-sm"
                                  onClick={() => handleTriggerAdministrarAdjunto(mov, idx)}
                                  style={{
                                    background: '#082f49',
                                    border: '1px solid #0284c7',
                                    color: '#38bdf8',
                                    padding: '2px 5px',
                                    fontSize: '11px',
                                  }}
                                  title={`📎 Documento vinculado: ${adj?.nombre}. Clic para cambiar o desvincular`}
                                >
                                  📎
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-sm"
                                onClick={() => handleTriggerAdjuntar(mov, idx)}
                                style={{
                                  background: '#00220f',
                                  border: '1px solid var(--green)',
                                  color: 'var(--green)',
                                  padding: '2px 5px',
                                  fontSize: '11px',
                                }}
                                title="📎 Vincular documento de respaldo (PDF / Imagen) desde tu equipo"
                              >
                                📎
                              </button>
                            )}
                            <button
                              className="btn btn-cyan btn-sm"
                              onClick={() => onEditarKardex(mov, idx)}
                              style={{ padding: '2px 5px' }}
                              title="Corregir"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-red btn-sm"
                              onClick={() => onEliminarKardex(idx)}
                              style={{ padding: '2px 5px' }}
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
              );
            })
          ) : (
            /* ── VISTA CRONOLÓGICA CON BADGES DE FAMILIA ── */
            filtrados.map((mov) => {
              const idx = kardex.indexOf(mov);
              const esEntrada = mov.tipo === 'ENTRADA';
              const esSalida = mov.tipo === 'SALIDA';
              const saldo = mov._saldoHistorico ?? 0;
              const costoUnit = valorMap[mov.codigo] || 0;
              const costoTotal = costoUnit * saldo;
              const movFam = getMovFam(mov);
              const adj = mov.adjunto || (mov.adjuntos && mov.adjuntos[0]) || null;
              const tieneAdj = Boolean(adj && (adj.data || adj.nombre));

              return (
                <div key={`${mov?.id || 'mov'}-${idx}`} className="kardex-row">
                  <span style={{ color: '#8ab0cc', fontSize: '11px', lineHeight: 1.2 }}>
                    {mov.fechaIngreso ? (
                      <div>
                        <div style={{ color: 'var(--cyan)', fontWeight: 600 }}>
                          {mov.fechaIngreso}
                        </div>
                        <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                          Reg: {mov.fecha.split(',')[0]}
                        </div>
                      </div>
                    ) : (
                      mov.fecha
                    )}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{mov.codigo}</span>
                    <span
                      style={{
                        fontSize: '9px',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#93c5fd',
                        padding: '1px 4px',
                        borderRadius: '3px',
                      }}
                      title={`Familia: ${movFam}`}
                    >
                      {movFam}
                    </span>
                  </span>
                  <span
                    style={{
                      color: '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={mov.producto}
                  >
                    {mov.producto}
                  </span>

                  {esEntrada ? (
                    <div className="kardex-entrada">
                      <div className="k-val-entrada">+{mov.cantidad || 0} uds</div>
                      <div className="k-sub">{mov.fecha.split(',')[1]?.trim()}</div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--muted)', textAlign: 'center' }}>—</span>
                  )}

                  {esSalida ? (
                    <div className="kardex-salida">
                      <div className="k-val-salida">-{mov.cantidad || 0} uds</div>
                      <div className="k-sub-salida">{mov.unidad || 'Despacho'}</div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--muted)', textAlign: 'center' }}>—</span>
                  )}

                  <span style={{ color: '#a0c8e8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span>{mov.guia || '—'}</span>
                    {mov.guia && tieneAdj && (
                      <span
                        onClick={() => adj && handleTriggerImprimirAdjunto(adj)}
                        style={{ cursor: 'pointer', fontSize: '10px' }}
                        title={`🖨️ Clic para imprimir documento vinculado: ${adj?.nombre}`}
                      >
                        📎
                      </span>
                    )}
                  </span>
                  <span style={{ color: '#a0c8e8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span>{mov.factura || '—'}</span>
                    {mov.factura && tieneAdj && (
                      <span
                        onClick={() => adj && handleTriggerImprimirAdjunto(adj)}
                        style={{ cursor: 'pointer', fontSize: '10px' }}
                        title={`🖨️ Clic para imprimir documento vinculado: ${adj?.nombre}`}
                      >
                        📎
                      </span>
                    )}
                  </span>
                  <span style={{ color: '#a0c8e8', fontSize: '11px' }}>
                    {mov.oc || '—'}
                  </span>
                  <span
                    style={{
                      color:
                        saldo <= 0 ? 'var(--red)' : saldo <= 20 ? 'var(--yellow)' : 'var(--green)',
                      fontWeight: 700,
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  >
                    {saldo}
                  </span>
                  <span style={{ color: 'var(--yellow)', fontSize: '11px', textAlign: 'right' }}>
                    {costoUnit ? fmtMoney(costoUnit) : '—'}
                  </span>
                  <span
                    style={{
                      color: 'var(--yellow)',
                      fontSize: '11px',
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  >
                    {costoTotal ? fmtMoney(costoTotal) : '—'}
                  </span>

                  <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', alignItems: 'center' }}>
                    {tieneAdj ? (
                      <>
                        <button
                          className="btn btn-sm"
                          onClick={() => adj && handleTriggerImprimirAdjunto(adj)}
                          style={{
                            background: '#042f2e',
                            border: '1px solid #10b981',
                            color: '#34d399',
                            padding: '2px 5px',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                          title={`🖨️ Imprimir documento vinculado: ${adj?.nombre || 'Documento'}`}
                        >
                          🖨️
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleTriggerAdministrarAdjunto(mov, idx)}
                          style={{
                            background: '#082f49',
                            border: '1px solid #0284c7',
                            color: '#38bdf8',
                            padding: '2px 5px',
                            fontSize: '11px',
                          }}
                          title={`📎 Documento vinculado: ${adj?.nombre}. Clic para cambiar o desvincular`}
                        >
                          📎
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-sm"
                        onClick={() => handleTriggerAdjuntar(mov, idx)}
                        style={{
                          background: '#00220f',
                          border: '1px solid var(--green)',
                          color: 'var(--green)',
                          padding: '2px 5px',
                          fontSize: '11px',
                        }}
                        title="📎 Vincular documento de respaldo (PDF / Imagen) desde tu equipo"
                      >
                        📎
                      </button>
                    )}
                    <button
                      className="btn btn-cyan btn-sm"
                      onClick={() => onEditarKardex(mov, idx)}
                      style={{ padding: '2px 5px' }}
                      title="Corregir"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => onEliminarKardex(idx)}
                      style={{ padding: '2px 5px' }}
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
    </div>
  );
};
