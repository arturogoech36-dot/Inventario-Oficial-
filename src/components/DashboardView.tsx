import React, { useState, useEffect, useRef } from 'react';
import { Producto, ItemDespacho, ActaSalida, FamiliaCatalogo, KardexMovimiento } from '../types';
import { fmtMoney } from '../utils/format';
import { HOSPITAL_SERVICIOS, INITIAL_FAMILIAS } from '../data/initialData';

declare const Chart: any;

interface DashboardViewProps {
  productos: Producto[];
  kardex?: KardexMovimiento[];
  familias?: FamiliaCatalogo[];
  onOpenFamilias?: () => void;
  onImprimirEtiquetaProducto?: (p: Producto, mode?: 'barra' | 'qr' | 'combinada' | 'caja') => void;
  onOpenNuevoRegistro: () => void;
  onOpenMaestroNuevo: () => void;
  onEditarProducto: (p: Producto) => void;
  onClonarProducto?: (p: Producto) => void;
  onAbrirQR?: (p: Producto) => void;
  onCorregirStock: (p: Producto) => void;
  onEliminarProducto: (p: Producto) => void;
  onExportCSV: () => void;
  onImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerarReporte: (fam?: string) => void;
  onImprimirResumenKardex: () => void;
  onGenerarActa: (
    servicio: string,
    solicitud: string,
    responsable: string,
    items: ItemDespacho[],
    nota?: string
  ) => void;
  actas: ActaSalida[];
  inOC: string;
  setInOC: (v: string) => void;
  inFactura: string;
  setInFactura: (v: string) => void;
  inGuia: string;
  setInGuia: (v: string) => void;
  archivos: { [key: string]: { nombre: string; data: string; tipo: string } | null };
  onHandleClip: (tipo: 'Factura' | 'Guia' | 'OC') => void;
  onVerAdjuntoDoc?: (adjunto: { nombre: string; data: string; tipo: string }, titulo: string) => void;
  onImprimirAdjuntoDoc?: (adjunto: { nombre: string; data: string; tipo: string }) => void;
  onRemoverAdjuntoDoc?: (tipo: 'Factura' | 'Guia' | 'OC') => void;
  onOpenDespachoContinuo?: () => void;
  itemsDespacho?: ItemDespacho[];
  setItemsDespacho?: React.Dispatch<React.SetStateAction<ItemDespacho[]>>;
  svcDestino?: string;
  setSvcDestino?: (s: string) => void;
  nroSolicitud?: string;
  setNroSolicitud?: (s: string) => void;
  responsableRecep?: string;
  setResponsableRecep?: (s: string) => void;
  notaEntrega?: string;
  setNotaEntrega?: (s: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  productos,
  kardex = [],
  familias = INITIAL_FAMILIAS,
  onOpenFamilias,
  onImprimirEtiquetaProducto,
  onOpenNuevoRegistro,
  onOpenMaestroNuevo,
  onEditarProducto,
  onClonarProducto,
  onAbrirQR,
  onCorregirStock,
  onEliminarProducto,
  onExportCSV,
  onImportCSV,
  onGenerarReporte,
  onImprimirResumenKardex,
  onGenerarActa,
  actas = [],
  inOC,
  setInOC,
  inFactura,
  setInFactura,
  inGuia,
  setInGuia,
  archivos,
  onHandleClip,
  onVerAdjuntoDoc,
  onImprimirAdjuntoDoc,
  onRemoverAdjuntoDoc,
  onOpenDespachoContinuo,
  itemsDespacho: propItemsDespacho,
  setItemsDespacho: propSetItemsDespacho,
  svcDestino: propSvcDestino,
  setSvcDestino: propSetSvcDestino,
  nroSolicitud: propNroSolicitud,
  setNroSolicitud: propSetNroSolicitud,
  responsableRecep: propResponsableRecep,
  setResponsableRecep: propSetResponsableRecep,
  notaEntrega: propNotaEntrega,
  setNotaEntrega: propSetNotaEntrega,
}) => {
  // Search & Filter States
  const [searchInv, setSearchInv] = useState('');
  const [filtFamInv, setFiltFamInv] = useState('');
  const [searchProd, setSearchProd] = useState('');
  const [filtFamProd, setFiltFamProd] = useState('');

  // Despacho state with prop-fallback
  const [searchSalida, setSearchSalida] = useState('');
  const [suggListOpen, setSuggListOpen] = useState(false);
  const [localSvcDestino, setLocalSvcDestino] = useState('Urgencia');
  const [localNroSolicitud, setLocalNroSolicitud] = useState('');
  const [localResponsableRecep, setLocalResponsableRecep] = useState('');
  const [localNotaEntrega, setLocalNotaEntrega] = useState('ENTREGADOS : CORREO , URGENCIA');
  const [localItemsDespacho, setLocalItemsDespacho] = useState<ItemDespacho[]>([]);

  const itemsDespacho = propItemsDespacho ?? localItemsDespacho;
  const setItemsDespacho = propSetItemsDespacho ?? setLocalItemsDespacho;
  const svcDestino = propSvcDestino ?? localSvcDestino;
  const setSvcDestino = propSetSvcDestino ?? setLocalSvcDestino;
  const nroSolicitud = propNroSolicitud ?? localNroSolicitud;
  const setNroSolicitud = propSetNroSolicitud ?? setLocalNroSolicitud;
  const responsableRecep = propResponsableRecep ?? localResponsableRecep;
  const setResponsableRecep = propSetResponsableRecep ?? setLocalResponsableRecep;
  const notaEntrega = propNotaEntrega ?? localNotaEntrega;
  const setNotaEntrega = propSetNotaEntrega ?? setLocalNotaEntrega;

  // Canvas Refs for Chart.js
  const pieFamRef = useRef<HTMLCanvasElement | null>(null);
  const barMensualRef = useRef<HTMLCanvasElement | null>(null);
  const donutFijosRef = useRef<HTMLCanvasElement | null>(null);
  const sparkDespachoRef = useRef<HTMLCanvasElement | null>(null);

  const chartsRef = useRef<{ [key: string]: any }>({});

  const activos = productos.filter((p) => p.estado === 'Activo');
  const valorTotal = activos.reduce(
    (acc, p) => acc + p.stock * p.valor,
    0
  );
  const criticos = activos.filter((p) => p.stock <= p.stockMin).length;

  // Control Fijos
  const fijos = activos.filter((p) => p.tipo === 'Fijo');
  const fijosOk = fijos.filter((p) => p.stock > p.stockMin * 1.5).length;
  const fijosAl = fijos.filter(
    (p) => p.stock > p.stockMin && p.stock <= p.stockMin * 1.5
  ).length;
  const fijosCr = fijos.filter((p) => p.stock <= p.stockMin).length;
  const pctOptimo = fijos.length ? Math.round((fijosOk / fijos.length) * 100) : 0;
  const coberturas = fijos
    .filter((p) => p.stockMin > 0)
    .map((p) => p.stock / p.stockMin);
  const avgCob = coberturas.length
    ? (coberturas.reduce((s, v) => s + v, 0) / coberturas.length).toFixed(1)
    : '0';

  // Formatear OC
  const handleOCChange = (val: string) => {
    let clean = val.replace(/[^0-9]/g, '');
    if (clean.length > 5) clean = clean.substring(0, 5);
    const anio = new Date().getFullYear();
    setInOC(clean.length > 0 ? `OC-${anio}-${clean.padStart(5, '0')}` : val);
  };

  // Despacho item management
  const handleSelectInsumo = (p: Producto) => {
    if (p.stock <= 0) {
      alert(`⛔ ${p.codigo} sin stock disponible (0 uds.)`);
      return;
    }
    const nuevo: ItemDespacho = {
      id: Date.now() + Math.random(),
      codigo: p.codigo,
      desc: p.desc,
      familia: p.familia,
      cantidad: 1,
      maxStock: p.stock,
    };
    setItemsDespacho((prev) => [...prev, nuevo]);
    setSearchSalida('');
    setSuggListOpen(false);
  };

  const handleUpdateItem = (id: number, field: keyof ItemDespacho, val: any) => {
    setItemsDespacho((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: val } : it))
    );
  };

  const handleRemoveItem = (id: number) => {
    setItemsDespacho((prev) => prev.filter((it) => it.id !== id));
  };

  const handleDespachar = () => {
    if (!itemsDespacho || itemsDespacho.length === 0) {
      alert('Agrega al menos un ítem al acta de despacho.');
      return;
    }
    onGenerarActa(svcDestino, nroSolicitud, responsableRecep, itemsDespacho, notaEntrega);
    setItemsDespacho([]);
    setNroSolicitud('');
    setResponsableRecep('');
    setNotaEntrega(`ENTREGADOS : CORREO , ${svcDestino.toUpperCase()}`);
  };

  // Ordenamiento ordenado por catálogo de familias (ALI -> GOB -> EQM -> BOT -> nuevas familias creadas al final)
  // y numéricamente por código dentro de cada familia.
  const sortProductosPorFamilia = (a: Producto, b: Producto) => {
    const famOrder = (familias && familias.length > 0) ? familias : INITIAL_FAMILIAS;
    const idxA = famOrder.findIndex((f) => f.id.toUpperCase() === (a.familia || '').toUpperCase());
    const idxB = famOrder.findIndex((f) => f.id.toUpperCase() === (b.familia || '').toUpperCase());

    const rankA = idxA >= 0 ? idxA : 9999;
    const rankB = idxB >= 0 ? idxB : 9999;

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const na = parseInt(a.codigo.split('-').pop() || '0', 10);
    const nb = parseInt(b.codigo.split('-').pop() || '0', 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) {
      return na - nb;
    }
    return a.codigo.localeCompare(b.codigo);
  };

  // Filtered lists
  const filteredInv = activos
    .filter(
      (p) =>
        (!filtFamInv || p.familia === filtFamInv) &&
        (p.codigo.toLowerCase().includes(searchInv.toLowerCase()) ||
          p.desc.toLowerCase().includes(searchInv.toLowerCase()))
    )
    .sort(sortProductosPorFamilia);

  const filteredMaestro = activos
    .filter(
      (p) =>
        (!filtFamProd || p.familia === filtFamProd) &&
        (p.codigo.toLowerCase().includes(searchProd.toLowerCase()) ||
          p.desc.toLowerCase().includes(searchProd.toLowerCase()))
    )
    .sort(sortProductosPorFamilia);

  const invTotalValor = filteredInv.reduce(
    (acc, p) => acc + p.stock * (p.valor + Math.round(p.valor * 0.19)),
    0
  );

  // Initialize & update Chart.js
  useEffect(() => {
    if (typeof Chart === 'undefined') return;

    // 1. Pie Familias
    if (pieFamRef.current) {
      if (chartsRef.current.pieFam) chartsRef.current.pieFam.destroy();
      const vals = ['ALI', 'GOB', 'EQM', 'BOT'].map((f) => {
        const ps = productos.filter((p) => p.familia === f && p.estado === 'Activo');
        return ps.reduce((s, p) => s + p.stock * p.valor, 0) || 1;
      });

      chartsRef.current.pieFam = new Chart(pieFamRef.current, {
        type: 'doughnut',
        data: {
          labels: ['ALI', 'GOB', 'EQM', 'BOT'],
          datasets: [
            {
              data: vals,
              backgroundColor: ['#00d4ff', '#00cc55', '#ffaa00', '#aa55ff'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          cutout: '50%',
          plugins: { legend: { display: false } },
          responsive: false,
          animation: { duration: 400 },
        },
      });
    }

    // 2. Bar Mensual
    if (barMensualRef.current) {
      if (chartsRef.current.barMensual) chartsRef.current.barMensual.destroy();
      chartsRef.current.barMensual = new Chart(barMensualRef.current, {
        type: 'bar',
        data: {
          labels: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
          datasets: [
            {
              data: [40, 65, 50, 75, 55, 85, 70, 80, 60, 90, 75, 88],
              backgroundColor: '#00d4ff44',
              borderColor: '#00d4ff',
              borderWidth: 1,
              borderRadius: 2,
            },
            {
              data: [30, 50, 40, 60, 45, 70, 55, 65, 50, 75, 60, 72],
              backgroundColor: '#00cc5544',
              borderColor: '#00cc55',
              borderWidth: 1,
              borderRadius: 2,
            },
            {
              data: [20, 35, 30, 45, 35, 55, 45, 50, 40, 60, 50, 58],
              backgroundColor: '#ffaa0044',
              borderColor: '#ffaa00',
              borderWidth: 1,
              borderRadius: 2,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: '#1a2d4a' } },
            y: { grid: { color: '#1a2d4a' }, ticks: { maxTicksLimit: 3 } },
          },
          responsive: false,
          animation: { duration: 400 },
        },
      });
    }

    // 3. Donut Fijos
    if (donutFijosRef.current) {
      if (chartsRef.current.donutFijos) chartsRef.current.donutFijos.destroy();
      chartsRef.current.donutFijos = new Chart(donutFijosRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Óptimo', 'Alerta', 'Crítico'],
          datasets: [
            {
              data: [fijosOk || 8, fijosAl || 0, fijosCr || 15],
              backgroundColor: ['#00cc55', '#ffaa00', '#ff4d6d'],
              borderWidth: 0,
              hoverOffset: 3,
            },
          ],
        },
        options: {
          cutout: '65%',
          plugins: { legend: { display: false } },
          responsive: false,
          animation: { duration: 400 },
        },
      });
    }

    // 4. Sparkline Despacho
    if (sparkDespachoRef.current) {
      if (chartsRef.current.sparkDespacho) chartsRef.current.sparkDespacho.destroy();
      chartsRef.current.sparkDespacho = new Chart(sparkDespachoRef.current, {
        type: 'line',
        data: {
          labels: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N'],
          datasets: [
            {
              data: [25, 55, 35, 70, 45, 85, 55, 75, 45, 90, 60],
              borderColor: '#00d4ff',
              borderWidth: 1.5,
              tension: 0.4,
              pointRadius: 2,
              pointBackgroundColor: '#00d4ff',
              fill: true,
              backgroundColor: '#00d4ff0d',
            },
            {
              data: [15, 40, 30, 55, 35, 65, 45, 60, 40, 70, 50],
              borderColor: '#00cc55',
              borderWidth: 1.5,
              tension: 0.4,
              pointRadius: 2,
              pointBackgroundColor: '#00cc55',
              fill: false,
            },
            {
              data: [35, 48, 42, 58, 50, 62, 52, 62, 52, 68, 58],
              borderColor: '#ffaa00',
              borderWidth: 1.5,
              tension: 0.4,
              pointRadius: 2,
              pointBackgroundColor: '#ffaa00',
              fill: false,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { display: false } },
          responsive: false,
          animation: { duration: 400 },
        },
      });
    }

    return () => {
      Object.values(chartsRef.current).forEach((ch: any) => ch?.destroy?.());
    };
  }, [productos, fijosOk, fijosAl, fijosCr]);

  return (
    <div className="main-grid">
      {/* ── COLUMNA 1 (IZQUIERDA) ── */}
      <div className="col scroll">
        <div className="panel">
          <div className="panel-title">
            <span>REGISTRO DE ENTRADA (ACTA)</span>
            <span className="panel-status-badge">● MÓDULO ACTIVO</span>
          </div>
          <div className="metric-row">
            <div className="metric-box">
              <div className="metric-num" style={{ color: 'var(--cyan)' }}>
                {fmtMoney(valorTotal)}
              </div>
              <div className="metric-lbl">VALOR TOTAL INVENTARIO</div>
            </div>
            <div className="metric-box">
              <div className="metric-num" style={{ color: 'var(--red)' }}>
                {criticos}
              </div>
              <div className="metric-lbl">PRODUCTOS CRÍTICOS</div>
            </div>
          </div>

          <button
            className="btn btn-cyan btn-full"
            style={{ marginBottom: '10px' }}
            onClick={onOpenNuevoRegistro}
          >
            + Nuevo Registro
          </button>

          <div className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>N° ORDEN DE COMPRA (OC) *</span>
            {archivos['OC'] && (
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>
                ✓ Reflejado de PDF
              </span>
            )}
          </div>
          <div className="doc-row">
            <input
              className="field-input"
              value={inOC}
              placeholder="OC-2026-00001"
              onChange={(e) => handleOCChange(e.target.value)}
              style={archivos['OC'] ? { borderColor: 'var(--cyan)' } : undefined}
            />
            <button
              className={`clip-btn ${archivos['OC'] ? 'active' : ''}`}
              onClick={() => onHandleClip('OC')}
              title={archivos['OC'] ? `Adjuntado: ${archivos['OC'].nombre}. Clic para cambiar.` : 'Adjuntar PDF desde escritorio'}
            >
              📎 PDF
            </button>
          </div>
          {archivos['OC'] && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--cyan)',
                marginTop: '3px',
                marginBottom: '4px',
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.25)',
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              <span
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}
                title={archivos['OC'].nombre}
              >
                📄 {archivos['OC'].nombre}
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onImprimirAdjuntoDoc) onImprimirAdjuntoDoc(archivos['OC']!);
                    else onVerAdjuntoDoc?.(archivos['OC']!, `Orden de Compra: ${inOC || 'OC'}`);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', fontSize: '13px', padding: '0 2px' }}
                  title="🖨️ Imprimir PDF adjunto de Orden de Compra"
                >
                  🖨️
                </button>
                <button
                  type="button"
                  onClick={() => onRemoverAdjuntoDoc?.('OC')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '12px', padding: '0 2px' }}
                  title="Desvincular PDF"
                >
                  ✖
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: '11px',
              color: 'var(--text)',
              fontWeight: 600,
              margin: '8px 0 4px',
            }}
          >
            Documento Asociado
          </div>

          <div className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>FACTURA N°</span>
            {archivos['Factura'] && (
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>
                ✓ Reflejado de PDF
              </span>
            )}
          </div>
          <div className="doc-row">
            <input
              className="field-input"
              value={inFactura}
              placeholder="N°. 0000001"
              onChange={(e) => setInFactura(e.target.value)}
              style={archivos['Factura'] ? { borderColor: 'var(--cyan)' } : undefined}
            />
            <button
              className={`clip-btn ${archivos['Factura'] ? 'active' : ''}`}
              onClick={() => onHandleClip('Factura')}
              title={archivos['Factura'] ? `Adjuntado: ${archivos['Factura'].nombre}. Clic para cambiar.` : 'Adjuntar PDF desde escritorio'}
            >
              📎 PDF
            </button>
          </div>
          {archivos['Factura'] && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--cyan)',
                marginTop: '3px',
                marginBottom: '4px',
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.25)',
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              <span
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}
                title={archivos['Factura'].nombre}
              >
                📄 {archivos['Factura'].nombre}
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onImprimirAdjuntoDoc) onImprimirAdjuntoDoc(archivos['Factura']!);
                    else onVerAdjuntoDoc?.(archivos['Factura']!, `Factura: ${inFactura || 'Factura'}`);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', fontSize: '13px', padding: '0 2px' }}
                  title="🖨️ Imprimir PDF adjunto de Factura"
                >
                  🖨️
                </button>
                <button
                  type="button"
                  onClick={() => onRemoverAdjuntoDoc?.('Factura')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '12px', padding: '0 2px' }}
                  title="Desvincular PDF"
                >
                  ✖
                </button>
              </div>
            </div>
          )}

          <div className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>GUÍA DE DESPACHO N°</span>
            {archivos['Guia'] && (
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>
                ✓ Reflejado de PDF
              </span>
            )}
          </div>
          <div className="doc-row">
            <input
              className="field-input"
              value={inGuia}
              placeholder="N°. 0000002"
              onChange={(e) => setInGuia(e.target.value)}
              style={archivos['Guia'] ? { borderColor: 'var(--cyan)' } : undefined}
            />
            <button
              className={`clip-btn ${archivos['Guia'] ? 'active' : ''}`}
              onClick={() => onHandleClip('Guia')}
              title={archivos['Guia'] ? `Adjuntado: ${archivos['Guia'].nombre}. Clic para cambiar.` : 'Adjuntar PDF desde escritorio'}
            >
              📎 PDF
            </button>
          </div>
          {archivos['Guia'] && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--cyan)',
                marginTop: '3px',
                marginBottom: '4px',
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.25)',
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              <span
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}
                title={archivos['Guia'].nombre}
              >
                📄 {archivos['Guia'].nombre}
              </span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onImprimirAdjuntoDoc) onImprimirAdjuntoDoc(archivos['Guia']!);
                    else onVerAdjuntoDoc?.(archivos['Guia']!, `Guía de Despacho: ${inGuia || 'Guía'}`);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34d399', fontSize: '13px', padding: '0 2px' }}
                  title="🖨️ Imprimir PDF adjunto de Guía de Despacho"
                >
                  🖨️
                </button>
                <button
                  type="button"
                  onClick={() => onRemoverAdjuntoDoc?.('Guia')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '12px', padding: '0 2px' }}
                  title="Desvincular PDF"
                >
                  ✖
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: '10px',
              color: 'var(--muted)',
              textAlign: 'center',
              marginTop: '4px',
            }}
          >
            Al adjuntar PDF, el número se refleja automáticamente en el recuadro
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <span>FAMILIAS Y REPORTES</span>
            <span className="panel-status-badge">● MÓDULO ACTIVO</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
            Top Familias Insumos (Costo)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <canvas ref={pieFamRef} width={100} height={100}></canvas>
            <div className="legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--cyan)' }}></div>
                ALI
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--green)' }}></div>
                GOB
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--yellow)' }}></div>
                EQM
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--purple)' }}></div>
                BOT
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              margin: '10px 0 4px',
            }}
          >
            Consumo Mensual por Servicio
          </div>
          <canvas ref={barMensualRef} width={240} height={70}></canvas>
          <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
            <span style={{ fontSize: '10px', color: 'var(--cyan)' }}>— Urgencias</span>
            <span style={{ fontSize: '10px', color: 'var(--green)' }}>— Pabellón</span>
            <span style={{ fontSize: '10px', color: 'var(--yellow)' }}>— Otros</span>
          </div>
        </div>
      </div>

      {/* ── COLUMNA 2 (CENTRO) ── */}
      <div className="col scroll">
        <div className="panel">
          <div className="panel-title">
            <span>MAESTRO DE INVENTARIO (RESUMEN)</span>
            <span className="panel-status-badge">● MÓDULO ACTIVO</span>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            <input
              className="field-input"
              value={searchInv}
              placeholder="Buscar..."
              style={{ flex: 1, minWidth: '100px' }}
              onChange={(e) => setSearchInv(e.target.value)}
            />
            <select
              className="field-select"
              value={filtFamInv}
              style={{ width: '100px' }}
              onChange={(e) => setFiltFamInv(e.target.value)}
            >
              <option value="">Todas</option>
              {familias.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id}
                </option>
              ))}
            </select>
          </div>

          <div className="inv-hdr">
            <span>CÓDIGO</span>
            <span>PRODUCTO</span>
            <span>ENT.</span>
            <span>SAL.</span>
            <span>STK</span>
            <span>VAL.UNIT</span>
            <span>IVA</span>
            <span>C.TOTAL</span>
            <span>FAM</span>
          </div>

          <div className="inv-wrap">
            {filteredInv.map((p) => {
              const ivaUnit = Math.round(p.valor * 0.19);
              const costoTotal = p.stock * (p.valor + ivaUnit);
              const stkColor =
                p.stock <= p.stockMin
                  ? 'var(--red)'
                  : p.stock <= p.stockMin * 1.5
                  ? 'var(--yellow)'
                  : 'var(--green)';

              // Cálculo dinámico de Salidas (Despachos) y Entradas
              const salidasKardex = (kardex || [])
                .filter((m) => m.tipo === 'SALIDA' && m.codigo === p.codigo)
                .reduce((acc: number, m: KardexMovimiento) => acc + (m.cantidad || 0), 0);
              const salidasActas = (actas || []).reduce((acc: number, a: ActaSalida) => {
                const itemsInActa = (a?.items || []).filter((it: ItemDespacho) => it.codigo === p.codigo);
                return acc + itemsInActa.reduce((s: number, it: ItemDespacho) => s + (it.cantidad || 0), 0);
              }, 0);
              const totalSalidas = Math.max(salidasKardex, salidasActas);
              const totalEntradas = p.stock + totalSalidas;

              return (
                <div key={p.id} className="inv-row-wrap">
                  <span
                    style={{
                      color: 'var(--cyan)',
                      fontWeight: 700,
                      fontSize: '11px',
                    }}
                  >
                    {p.codigo}
                  </span>
                  <span
                    style={{
                      color: '#b0cce0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '11px',
                    }}
                    title={p.desc}
                  >
                    {p.desc}
                  </span>
                  <span
                    style={{
                      color: 'var(--green)',
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                    title={`Entradas acumuladas: ${totalEntradas}`}
                  >
                    {totalEntradas}
                  </span>
                  <span
                    style={{
                      color: totalSalidas > 0 ? 'var(--red)' : '#64748b',
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                    title={`Despachos / Salidas por Actas: ${totalSalidas}`}
                  >
                    {totalSalidas}
                  </span>
                  <span
                    style={{
                      color: stkColor,
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                  >
                    {p.stock}
                  </span>
                  <span
                    style={{
                      color: 'var(--cyan)',
                      fontSize: '11px',
                      textAlign: 'right',
                    }}
                  >
                    {fmtMoney(p.valor)}
                  </span>
                  <span
                    style={{
                      color: 'var(--purple)',
                      fontSize: '11px',
                      textAlign: 'right',
                    }}
                  >
                    {fmtMoney(ivaUnit)}
                  </span>
                  <span
                    style={{
                      color: 'var(--yellow)',
                      fontSize: '11px',
                      textAlign: 'right',
                    }}
                  >
                    {fmtMoney(costoTotal)}
                  </span>
                  <span className={`tag tag-${p.familia.toLowerCase()}`}>
                    {p.familia}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              marginTop: '5px',
              textAlign: 'center',
            }}
          >
            {activos.length} ítems · Total: {fmtMoney(invTotalValor || 23097675)}
          </div>
        </div>

        {/* Control de productos fijos */}
        <div className="panel">
          <div className="panel-title">
            <span>CONTROL DE PRODUCTOS FIJOS (23 ÍTEMS)</span>
            <span className="panel-status-badge">● MÓDULO ACTIVO</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '130px 1fr 1fr',
              gap: '10px',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <div className="donut-wrap">
              <canvas ref={donutFijosRef} width={130} height={130}></canvas>
              <div className="donut-center">
                <div className="big">{fijos.length}</div>
                <div className="small">productos</div>
              </div>
            </div>

            <div className="legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--green)' }}></div>
                <span>Óptimo ({fijosOk || 8})</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--yellow)' }}></div>
                <span>Alerta ({fijosAl || 0})</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--red)' }}></div>
                <span>Crítico ({fijosCr || 15})</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div
                style={{
                  background: 'var(--input)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--green)',
                  }}
                >
                  {pctOptimo || 35}%
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  % ÓPTIMO
                </div>
              </div>

              <div
                style={{
                  background: 'var(--input)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--cyan)',
                  }}
                >
                  {avgCob || '46.4'}x
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  COBERTURA AVG
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '.4px',
              marginBottom: '5px',
            }}
          >
            COBERTURA POR FAMILIA (STOCK / MÍNIMO)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '35px 1fr 40px', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--cyan)', fontWeight: 700 }}>ALI</span>
              <div style={{ background: 'var(--input)', borderRadius: '4px', height: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--green)' }}></div>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700, textAlign: 'right' }}>200%</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '35px 1fr 40px', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>GOB</span>
              <div style={{ background: 'var(--input)', borderRadius: '4px', height: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--green)' }}></div>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700, textAlign: 'right' }}>200%</span>
            </div>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '.4px',
              marginBottom: '4px',
            }}
          >
            ⚠ PRODUCTOS QUE REQUIEREN ATENCIÓN
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '90px', overflowY: 'auto' }}>
            {activos
              .filter((p) => p.stock <= p.stockMin)
              .slice(0, 4)
              .map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '55px 1fr 45px 50px',
                    gap: '4px',
                    alignItems: 'center',
                    padding: '4px 6px',
                    background: 'var(--input)',
                    borderRadius: '4px',
                    borderLeft: '3px solid var(--red)',
                  }}
                >
                  <span style={{ color: 'var(--cyan)', fontSize: '10px', fontWeight: 700 }}>
                    {p.codigo}
                  </span>
                  <span
                    style={{
                      color: '#b0cce0',
                      fontSize: '10px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.desc}
                  </span>
                  <span style={{ color: 'var(--red)', fontSize: '10px', fontWeight: 700, textAlign: 'center' }}>
                    {p.stock}/{p.stockMin}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      color: 'var(--red)',
                      background: '#1a0008',
                      borderRadius: '3px',
                      padding: '2px 4px',
                      textAlign: 'center',
                    }}
                  >
                    CRÍTICO
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Maestro de productos */}
        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-title">
            <span>MAESTRO DE PRODUCTOS</span>
            <span className="panel-status-badge">● MÓDULO ACTIVO</span>
          </div>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <input
              className="field-input"
              value={searchProd}
              placeholder="Buscar producto o código..."
              style={{ flex: 1, minWidth: '120px' }}
              onChange={(e) => setSearchProd(e.target.value)}
            />
            <select
              className="field-select"
              value={filtFamProd}
              style={{ width: '130px' }}
              onChange={(e) => setFiltFamProd(e.target.value)}
            >
              <option value="">Todas las Familias</option>
              {familias.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.id} · {f.nombre}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-cyan btn-sm" onClick={onOpenMaestroNuevo}>
              ➕ Crear Nuevo
            </button>
            {onOpenFamilias && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={onOpenFamilias}
                style={{
                  background: '#260c4a',
                  border: '1.5px solid #a855f7',
                  color: '#d8b4fe',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Gestionar familias de productos (ALI, GOB, EQM, BOT y nuevas familias)"
              >
                📁 Familias ({familias.length})
              </button>
            )}
            <button className="btn btn-yellow btn-sm" onClick={onExportCSV}>
              📥 CSV
            </button>
            <label className="btn btn-yellow btn-sm" style={{ cursor: 'pointer' }}>
              📤 Importar
              <input
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={onImportCSV}
              />
            </label>
          </div>

          <div className="table-hdr">
            <span>CÓDIGO</span>
            <span>DESCRIPCIÓN</span>
            <span>FAMILIA</span>
            <span style={{ textAlign: 'center' }}>STOCK</span>
            <span style={{ textAlign: 'center' }}>ACCIONES</span>
          </div>

          <div className="table-wrap">
            {filteredMaestro.map((p) => {
              const stkColor =
                p.stock <= p.stockMin
                  ? 'var(--red)'
                  : p.stock <= p.stockMin * 1.5
                  ? 'var(--yellow)'
                  : 'var(--green)';
              return (
                <div key={p.id} className="table-row">
                  <span className="prod-sku">{p.codigo}</span>
                  <span className="prod-name" title={p.desc}>
                    {p.desc}
                  </span>
                  <span>
                    <span className={`tag tag-${p.familia.toLowerCase()}`}>
                      {p.familia}
                    </span>
                  </span>
                  <span style={{ color: stkColor, textAlign: 'center', fontWeight: 700 }}>
                    {p.stock}
                  </span>
                  <div className="action-group">
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        onImprimirEtiquetaProducto
                          ? onImprimirEtiquetaProducto(p, 'barra')
                          : onAbrirQR?.(p)
                      }
                      style={{
                        background: '#081c16',
                        border: '1.5px solid #10b981',
                        color: '#34d399',
                      }}
                      title="Imprimir Etiqueta Termoadhesiva 50x25 mm (Código de Barras y QR) o Etiqueta Caja PDF"
                    >
                      🏷️
                    </button>
                    <button
                      className="btn btn-cyan btn-sm"
                      onClick={() => onEditarProducto(p)}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => onCorregirStock(p)}
                      style={{ background: '#1a0a00', border: '1px solid var(--yellow)', color: 'var(--yellow)' }}
                      title="Corregir Stock"
                    >
                      🔧
                    </button>
                    <button
                      className="btn btn-red btn-sm"
                      onClick={() => onEliminarProducto(p)}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              marginTop: '6px',
              textAlign: 'center',
            }}
          >
            Total: {filteredMaestro.length} productos activos ({activos.length}/100 máx.)
          </div>
        </div>
      </div>

      {/* ── COLUMNA 3 (DERECHA) ── */}
      <div className="col scroll">
        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>ACTA DE EGRESO Y DESPACHO</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {itemsDespacho.length > 0 && (
                <span style={{ fontSize: '10px', color: 'var(--cyan)', background: '#002b4d', padding: '1px 6px', borderRadius: '10px', border: '1px solid #00d4ff55' }}>
                  {itemsDespacho.length} ítems ({itemsDespacho.reduce((s, i) => s + (i.cantidad || 0), 0)} uds)
                </span>
              )}
              <span className="panel-status-badge">● MÓDULO ACTIVO</span>
            </div>
          </div>

          {/* Buscador de insumo con autocompletar */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <input
              className="field-input"
              value={searchSalida}
              placeholder="Buscar insumo (ej. Sonda...)"
              onChange={(e) => {
                setSearchSalida(e.target.value);
                setSuggListOpen(e.target.value.length >= 2);
              }}
              onFocus={() => {
                if (searchSalida.length >= 2) setSuggListOpen(true);
              }}
            />
            {suggListOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  zIndex: 50,
                  maxHeight: '160px',
                  overflowY: 'auto',
                }}
              >
                {activos
                  .filter(
                    (p) =>
                      p.codigo.toLowerCase().includes(searchSalida.toLowerCase()) ||
                      p.desc.toLowerCase().includes(searchSalida.toLowerCase())
                  )
                  .slice(0, 5)
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectInsumo(p)}
                      style={{
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#1e3560')}
                      onMouseOut={(e) => (e.currentTarget.style.background = '')}
                    >
                      <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>
                        {p.codigo}
                      </span>{' '}
                      – {p.desc}
                      <span
                        style={{
                          float: 'right',
                          color: p.stock <= p.stockMin ? 'var(--red)' : 'var(--green)',
                          fontWeight: 700,
                        }}
                      >
                        Stock: {p.stock}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Botones de servicio rápido */}
          <div className="svc-btns">
            {['Urgencia', 'Pabellón', 'Hospitalización', 'Camas Medias'].map((s) => (
              <button
                key={s}
                className={`svc-btn ${svcDestino === s ? 'active' : ''}`}
                onClick={() => {
                  setSvcDestino(s);
                  if (!notaEntrega || notaEntrega.startsWith('ENTREGADOS :')) {
                    setNotaEntrega(`ENTREGADOS : ${nroSolicitud ? nroSolicitud + ' , ' : 'CORREO , '}${s.toUpperCase()}`);
                  }
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '6px' }}>
            <div>
              <div className="field-label">SERVICIO DESTINO *</div>
              <select
                className="field-select"
                value={svcDestino}
                onChange={(e) => {
                  const s = e.target.value;
                  setSvcDestino(s);
                  if (!notaEntrega || notaEntrega.startsWith('ENTREGADOS :')) {
                    setNotaEntrega(`ENTREGADOS : ${nroSolicitud ? nroSolicitud + ' , ' : 'CORREO , '}${s.toUpperCase()}`);
                  }
                }}
              >
                {HOSPITAL_SERVICIOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="field-label">N° SOLICITUD INTERNA</div>
              <input
                className="field-input"
                value={nroSolicitud}
                placeholder="SI-00001-2026"
                onChange={(e) => setNroSolicitud(e.target.value)}
              />
            </div>
          </div>

          <div className="field-label">RESPONSABLE RECEPCIÓN / FUNCIONARIO QUE RECIBE</div>
          <input
            className="field-input"
            value={responsableRecep}
            placeholder="Nombre y RUT del funcionario (se vincula a la firma)"
            style={{ marginBottom: '8px' }}
            onChange={(e) => setResponsableRecep(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <div className="field-label" style={{ marginBottom: 0 }}>NOTA / ANOTACIONES SEGÚN ENTREGA</div>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: '10px', cursor: 'pointer', padding: 0 }}
              onClick={() => setNotaEntrega(`ENTREGADOS : ${nroSolicitud ? nroSolicitud + ' , ' : 'CORREO , '}${svcDestino.toUpperCase()}`)}
              title="Restablecer formato estándar de nota"
            >
              ↺ Formato Estándar
            </button>
          </div>
          <textarea
            className="field-input"
            rows={2}
            value={notaEntrega}
            placeholder="Ej: ENTREGADOS : CORREO , ALIMENTACION / Escribir anotaciones según entrega..."
            style={{ marginBottom: '8px', fontSize: '11px', fontFamily: 'inherit', resize: 'vertical' }}
            onChange={(e) => setNotaEntrega(e.target.value)}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 60px 24px',
              gap: '4px',
              fontSize: '10px',
              color: 'var(--muted)',
              padding: '3px 0',
              borderBottom: '1px solid var(--border)',
              marginBottom: '4px',
              textTransform: 'uppercase',
            }}
          >
            <span>INSUMO</span>
            <span>FAMILIA</span>
            <span style={{ textAlign: 'center' }}>CANTIDAD</span>
            <span></span>
          </div>

          <div style={{ maxHeight: '140px', overflowY: 'auto', marginBottom: '6px' }}>
            {(itemsDespacho || []).map((it, idx) => (
              <div
                key={`${it.id || 'desp'}-${idx}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 60px 60px 24px',
                  gap: '4px',
                  marginBottom: '3px',
                  alignItems: 'center',
                }}
              >
                <input
                  className="field-input"
                  value={it.desc}
                  style={{ fontSize: '11px', padding: '5px 6px' }}
                  onChange={(e) => handleUpdateItem(it.id, 'desc', e.target.value)}
                />
                <span
                  className={`tag tag-${(it.familia || 'bot').toLowerCase()}`}
                  style={{ textAlign: 'center', fontSize: '9px' }}
                >
                  {it.familia || '—'}
                </span>
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  max={it.maxStock || 9999}
                  value={it.cantidad}
                  style={{ fontSize: '11px', textAlign: 'center', padding: '5px 4px' }}
                  onChange={(e) =>
                    handleUpdateItem(it.id, 'cantidad', parseInt(e.target.value) || 1)
                  }
                />
                <button
                  style={{
                    background: 'var(--input)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--red)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '3px 0',
                  }}
                  onClick={() => handleRemoveItem(it.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            className="btn btn-cyan btn-sm"
            style={{ width: '100%', marginBottom: '8px' }}
            onClick={() => {
              const primero = activos[0];
              if (primero) handleSelectInsumo(primero);
            }}
          >
            + Agregar Ítem
          </button>

          <canvas ref={sparkDespachoRef} width={240} height={50} style={{ width: '100%', marginBottom: '4px' }}></canvas>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', marginBottom: '8px' }}>
            Resumen Despacho Mensual
          </div>

          <button className="btn btn-cyan btn-full" style={{ padding: '10px' }} onClick={handleDespachar}>
            🖨️ Imprimir Acta de Salida
          </button>
          <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', marginTop: '3px' }}>
            Formato Carta / Firmas Automatizadas
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">REPORTES Y RESPALDOS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onGenerarReporte('TOTAL')}
                title="Reporte Inventario Valorizado"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'var(--input)',
                  border: '1px solid var(--cyan)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '15px',
                  color: 'var(--cyan)',
                }}
              >
                📊
              </button>
              <button
                onClick={onExportCSV}
                title="Respaldo General (Excel / CSV)"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'var(--input)',
                  border: '1px solid var(--green)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '15px',
                  color: 'var(--green)',
                }}
              >
                📥
              </button>
              <button
                onClick={onImprimirResumenKardex}
                title="Resumen Oficial de Kardex por Familias (Imprimir / PDF)"
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'var(--input)',
                  border: '1px solid var(--yellow)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '15px',
                  color: 'var(--yellow)',
                }}
              >
                🖨️
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#a0c0d8' }}>Atención 24/7</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Arturo Gómez E.</div>
            </div>
          </div>

          <div
            style={{
              marginTop: '8px',
              padding: '6px 8px',
              background: 'rgba(2, 132, 199, 0.08)',
              borderRadius: '4px',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              fontSize: '10.5px',
              color: '#93c5fd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>📁 Kardex por Familias:</span>
            <span style={{ color: '#fef08a', fontWeight: 700 }}>
              {familias.length} familias clasificadas
            </span>
          </div>

          <div
            style={{
              marginTop: '10px',
              paddingTop: '10px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--cyan)' }}>⊕ HAH</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Hospital Alto Hospicio</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Bodega General</div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-cyan btn-sm"
                onClick={() => onGenerarReporte('KARDEX_FAMILIAS')}
                title="Abrir vista previa del Resumen Kardex estructurado y consolidado por familias"
                style={{ fontSize: '11px', padding: '5px 8px' }}
              >
                📋 Resumen Kardex
              </button>
              <button
                className="btn btn-green btn-sm"
                onClick={() => onGenerarReporte('TOTAL')}
                style={{ fontSize: '11px', padding: '5px 8px' }}
              >
                📊 Reporte
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
