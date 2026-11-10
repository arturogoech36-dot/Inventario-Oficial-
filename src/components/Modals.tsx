import React, { useState } from 'react';
import {
  Producto,
  KardexMovimiento,
  ActaSalida,
  SinCostoMovimiento,
  TrazabilidadEquipo,
  Herramienta,
  EquipoMenor,
  FamiliaCatalogo,
} from '../types';
import { fmtMoney, today } from '../utils/format';
import { pickDesktopFile } from '../utils/barcodeHelpers';
import { INITIAL_FAMILIAS, HOSPITAL_SERVICIOS } from '../data/initialData';
import {
  printReporteTexto,
  printActaSalidaDocument,
  downloadActaSalidaPDF,
  printDocument,
  downloadHtmlAsPDF,
  downloadElementAsPDF,
  downloadPrintableHtml,
  openPrintableWindow,
} from '../utils/printHelpers';
import { buildActaDespachoTemplate } from '../utils/hospitalTemplates';
import {
  openGmailWebComposer,
  openOutlookWebComposer,
  openDefaultMailClient,
  copyReportToClipboard,
  buildReportEmailSubject,
  buildReportEmailBody,
  buildReportEmailBodyForUrl,
} from '../utils/emailReportHelper';
import { getStoredAppsScriptUrl, sendEmailViaAppsScript } from '../services/appsScriptService';

function toInputDate(val?: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const parts = val.split(/[-/]/);
  if (parts.length === 3 && parts[2]?.length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return val;
}

declare const QRCode: any;

interface ModalsProps {
  modalOpen: string | null;
  onClose: () => void;
  familias?: FamiliaCatalogo[];
  productos?: Producto[];
  onPrintEtiquetaSeparada?: (p: Producto, mode: 'barra' | 'qr' | 'caja') => void;
  // Producto
  modalProductoTitulo: string;
  modalProdData: {
    familia: string;
    codigo: string;
    desc: string;
    stock: number;
    stockMin: number;
    valor: number;
    venc: string;
    fechaIngreso?: string;
    isEdit?: boolean;
  };
  setModalProdData: React.Dispatch<React.SetStateAction<any>>;
  onSaveProducto: () => void;
  inOC?: string;
  inFactura?: string;
  inGuia?: string;
  // Acta
  actaContent: string;
  ultimaActa?: ActaSalida | null;
  onPrintActa: () => void;
  // Reporte
  reporteContent: string;
  reporteFam: string;
  setReporteFam: (fam: string) => void;
  onPrintReporte: () => void;
  onEnviarReporteCorreo?: (email: string, mode?: 'gmail' | 'outlook' | 'mailto' | 'copy' | 'appsscript') => void | Promise<void>;
  // Correccion
  corrProd: Producto | null;
  onConfirmarCorreccion: (nuevoStock: number, motivo: string, obs: string) => void;
  // QR
  qrProducto: Producto | null;
  onQREntrada: (cant: number) => void;
  onQRSalida: (cant: number, servicio: string) => void;
  onQRUpdateValor: (val: number) => void;
  onPrintQREtiqueta: () => void;
  onOpenCorreccionFromQR: () => void;
  kardex: KardexMovimiento[];
  // Lector QR
  onCodigoDetectado: (codigo: string) => void;
  // Confirm
  confirmData: {
    icono: string;
    titulo: string;
    mensaje: string;
    textoOk: string;
    colorOk: string;
    onOk: () => void;
  } | null;
  // Editar Kardex
  editKardexData: {
    idx: number;
    tipo: string;
    codigo: string;
    producto: string;
    cantidad: number;
    guia: string;
    factura: string;
    oc: string;
    unidad: string;
    adjunto?: { nombre: string; tipo: string; data?: string } | null;
    adjuntos?: any[];
  } | null;
  setEditKardexData: React.Dispatch<React.SetStateAction<any>>;
  onGuardarEditKardex: () => void;
  // Despacho SC
  despachoSCItem: SinCostoMovimiento | null;
  onConfirmarDespachoSC: (cant: number, svc: string, resp: string, obs: string) => void;
  // Despacho Trazabilidad (Equipos, Herramientas, Equipos Menores)
  despachoTrazItem?: {
    modulo: 'equipos' | 'herramientas' | 'equiposmenores';
    item: any;
    codigo: string;
    nombre: string;
    saldo: number;
    servicioDestino?: string;
    personaRecibe?: string;
  } | null;
  onConfirmarDespachoTraz?: (cant: number, svc: string, resp: string, nota: string) => void;
  // Detalle Acta
  detalleActa: ActaSalida | null;
  onImprimirDetalleActa: () => void;
  onUpdateNotaActa?: (actaId: string, nuevaNota: string) => void;
  // Trazabilidad
  trazData: Partial<TrazabilidadEquipo>;
  setTrazData: React.Dispatch<React.SetStateAction<any>>;
  onGuardarTrazabilidad: () => void;
  // Herramienta
  herData: Partial<Herramienta>;
  setHerData: React.Dispatch<React.SetStateAction<any>>;
  onGuardarHerramienta: () => void;
  // Equipo Menor
  eqmData: Partial<EquipoMenor>;
  setEqmData: React.Dispatch<React.SetStateAction<any>>;
  onGuardarEquipoMenor: () => void;
}

export const Modals: React.FC<ModalsProps> = ({
  modalOpen,
  onClose,
  familias = INITIAL_FAMILIAS,
  productos = [],
  onPrintEtiquetaSeparada,
  modalProductoTitulo,
  modalProdData,
  setModalProdData,
  onSaveProducto,
  inOC,
  inFactura,
  inGuia,
  actaContent,
  ultimaActa,
  onPrintActa,
  reporteContent,
  reporteFam,
  setReporteFam,
  onPrintReporte,
  onEnviarReporteCorreo,
  corrProd,
  onConfirmarCorreccion,
  qrProducto,
  onQREntrada,
  onQRSalida,
  onQRUpdateValor,
  onPrintQREtiqueta,
  onOpenCorreccionFromQR,
  kardex,
  onCodigoDetectado,
  confirmData,
  editKardexData,
  setEditKardexData,
  onGuardarEditKardex,
  despachoSCItem,
  onConfirmarDespachoSC,
  despachoTrazItem,
  onConfirmarDespachoTraz,
  detalleActa,
  onImprimirDetalleActa,
  onUpdateNotaActa,
  trazData,
  setTrazData,
  onGuardarTrazabilidad,
  herData,
  setHerData,
  onGuardarHerramienta,
  eqmData,
  setEqmData,
  onGuardarEquipoMenor,
}) => {
  // Local modal states
  const [corrNuevoStock, setCorrNuevoStock] = useState<number>(0);
  const [corrMotivo, setCorrMotivo] = useState('');
  const [corrObs, setCorrObs] = useState('');

  const [qrCantEnt, setQrCantEnt] = useState(1);
  const [qrCantSal, setQrCantSal] = useState(1);
  const [qrSvcSal, setQrSvcSal] = useState('');
  const [qrManualInput, setQrManualInput] = useState('');

  const [dscCant, setDscCant] = useState(1);
  const [dscSvc, setDscSvc] = useState('');
  const [dscResp, setDscResp] = useState('');
  const [dscObs, setDscObs] = useState('');

  const [emailDestino, setEmailDestino] = useState<string>(() => {
    return localStorage.getItem('hah_email_jefatura') || 'arturo.gomez@hah.gob.cl';
  });
  const [emailFeedback, setEmailFeedback] = useState<{
    type: 'success' | 'error' | 'info' | 'sending';
    message: string;
    externalLink?: string;
  } | null>(null);
  const [isSendingViaAppsScript, setIsSendingViaAppsScript] = useState(false);

  const normalizeEmail = (raw: string): string => {
    let email = (raw || '').trim().toLowerCase();
    if (!email) return 'arturo.gomez@hah.gob.cl';
    if (!email.includes('@')) {
      email = `${email}@hah.gob.cl`;
    }
    return email;
  };

  const handleDespacharEmail = async (mode: 'gmail' | 'outlook' | 'mailto' | 'copy' | 'appsscript' = 'gmail') => {
    let raw = (emailDestino || '').trim();
    if (!raw && mode !== 'copy') {
      raw = 'arturo.gomez@hah.gob.cl';
    }
    const destino = normalizeEmail(raw);
    setEmailDestino(destino);
    localStorage.setItem('hah_email_jefatura', destino);

    const asunto = buildReportEmailSubject(reporteFam, today());
    const cuerpoTexto = buildReportEmailBody({
      destino,
      reporteFam,
      reporteHtmlOrText: reporteContent,
      usuario: 'Arturo Gómez Echegoyen',
      fecha: today(),
    });
    const cuerpoUrl = buildReportEmailBodyForUrl({
      destino,
      reporteFam,
      reporteHtmlOrText: reporteContent,
      usuario: 'Arturo Gómez Echegoyen',
      fecha: today(),
    });

    if (mode === 'copy') {
      const ok = await copyReportToClipboard(cuerpoTexto, reporteContent);
      setEmailFeedback({
        type: ok ? 'success' : 'error',
        message: ok
          ? '📋 Reporte completo con diseño visual, tablas y colores oficiales copiado al portapapeles. ¡Listo para pegar con Ctrl + V en Gmail, Outlook o Word!'
          : 'No se pudo copiar automáticamente. Puedes seleccionar el texto manualmente.',
      });
      if (onEnviarReporteCorreo) onEnviarReporteCorreo(destino, 'copy');
      return;
    }

    if (mode === 'gmail') {
      // Primero copiamos el reporte oficial al portapapeles con formato visual completo
      await copyReportToClipboard(cuerpoTexto, reporteContent);
      // Abrimos Gmail con la URL segura (evita HTTP 400 Bad Request)
      const res = openGmailWebComposer(destino, asunto, cuerpoUrl);
      setEmailFeedback({
        type: 'success',
        message: `✉️ Gmail Web abierto para ${destino}. ¡El diseño visual oficial ha sido copiado a su portapapeles! Presione Ctrl + V en Gmail para pegarlo.`,
        externalLink: res.url,
      });
      if (onEnviarReporteCorreo) onEnviarReporteCorreo(destino, 'gmail');
      return;
    }

    if (mode === 'outlook') {
      await copyReportToClipboard(cuerpoTexto, reporteContent);
      openOutlookWebComposer(destino, asunto, cuerpoUrl);
      const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(destino)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoUrl)}`;
      setEmailFeedback({
        type: 'success',
        message: `🏢 Se abrió Outlook Web para ${destino}. ¡Reporte con diseño visual copiado al portapapeles! Presione Ctrl + V para pegarlo.`,
        externalLink: outlookUrl,
      });
      if (onEnviarReporteCorreo) onEnviarReporteCorreo(destino, 'outlook');
      return;
    }

    if (mode === 'mailto') {
      await copyReportToClipboard(cuerpoTexto, reporteContent);
      openDefaultMailClient(destino, asunto, cuerpoUrl);
      setEmailFeedback({
        type: 'info',
        message: `💻 Abriendo cliente de correo para ${destino}. (Reporte con diseño visual copiado al portapapeles).`,
      });
      if (onEnviarReporteCorreo) onEnviarReporteCorreo(destino, 'mailto');
      return;
    }

    if (mode === 'appsscript') {
      const scriptUrl = getStoredAppsScriptUrl();
      if (!scriptUrl) {
        setEmailFeedback({
          type: 'error',
          message: '⚠️ Para envío automático directo desde Google Cloud, primero configura la URL de tu Backend Google Apps Script en la barra superior (botón Google Sheets / Apps Script).',
        });
        return;
      }
      try {
        setIsSendingViaAppsScript(true);
        setEmailFeedback({
          type: 'sending',
          message: `🚀 Enviando correo oficial en segundo plano mediante Google Apps Script a ${destino}...`,
        });
        const res = await sendEmailViaAppsScript(scriptUrl, {
          to: destino,
          subject: asunto,
          body: cuerpoTexto,
          htmlBody: reporteContent.includes('<') ? reporteContent : undefined,
        });
        setIsSendingViaAppsScript(false);
        setEmailFeedback({
          type: 'success',
          message: `✅ ${res.message || `Correo oficial despachado con éxito a ${destino}`}`,
        });
        if (onEnviarReporteCorreo) onEnviarReporteCorreo(destino, 'appsscript');
      } catch (err: any) {
        setIsSendingViaAppsScript(false);
        setEmailFeedback({
          type: 'error',
          message: `Error al enviar correo por Apps Script: ${err.message}`,
        });
      }
      return;
    }
  };

  const [trzPegado, setTrzPegado] = useState('');
  const [editDetalleNota, setEditDetalleNota] = useState('');
  const [notaSavedFeedback, setNotaSavedFeedback] = useState(false);
  const [editActaNota, setEditActaNota] = useState('');
  const [actaNotaSavedFeedback, setActaNotaSavedFeedback] = useState(false);

  React.useEffect(() => {
    if (despachoTrazItem) {
      setDscCant(1);
      setDscSvc(despachoTrazItem.servicioDestino || 'Urgencia');
      setDscResp(despachoTrazItem.personaRecibe || '');
      setDscObs('ENTREGADOS CONFORMES PARA OPERACIÓN EN SERVICIO CLÍNICO');
    }
  }, [despachoTrazItem]);

  React.useEffect(() => {
    if (despachoSCItem) {
      setDscCant(1);
      setDscSvc(despachoSCItem.unidad || '');
      setDscResp(despachoSCItem.persona || '');
      setDscObs('');
    }
  }, [despachoSCItem]);

  React.useEffect(() => {
    if (detalleActa) {
      setEditDetalleNota(detalleActa.nota || '');
    }
  }, [detalleActa]);

  React.useEffect(() => {
    if (ultimaActa) {
      setEditActaNota(ultimaActa.nota || '');
    }
  }, [ultimaActa]);

  // Handle SKU & Familia changes in modal
  const handleFamiliaSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    if (val.includes('|')) {
      const [fam, cod, desc] = val.split('|');
      setModalProdData((prev: any) => ({
        ...prev,
        familia: fam,
        codigo: cod,
        desc: desc,
      }));
    } else {
      const famId = val;
      if (!modalProdData.isEdit) {
        const famProds = productos.filter((p) => p.familia === famId);
        let maxNum = 0;
        famProds.forEach((p) => {
          const m = p.codigo.match(new RegExp(`${famId}-(\\d+)`, 'i'));
          if (m && m[1]) {
            const num = parseInt(m[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        let nextNum = maxNum > 0 ? maxNum + 1 : 1;
        if (maxNum === 0) {
          if (famId === 'ALI') nextNum = 22;
          else if (famId === 'GOB') nextNum = 24;
          else if (famId === 'EQM') nextNum = 28;
          else if (famId === 'BOT') nextNum = 72;
          else nextNum = 1;
        }
        const nextCode = `${famId}-${String(nextNum).padStart(2, '0')}`;
        setModalProdData((prev: any) => ({
          ...prev,
          familia: famId,
          codigo: nextCode,
        }));
      } else {
        setModalProdData((prev: any) => ({ ...prev, familia: famId }));
      }
    }
  };

  const parseTrazabilidadText = () => {
    if (!trzPegado.trim()) return;
    const lines = trzPegado.split('\n');
    const update: any = { ...trazData };
    lines.forEach((line) => {
      const lower = line.toLowerCase();
      if (lower.includes('equipo') || lower.includes('nombre'))
        update.nombreEquipo = line.split(/[:\t]/).pop()?.trim() || '';
      else if (lower.includes('marca')) update.marca = line.split(/[:\t]/).pop()?.trim() || '';
      else if (lower.includes('modelo')) update.modelo = line.split(/[:\t]/).pop()?.trim() || '';
      else if (lower.includes('serie') || lower.includes('n°'))
        update.nSerie = line.split(/[:\t]/).pop()?.trim() || '';
      else if (lower.includes('finalidad'))
        update.finalidad = line.split(/[:\t]/).pop()?.trim() || '';
      else if (lower.includes('instituc') || lower.includes('extern'))
        update.institucionExterna = line.split(/[:\t]/).pop()?.trim() || '';
      else if (lower.includes('clinico') || lower.includes('serv'))
        update.servClinico = line.split(/[:\t]/).pop()?.trim() || '';
      else if (lower.includes('mant') || lower.includes('preventivo'))
        update.mantPreventivo = line.split(/[:\t]/).pop()?.trim() || '';
      else if (lower.includes('accesor'))
        update.accesorios = line.split(/[:\t]/).pop()?.trim() || '';
      else if (lower.includes('ingreso') || lower.includes('retiro'))
        update.ingresoRetiro = line.split(/[:\t]/).pop()?.trim() || '';
    });
    setTrazData(update);
  };

  return (
    <>
      {/* ── MODAL PRODUCTO ── */}
      <div className={`modal-overlay ${modalOpen === 'modalProducto' ? 'open' : ''}`}>
        <div className="modal">
          <div className="modal-title">{modalProductoTitulo}</div>
          <div className="modal-grid">
            <div className="modal-field">
              <div className="field-label">Familia *</div>
              <select
                className="field-select"
                value={modalProdData.familia}
                onChange={(e) => handleFamiliaSelectChange(e)}
              >
                <option value="">-- Seleccionar Familia --</option>
                {familias.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} · {f.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <div className="field-label">Código del Producto *</div>
              <input
                className="field-input"
                value={modalProdData.codigo}
                placeholder="ej. ALI-01"
                style={{ fontWeight: 800, fontFamily: 'monospace', textTransform: 'uppercase' }}
                onChange={(e) =>
                  setModalProdData((prev: any) => ({
                    ...prev,
                    codigo: e.target.value.toUpperCase(),
                  }))
                }
              />
            </div>
            {/* Quick selector of pre-existing catalog items */}
            {productos && productos.length > 0 && (
              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <div className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Seleccionar Producto Existente del Catálogo</span>
                  <span style={{ fontSize: '10.5px', color: '#64748b' }}>Opcional (para autocompletar)</span>
                </div>
                <select
                  className="field-select"
                  value={modalProdData.codigo ? `${modalProdData.familia}|${modalProdData.codigo}|${modalProdData.desc}` : ''}
                  onChange={handleFamiliaSelectChange}
                  style={{ fontSize: '12px' }}
                >
                  <option value="">-- Seleccionar producto para autocompletar --</option>
                  {familias.map((fam) => {
                    const famProds = productos.filter((p) => p.familia === fam.id);
                    if (famProds.length === 0) return null;
                    return (
                      <optgroup key={fam.id} label={`── ${fam.id} (${fam.nombre})`}>
                        {famProds.map((p) => (
                          <option key={p.id} value={`${p.familia}|${p.codigo}|${p.desc}`}>
                            {p.codigo} · {p.desc}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            )}
            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Descripción *</div>
              <input
                className="field-input"
                value={modalProdData.desc}
                placeholder="Nombre del producto"
                onChange={(e) =>
                  setModalProdData((prev: any) => ({ ...prev, desc: e.target.value }))
                }
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Cantidad Entrada</div>
              <input
                className="field-input"
                type="number"
                value={modalProdData.stock}
                onChange={(e) =>
                  setModalProdData((prev: any) => ({
                    ...prev,
                    stock: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Stock Mínimo</div>
              <input
                className="field-input"
                type="number"
                value={modalProdData.stockMin}
                onChange={(e) =>
                  setModalProdData((prev: any) => ({
                    ...prev,
                    stockMin: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Valor Unitario ($)</div>
              <input
                className="field-input"
                type="number"
                value={modalProdData.valor}
                onChange={(e) =>
                  setModalProdData((prev: any) => ({
                    ...prev,
                    valor: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
            <div className="modal-field">
              <div className="field-label" style={{ color: 'var(--cyan)', fontWeight: 700 }}>
                📅 Fecha de Ingreso de los Productos a Bodega *
              </div>
              <input
                className="field-input"
                type="date"
                value={toInputDate(modalProdData.fechaIngreso || today())}
                onChange={(e) =>
                  setModalProdData((prev: any) => ({ ...prev, fechaIngreso: e.target.value }))
                }
                style={{ borderColor: 'var(--cyan)', fontWeight: 600 }}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">📅 Fecha de Vencimiento</div>
              <input
                className="field-input"
                type="date"
                value={toInputDate(modalProdData.venc)}
                onChange={(e) =>
                  setModalProdData((prev: any) => ({ ...prev, venc: e.target.value }))
                }
              />
            </div>
            {/* Resumen de Documentos de Entrada Asociados */}
            {(inOC || inFactura || inGuia) && (
              <div
                className="modal-field"
                style={{
                  gridColumn: 'span 2',
                  background: 'rgba(0, 212, 255, 0.06)',
                  border: '1px solid rgba(0, 212, 255, 0.25)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--cyan)', fontWeight: 700, marginBottom: '4px' }}>
                  📋 Documentos de Entrada Asociados a esta Recepción
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>N° OC: </span>
                    <strong style={{ color: inOC ? '#ffffff' : '#64748b' }}>{inOC || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>N° Factura: </span>
                    <strong style={{ color: inFactura ? '#ffffff' : '#64748b' }}>{inFactura || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)' }}>N° Guía: </span>
                    <strong style={{ color: inGuia ? '#ffffff' : '#64748b' }}>{inGuia || '—'}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn btn-red" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-green" onClick={onSaveProducto}>
              💾 Guardar Cambios
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL ACTA PREVIEW ── */}
      <div className={`modal-overlay ${modalOpen === 'modalActa' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '860px', maxWidth: '96vw' }}>
          <div className="modal-title">🖨️ Vista Previa – . Acta de Egreso y Despacho</div>
          {/* Nota editor in preview modal */}
          {ultimaActa && (
            <div style={{ marginBottom: '10px', background: 'var(--panel2)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--cyan)', fontWeight: 700 }}>
                  ✏️ NOTA / ANOTACIONES SEGÚN ENTREGA:
                </span>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                  Puedes editar la nota y guardarla para proyectarla en el documento oficial
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="field-input"
                  style={{ flex: 1, fontSize: '12px' }}
                  value={editActaNota}
                  placeholder="Ej: ENTREGADOS : CORREO , ALIMENTACION / Escribir anotaciones según entrega..."
                  onChange={(e) => setEditActaNota(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (ultimaActa) {
                        ultimaActa.nota = editActaNota;
                        if (onUpdateNotaActa) {
                          onUpdateNotaActa(ultimaActa.id, editActaNota);
                        }
                        setActaNotaSavedFeedback(true);
                        setTimeout(() => setActaNotaSavedFeedback(false), 2200);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-green btn-sm"
                  style={{
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: actaNotaSavedFeedback ? '#15803d' : undefined,
                    borderColor: actaNotaSavedFeedback ? '#22c55e' : undefined,
                  }}
                  onClick={() => {
                    if (ultimaActa) {
                      ultimaActa.nota = editActaNota;
                      if (onUpdateNotaActa) {
                        onUpdateNotaActa(ultimaActa.id, editActaNota);
                      }
                      setActaNotaSavedFeedback(true);
                      setTimeout(() => setActaNotaSavedFeedback(false), 2200);
                    }
                  }}
                  title="Guardar anotación actualizada en el acta"
                >
                  {actaNotaSavedFeedback ? '✅ Guardado' : '💾 Guardar Nota'}
                </button>
              </div>
            </div>
          )}

          <div
            id="actaContentSheet"
            style={{
              maxHeight: '66vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              color: '#000000',
            }}
            dangerouslySetInnerHTML={{
              __html: ultimaActa
                ? buildActaDespachoTemplate({ ...ultimaActa, nota: editActaNota || ultimaActa.nota })
                : (actaContent || '').includes('hah-official-sheet')
                ? (actaContent || '')
                : buildActaDespachoTemplate(actaContent || ''),
            }}
          />
          <div className="modal-actions" style={{ marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-red" onClick={onClose}>
              Cerrar
            </button>
            <button
              className="btn btn-yellow"
              style={{ background: '#1a1005', border: '1px solid #d97706', color: '#fbbf24' }}
              onClick={async () => {
                if (ultimaActa) {
                  const actaActualizada = { ...ultimaActa, nota: editActaNota || ultimaActa.nota };
                  await downloadActaSalidaPDF(actaActualizada, `Acta_${ultimaActa.id || 'HAH'}`);
                } else {
                  const html = (actaContent || '').includes('hah-official-sheet')
                    ? (actaContent || '')
                    : buildActaDespachoTemplate(actaContent || '');
                  await downloadHtmlAsPDF(html, 'Acta_Salida_Despacho_HAH', 'portrait');
                }
              }}
              title="Descargar acta oficial en formato PDF institucional"
            >
              📥 Descargar PDF (.pdf)
            </button>
            <button
              className="btn btn-cyan"
              onClick={() => {
                if (ultimaActa) {
                  const actaActualizada = { ...ultimaActa, nota: editActaNota || ultimaActa.nota };
                  printActaSalidaDocument(actaActualizada, `Acta ${ultimaActa.id} - Hospital Alto Hospicio`);
                } else if (onPrintActa) {
                  onPrintActa();
                } else {
                  printActaSalidaDocument(actaContent || '', 'Acta de Salida y Despacho - Hospital Alto Hospicio');
                }
              }}
              title="Abre ventana oficial para imprimir"
            >
              🖨️ Imprimir Acta
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL REPORTE VALORIZADO Y TRAZABILIDAD ── */}
      <div className={`modal-overlay ${modalOpen === 'modalReporte' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '880px', maxWidth: '96vw' }}>
          <div className="modal-title">
            {reporteFam.startsWith('KARDEX_FAMILIAS')
              ? reporteFam.includes(':')
                ? `📋 Resumen Oficial de Kardex · Familia ${reporteFam.split(':')[1]}`
                : '📋 Resumen Oficial de Kardex por Familias de Insumos'
              : reporteFam === 'TRAZ-EQUIPOS'
              ? '📋 Reporte Oficial de Trazabilidad de Equipos Médicos'
              : reporteFam === 'TRAZ-HERRAMIENTAS'
              ? '🧰 Reporte Oficial de Trazabilidad de Herramientas'
              : reporteFam === 'TRAZ-EQUIPOS-MENORES'
              ? '⚙️ Reporte Oficial de Trazabilidad de Equipos Menores'
              : '📊 Reporte Inventario Valorizado'}
          </div>

          {reporteFam && !reporteFam.startsWith('TRAZ') && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <button
                className={`btn-rpt-tab ${reporteFam === 'TOTAL' ? 'active' : ''}`}
                onClick={() => setReporteFam('TOTAL')}
              >
                📋 Total Inventario
              </button>
              {(familias && familias.length > 0 ? familias : INITIAL_FAMILIAS).map((f) => (
                <button
                  key={f.id}
                  className={`btn-rpt-tab ${reporteFam === f.id ? 'active' : ''}`}
                  onClick={() => setReporteFam(f.id)}
                >
                  {f.id} - {f.nombre}
                </button>
              ))}
              <button
                className={`btn-rpt-tab ${reporteFam === 'KARDEX_FAMILIAS' ? 'active' : ''}`}
                style={{
                  background: reporteFam === 'KARDEX_FAMILIAS' ? '#003366' : 'rgba(2, 132, 199, 0.12)',
                  color: reporteFam === 'KARDEX_FAMILIAS' ? '#38bdf8' : 'var(--cyan)',
                  border: '1px solid var(--cyan)',
                  fontWeight: 700,
                }}
                onClick={() => setReporteFam('KARDEX_FAMILIAS')}
                title="Resumen oficial de Kardex estructurado y consolidado de todas las familias"
              >
                📦 Resumen Kardex (Todas)
              </button>
              {(familias && familias.length > 0 ? familias : INITIAL_FAMILIAS).map((f) => {
                const isKdxFam = reporteFam === `KARDEX_FAMILIAS:${f.id}`;
                return (
                  <button
                    key={`kdx-btn-${f.id}`}
                    className={`btn-rpt-tab ${isKdxFam ? 'active' : ''}`}
                    style={{
                      background: isKdxFam ? '#0284c7' : 'rgba(2, 132, 199, 0.08)',
                      color: isKdxFam ? '#ffffff' : '#38bdf8',
                      border: isKdxFam ? '1px solid #0284c7' : '1px solid rgba(2, 132, 199, 0.35)',
                      fontWeight: 600,
                      fontSize: '11px',
                    }}
                    onClick={() => setReporteFam(`KARDEX_FAMILIAS:${f.id}`)}
                    title={`Ver resumen oficial de Kardex solo para la familia ${f.id} (${f.nombre})`}
                  >
                    📋 Kdx: {f.id}
                  </button>
                );
              })}
            </div>
          )}

          <div
            id="reporteContentBox"
            style={{
              maxHeight: '66vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              color: '#000000',
            }}
          >
            {(reporteContent || '').includes('<') ? (
              <div dangerouslySetInnerHTML={{ __html: reporteContent || '' }} />
            ) : (
              <pre style={{ fontFamily: 'Courier New, monospace', fontSize: '9pt', color: '#000000', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                {reporteContent || '(Reporte vacío)'}
              </pre>
            )}
          </div>

          {/* ── CONTENEDOR: ENVIAR REPORTE POR CORREO A JEFATURA (DISEÑO OFICIAL) ── */}
          <div
            className="no-print"
            style={{
              marginTop: '14px',
              padding: '14px 16px',
              background: '#070f1e',
              borderRadius: '10px',
              border: '1px solid #1a2d48',
              boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#7ea1c8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>ENVIAR REPORTE POR CORREO A JEFATURA</span>
              </div>
              {/* Acceso rápido a destinatarios institucionales frecuentes */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmailDestino('arturo.gomez@hah.gob.cl');
                    localStorage.setItem('hah_email_jefatura', 'arturo.gomez@hah.gob.cl');
                  }}
                  style={{
                    background: emailDestino.includes('arturo') ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: emailDestino.includes('arturo') ? '1px solid #00d4ff' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: emailDestino.includes('arturo') ? '#38bdf8' : '#94a3b8',
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  title="Seleccionar Arturo Gómez"
                >
                  arturo.gomez@hah.gob.cl
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailDestino('orielle.montecinos@hah.gob.cl');
                    localStorage.setItem('hah_email_jefatura', 'orielle.montecinos@hah.gob.cl');
                  }}
                  style={{
                    background: emailDestino.includes('orielle') ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: emailDestino.includes('orielle') ? '1px solid #00d4ff' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: emailDestino.includes('orielle') ? '#38bdf8' : '#94a3b8',
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  title="Seleccionar Orielle Montecinos"
                >
                  orielle.montecinos@hah.gob.cl
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: '1 1 auto', position: 'relative' }}>
                <input
                  className="field-input"
                  value={emailDestino}
                  placeholder="ej: orielle.montecinos@hah.gob.cl"
                  onBlur={() => {
                    if (emailDestino.trim()) {
                      const norm = normalizeEmail(emailDestino);
                      setEmailDestino(norm);
                      localStorage.setItem('hah_email_jefatura', norm);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleDespacharEmail('gmail');
                    }
                  }}
                  style={{
                    width: '100%',
                    fontSize: '13px',
                    fontFamily: 'monospace, sans-serif',
                    fontWeight: 600,
                    padding: '9px 14px',
                    background: '#040915',
                    color: '#ffffff',
                    border: '1px solid #1e3a5f',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                  onChange={(e) => {
                    setEmailDestino(e.target.value);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => handleDespacharEmail('gmail')}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#041624',
                  border: '2px solid #00d4ff',
                  color: '#00d4ff',
                  borderRadius: '10px',
                  boxShadow: '0 0 10px rgba(0, 212, 255, 0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#082842';
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 212, 255, 0.45)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#041624';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.25)';
                }}
                title="Abre Gmail Web con asunto, destinatario y reporte oficial cargados"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>Enviar</span>
              </button>
            </div>

            {/* Accesos de formato visual enriquecido y Apps Script */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleDespacharEmail('copy')}
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid #0284c7',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Copia el reporte en HTML enriquecido con tablas y colores para pegar (Ctrl+V) en cualquier correo"
              >
                📋 Copiar Formato Oficial (Ctrl+V)
              </button>
              <button
                type="button"
                onClick={() => handleDespacharEmail('appsscript')}
                disabled={isSendingViaAppsScript}
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid #059669',
                  color: '#34d399',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '5px',
                  cursor: isSendingViaAppsScript ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Envía el correo directamente desde tu cuenta de Google mediante Google Apps Script (HTML completo sin abrir pestañas)"
              >
                🚀 {isSendingViaAppsScript ? 'Enviando...' : 'Enviar directo por Apps Script (HTML)'}
              </button>
            </div>

            {/* Notificación de envío */}
            {emailFeedback && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  background:
                    emailFeedback.type === 'success'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : emailFeedback.type === 'error'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(2, 132, 199, 0.15)',
                  border: `1px solid ${
                    emailFeedback.type === 'success'
                      ? '#10b981'
                      : emailFeedback.type === 'error'
                      ? '#ef4444'
                      : '#0284c7'
                  }`,
                  color:
                    emailFeedback.type === 'success'
                      ? '#a7f3d0'
                      : emailFeedback.type === 'error'
                      ? '#fca5a5'
                      : '#bae6fd',
                }}
              >
                <span>{emailFeedback.message}</span>
                {emailFeedback.externalLink && (
                  <a
                    href={emailFeedback.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#00d4ff',
                      textDecoration: 'underline',
                      fontWeight: 700,
                      fontSize: '11px',
                    }}
                  >
                    ¿No abrió automáticamente? Clic aquí para abrir Gmail ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── BOTONES DE ACCIÓN INFERIORES (DISEÑO OFICIAL) ── */}
          <div
            className="modal-actions"
            style={{
              marginTop: '14px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#1f0a14',
                border: '2px solid #ff2a6d',
                color: '#ff6b8b',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '12px',
                padding: '8px 22px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#2e0f1e';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 42, 109, 0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#1f0a14';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={async () => {
                const isKdx = reporteFam.startsWith('KARDEX_FAMILIAS');
                const famFilter = isKdx && reporteFam.includes(':') ? reporteFam.split(':')[1] : '';
                const fname = isKdx
                  ? (famFilter ? `Resumen_Kardex_Familia_${famFilter}_HAH` : 'Resumen_Kardex_Por_Familias_HAH')
                  : `Reporte_${reporteFam || 'Inventario'}_HAH`;
                const orientation = 'portrait';
                if ((reporteContent || '').includes('<')) {
                  await downloadHtmlAsPDF(reporteContent, fname, orientation);
                } else {
                  const el = document.getElementById('reporteContentBox');
                  if (el) await downloadElementAsPDF(el, fname, orientation);
                }
              }}
              style={{
                background: '#1d1304',
                border: '2px solid #f59e0b',
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '12px',
                padding: '8px 22px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#2e1d06';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#1d1304';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="Descargar reporte oficial en formato PDF institucional"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Descargar PDF (.pdf)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onPrintReporte) {
                  onPrintReporte();
                } else {
                  const isKdx = reporteFam === 'KARDEX_FAMILIAS';
                  const title =
                    isKdx
                      ? 'Resumen Oficial de Kardex por Familias - Hospital Alto Hospicio'
                      : reporteFam === 'TRAZ-EQUIPOS'
                      ? 'Reporte Oficial de Trazabilidad de Equipos - HAH'
                      : reporteFam === 'TRAZ-HERRAMIENTAS'
                      ? 'Reporte Oficial de Trazabilidad de Herramientas - HAH'
                      : reporteFam === 'TRAZ-EQUIPOS-MENORES'
                      ? 'Reporte Oficial de Trazabilidad de Equipos Menores - HAH'
                      : `Reporte Inventario Valorizado (${reporteFam}) - HAH`;
                  const orientation = 'portrait';
                  if (reporteContent.includes('<')) {
                    printDocument({ title, htmlContent: reporteContent, pageOrientation: orientation });
                  } else {
                    printReporteTexto(reporteContent, title);
                  }
                }
              }}
              style={{
                background: '#041c14',
                border: '2px solid #10b981',
                color: '#34d399',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '12px',
                padding: '8px 22px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#072e21';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#041c14';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title="Abre ventana de impresión oficial"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Imprimir Reporte</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL CORRECCIÓN DE STOCK ── */}
      <div className={`modal-overlay ${modalOpen === 'modalCorreccion' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '420px' }}>
          <div className="modal-title">🔧 Corrección de Stock</div>
          {corrProd && (
            <div style={{ background: 'var(--input)', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--cyan)', fontWeight: 700, fontSize: '13px' }}>
                {corrProd.codigo}
              </div>
              <div style={{ color: 'var(--text)', fontSize: '12px' }}>{corrProd.desc}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                Stock actual: <b style={{ color: 'var(--yellow)' }}>{corrProd.stock} uds.</b>
              </div>
            </div>
          )}

          <div className="modal-grid">
            <div className="modal-field">
              <div className="field-label">Stock Correcto (real)</div>
              <input
                className="field-input"
                type="number"
                min="0"
                value={corrNuevoStock}
                onChange={(e) => setCorrNuevoStock(parseInt(e.target.value) || 0)}
                style={{ fontSize: '18px', fontWeight: 700, color: 'var(--cyan)' }}
              />
            </div>
            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Motivo de la corrección *</div>
              <select
                className="field-select"
                value={corrMotivo}
                onChange={(e) => setCorrMotivo(e.target.value)}
              >
                <option value="">-- Seleccionar motivo --</option>
                <option value="Error de digitación">Error de digitación</option>
                <option value="Ajuste por inventario físico">Ajuste por inventario físico</option>
                <option value="Merma / pérdida">Merma / pérdida</option>
                <option value="Devolución no registrada">Devolución no registrada</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Observación (opcional)</div>
              <input
                className="field-input"
                value={corrObs}
                placeholder="Detalle adicional..."
                onChange={(e) => setCorrObs(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              background: '#1a0a00',
              border: '1px solid var(--yellow)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '11px',
              color: 'var(--yellow)',
              marginBottom: '12px',
            }}
          >
            ⚠️ Esta corrección quedará registrada en el Kardex como <b>AJUSTE</b> con el motivo indicado.
          </div>

          <div className="modal-actions">
            <button className="btn btn-red" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn btn-cyan"
              onClick={() => onConfirmarCorreccion(corrNuevoStock, corrMotivo, corrObs)}
            >
              ✅ Aplicar Corrección
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL QR FICHA RÁPIDA ── */}
      <div className={`modal-overlay ${modalOpen === 'modalQR' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '380px' }}>
          <div className="modal-title" style={{ justifyContent: 'space-between' }}>
            <span>📱 Ficha Rápida</span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '18px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {qrProducto && (
            <>
              <div
                style={{
                  background: 'var(--input)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px',
                  borderLeft: '4px solid var(--cyan)',
                }}
              >
                <div style={{ color: 'var(--cyan)', fontWeight: 700, fontSize: '16px' }}>
                  {qrProducto.codigo}
                </div>
                <div style={{ color: 'var(--text)', fontSize: '13px', marginTop: '2px' }}>
                  {qrProducto.desc}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '4px' }}>
                  {qrProducto.familia} · {qrProducto.tipo}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    background: 'var(--panel2)',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color:
                        qrProducto.stock <= 0
                          ? 'var(--red)'
                          : qrProducto.stock <= qrProducto.stockMin
                          ? 'var(--yellow)'
                          : 'var(--green)',
                    }}
                  >
                    {qrProducto.stock}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Stock
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--panel2)',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--muted)' }}>
                    {qrProducto.stockMin}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Mínimo
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--panel2)',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    defaultValue={qrProducto.valor}
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--yellow)',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'center',
                      width: '100%',
                      outline: 'none',
                    }}
                    onBlur={(e) => onQRUpdateValor(parseFloat(e.target.value) || 0)}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    Val. Unit.
                  </div>
                </div>
              </div>

              {/* Acción Rápida Entrada */}
              <div
                style={{
                  background: '#001a0a',
                  border: '1px solid var(--green)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--green)', marginBottom: '6px' }}>
                  ▼ REGISTRAR ENTRADA
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    value={qrCantEnt}
                    onChange={(e) => setQrCantEnt(parseInt(e.target.value) || 1)}
                    style={{
                      width: '80px',
                      fontSize: '18px',
                      fontWeight: 700,
                      textAlign: 'center',
                      background: 'var(--input)',
                      border: '2px solid var(--green)',
                      borderRadius: '8px',
                      color: 'var(--green)',
                      padding: '6px',
                    }}
                  />
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>unidades</span>
                  <button
                    onClick={() => onQREntrada(qrCantEnt)}
                    style={{
                      flex: 1,
                      background: 'var(--green)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#000',
                      fontWeight: 700,
                      fontSize: '14px',
                      padding: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    ✅ Ingresar
                  </button>
                </div>
              </div>

              {/* Acción Rápida Salida */}
              <div
                style={{
                  background: '#1a0008',
                  border: '1px solid var(--red)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--red)', marginBottom: '6px' }}>
                  ▲ REGISTRAR SALIDA
                </div>
                <input
                  className="field-input"
                  value={qrSvcSal}
                  placeholder="Servicio destino..."
                  style={{ width: '100%', marginBottom: '6px', fontSize: '12px' }}
                  onChange={(e) => setQrSvcSal(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    value={qrCantSal}
                    onChange={(e) => setQrCantSal(parseInt(e.target.value) || 1)}
                    style={{
                      width: '80px',
                      fontSize: '18px',
                      fontWeight: 700,
                      textAlign: 'center',
                      background: 'var(--input)',
                      border: '2px solid var(--red)',
                      borderRadius: '8px',
                      color: 'var(--red)',
                      padding: '6px',
                    }}
                  />
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>unidades</span>
                  <button
                    onClick={() => onQRSalida(qrCantSal, qrSvcSal)}
                    style={{
                      flex: 1,
                      background: 'var(--red)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '14px',
                      padding: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    📤 Despachar
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() =>
                    onPrintEtiquetaSeparada
                      ? onPrintEtiquetaSeparada(qrProducto, 'barra')
                      : onPrintQREtiqueta()
                  }
                  style={{
                    background: '#081c16',
                    border: '1.5px solid #10b981',
                    borderRadius: '8px',
                    color: '#34d399',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '8px 4px',
                    cursor: 'pointer',
                  }}
                  title="Imprimir Etiqueta Termoadhesiva de Código de Barras 50x25 mm"
                >
                  🏷️ Barra (50x25)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onPrintEtiquetaSeparada
                      ? onPrintEtiquetaSeparada(qrProducto, 'qr')
                      : onPrintQREtiqueta()
                  }
                  style={{
                    background: '#092540',
                    border: '1.5px solid #0284c7',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '8px 4px',
                    cursor: 'pointer',
                  }}
                  title="Imprimir Etiqueta Termoadhesiva de Código QR 50x25 mm"
                >
                  📱 QR (50x25)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onPrintEtiquetaSeparada
                      ? onPrintEtiquetaSeparada(qrProducto, 'caja')
                      : onPrintQREtiqueta()
                  }
                  style={{
                    background: '#1a1005',
                    border: '1.5px solid #d97706',
                    borderRadius: '8px',
                    color: '#fbbf24',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '8px 4px',
                    cursor: 'pointer',
                  }}
                  title="Imprimir Etiqueta Institucional para Cajas de Productos (PDF)"
                >
                  📦 Caja (PDF)
                </button>
              </div>
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={onOpenCorreccionFromQR}
                  style={{
                    width: '100%',
                    background: '#1a0a00',
                    border: '1px solid var(--yellow)',
                    borderRadius: '8px',
                    color: 'var(--yellow)',
                    fontSize: '12px',
                    padding: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  🔧 Corregir Stock en Kardex
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MODAL LECTOR QR ── */}
      <div className={`modal-overlay ${modalOpen === 'modalLectorQR' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '420px', textAlign: 'center' }}>
          <div className="modal-title" style={{ justifyContent: 'center' }}>
            📷 Lector QR — Cámara
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
            Apunta la cámara al código QR del producto o ingresa el código manual:
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: '10px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                className="field-input"
                value={qrManualInput}
                placeholder="Código del producto (ej. ALI-01)"
                style={{ flex: 1, fontSize: '13px' }}
                onChange={(e) => setQrManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onCodigoDetectado(qrManualInput);
                    setQrManualInput('');
                  }
                }}
              />
              <button
                className="btn btn-cyan"
                onClick={() => {
                  onCodigoDetectado(qrManualInput);
                  setQrManualInput('');
                }}
              >
                Buscar
              </button>
            </div>
          </div>

          <div className="modal-actions" style={{ justifyContent: 'center' }}>
            <button className="btn btn-red" onClick={onClose}>
              ⏹ Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL CONFIRMACIÓN ── */}
      <div className={`modal-overlay ${modalOpen === 'modalConfirm' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '380px', textAlign: 'center' }}>
          <div style={{ fontSize: '38px', marginBottom: '6px' }}>
            {confirmData?.icono || '⚠️'}
          </div>
          <div className="modal-title" style={{ justifyContent: 'center' }}>
            {confirmData?.titulo || 'Confirmar acción'}
          </div>
          <div
            style={{ fontSize: '12px', color: 'var(--text)', margin: '10px 0 18px', lineHeight: 1.5 }}
            dangerouslySetInnerHTML={{ __html: confirmData?.mensaje || '' }}
          ></div>
          <div className="modal-actions" style={{ justifyContent: 'center' }}>
            <button
              className={`btn ${confirmData?.colorOk || 'btn-red'}`}
              onClick={() => {
                confirmData?.onOk();
                onClose();
              }}
            >
              ✅ {confirmData?.textoOk || 'Confirmar'}
            </button>
            <button className="btn" onClick={onClose} style={{ background: 'var(--input)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL EDITAR KARDEX ── */}
      <div className={`modal-overlay ${modalOpen === 'modalEditKardex' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '480px' }}>
          <div className="modal-title">✏️ Corregir Registro Kardex</div>
          {editKardexData && (
            <div className="modal-grid">
              <div className="modal-field">
                <div className="field-label">Tipo Movimiento</div>
                <select
                  className="field-select"
                  value={editKardexData.tipo}
                  onChange={(e) =>
                    setEditKardexData((prev: any) => ({ ...prev, tipo: e.target.value }))
                  }
                >
                  <option value="ENTRADA">▼ ENTRADA</option>
                  <option value="SALIDA">▲ SALIDA</option>
                </select>
              </div>
              <div className="modal-field">
                <div className="field-label">Código Producto</div>
                <input className="field-input" value={editKardexData.codigo} readOnly style={{ opacity: 0.6 }} />
              </div>
              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <div className="field-label">Descripción Producto</div>
                <input
                  className="field-input"
                  value={editKardexData.producto}
                  onChange={(e) =>
                    setEditKardexData((prev: any) => ({ ...prev, producto: e.target.value }))
                  }
                />
              </div>
              <div className="modal-field">
                <div className="field-label">⚡ Cantidad (unidades)</div>
                <input
                  className="field-input"
                  type="number"
                  min="0"
                  value={editKardexData.cantidad}
                  style={{ borderColor: 'var(--cyan)', fontSize: '15px', fontWeight: 700, color: 'var(--cyan)' }}
                  onChange={(e) =>
                    setEditKardexData((prev: any) => ({
                      ...prev,
                      cantidad: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="modal-field">
                <div className="field-label">Guía de Despacho N°</div>
                <input
                  className="field-input"
                  value={editKardexData.guia}
                  onChange={(e) =>
                    setEditKardexData((prev: any) => ({ ...prev, guia: e.target.value }))
                  }
                />
              </div>
              <div className="modal-field">
                <div className="field-label">Factura N°</div>
                <input
                  className="field-input"
                  value={editKardexData.factura}
                  onChange={(e) =>
                    setEditKardexData((prev: any) => ({ ...prev, factura: e.target.value }))
                  }
                />
              </div>
              <div className="modal-field">
                <div className="field-label">Orden de Compra N°</div>
                <input
                  className="field-input"
                  value={editKardexData.oc}
                  onChange={(e) =>
                    setEditKardexData((prev: any) => ({ ...prev, oc: e.target.value }))
                  }
                />
              </div>
              <div className="modal-field" style={{ gridColumn: 'span 2' }}>
                <div className="field-label">📎 Documento de Respaldo Vinculado</div>
                {editKardexData.adjunto ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(20, 184, 166, 0.12)',
                      border: '1px solid #14b8a6',
                      borderRadius: '6px',
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '16px' }}>📄</span>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#2dd4bf',
                          fontWeight: 700,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '260px',
                        }}
                        title={editKardexData.adjunto.nombre}
                      >
                        {editKardexData.adjunto.nombre}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ background: 'var(--input)', border: '1px solid var(--border)', fontSize: '11px', padding: '3px 8px' }}
                        onClick={async () => {
                          const file = await pickDesktopFile('.pdf,image/*');
                          if (file) {
                            setEditKardexData((prev: any) => ({
                              ...prev,
                              adjunto: file,
                              adjuntos: [file],
                            }));
                          }
                        }}
                      >
                        🔄 Cambiar
                      </button>
                      <button
                        type="button"
                        className="btn btn-red btn-sm"
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                        onClick={() =>
                          setEditKardexData((prev: any) => ({
                            ...prev,
                            adjunto: null,
                            adjuntos: [],
                          }))
                        }
                      >
                        ❌ Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      background: '#00220f',
                      border: '1px solid var(--green)',
                      color: 'var(--green)',
                      width: '100%',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: 600,
                    }}
                    onClick={async () => {
                      const file = await pickDesktopFile('.pdf,image/*');
                      if (file) {
                        setEditKardexData((prev: any) => ({
                          ...prev,
                          adjunto: file,
                          adjuntos: [file],
                        }));
                      }
                    }}
                  >
                    📎 Vincular Documento Digital (PDF / Imagen) desde tu Equipo
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn btn-red" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-green" onClick={onGuardarEditKardex}>
              💾 Guardar y Ajustar Stock
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL DESPACHO SIN COSTO ── */}
      <div className={`modal-overlay ${modalOpen === 'modalDespachoSC' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '420px' }}>
          <div className="modal-title">📤 Despachar Insumo · TRANSITO DESPACHO</div>
          {despachoSCItem && (
            <div style={{ background: 'var(--input)', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '12px' }}>
              <div style={{ color: 'var(--yellow)', fontWeight: 700 }}>{despachoSCItem.codigo}</div>
              <div style={{ color: 'var(--text)' }}>{despachoSCItem.desc}</div>
            </div>
          )}
          <div className="modal-grid">
            <div className="modal-field">
              <div className="field-label">Cantidad a Despachar</div>
              <input
                className="field-input"
                type="number"
                min="1"
                value={dscCant}
                onChange={(e) => setDscCant(parseInt(e.target.value) || 1)}
                style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cyan)' }}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Servicio Destino</div>
              <input
                className="field-input"
                value={dscSvc}
                placeholder="Ej: UCI, Pediatría..."
                onChange={(e) => setDscSvc(e.target.value)}
              />
            </div>
            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Responsable que Recibe</div>
              <input
                className="field-input"
                value={dscResp}
                placeholder="Nombre completo del receptor"
                onChange={(e) => setDscResp(e.target.value)}
              />
            </div>
            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Observación (opcional)</div>
              <input
                className="field-input"
                value={dscObs}
                placeholder="Detalle adicional..."
                onChange={(e) => setDscObs(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn btn-red" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn btn-cyan"
              onClick={() => onConfirmarDespachoSC(dscCant, dscSvc, dscResp, dscObs)}
            >
              ✅ Confirmar Despacho
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL DESPACHO TRAZABILIDAD (EQUIPOS, HERRAMIENTAS, EQUIPOS MENORES) ── */}
      <div className={`modal-overlay ${modalOpen === 'modalDespachoTraz' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '480px' }}>
          <div className="modal-title">
            📤 Entrega y Despacho Oficial ·{' '}
            {despachoTrazItem?.modulo === 'equipos'
              ? 'Equipo Médico'
              : despachoTrazItem?.modulo === 'herramientas'
              ? 'Herramienta'
              : 'Equipo Menor'}
          </div>

          {despachoTrazItem && (
            <div style={{ background: 'var(--input)', borderRadius: '8px', padding: '12px', marginBottom: '14px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ color: 'var(--yellow)', fontWeight: 700, fontFamily: 'monospace', fontSize: '13px' }}>
                  {despachoTrazItem.codigo}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    background: '#092548',
                    border: '1px solid #194a85',
                    color: '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 600,
                  }}
                >
                  Disponible en Bodega: {despachoTrazItem.saldo} ud(s).
                </span>
              </div>
              <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '13px' }}>
                {despachoTrazItem.nombre}
              </div>
              {despachoTrazItem.item?.marca && (
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  Marca: {despachoTrazItem.item.marca} · Modelo: {despachoTrazItem.item.modelo || '—'}
                  {despachoTrazItem.item.nSerie || despachoTrazItem.item.serie ? ` · Serie: ${despachoTrazItem.item.nSerie || despachoTrazItem.item.serie}` : ''}
                </div>
              )}
            </div>
          )}

          <div className="modal-grid">
            <div className="modal-field">
              <div className="field-label">Cantidad a Entregar</div>
              <input
                className="field-input"
                type="number"
                min="1"
                max={despachoTrazItem?.saldo || 1}
                value={dscCant}
                onChange={(e) => setDscCant(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ fontSize: '16px', fontWeight: 700, color: 'var(--cyan)' }}
              />
            </div>

            <div className="modal-field">
              <div className="field-label">Servicio / Unidad Receptora</div>
              <input
                className="field-input"
                list="listaServiciosHosp"
                value={dscSvc}
                placeholder="Seleccionar o escribir unidad..."
                onChange={(e) => setDscSvc(e.target.value)}
              />
              <datalist id="listaServiciosHosp">
                {HOSPITAL_SERVICIOS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Funcionario que Recibe (Nombre y RUT)</div>
              <input
                className="field-input"
                value={dscResp}
                placeholder="Nombre del funcionario receptor"
                onChange={(e) => setDscResp(e.target.value)}
              />
            </div>

            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Nota / Observación para el Acta Oficial</div>
              <input
                className="field-input"
                value={dscObs}
                placeholder="Ej: ENTREGADOS CONFORMES PARA OPERACIÓN EN SERVICIO CLÍNICO"
                onChange={(e) => setDscObs(e.target.value)}
              />
              <span style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px', display: 'block' }}>
                ⚡ Se generará automáticamente el Acta Oficial de Egreso con la plantilla institucional lista para imprimir o descargar en PDF.
              </span>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button className="btn btn-red" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="btn btn-cyan"
              style={{ fontWeight: 700 }}
              onClick={() => {
                if (onConfirmarDespachoTraz) {
                  onConfirmarDespachoTraz(dscCant, dscSvc, dscResp, dscObs);
                }
              }}
            >
              📋 Confirmar y Generar Acta Oficial
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL DETALLE ACTA ── */}
      <div className={`modal-overlay ${modalOpen === 'modalDetalleActa' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '860px', maxWidth: '96vw' }}>
          <div className="modal-title">📋 Detalle Oficial – . Acta de Egreso y Despacho</div>
          {detalleActa && (
            <>
              <div style={{ marginBottom: '10px', background: 'var(--panel2)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--cyan)', fontWeight: 700 }}>
                    ✏️ NOTA / ANOTACIONES SEGÚN ENTREGA:
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                    Puedes editar la nota y guardarla para proyectarla en el documento oficial
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="field-input"
                    style={{ flex: 1, fontSize: '12px' }}
                    value={editDetalleNota}
                    placeholder="Ej: ENTREGADOS : CORREO , ALIMENTACION / Escribir anotaciones según entrega..."
                    onChange={(e) => setEditDetalleNota(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (detalleActa) {
                          detalleActa.nota = editDetalleNota;
                          if (onUpdateNotaActa) {
                            onUpdateNotaActa(detalleActa.id, editDetalleNota);
                          }
                          setNotaSavedFeedback(true);
                          setTimeout(() => setNotaSavedFeedback(false), 2200);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-green btn-sm"
                    style={{
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: notaSavedFeedback ? '#15803d' : undefined,
                      borderColor: notaSavedFeedback ? '#22c55e' : undefined,
                    }}
                    onClick={() => {
                      if (detalleActa) {
                        detalleActa.nota = editDetalleNota;
                        if (onUpdateNotaActa) {
                          onUpdateNotaActa(detalleActa.id, editDetalleNota);
                        }
                        setNotaSavedFeedback(true);
                        setTimeout(() => setNotaSavedFeedback(false), 2200);
                      }
                    }}
                    title="Guardar anotación actualizada en el acta"
                  >
                    {notaSavedFeedback ? '✅ Guardado' : '💾 Guardar Nota'}
                  </button>
                </div>
              </div>

              <div
                id="detalleActaSheet"
                style={{
                  maxHeight: '66vh',
                  overflowY: 'auto',
                  background: '#ffffff',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  color: '#000000',
                }}
                dangerouslySetInnerHTML={{
                  __html: buildActaDespachoTemplate({ ...detalleActa, nota: editDetalleNota || detalleActa.nota }),
                }}
              />
            </>
          )}
          <div className="modal-actions" style={{ marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-red" onClick={onClose}>
              Cerrar
            </button>
            <button
              className="btn btn-yellow"
              style={{ background: '#1a1005', border: '1px solid #d97706', color: '#fbbf24' }}
              onClick={async () => {
                if (detalleActa) {
                  const actaActualizada = { ...detalleActa, nota: editDetalleNota || detalleActa.nota };
                  const html = buildActaDespachoTemplate(actaActualizada);
                  await downloadHtmlAsPDF(html, `Acta_${detalleActa.id || 'HAH'}`, 'portrait');
                }
              }}
              title="Descargar acta oficial en formato PDF institucional"
            >
              📥 Descargar PDF (.pdf)
            </button>
            <button
              className="btn btn-cyan"
              onClick={() => {
                if (detalleActa) {
                  const actaActualizada = { ...detalleActa, nota: editDetalleNota || detalleActa.nota };
                  printActaSalidaDocument(actaActualizada, `Acta ${detalleActa.id} - Hospital Alto Hospicio`);
                } else if (onImprimirDetalleActa) {
                  onImprimirDetalleActa();
                }
              }}
              title="Abre ventana oficial para imprimir"
            >
              🖨️ Imprimir Acta
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL TRAZABILIDAD EQUIPO ── */}
      <div className={`modal-overlay ${modalOpen === 'modalTrazabilidad' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '560px' }}>
          <div className="modal-title">🔧 Registro de Equipo en Préstamo</div>
          <div
            style={{
              background: '#001a2a',
              border: '1px solid var(--cyan)',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '12px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--cyan)', fontWeight: 700, marginBottom: '4px' }}>
              📋 Pegar datos desde la plantilla (Word o Excel)
            </div>
            <textarea
              value={trzPegado}
              placeholder="Pega aquí el texto completo de la plantilla..."
              style={{
                width: '100%',
                minHeight: '60px',
                background: 'var(--input)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                color: 'var(--text)',
                fontSize: '11px',
                padding: '6px',
              }}
              onChange={(e) => setTrzPegado(e.target.value)}
            />
            <button className="btn btn-cyan btn-sm" style={{ width: '100%', marginTop: '6px' }} onClick={parseTrazabilidadText}>
              🔎 Autocompletar campos
            </button>
          </div>

          <div className="modal-grid">
            <div className="modal-field">
              <div className="field-label">Fecha</div>
              <input
                className="field-input"
                type="date"
                value={trazData.fecha || ''}
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, fecha: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">N° Guía de Despacho</div>
              <input
                className="field-input"
                value={trazData.guia || ''}
                placeholder="Ej. GD-10293"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, guia: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">N° Factura</div>
              <input
                className="field-input"
                value={trazData.factura || ''}
                placeholder="Ej. FAC-4819"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, factura: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">N° Orden de Compra (OC)</div>
              <input
                className="field-input"
                value={trazData.oc || ''}
                placeholder="Ej. OC-2024-912"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, oc: e.target.value }))}
              />
            </div>

            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Nombre del Equipo *</div>
              <input
                className="field-input"
                value={trazData.nombreEquipo || ''}
                placeholder="Ej. Monitor Multiparámetro / Cama Clínica"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, nombreEquipo: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Marca</div>
              <input
                className="field-input"
                value={trazData.marca || ''}
                placeholder="Ej. Mindray / Philips"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, marca: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Modelo</div>
              <input
                className="field-input"
                value={trazData.modelo || ''}
                placeholder="Ej. ePM 12M"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, modelo: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">N° Serie (S/N)</div>
              <input
                className="field-input"
                value={trazData.nSerie || ''}
                placeholder="Ej. SN-891024"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, nSerie: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Cantidad</div>
              <input
                className="field-input"
                type="number"
                min="1"
                value={trazData.cantidad ?? 1}
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Institución / Proveedor Emisor (ej. GHC Global Health Care SpA)</div>
              <input
                className="field-input"
                value={trazData.institucionExterna || ''}
                placeholder="Ej. GHC Global Health Care SpA"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, institucionExterna: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Serv. Clínico HAH Destino</div>
              <input
                className="field-input"
                value={trazData.servClinico || ''}
                placeholder="Ej. UPC / Pabellón / Urgencia"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, servClinico: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Quién Recibe / Responsable</div>
              <input
                className="field-input"
                value={trazData.quienRecibe || ''}
                placeholder="Ej. Arturo Gómez E."
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, quienRecibe: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Finalidad / Motivo Traslado</div>
              <input
                className="field-input"
                value={trazData.finalidad || ''}
                placeholder="Ej. Comodato / Préstamo / Venta"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, finalidad: e.target.value }))}
              />
            </div>
            <div className="modal-field">
              <div className="field-label">Estado (Ingreso / Retiro)</div>
              <input
                className="field-input"
                value={trazData.ingresoRetiro || 'Ingreso'}
                placeholder="Ingreso / Retiro / En Préstamo"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, ingresoRetiro: e.target.value }))}
              />
            </div>
            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Accesorios Incluidos</div>
              <input
                className="field-input"
                value={trazData.accesorios || ''}
                placeholder="Ej. Cable ECG, Sensor SpO2, Manguito PNI"
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, accesorios: e.target.value }))}
              />
            </div>
            <div className="modal-field" style={{ gridColumn: 'span 2' }}>
              <div className="field-label">Observaciones y Notas Adicionales</div>
              <input
                className="field-input"
                value={trazData.observaciones || ''}
                placeholder="Ej. Equipo nuevo según Guía de Despacho..."
                onChange={(e) => setTrazData((prev: any) => ({ ...prev, observaciones: e.target.value }))}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn btn-red" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-green" onClick={onGuardarTrazabilidad}>
              💾 Guardar
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL HERRAMIENTA ── */}
      <div className={`modal-overlay ${modalOpen === 'modalHerramienta' ? 'open' : ''}`}>
        <div
          className="modal"
          style={{
            width: '540px',
            maxWidth: '95vw',
            background: '#0e1832',
            border: '1.5px solid #1c2b50',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#00e5ff',
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '20px' }}>🧰</span>
            <span>Registro de Herramienta</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                FECHA
              </label>
              <input
                className="field-input"
                type="date"
                value={toInputDate(herData.fecha)}
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setHerData((prev: any) => ({ ...prev, fecha: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                DESCRIPCIÓN
              </label>
              <input
                className="field-input"
                value={herData.descripcion || ''}
                placeholder="Ej. Taladro Bosch"
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setHerData((prev: any) => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                CANTIDAD
              </label>
              <input
                className="field-input"
                type="number"
                min="1"
                value={herData.cantidad !== undefined ? herData.cantidad : 1}
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setHerData((prev: any) => ({ ...prev, cantidad: parseFloat(e.target.value) || 1 }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                VALOR UNITARIO ($)
              </label>
              <input
                className="field-input"
                type="number"
                min="0"
                value={herData.valorUnitario !== undefined ? herData.valorUnitario : 0}
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setHerData((prev: any) => ({ ...prev, valorUnitario: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                SERVICIO DESTINO
              </label>
              <input
                className="field-input"
                value={herData.servicioDestino || ''}
                placeholder="Ej. Mantención"
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setHerData((prev: any) => ({ ...prev, servicioDestino: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                PERSONA QUE RECIBE
              </label>
              <input
                className="field-input"
                value={herData.personaRecibe || ''}
                placeholder="Nombre completo"
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setHerData((prev: any) => ({ ...prev, personaRecibe: e.target.value }))}
              />
            </div>
          </div>

          {/* Documento adjunto desde escritorio */}
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: '#09152b',
              border: '1px dashed #1e3a6a',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>📎</span>
              {herData.adjunto ? (
                <div>
                  <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                    {herData.adjunto.nombre}
                  </span>
                  <span style={{ fontSize: '10px', color: '#7a92b8', marginLeft: '6px' }}>
                    (Documento adjunto)
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: '#7a92b8' }}>
                  Sin documento adjunto
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={async () => {
                  const file = await pickDesktopFile('.pdf,image/*');
                  if (file) {
                    setHerData((prev: any) => ({ ...prev, adjunto: file }));
                  }
                }}
                style={{
                  background: '#0a274a',
                  border: '1px solid #0284c7',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {herData.adjunto ? '🔄 Cambiar' : '📎 Adjuntar desde Escritorio'}
              </button>
              {herData.adjunto && (
                <button
                  type="button"
                  onClick={() => setHerData((prev: any) => ({ ...prev, adjunto: null }))}
                  style={{
                    background: '#220b15',
                    border: '1px solid #be123c',
                    color: '#f43f5e',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Quitar documento"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#160b18',
                border: '1.5px solid #e11d48',
                color: '#fb7185',
                borderRadius: '8px',
                padding: '8px 22px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onGuardarHerramienta}
              style={{
                background: '#081a17',
                border: '1.5px solid #10b981',
                color: '#34d399',
                borderRadius: '8px',
                padding: '8px 22px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              💾 Guardar
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL EQUIPO MENOR (IDÉNTICO A HERRAMIENTAS SEGÚN IMAGEN) ── */}
      <div className={`modal-overlay ${modalOpen === 'modalEquipoMenor' ? 'open' : ''}`}>
        <div
          className="modal"
          style={{
            width: '540px',
            maxWidth: '95vw',
            background: '#0e1832',
            border: '1.5px solid #1c2b50',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#00e5ff',
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '20px' }}>🧰</span>
            <span>Registro de Equipo Menor</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                FECHA
              </label>
              <input
                className="field-input"
                type="date"
                value={toInputDate(eqmData.fecha)}
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setEqmData((prev: any) => ({ ...prev, fecha: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                DESCRIPCIÓN
              </label>
              <input
                className="field-input"
                value={eqmData.nombreEquipo || (eqmData as any).descripcion || ''}
                placeholder="Ej. Taladro Bosch"
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) =>
                  setEqmData((prev: any) => ({
                    ...prev,
                    nombreEquipo: e.target.value,
                    descripcion: e.target.value,
                  }))
                }
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                CANTIDAD
              </label>
              <input
                className="field-input"
                type="number"
                min="1"
                value={eqmData.cantidad !== undefined ? eqmData.cantidad : 1}
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setEqmData((prev: any) => ({ ...prev, cantidad: parseFloat(e.target.value) || 1 }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                VALOR UNITARIO ($)
              </label>
              <input
                className="field-input"
                type="number"
                min="0"
                value={eqmData.valorUnitario !== undefined ? eqmData.valorUnitario : 0}
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setEqmData((prev: any) => ({ ...prev, valorUnitario: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                SERVICIO DESTINO
              </label>
              <input
                className="field-input"
                value={eqmData.servicioDestino || ''}
                placeholder="Ej. Mantención"
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) => setEqmData((prev: any) => ({ ...prev, servicioDestino: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: '#7a92b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                PERSONA QUE RECIBE
              </label>
              <input
                className="field-input"
                value={eqmData.quienRecibe || (eqmData as any).personaRecibe || ''}
                placeholder="Nombre completo"
                style={{
                  background: '#0a1224',
                  border: '1.5px solid #1c2c50',
                  borderRadius: '8px',
                  color: '#ffffff',
                  padding: '10px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onChange={(e) =>
                  setEqmData((prev: any) => ({
                    ...prev,
                    quienRecibe: e.target.value,
                    personaRecibe: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* Documento adjunto desde escritorio */}
          <div
            style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: '#09152b',
              border: '1px dashed #1e3a6a',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>📎</span>
              {eqmData.adjunto ? (
                <div>
                  <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>
                    {eqmData.adjunto.nombre}
                  </span>
                  <span style={{ fontSize: '10px', color: '#7a92b8', marginLeft: '6px' }}>
                    (Documento adjunto)
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: '#7a92b8' }}>
                  Sin documento adjunto
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={async () => {
                  const file = await pickDesktopFile('.pdf,image/*');
                  if (file) {
                    setEqmData((prev: any) => ({ ...prev, adjunto: file }));
                  }
                }}
                style={{
                  background: '#0a274a',
                  border: '1px solid #0284c7',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {eqmData.adjunto ? '🔄 Cambiar' : '📎 Adjuntar desde Escritorio'}
              </button>
              {eqmData.adjunto && (
                <button
                  type="button"
                  onClick={() => setEqmData((prev: any) => ({ ...prev, adjunto: null }))}
                  style={{
                    background: '#220b15',
                    border: '1px solid #be123c',
                    color: '#f43f5e',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Quitar documento"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#160b18',
                border: '1.5px solid #e11d48',
                color: '#fb7185',
                borderRadius: '8px',
                padding: '8px 22px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onGuardarEquipoMenor}
              style={{
                background: '#081a17',
                border: '1.5px solid #10b981',
                color: '#34d399',
                borderRadius: '8px',
                padding: '8px 22px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              💾 Guardar
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL AYUDA ── */}
      <div className={`modal-overlay ${modalOpen === 'modalAyuda' ? 'open' : ''}`}>
        <div className="modal" style={{ width: '620px' }}>
          <div className="modal-title">❓ Ayuda del Sistema — Bodega HAH</div>
          <div style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--text)' }}>
            <div style={{ background: 'var(--input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
              <div style={{ color: 'var(--cyan)', fontWeight: 700 }}>🔐 Ingresar al sistema</div>
              <div>Entra con tu nombre para registrar los movimientos. La sesión queda guardada.</div>
            </div>
            <div style={{ background: 'var(--input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
              <div style={{ color: 'var(--green)', fontWeight: 700 }}>📷 Registrar entrada o salida</div>
              <div>Con QR o manual, puedes ingresar o despachar insumos con actualización automática de stock.</div>
            </div>
            <div style={{ background: 'var(--input)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ color: 'var(--yellow)', fontWeight: 700 }}>📋 Acta de despacho</div>
              <div>Al generar un despacho se crea automáticamente el acta en formato carta para imprimir o guardar en PDF.</div>
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: '12px' }}>
            <button className="btn btn-cyan" onClick={onClose} style={{ width: '100%' }}>
              Entendido
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
