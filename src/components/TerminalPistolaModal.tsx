import React, { useState, useEffect, useRef } from 'react';
import {
  Producto,
  ItemDespacho,
  ItemIngresoPistola,
  TrazabilidadEquipo,
  Herramienta,
  EquipoMenor,
  SinCostoMovimiento,
} from '../types';
import { playScannerBeep } from '../utils/barcodeHelpers';
import { HOSPITAL_SERVICIOS } from '../data/initialData';
import { fmtMoney, today } from '../utils/format';

declare const jsQR: any;

export type TerminalMode = 'ingreso' | 'despacho' | 'consulta';

export interface TerminalPistolaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: TerminalMode;
  initialCode?: string | null;
  productos: Producto[];
  trazabilidad?: TrazabilidadEquipo[];
  herramientas?: Herramienta[];
  equiposMenores?: EquipoMenor[];
  sinCostoList?: SinCostoMovimiento[];
  onFinalizarDespacho: (
    servicio: string,
    nroSolicitud: string,
    responsable: string,
    items: ItemDespacho[],
    nota?: string
  ) => void;
  onFinalizarIngreso?: (
    docData: {
      guia: string;
      factura: string;
      oc: string;
      proveedor: string;
      fechaIngreso: string;
      observacion?: string;
    },
    items: ItemIngresoPistola[]
  ) => void;
  onTraspasarADashboard?: (items: ItemDespacho[], servicio: string, solicitud: string, responsable: string) => void;
  initialItems?: ItemDespacho[];
  usuario?: string | null;
}

export const TerminalPistolaModal: React.FC<TerminalPistolaModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'despacho',
  initialCode = null,
  productos,
  trazabilidad = [],
  herramientas = [],
  equiposMenores = [],
  sinCostoList = [],
  onFinalizarDespacho,
  onFinalizarIngreso,
  onTraspasarADashboard,
  initialItems = [],
  usuario = '',
}) => {
  // Master Mode: 'ingreso' (Recepción), 'despacho' (Egreso/Acta), 'consulta' (Inspección rápida)
  const [terminalMode, setTerminalMode] = useState<TerminalMode>(initialMode);

  // Scanner Hardware/Input tab
  const [activeDevice, setActiveDevice] = useState<'pistola' | 'camara' | 'manual' | 'simulador'>('pistola');
  const [multiplier, setMultiplier] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // ── DESPACHO STATE ──
  const [scannedDespachoItems, setScannedDespachoItems] = useState<ItemDespacho[]>(initialItems);
  const [servicioDestino, setServicioDestino] = useState<string>('Urgencia');
  const [nroSolicitud, setNroSolicitud] = useState<string>('');
  const [responsableRecep, setResponsableRecep] = useState<string>('');
  const [notaEntrega, setNotaEntrega] = useState<string>('ENTREGADOS : CORREO , URGENCIA');

  // ── INGRESO STATE ──
  const [scannedIngresoItems, setScannedIngresoItems] = useState<ItemIngresoPistola[]>([]);
  const [inGuia, setInGuia] = useState<string>('');
  const [inFactura, setInFactura] = useState<string>('');
  const [inOC, setInOC] = useState<string>('');
  const [inProveedor, setInProveedor] = useState<string>('CENABAST / Droguería');
  const [inFecha, setInFecha] = useState<string>(today());
  const [inObservacion, setInObservacion] = useState<string>('');

  // ── SCANNER FEEDBACK & INPUTS ──
  const [pistolaInput, setPistolaInput] = useState<string>('');
  const [manualSearch, setManualSearch] = useState<string>('');
  const [scanFlash, setScanFlash] = useState<boolean>(false);
  const [lastScanned, setLastScanned] = useState<{
    itemInfo: {
      codigo: string;
      desc: string;
      familia: string;
      stock: number;
      valor: number;
      origen?: string;
      subtext?: string;
    };
    modo: TerminalMode;
    cantidadAgregada: number;
    totalEnLote: number;
    stockRestanteOProyectado: number;
    timestamp: string;
    isError?: boolean;
    errorMsg?: string;
  } | null>(null);

  // Simulator filters
  const [simModuleTab, setSimModuleTab] = useState<'catalogo' | 'equipos' | 'herramientas' | 'equiposmenores'>('catalogo');
  const [filterFamilySim, setFilterFamilySim] = useState<string>('');

  // Camera state
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastCameraReadRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const pistolaInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const lastProcessedInitialCodeRef = useRef<string | null>(null);

  // Sync mode and init when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setTerminalMode(initialMode);
      }
      if (initialItems && initialItems.length > 0) {
        setScannedDespachoItems(initialItems);
      }
      setNroSolicitud(`SI-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`);
      
      if (initialCode && initialCode !== lastProcessedInitialCodeRef.current) {
        lastProcessedInitialCodeRef.current = initialCode;
        setTimeout(() => {
          handleProcessBarcode(initialCode, 'PISTOLA');
        }, 80);
      }
      setTimeout(() => {
        pistolaInputRef.current?.focus();
      }, 150);
    } else {
      lastProcessedInitialCodeRef.current = null;
    }
  }, [isOpen, initialMode, initialCode]);

  // Keep focus on pistola input in 'pistola' mode
  useEffect(() => {
    if (!isOpen || activeDevice !== 'pistola') return;

    const interval = setInterval(() => {
      if (document.activeElement !== pistolaInputRef.current && activeDevice === 'pistola') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'SELECT' && activeTag !== 'TEXTAREA') {
          pistolaInputRef.current?.focus();
        }
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isOpen, activeDevice]);

  // Camera stream management
  useEffect(() => {
    if (isOpen && activeDevice === 'camara') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeDevice]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        scanCameraFrame();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('No se pudo acceder a la cámara. Usa la pistola lectora USB o el simulador.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const scanCameraFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(scanCameraFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (typeof jsQR !== 'undefined') {
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (qrCode && qrCode.data) {
        const rawCode = qrCode.data.trim();
        const now = Date.now();
        if (rawCode !== lastCameraReadRef.current.code || now - lastCameraReadRef.current.time > 1300) {
          lastCameraReadRef.current = { code: rawCode, time: now };
          handleProcessBarcode(rawCode, 'QR');
        }
      }
    }

    animationFrameId.current = requestAnimationFrame(scanCameraFrame);
  };

  // ── CORE MULTI-MODULE BARCODE SEARCH ENGINE ──
  const lookupItemInAllModules = (rawInput: string) => {
    if (!rawInput || !rawInput.trim()) return null;
    let code = rawInput.trim();

    if (code.startsWith('{') && code.endsWith('}')) {
      try {
        const parsed = JSON.parse(code);
        if (parsed.cod) code = parsed.cod.trim();
        else if (parsed.codigo) code = parsed.codigo.trim();
        else if (parsed.sku) code = parsed.sku.trim();
        else if (parsed.sn) code = parsed.sn.trim();
      } catch (e) {}
    }

    const clean = code.toLowerCase();
    const cleanAlnum = clean.replace(/[^a-z0-9]/g, '');

    // 1. Catálogo Activo de Productos (Insumos)
    const prodMatch = productos.find(
      (p) =>
        p.estado === 'Activo' &&
        (p.codigo.toLowerCase() === clean ||
          p.desc.toLowerCase() === clean ||
          String(p.id) === clean ||
          p.codigo.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlnum)
    );
    if (prodMatch) {
      return {
        codigo: prodMatch.codigo,
        desc: prodMatch.desc,
        familia: prodMatch.familia,
        stock: prodMatch.stock,
        valor: prodMatch.valor,
        origen: 'producto' as const,
        id: prodMatch.id,
        subtext: `Insumo Catálogo · Stock: ${prodMatch.stock} uds`,
      };
    }

    // 2. Trazabilidad Equipos Médicos (TRZ-EQ-001, etc.)
    if (Array.isArray(trazabilidad) && trazabilidad.length > 0) {
      const eqMatch = trazabilidad.find(
        (eq) =>
          (eq.codigo && eq.codigo.toLowerCase() === clean) ||
          (eq.nSerie && eq.nSerie.toLowerCase() === clean) ||
          (eq.guia && eq.guia.toLowerCase() === clean) ||
          (eq.id && eq.id.toLowerCase() === clean) ||
          (eq.codigo && eq.codigo.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlnum) ||
          (eq.nombreEquipo && eq.nombreEquipo.toLowerCase() === clean)
      );
      if (eqMatch) {
        const marcaPart = eqMatch.marca && eqMatch.marca !== '—' ? ` · ${eqMatch.marca}` : '';
        const snPart = eqMatch.nSerie && eqMatch.nSerie !== '—' ? ` (S/N: ${eqMatch.nSerie})` : '';
        return {
          codigo: eqMatch.codigo || code,
          desc: `${eqMatch.nombreEquipo}${marcaPart}${snPart}`,
          familia: 'EQM',
          stock: eqMatch.cantidad && eqMatch.cantidad > 0 ? eqMatch.cantidad : 1,
          valor: eqMatch.valorUnitario || 0,
          origen: 'equipos' as const,
          id: eqMatch.id,
          subtext: `Trazabilidad Equipos · ${eqMatch.servClinico || 'Bodega'} · ${eqMatch.ingresoRetiro || 'Activo'}`,
        };
      }
    }

    // 3. Herramientas (TRZ-HER-001, etc.)
    if (Array.isArray(herramientas) && herramientas.length > 0) {
      const herMatch = herramientas.find(
        (her) =>
          (her.codigo && her.codigo.toLowerCase() === clean) ||
          (her.descripcion && her.descripcion.toLowerCase() === clean) ||
          (her.id && her.id.toLowerCase() === clean) ||
          (her.codigo && her.codigo.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlnum)
      );
      if (herMatch) {
        return {
          codigo: herMatch.codigo || code,
          desc: herMatch.descripcion,
          familia: 'HER',
          stock: herMatch.cantidad && herMatch.cantidad > 0 ? herMatch.cantidad : 1,
          valor: herMatch.valorUnitario || 0,
          origen: 'herramientas' as const,
          id: herMatch.id,
          subtext: `Trazabilidad Herramienta · Destino: ${herMatch.servicioDestino || 'Mantención'}`,
        };
      }
    }

    // 4. Equipos Menores (TRZ-EQM-001, etc.)
    if (Array.isArray(equiposMenores) && equiposMenores.length > 0) {
      const eqmMatch = equiposMenores.find(
        (eqm) =>
          (eqm.codigo && eqm.codigo.toLowerCase() === clean) ||
          (eqm.nombreEquipo && eqm.nombreEquipo.toLowerCase() === clean) ||
          (eqm.serie && eqm.serie.toLowerCase() === clean) ||
          (eqm.id && eqm.id.toLowerCase() === clean) ||
          (eqm.codigo && eqm.codigo.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlnum)
      );
      if (eqmMatch) {
        const marcaPart = eqmMatch.marca && eqmMatch.marca !== '—' ? ` · ${eqmMatch.marca}` : '';
        const snPart = eqmMatch.serie && eqmMatch.serie !== '—' ? ` (S/N: ${eqmMatch.serie})` : '';
        return {
          codigo: eqmMatch.codigo || code,
          desc: `${eqmMatch.nombreEquipo}${marcaPart}${snPart}`,
          familia: 'EQM',
          stock: eqmMatch.cantidad && eqmMatch.cantidad > 0 ? eqmMatch.cantidad : 1,
          valor: eqmMatch.valorUnitario || 0,
          origen: 'equiposmenores' as const,
          id: eqmMatch.id,
          subtext: `Trazabilidad Equipo Menor · ${eqmMatch.servicioDestino || 'UCI'}`,
        };
      }
    }

    // 5. Cargas Sin Costo (SC-...)
    if (Array.isArray(sinCostoList) && sinCostoList.length > 0) {
      const scMatch = sinCostoList.find(
        (sc) =>
          (sc.codigo && sc.codigo.toLowerCase() === clean) ||
          (sc.desc && sc.desc.toLowerCase() === clean) ||
          (sc.id && sc.id.toLowerCase() === clean)
      );
      if (scMatch) {
        return {
          codigo: scMatch.codigo,
          desc: scMatch.desc,
          familia: scMatch.familia || 'BOT',
          stock: scMatch.cantidad && scMatch.cantidad > 0 ? scMatch.cantidad : 1,
          valor: 0,
          origen: 'sincosto' as const,
          id: scMatch.id,
          subtext: `Tránsito Despacho Sin Costo · ${scMatch.guia || 'Sin Guía'}`,
        };
      }
    }

    return null;
  };

  // ── SCAN PROCESSING DISPATCHER ──
  const handleProcessBarcode = (rawInput: string, source: 'PISTOLA' | 'QR' | 'MANUAL' | 'SIMULADOR') => {
    if (!rawInput || !rawInput.trim()) return;
    const cleanCode = rawInput.trim();
    const foundItem = lookupItemInAllModules(cleanCode);

    if (!foundItem) {
      if (soundEnabled) playScannerBeep(false);
      setLastScanned({
        itemInfo: {
          codigo: cleanCode,
          desc: 'Código no identificado',
          familia: '—',
          stock: 0,
          valor: 0,
        },
        modo: terminalMode,
        cantidadAgregada: 0,
        totalEnLote: 0,
        stockRestanteOProyectado: 0,
        timestamp: new Date().toLocaleTimeString('es-CL'),
        isError: true,
        errorMsg: `⛔ Código "${cleanCode}" no registrado en el inventario activo del HAH.`,
      });
      return;
    }

    // Trigger visual flash
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 220);

    const qtyToAdd = Math.max(1, multiplier);

    if (terminalMode === 'ingreso') {
      // ── MODO INGRESO: AÑADIR A LOTE DE RECEPCIÓN ──
      let totalEnLote = qtyToAdd;
      let nuevoStockProyectado = foundItem.stock + qtyToAdd;

      setScannedIngresoItems((prev) => {
        const exists = prev.find(
          (it) => it.codigo.toLowerCase() === foundItem.codigo.toLowerCase() && it.origenModulo === foundItem.origen
        );
        if (exists) {
          totalEnLote = exists.cantidad + qtyToAdd;
          nuevoStockProyectado = foundItem.stock + totalEnLote;
          return prev.map((it) =>
            it.codigo.toLowerCase() === foundItem.codigo.toLowerCase() && it.origenModulo === foundItem.origen
              ? { ...it, cantidad: it.cantidad + qtyToAdd }
              : it
          );
        } else {
          return [
            ...prev,
            {
              id: Date.now() + Math.random(),
              codigo: foundItem.codigo,
              desc: foundItem.desc,
              familia: foundItem.familia,
              cantidad: qtyToAdd,
              stockActual: foundItem.stock,
              valorUnitario: foundItem.valor,
              origenModulo: foundItem.origen,
              itemId: String(foundItem.id),
            },
          ];
        }
      });

      if (soundEnabled) playScannerBeep(true);

      setLastScanned({
        itemInfo: foundItem,
        modo: 'ingreso',
        cantidadAgregada: qtyToAdd,
        totalEnLote,
        stockRestanteOProyectado: nuevoStockProyectado,
        timestamp: new Date().toLocaleTimeString('es-CL'),
        isError: false,
      });
    } else if (terminalMode === 'despacho') {
      // ── MODO DESPACHO: AÑADIR A LOTE DE EGRESO / ACTA ──
      const existingInBatch = scannedDespachoItems.find(
        (it) => it.codigo.toLowerCase() === foundItem.codigo.toLowerCase() && it.origenModulo === foundItem.origen
      );
      const currentEnDespacho = existingInBatch ? existingInBatch.cantidad : 0;
      const targetQty = currentEnDespacho + qtyToAdd;

      if (foundItem.origen === 'producto' && targetQty > foundItem.stock) {
        if (soundEnabled) playScannerBeep(false);
        setLastScanned({
          itemInfo: foundItem,
          modo: 'despacho',
          cantidadAgregada: 0,
          totalEnDespacho: currentEnDespacho,
          stockRestante: foundItem.stock - currentEnDespacho,
          timestamp: new Date().toLocaleTimeString('es-CL'),
          isError: true,
          errorMsg: `⚠️ Stock insuficiente. Disponible en Bodega: ${foundItem.stock} uds. (Ya tienes ${currentEnDespacho} en el lote).`,
        } as any);
        return;
      }

      setScannedDespachoItems((prev) => {
        const exists = prev.find(
          (it) => it.codigo.toLowerCase() === foundItem.codigo.toLowerCase() && it.origenModulo === foundItem.origen
        );
        if (exists) {
          return prev.map((it) =>
            it.codigo.toLowerCase() === foundItem.codigo.toLowerCase() && it.origenModulo === foundItem.origen
              ? { ...it, cantidad: it.cantidad + qtyToAdd }
              : it
          );
        } else {
          return [
            ...prev,
            {
              id: Date.now() + Math.random(),
              codigo: foundItem.codigo,
              desc: foundItem.desc,
              familia: foundItem.familia,
              cantidad: qtyToAdd,
              maxStock: foundItem.stock,
              origenModulo: foundItem.origen,
              itemId: String(foundItem.id),
              valorUnitario: foundItem.valor,
            },
          ];
        }
      });

      if (soundEnabled) playScannerBeep(true);

      setLastScanned({
        itemInfo: foundItem,
        modo: 'despacho',
        cantidadAgregada: qtyToAdd,
        totalEnLote: targetQty,
        stockRestanteOProyectado: Math.max(0, foundItem.stock - targetQty),
        timestamp: new Date().toLocaleTimeString('es-CL'),
        isError: false,
      });
    } else {
      // ── MODO CONSULTA: INSPECCIÓN RÁPIDA ──
      if (soundEnabled) playScannerBeep(true);
      setLastScanned({
        itemInfo: foundItem,
        modo: 'consulta',
        cantidadAgregada: 0,
        totalEnLote: 0,
        stockRestanteOProyectado: foundItem.stock,
        timestamp: new Date().toLocaleTimeString('es-CL'),
        isError: false,
      });
    }

    setPistolaInput('');
    setManualSearch('');
  };

  const handlePistolaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = pistolaInput.trim();
      if (code) {
        handleProcessBarcode(code, 'PISTOLA');
      }
    }
  };

  // Adjust quantities in batch
  const updateDespachoQty = (codigo: string, delta: number) => {
    setScannedDespachoItems((prev) =>
      prev
        .map((it) => {
          if (it.codigo === codigo) {
            const next = it.cantidad + delta;
            if (it.origenModulo === 'producto' && it.maxStock && next > it.maxStock) {
              return it;
            }
            return next > 0 ? { ...it, cantidad: next } : null;
          }
          return it;
        })
        .filter(Boolean) as ItemDespacho[]
    );
  };

  const removeDespachoItem = (codigo: string) => {
    setScannedDespachoItems((prev) => prev.filter((it) => it.codigo !== codigo));
  };

  const updateIngresoQty = (codigo: string, delta: number) => {
    setScannedIngresoItems((prev) =>
      prev
        .map((it) => {
          if (it.codigo === codigo) {
            const next = it.cantidad + delta;
            return next > 0 ? { ...it, cantidad: next } : null;
          }
          return it;
        })
        .filter(Boolean) as ItemIngresoPistola[]
    );
  };

  const removeIngresoItem = (codigo: string) => {
    setScannedIngresoItems((prev) => prev.filter((it) => it.codigo !== codigo));
  };

  // Finalize operations
  const handleFinalizarDespacho = () => {
    if (scannedDespachoItems.length === 0) return;
    onFinalizarDespacho(servicioDestino, nroSolicitud, responsableRecep, scannedDespachoItems, notaEntrega);
    setScannedDespachoItems([]);
    onClose();
  };

  const handleFinalizarIngreso = () => {
    if (scannedIngresoItems.length === 0) return;
    if (onFinalizarIngreso) {
      onFinalizarIngreso(
        {
          guia: inGuia,
          factura: inFactura,
          oc: inOC,
          proveedor: inProveedor,
          fechaIngreso: inFecha,
          observacion: inObservacion,
        },
        scannedIngresoItems
      );
    }
    setScannedIngresoItems([]);
    setInGuia('');
    setInFactura('');
    setInOC('');
    setInObservacion('');
    onClose();
  };

  const handleTraspasar = () => {
    if (onTraspasarADashboard && scannedDespachoItems.length > 0) {
      onTraspasarADashboard(scannedDespachoItems, servicioDestino, nroSolicitud, responsableRecep);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Totals calculations
  const totalDespachoUnidades = scannedDespachoItems.reduce((acc, it) => acc + it.cantidad, 0);
  const totalDespachoLineas = scannedDespachoItems.length;
  const valorTotalDespacho = scannedDespachoItems.reduce((acc, it) => acc + it.cantidad * (it.valorUnitario || 0), 0);

  const totalIngresoUnidades = scannedIngresoItems.reduce((acc, it) => acc + it.cantidad, 0);
  const totalIngresoLineas = scannedIngresoItems.length;
  const valorTotalIngreso = scannedIngresoItems.reduce((acc, it) => acc + it.cantidad * (it.valorUnitario || 0), 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(2, 6, 17, 0.94)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          width: '98vw',
          maxWidth: '1380px',
          height: '92vh',
          maxHeight: '940px',
          background: '#07111e',
          borderRadius: '14px',
          border: terminalMode === 'ingreso' ? '2px solid #10b981' : terminalMode === 'despacho' ? '2px solid #00d4ff' : '2px solid #8b5cf6',
          boxShadow: terminalMode === 'ingreso' ? '0 0 40px rgba(16, 185, 129, 0.35)' : terminalMode === 'despacho' ? '0 0 40px rgba(0, 212, 255, 0.35)' : '0 0 40px rgba(139, 92, 246, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── TOP HEADER & MASTER UNIFIED MODE SWITCHER ── */}
        <div
          style={{
            padding: '10px 18px',
            background: 'linear-gradient(90deg, #050d1a 0%, #0d223a 100%)',
            borderBottom: '1.5px solid #1b375d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🔫</span>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.5px' }}>
                TERMINAL PISTOLA LECTORA (QR / BARRAS)
              </div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                INVENTARIO OFICIAL BODEGA DE TRÁNSITO HAH · Operador: <strong style={{ color: '#38bdf8' }}>{usuario || 'Arturo Gómez E.'}</strong>
              </div>
            </div>
          </div>

          {/* MASTER 3-MODE TOGGLE TABS (UN SOLO SISTEMA) */}
          <div
            style={{
              display: 'flex',
              background: '#040914',
              padding: '3px',
              borderRadius: '9px',
              border: '1.5px solid #1e3a5f',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setTerminalMode('ingreso');
                setTimeout(() => pistolaInputRef.current?.focus(), 80);
              }}
              style={{
                background: terminalMode === 'ingreso' ? 'linear-gradient(135deg, #065f46 0%, #10b981 100%)' : 'transparent',
                color: terminalMode === 'ingreso' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: terminalMode === 'ingreso' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: terminalMode === 'ingreso' ? '0 2px 10px rgba(16, 185, 129, 0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📥</span>
              <span>MODO INGRESO (RECEPCIÓN)</span>
              {scannedIngresoItems.length > 0 && (
                <span
                  style={{
                    background: '#047857',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}
                >
                  {scannedIngresoItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setTerminalMode('despacho');
                setTimeout(() => pistolaInputRef.current?.focus(), 80);
              }}
              style={{
                background: terminalMode === 'despacho' ? 'linear-gradient(135deg, #0284c7 0%, #00d4ff 100%)' : 'transparent',
                color: terminalMode === 'despacho' ? '#001a2a' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: terminalMode === 'despacho' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: terminalMode === 'despacho' ? '0 2px 10px rgba(0, 212, 255, 0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>📤</span>
              <span>MODO DESPACHO (EGRESO / ACTA)</span>
              {scannedDespachoItems.length > 0 && (
                <span
                  style={{
                    background: '#0369a1',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}
                >
                  {scannedDespachoItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setTerminalMode('consulta');
                setTimeout(() => pistolaInputRef.current?.focus(), 80);
              }}
              style={{
                background: terminalMode === 'consulta' ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'transparent',
                color: terminalMode === 'consulta' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: terminalMode === 'consulta' ? 800 : 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: terminalMode === 'consulta' ? '0 2px 10px rgba(168, 85, 247, 0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🔍</span>
              <span>CONSULTA RÁPIDA</span>
            </button>
          </div>

          {/* Right Header: Sound toggle & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              style={{
                background: soundEnabled ? '#0e2942' : '#221526',
                border: `1px solid ${soundEnabled ? '#00d4ff' : '#734685'}`,
                color: soundEnabled ? '#00d4ff' : '#c084fc',
                borderRadius: '6px',
                padding: '4px 9px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Activar/Desactivar sonido POS de confirmación al escanear"
            >
              {soundEnabled ? '🔊 Beep POS: ON' : '🔇 Beep: OFF'}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#1a0d18',
                border: '1.5px solid #ef4444',
                color: '#f87171',
                borderRadius: '7px',
                width: '32px',
                height: '32px',
                fontSize: '16px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Cerrar Terminal Pistola"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── TWO-COLUMN WORKSPACE: LEFT SCANNER STATION, RIGHT BATCH TABLE ── */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '430px 1fr', minHeight: 0 }}>
          {/* ════ LEFT COLUMN: SCANNER CONTROLS & LIVE FEEDBACK ════ */}
          <div
            style={{
              background: '#060d17',
              borderRight: '1.5px solid #162b45',
              display: 'flex',
              flexDirection: 'column',
              padding: '14px',
              gap: '12px',
              overflowY: 'auto',
            }}
          >
            {/* Device tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                background: '#030811',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid #162a42',
                gap: '3px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveDevice('pistola')}
                style={{
                  background: activeDevice === 'pistola' ? '#00d4ff' : 'transparent',
                  color: activeDevice === 'pistola' ? '#001a2a' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔫 Pistola
              </button>
              <button
                type="button"
                onClick={() => setActiveDevice('camara')}
                style={{
                  background: activeDevice === 'camara' ? '#00d4ff' : 'transparent',
                  color: activeDevice === 'camara' ? '#001a2a' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                📷 Cámara
              </button>
              <button
                type="button"
                onClick={() => setActiveDevice('manual')}
                style={{
                  background: activeDevice === 'manual' ? '#00d4ff' : 'transparent',
                  color: activeDevice === 'manual' ? '#001a2a' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⌨️ Manual
              </button>
              <button
                type="button"
                onClick={() => setActiveDevice('simulador')}
                style={{
                  background: activeDevice === 'simulador' ? '#10b981' : 'transparent',
                  color: activeDevice === 'simulador' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🧪 Simulador
              </button>
            </div>

            {/* Multiplier pills */}
            <div
              style={{
                background: '#091524',
                border: '1px solid #163050',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#8bb4d8' }}>
                MULTIPLICADOR:
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 5, 10, 25, 50, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setMultiplier(val);
                      pistolaInputRef.current?.focus();
                    }}
                    style={{
                      background: multiplier === val ? '#00d4ff' : '#040b15',
                      color: multiplier === val ? '#001a2a' : '#94a3b8',
                      border: multiplier === val ? '1.5px solid #38bdf8' : '1px solid #1e3a5f',
                      borderRadius: '5px',
                      padding: '3px 7px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    x{val}
                  </button>
                ))}
              </div>
            </div>

            {/* SCANNER ACTIVE DEVICE VIEW */}
            {activeDevice === 'pistola' && (
              <div
                style={{
                  background: scanFlash ? '#00d4ff33' : '#071626',
                  border: '2px solid #00d4ff',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 0 20px rgba(0, 212, 255, 0.15)',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#00d4ff' }}>
                    ⚡ LECTOR PISTOLA USB / BT (ENFOCADO)
                  </span>
                  <span
                    style={{
                      fontSize: '9.5px',
                      background: '#047857',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}
                  >
                    LISTO PARA PISTOLEAR
                  </span>
                </div>

                <input
                  ref={pistolaInputRef}
                  type="text"
                  value={pistolaInput}
                  onChange={(e) => setPistolaInput(e.target.value)}
                  onKeyDown={handlePistolaKeyDown}
                  placeholder="Apunta la pistola y presiona el gatillo..."
                  style={{
                    width: '100%',
                    background: '#030a13',
                    border: '1.5px solid #00d4ff',
                    borderRadius: '7px',
                    padding: '10px 12px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                  }}
                  autoFocus
                />
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  💡 Cada lectura de código (Code128, EAN13 o QR) se registrará automáticamente en{' '}
                  <strong style={{ color: terminalMode === 'ingreso' ? '#10b981' : '#00d4ff' }}>
                    {terminalMode.toUpperCase()}
                  </strong>.
                </span>
              </div>
            )}

            {activeDevice === 'camara' && (
              <div
                style={{
                  background: '#071626',
                  border: '1.5px solid #38bdf8',
                  borderRadius: '10px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '100%', height: '170px', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                  <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  {cameraActive && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: '20px',
                        border: '2px dashed #00d4ff',
                        borderRadius: '8px',
                        pointerEvents: 'none',
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                  )}
                </div>
                {cameraError && <span style={{ fontSize: '11px', color: '#f87171' }}>{cameraError}</span>}
              </div>
            )}

            {activeDevice === 'manual' && (
              <div
                style={{
                  background: '#071626',
                  border: '1.5px solid #38bdf8',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>
                  Ingreso Manual de Código o Búsqueda
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualSearch.trim()) {
                        handleProcessBarcode(manualSearch.trim(), 'MANUAL');
                      }
                    }}
                    placeholder="Ej. ALI-01, TRZ-EQ-001..."
                    style={{
                      flex: 1,
                      background: '#030a13',
                      border: '1px solid #1e3a5f',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualSearch.trim()) handleProcessBarcode(manualSearch.trim(), 'MANUAL');
                    }}
                    style={{
                      background: '#00d4ff',
                      color: '#001a2a',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0 12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Cargar
                  </button>
                </div>
              </div>
            )}

            {activeDevice === 'simulador' && (
              <div
                style={{
                  background: '#071626',
                  border: '1.5px solid #10b981',
                  borderRadius: '10px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981' }}>
                    🧪 SIMULADOR (PRUEBAS 1-CLIC)
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setSimModuleTab('catalogo')}
                      style={{
                        background: simModuleTab === 'catalogo' ? '#10b981' : '#091524',
                        color: simModuleTab === 'catalogo' ? '#fff' : '#94a3b8',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Insumos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimModuleTab('equipos')}
                      style={{
                        background: simModuleTab === 'equipos' ? '#10b981' : '#091524',
                        color: simModuleTab === 'equipos' ? '#fff' : '#94a3b8',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Equipos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimModuleTab('herramientas')}
                      style={{
                        background: simModuleTab === 'herramientas' ? '#10b981' : '#091524',
                        color: simModuleTab === 'herramientas' ? '#fff' : '#94a3b8',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Herramientas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimModuleTab('equiposmenores')}
                      style={{
                        background: simModuleTab === 'equiposmenores' ? '#10b981' : '#091524',
                        color: simModuleTab === 'equiposmenores' ? '#fff' : '#94a3b8',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Eq. Menores
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {simModuleTab === 'catalogo' &&
                    productos.slice(0, 10).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProcessBarcode(p.codigo, 'SIMULADOR')}
                        style={{
                          background: '#040b15',
                          border: '1px solid #1b375d',
                          borderRadius: '5px',
                          padding: '4px 8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#fff',
                          fontSize: '11px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>{p.codigo}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                          {p.desc}
                        </span>
                        <span style={{ color: '#10b981' }}>{p.stock} uds</span>
                      </button>
                    ))}

                  {simModuleTab === 'equipos' &&
                    trazabilidad.slice(0, 8).map((eq, idx) => (
                      <button
                        key={eq.id || idx}
                        type="button"
                        onClick={() => handleProcessBarcode(eq.codigo || `TRZ-EQ-${String(idx + 1).padStart(3, '0')}`, 'SIMULADOR')}
                        style={{
                          background: '#040b15',
                          border: '1px solid #1b375d',
                          borderRadius: '5px',
                          padding: '4px 8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#fff',
                          fontSize: '11px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ color: '#a855f7', fontFamily: 'monospace', fontWeight: 700 }}>
                          {eq.codigo || `TRZ-EQ-${String(idx + 1).padStart(3, '0')}`}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                          {eq.nombreEquipo}
                        </span>
                      </button>
                    ))}

                  {simModuleTab === 'herramientas' &&
                    herramientas.slice(0, 8).map((her, idx) => (
                      <button
                        key={her.id || idx}
                        type="button"
                        onClick={() => handleProcessBarcode(her.codigo || `TRZ-HER-${String(idx + 1).padStart(3, '0')}`, 'SIMULADOR')}
                        style={{
                          background: '#040b15',
                          border: '1px solid #1b375d',
                          borderRadius: '5px',
                          padding: '4px 8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#fff',
                          fontSize: '11px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 700 }}>
                          {her.codigo || `TRZ-HER-${String(idx + 1).padStart(3, '0')}`}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                          {her.descripcion}
                        </span>
                      </button>
                    ))}

                  {simModuleTab === 'equiposmenores' &&
                    equiposMenores.slice(0, 8).map((eqm, idx) => (
                      <button
                        key={eqm.id || idx}
                        type="button"
                        onClick={() => handleProcessBarcode(eqm.codigo || `TRZ-EQM-${String(idx + 1).padStart(3, '0')}`, 'SIMULADOR')}
                        style={{
                          background: '#040b15',
                          border: '1px solid #1b375d',
                          borderRadius: '5px',
                          padding: '4px 8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#fff',
                          fontSize: '11px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ color: '#06b6d4', fontFamily: 'monospace', fontWeight: 700 }}>
                          {eqm.codigo || `TRZ-EQM-${String(idx + 1).padStart(3, '0')}`}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                          {eqm.nombreEquipo}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* LIVE SCAN FEEDBACK CARD */}
            <div
              style={{
                flex: 1,
                background: '#040914',
                border: lastScanned?.isError ? '1.5px solid #ef4444' : '1.5px solid #1e3a5f',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px' }}>
                    ÚLTIMA LECTURA REGISTRADA
                  </span>
                  {lastScanned && (
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {lastScanned.timestamp}
                    </span>
                  )}
                </div>

                {lastScanned ? (
                  <div>
                    {lastScanned.isError ? (
                      <div style={{ padding: '8px', background: '#20080c', borderRadius: '6px', border: '1px solid #ef4444' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#f87171' }}>
                          {lastScanned.errorMsg}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontFamily: 'monospace',
                              fontWeight: 900,
                              color: terminalMode === 'ingreso' ? '#10b981' : '#00d4ff',
                              background: '#0a192f',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: `1px solid ${terminalMode === 'ingreso' ? '#10b981' : '#00d4ff'}`,
                            }}
                          >
                            {lastScanned.itemInfo.codigo}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 800,
                              background:
                                lastScanned.itemInfo.origen === 'equipos'
                                  ? '#7c3aed'
                                  : lastScanned.itemInfo.origen === 'herramientas'
                                  ? '#d97706'
                                  : lastScanned.itemInfo.origen === 'equiposmenores'
                                  ? '#0891b2'
                                  : '#0369a1',
                              color: '#fff',
                            }}
                          >
                            {lastScanned.itemInfo.origen === 'equipos'
                              ? 'EQUIPO MÉDICO'
                              : lastScanned.itemInfo.origen === 'herramientas'
                              ? 'HERRAMIENTA'
                              : lastScanned.itemInfo.origen === 'equiposmenores'
                              ? 'EQUIPO MENOR'
                              : 'INSUMO CATÁLOGO'}
                          </span>
                        </div>

                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#f8fafc', lineHeight: '1.3' }}>
                          {lastScanned.itemInfo.desc}
                        </div>

                        {lastScanned.itemInfo.subtext && (
                          <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                            {lastScanned.itemInfo.subtext}
                          </div>
                        )}

                        {terminalMode !== 'consulta' && (
                          <div
                            style={{
                              marginTop: '4px',
                              padding: '6px 8px',
                              background: '#091c33',
                              borderRadius: '6px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {terminalMode === 'ingreso' ? '📥 Cantidad a Ingresar:' : '📤 Cantidad a Despachar:'}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: terminalMode === 'ingreso' ? '#10b981' : '#00d4ff' }}>
                              +{lastScanned.cantidadAgregada} uds. (Total en lote: {lastScanned.totalEnLote})
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 8px', color: '#64748b' }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎯</div>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>Esperando primer escaneo...</div>
                    <div style={{ fontSize: '10.5px' }}>
                      Apunta con la pistola lectora o usa el simulador para cargar artículos.
                    </div>
                  </div>
                )}
              </div>

              {/* Status bar */}
              <div
                style={{
                  padding: '6px 8px',
                  background: '#081424',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '10.5px',
                  color: '#64748b',
                }}
              >
                <span>Modo Activo: <strong style={{ color: terminalMode === 'ingreso' ? '#10b981' : '#00d4ff' }}>{terminalMode.toUpperCase()}</strong></span>
                <span>Pistola: <strong style={{ color: '#10b981' }}>CONECTADA</strong></span>
              </div>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: BATCH OPERATION LIST & DOCUMENT HEADER ════ */}
          <div
            style={{
              background: '#081322',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* ── HEADER PANEL SEGÚN MODO ACTIVO (INGRESO O DESPACHO) ── */}
            {terminalMode === 'ingreso' && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(90deg, #061917 0%, #0d2a23 100%)',
                  borderBottom: '1.5px solid #10b98144',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '10px',
                }}
              >
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', display: 'block', marginBottom: '3px' }}>
                    N° GUÍA DE DESPACHO
                  </label>
                  <input
                    type="text"
                    value={inGuia}
                    onChange={(e) => setInGuia(e.target.value)}
                    placeholder="Ej. GD-1404"
                    style={{
                      width: '100%',
                      background: '#04100e',
                      border: '1px solid #10b981',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', display: 'block', marginBottom: '3px' }}>
                    N° FACTURA
                  </label>
                  <input
                    type="text"
                    value={inFactura}
                    onChange={(e) => setInFactura(e.target.value)}
                    placeholder="Ej. FAC-8842"
                    style={{
                      width: '100%',
                      background: '#04100e',
                      border: '1px solid #10b981',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', display: 'block', marginBottom: '3px' }}>
                    ORDEN DE COMPRA (OC)
                  </label>
                  <input
                    type="text"
                    value={inOC}
                    onChange={(e) => setInOC(e.target.value)}
                    placeholder="Ej. OC-2026-001"
                    style={{
                      width: '100%',
                      background: '#04100e',
                      border: '1px solid #10b981',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', display: 'block', marginBottom: '3px' }}>
                    PROVEEDOR / PROCEDENCIA
                  </label>
                  <input
                    type="text"
                    value={inProveedor}
                    onChange={(e) => setInProveedor(e.target.value)}
                    placeholder="CENABAST, Proveedor..."
                    style={{
                      width: '100%',
                      background: '#04100e',
                      border: '1px solid #10b981',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#34d399', display: 'block', marginBottom: '3px' }}>
                    FECHA RECEPCIÓN
                  </label>
                  <input
                    type="text"
                    value={inFecha}
                    onChange={(e) => setInFecha(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#04100e',
                      border: '1px solid #10b981',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>
            )}

            {terminalMode === 'despacho' && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(90deg, #091728 0%, #0d243d 100%)',
                  borderBottom: '1.5px solid #00d4ff44',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                }}
              >
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#00d4ff', display: 'block', marginBottom: '3px' }}>
                    SERVICIO DESTINO
                  </label>
                  <select
                    value={servicioDestino}
                    onChange={(e) => setServicioDestino(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#030a13',
                      border: '1px solid #00d4ff',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {HOSPITAL_SERVICIOS.map((svc) => (
                      <option key={svc} value={svc}>
                        {svc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#00d4ff', display: 'block', marginBottom: '3px' }}>
                    N° SOLICITUD INTERNA
                  </label>
                  <input
                    type="text"
                    value={nroSolicitud}
                    onChange={(e) => setNroSolicitud(e.target.value)}
                    placeholder="Ej. SI-2026-0042"
                    style={{
                      width: '100%',
                      background: '#030a13',
                      border: '1px solid #00d4ff',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#00d4ff', display: 'block', marginBottom: '3px' }}>
                    FUNCIONARIO QUE RECIBE
                  </label>
                  <input
                    type="text"
                    value={responsableRecep}
                    onChange={(e) => setResponsableRecep(e.target.value)}
                    placeholder="Nombre del funcionario..."
                    style={{
                      width: '100%',
                      background: '#030a13',
                      border: '1px solid #00d4ff',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '10px', fontWeight: 800, color: '#00d4ff', display: 'block', marginBottom: '3px' }}>
                    NOTA EN ACTA DE EGRESO
                  </label>
                  <input
                    type="text"
                    value={notaEntrega}
                    onChange={(e) => setNotaEntrega(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#030a13',
                      border: '1px solid #00d4ff',
                      borderRadius: '5px',
                      padding: '6px 8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>
            )}

            {terminalMode === 'consulta' && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(90deg, #160a28 0%, #23123d 100%)',
                  borderBottom: '1.5px solid #a855f744',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#c084fc' }}>
                    🔍 MODO CONSULTA / INSPECCIÓN RÁPIDA
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '10px' }}>
                    Apunta la pistola hacia cualquier insumo, equipo o herramienta para consultar stock, ubicación y ficha técnica sin alterar el inventario.
                  </span>
                </div>
              </div>
            )}

            {/* ── BATCH OPERATION TABLE ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {terminalMode === 'ingreso' ? (
                scannedIngresoItems.length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      minHeight: '260px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      textAlign: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '42px' }}>📥</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8' }}>
                      LOTE DE RECEPCIÓN VACÍO
                    </span>
                    <span style={{ fontSize: '11px', maxWidth: '420px' }}>
                      Apunta con la pistola lectora a las cajas o artículos que están ingresando a bodega.
                      Cada lectura sumará unidades y calculará el nuevo stock proyectado.
                    </span>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                    <thead>
                      <tr style={{ background: '#051410', borderBottom: '1.5px solid #10b981', color: '#34d399', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: '130px' }}>CÓDIGO</th>
                        <th style={{ padding: '8px 10px' }}>DESCRIPCIÓN / DETALLE</th>
                        <th style={{ padding: '8px 10px', width: '90px' }}>MÓDULO</th>
                        <th style={{ padding: '8px 10px', width: '130px', textAlign: 'center' }}>CANT. A INGRESAR</th>
                        <th style={{ padding: '8px 10px', width: '150px', textAlign: 'right' }}>STOCK BODEGA</th>
                        <th style={{ padding: '8px 10px', width: '60px', textAlign: 'center' }}>QUITAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedIngresoItems.map((item, idx) => (
                        <tr
                          key={item.id || idx}
                          style={{
                            borderBottom: '1px solid #132b24',
                            background: idx % 2 === 0 ? '#061713' : '#081f1a',
                          }}
                        >
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: '#34d399' }}>
                            {item.codigo}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#f8fafc', fontWeight: 600 }}>
                            {item.desc}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span
                              style={{
                                fontSize: '9.5px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                background:
                                  item.origenModulo === 'equipos'
                                    ? '#7c3aed'
                                    : item.origenModulo === 'herramientas'
                                    ? '#d97706'
                                    : item.origenModulo === 'equiposmenores'
                                    ? '#0891b2'
                                    : '#047857',
                                color: '#fff',
                              }}
                            >
                              {item.origenModulo === 'equipos'
                                ? 'Equipo'
                                : item.origenModulo === 'herramientas'
                                ? 'Herram.'
                                : item.origenModulo === 'equiposmenores'
                                ? 'Eq.Menor'
                                : 'Insumo'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => updateIngresoQty(item.codigo, -1)}
                                style={{
                                  background: '#09251e',
                                  border: '1px solid #10b981',
                                  color: '#34d399',
                                  borderRadius: '4px',
                                  width: '24px',
                                  height: '24px',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', minWidth: '36px', textAlign: 'center', fontFamily: 'monospace' }}>
                                +{item.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateIngresoQty(item.codigo, 1)}
                                style={{
                                  background: '#09251e',
                                  border: '1px solid #10b981',
                                  color: '#34d399',
                                  borderRadius: '4px',
                                  width: '24px',
                                  height: '24px',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                }}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                            <span style={{ color: '#94a3b8' }}>{item.stockActual}</span>
                            <span style={{ color: '#34d399', fontWeight: 800 }}> ➔ {item.stockActual + item.cantidad} uds</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeIngresoItem(item.codigo)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '14px',
                                cursor: 'pointer',
                                fontWeight: 800,
                              }}
                              title="Quitar del lote"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : terminalMode === 'despacho' ? (
                scannedDespachoItems.length === 0 ? (
                  <div
                    style={{
                      height: '100%',
                      minHeight: '260px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      textAlign: 'center',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '42px' }}>📤</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8' }}>
                      LOTE DE DESPACHO VACÍO
                    </span>
                    <span style={{ fontSize: '11px', maxWidth: '420px' }}>
                      Apunta con la pistola lectora a los insumos o equipos solicitados.
                      Al terminar, presiona el botón para generar el Acta Oficial de Egreso.
                    </span>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                    <thead>
                      <tr style={{ background: '#061726', borderBottom: '1.5px solid #00d4ff', color: '#38bdf8', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: '130px' }}>CÓDIGO</th>
                        <th style={{ padding: '8px 10px' }}>DESCRIPCIÓN / ARTÍCULO</th>
                        <th style={{ padding: '8px 10px', width: '90px' }}>MÓDULO</th>
                        <th style={{ padding: '8px 10px', width: '130px', textAlign: 'center' }}>CANT. A DESPACHAR</th>
                        <th style={{ padding: '8px 10px', width: '150px', textAlign: 'right' }}>STOCK DISPONIBLE</th>
                        <th style={{ padding: '8px 10px', width: '60px', textAlign: 'center' }}>QUITAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedDespachoItems.map((item, idx) => {
                        const stockActual = item.maxStock ?? 0;
                        const restante = Math.max(0, stockActual - item.cantidad);
                        return (
                          <tr
                            key={item.id || idx}
                            style={{
                              borderBottom: '1px solid #132b45',
                              background: idx % 2 === 0 ? '#081729' : '#0a1d33',
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8' }}>
                              {item.codigo}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#f8fafc', fontWeight: 600 }}>
                              {item.desc}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  background:
                                    item.origenModulo === 'equipos'
                                      ? '#7c3aed'
                                      : item.origenModulo === 'herramientas'
                                      ? '#d97706'
                                      : item.origenModulo === 'equiposmenores'
                                      ? '#0891b2'
                                      : '#0284c7',
                                  color: '#fff',
                                }}
                              >
                                {item.origenModulo === 'equipos'
                                  ? 'Equipo'
                                  : item.origenModulo === 'herramientas'
                                  ? 'Herram.'
                                  : item.origenModulo === 'equiposmenores'
                                  ? 'Eq.Menor'
                                  : 'Insumo'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => updateDespachoQty(item.codigo, -1)}
                                  style={{
                                    background: '#092540',
                                    border: '1px solid #00d4ff',
                                    color: '#00d4ff',
                                    borderRadius: '4px',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                  }}
                                >
                                  -
                                </button>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', minWidth: '36px', textAlign: 'center', fontFamily: 'monospace' }}>
                                  {item.cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateDespachoQty(item.codigo, 1)}
                                  style={{
                                    background: '#092540',
                                    border: '1px solid #00d4ff',
                                    color: '#00d4ff',
                                    borderRadius: '4px',
                                    width: '24px',
                                    height: '24px',
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                              <span style={{ color: '#94a3b8' }}>{stockActual}</span>
                              <span style={{ color: '#38bdf8', fontWeight: 800 }}> ➔ {restante} uds</span>
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => removeDespachoItem(item.codigo)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                }}
                                title="Quitar del lote"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : (
                /* CONSULTA VIEW */
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {lastScanned && !lastScanned.isError ? (
                    <div
                      style={{
                        background: '#0d182b',
                        border: '1.5px solid #a855f7',
                        borderRadius: '12px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#c084fc' }}>
                          {lastScanned.itemInfo.codigo}
                        </span>
                        <span style={{ fontSize: '11px', background: '#581c87', color: '#fff', padding: '3px 8px', borderRadius: '5px', fontWeight: 700 }}>
                          FICHA TÉCNICA
                        </span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                        {lastScanned.itemInfo.desc}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <div style={{ background: '#07101e', padding: '10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>STOCK ACTUAL BODEGA</span>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                            {lastScanned.itemInfo.stock} uds.
                          </span>
                        </div>
                        <div style={{ background: '#07101e', padding: '10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>VALOR UNITARIO</span>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>
                            {fmtMoney(lastScanned.itemInfo.valor || 0)}
                          </span>
                        </div>
                        <div style={{ background: '#07101e', padding: '10px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>FAMILIA / TIPO</span>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                            {lastScanned.itemInfo.familia}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setTerminalMode('ingreso');
                            handleProcessBarcode(lastScanned.itemInfo.codigo, 'MANUAL');
                          }}
                          style={{
                            flex: 1,
                            background: '#065f46',
                            border: '1px solid #10b981',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '10px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          📥 Pasar a Lote de Ingreso
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTerminalMode('despacho');
                            handleProcessBarcode(lastScanned.itemInfo.codigo, 'MANUAL');
                          }}
                          style={{
                            flex: 1,
                            background: '#0284c7',
                            border: '1px solid #38bdf8',
                            color: '#001a2a',
                            borderRadius: '6px',
                            padding: '10px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          📤 Pasar a Lote de Despacho
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      <span style={{ fontSize: '36px' }}>🔍</span>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', marginTop: '8px' }}>
                        Modo Consulta Activo
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>
                        Escanea cualquier código de barras o QR para visualizar su información detallada.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── FOOTER ACTIONS & SUMMARY BAR ── */}
            <div
              style={{
                padding: '12px 18px',
                background: 'linear-gradient(90deg, #050e18 0%, #0d223a 100%)',
                borderTop: '1.5px solid #193452',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              {terminalMode === 'ingreso' ? (
                <>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8bb4d8', display: 'block' }}>UNIDADES A INGRESAR</span>
                      <span style={{ fontSize: '17px', color: '#10b981', fontWeight: 900, fontFamily: 'monospace' }}>
                        +{totalIngresoUnidades} <span style={{ fontSize: '11px', color: '#94a3b8' }}>uds.</span>
                      </span>
                    </div>
                    <div style={{ width: '1px', height: '24px', background: '#1e3a5f' }} />
                    <div>
                      <span style={{ fontSize: '10px', color: '#8bb4d8', display: 'block' }}>LÍNEAS DISTINTAS</span>
                      <span style={{ fontSize: '17px', color: '#38bdf8', fontWeight: 900, fontFamily: 'monospace' }}>
                        {totalIngresoLineas}
                      </span>
                    </div>
                    {valorTotalIngreso > 0 && (
                      <>
                        <div style={{ width: '1px', height: '24px', background: '#1e3a5f' }} />
                        <div>
                          <span style={{ fontSize: '10px', color: '#8bb4d8', display: 'block' }}>VALORIZACIÓN ESTIMADA</span>
                          <span style={{ fontSize: '17px', color: '#fbbf24', fontWeight: 900, fontFamily: 'monospace' }}>
                            {fmtMoney(valorTotalIngreso)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleFinalizarIngreso}
                    disabled={scannedIngresoItems.length === 0}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                      border: 'none',
                      color: '#ffffff',
                      padding: '10px 22px',
                      borderRadius: '7px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: scannedIngresoItems.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: scannedIngresoItems.length === 0 ? 0.45 : 1,
                    }}
                  >
                    <span>📥</span>
                    <span>CONFIRMAR RECEPCIÓN E INGRESAR A BODEGA</span>
                  </button>
                </>
              ) : terminalMode === 'despacho' ? (
                <>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#8bb4d8', display: 'block' }}>TOTAL ARTÍCULOS A DESPACHAR</span>
                      <span style={{ fontSize: '17px', color: '#00d4ff', fontWeight: 900, fontFamily: 'monospace' }}>
                        {totalDespachoUnidades} <span style={{ fontSize: '11px', color: '#94a3b8' }}>uds.</span>
                      </span>
                    </div>
                    <div style={{ width: '1px', height: '24px', background: '#1e3a5f' }} />
                    <div>
                      <span style={{ fontSize: '10px', color: '#8bb4d8', display: 'block' }}>LÍNEAS DISTINTAS</span>
                      <span style={{ fontSize: '17px', color: '#10b981', fontWeight: 900, fontFamily: 'monospace' }}>
                        {totalDespachoLineas}
                      </span>
                    </div>
                    {valorTotalDespacho > 0 && (
                      <>
                        <div style={{ width: '1px', height: '24px', background: '#1e3a5f' }} />
                        <div>
                          <span style={{ fontSize: '10px', color: '#8bb4d8', display: 'block' }}>VALOR TOTAL ESTIMADO</span>
                          <span style={{ fontSize: '17px', color: '#fbbf24', fontWeight: 900, fontFamily: 'monospace' }}>
                            {fmtMoney(valorTotalDespacho)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {onTraspasarADashboard && (
                      <button
                        type="button"
                        onClick={handleTraspasar}
                        disabled={scannedDespachoItems.length === 0}
                        style={{
                          background: '#092540',
                          border: '1.5px solid #00d4ff',
                          color: '#00d4ff',
                          padding: '9px 14px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '11.5px',
                          cursor: scannedDespachoItems.length === 0 ? 'not-allowed' : 'pointer',
                          opacity: scannedDespachoItems.length === 0 ? 0.45 : 1,
                        }}
                        title="Traspasa los ítems al panel de despacho del dashboard principal"
                      >
                        📋 Traspasar al Panel
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleFinalizarDespacho}
                      disabled={scannedDespachoItems.length === 0}
                      style={{
                        background: 'linear-gradient(135deg, #0088cc 0%, #00d4ff 100%)',
                        border: 'none',
                        color: '#001a2a',
                        padding: '10px 22px',
                        borderRadius: '7px',
                        fontWeight: 900,
                        fontSize: '13px',
                        cursor: scannedDespachoItems.length === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: '0 0 18px rgba(0, 212, 255, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: scannedDespachoItems.length === 0 ? 0.45 : 1,
                      }}
                    >
                      <span>🖨️</span>
                      <span>GENERAR ACTA Y DESPACHAR AHORA</span>
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: '#1e293b',
                      color: '#f8fafc',
                      border: '1px solid #475569',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cerrar Terminal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
