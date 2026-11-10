import React, { useState, useRef, useEffect } from 'react';
import { TrazabilidadEquipo, Herramienta, EquipoMenor } from '../types';
import { today, fmtMoney } from '../utils/format';

type TraceabilityModule = 'equipos' | 'herramientas' | 'equiposmenores';
type DocumentType = 'FACTURA' | 'GUÍA DESPACHO' | 'ORDEN COMPRA';

export interface ExtractedDocItem {
  id: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  serie: string;
  lote: string;
  cantidad: number;
  valorUnitario: number;
  costoTotal: number;
  accesorios?: string;
  finalidad?: string;
}

interface OCRExtractorProps {
  initialModule?: TraceabilityModule;
  onSaveEquipo?: (equipo: Partial<TrazabilidadEquipo>) => void;
  onSaveMultipleEquipos?: (equipos: Partial<TrazabilidadEquipo>[]) => void;
  onSaveHerramienta?: (herramienta: Partial<Herramienta>) => void;
  onSaveMultipleHerramientas?: (herramientas: Partial<Herramienta>[]) => void;
  onSaveEquipoMenor?: (equipoMenor: Partial<EquipoMenor>) => void;
  onSaveMultipleEquiposMenores?: (equiposMenores: Partial<EquipoMenor>[]) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const OCRExtractor: React.FC<OCRExtractorProps> = ({
  initialModule = 'equipos',
  onSaveEquipo,
  onSaveMultipleEquipos,
  onSaveHerramienta,
  onSaveMultipleHerramientas,
  onSaveEquipoMenor,
  onSaveMultipleEquiposMenores,
  onClose,
  isModal = false,
}) => {
  const [activeModule, setActiveModule] = useState<TraceabilityModule>(initialModule);
  const [activeMethod, setActiveMethod] = useState<'upload' | 'camera'>('upload');
  const [docType, setDocType] = useState<DocumentType>('FACTURA');

  // File & Camera states
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    base64: string;
    mimeType: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera video ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extracted data models (100% editable)
  const [extractedEquipo, setExtractedEquipo] = useState<Partial<TrazabilidadEquipo>>({
    fecha: today(),
    guia: '',
    factura: '',
    oc: '',
    nombreEquipo: '',
    marca: '',
    modelo: '',
    nSerie: '',
    cantidad: 1,
    finalidad: 'Uso Clínico Hospitalario',
    institucionExterna: '',
    servClinico: 'Bodega General / Urgencia',
    quienRecibe: '',
    mantPreventivo: 'Vigente',
    accesorios: '',
    ingresoRetiro: 'Ingreso',
    valorUnitario: 0,
    costoTotal: 0,
    observaciones: '',
  });

  // Document header fields (shared across all products in the guide)
  const [docHeader, setDocHeader] = useState({
    fecha: today(),
    guia: '',
    factura: '',
    oc: '',
    servicioDestino: 'HOSPITAL DE ALTO HOSPICIO',
    quienRecibe: 'Erik Faundes',
    institucionExterna: 'GHC Global Health Care SpA',
    observaciones: '',
  });

  // Multiple items extracted from the document
  const [docItems, setDocItems] = useState<ExtractedDocItem[]>([]);

  const [extractedHerramienta, setExtractedHerramienta] = useState<Partial<Herramienta>>({
    fecha: today(),
    descripcion: '',
    guia: '',
    factura: '',
    oc: '',
    cantidad: 1,
    servicioDestino: 'Mantención',
    personaRecibe: '',
    valorUnitario: 0,
    costoTotal: 0,
  });

  const [extractedEquipoMenor, setExtractedEquipoMenor] = useState<Partial<EquipoMenor>>({
    fecha: today(),
    nombreEquipo: '',
    marca: '',
    modelo: '',
    serie: '',
    lote: '',
    guia: '',
    factura: '',
    oc: '',
    cantidad: 1,
    servicioDestino: 'UCI',
    quienRecibe: '',
    valorUnitario: 0,
    costoTotal: 0,
  });

  const [hasExtracted, setHasExtracted] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [itemDisplayMode, setItemDisplayMode] = useState<'table' | 'detail'>('table');

  // Stop camera on unmount or tab switch
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    setActiveMethod('camera');
    setErrorMsg(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e: any) {
      setErrorMsg('No se pudo acceder a la cámara. Por favor verifica los permisos o utiliza el Método 1.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    setSelectedFile({
      name: `captura_${Date.now()}.jpg`,
      size: `${Math.round(dataUrl.length * 0.75 / 1024)} KB`,
      base64: dataUrl,
      mimeType: 'image/jpeg',
    });
    stopCamera();
    setActiveMethod('upload');
  };

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        base64,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // OCR Extraction call
  const handleExtractData = async () => {
    if (!selectedFile) {
      setErrorMsg('Por favor selecciona o captura un documento primero.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ocr-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoTrazabilidad: activeModule,
          tipoDocumento: docType,
          fileBase64: selectedFile.base64,
          mimeType: selectedFile.mimeType,
          fileName: selectedFile.name,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al conectar con el servicio OCR de IA');
      }

      const resData = await res.json();
      if (resData.success && resData.data) {
        const d = resData.data;

        const hFecha = d.fecha || today();
        const hGuia = d.guia || '';
        const hFact = d.factura || '';
        const hOc = d.oc || '';
        const hSvc = d.servicioDestino || d.servClinico || 'HOSPITAL DE ALTO HOSPICIO';
        const hQuien = d.quienRecibe || '';
        const hInst = d.institucionExterna || 'GHC Global Health Care SpA';
        const hObs = d.observaciones || '';

        setDocHeader({
          fecha: hFecha,
          guia: hGuia,
          factura: hFact,
          oc: hOc,
          servicioDestino: hSvc,
          quienRecibe: hQuien,
          institucionExterna: hInst,
          observaciones: hObs,
        });

        let parsedList: ExtractedDocItem[] = [];
        if (d.items && Array.isArray(d.items) && d.items.length > 0) {
          parsedList = d.items.map((it: any, i: number) => {
            const cant = Number(it.cantidad) || (i === 0 ? Number(d.cantidad) || 1 : 1);
            const val = Number(it.valorUnitario) || (i === 0 ? Number(d.valorUnitario) || 0 : 0);
            return {
              id: `item_${Date.now()}_${i}`,
              nombreEquipo: it.nombreEquipo || it.descripcion || (i === 0 ? (d.nombreEquipo || d.descripcion) : `Producto #${i + 1}`),
              marca: it.marca || (i === 0 ? d.marca : '') || '',
              modelo: it.modelo || (i === 0 ? d.modelo : '') || '',
              serie: it.serie || it.nSerie || (i === 0 ? (d.serie || d.nSerie) : '') || '',
              lote: it.lote || (i === 0 ? d.lote : '') || '',
              cantidad: cant,
              valorUnitario: val,
              costoTotal: Number(it.costoTotal) || cant * val,
              accesorios: it.accesorios || '',
              finalidad: it.finalidad || '',
            };
          });
        } else {
          const cant = Number(d.cantidad) || 1;
          const val = Number(d.valorUnitario) || 0;
          parsedList = [
            {
              id: `item_${Date.now()}_0`,
              nombreEquipo: d.nombreEquipo || d.descripcion || 'Producto',
              marca: d.marca || '',
              modelo: d.modelo || '',
              serie: d.serie || d.nSerie || '',
              lote: d.lote || '',
              cantidad: cant,
              valorUnitario: val,
              costoTotal: Number(d.costoTotal) || cant * val,
              accesorios: d.accesorios || '',
              finalidad: d.finalidad || '',
            },
          ];
        }

        setDocItems(parsedList);
        setActiveItemIndex(0);
        setItemDisplayMode('table');

        // Also update individual states for single item compatibility
        if (activeModule === 'equipos') {
          const first = parsedList[0];
          setExtractedEquipo({
            fecha: hFecha,
            guia: hGuia,
            factura: hFact,
            oc: hOc,
            nombreEquipo: first?.nombreEquipo || '',
            marca: first?.marca || '',
            modelo: first?.modelo || '',
            nSerie: first?.serie || '',
            cantidad: first?.cantidad || 1,
            finalidad: d.finalidad || 'Comodato / Demostración',
            institucionExterna: hInst,
            servClinico: hSvc,
            quienRecibe: hQuien,
            mantPreventivo: d.mantPreventivo || 'Vigente',
            accesorios: d.accesorios || '',
            ingresoRetiro: d.ingresoRetiro || 'Ingreso',
            valorUnitario: first?.valorUnitario || 0,
            costoTotal: first?.costoTotal || 0,
            observaciones: hObs,
          });
        } else if (activeModule === 'herramientas') {
          const first = parsedList[0];
          setExtractedHerramienta({
            fecha: hFecha,
            descripcion: first?.nombreEquipo || '',
            guia: hGuia,
            factura: hFact,
            oc: hOc,
            cantidad: first?.cantidad || 1,
            servicioDestino: hSvc,
            personaRecibe: hQuien,
            valorUnitario: first?.valorUnitario || 0,
            costoTotal: first?.costoTotal || 0,
          });
        } else if (activeModule === 'equiposmenores') {
          const first = parsedList[0];
          setExtractedEquipoMenor({
            fecha: hFecha,
            nombreEquipo: first?.nombreEquipo || '',
            marca: first?.marca || '',
            modelo: first?.modelo || '',
            serie: first?.serie || '',
            lote: first?.lote || '',
            guia: hGuia,
            factura: hFact,
            oc: hOc,
            cantidad: first?.cantidad || 1,
            servicioDestino: hSvc,
            quienRecibe: hQuien,
            valorUnitario: first?.valorUnitario || 0,
            costoTotal: first?.costoTotal || 0,
          });
        }

        setHasExtracted(true);
      } else {
        throw new Error(resData.error || 'No se pudieron extraer datos reconocibles');
      }
    } catch (err: any) {
      console.warn('Extracción directa falló o requiere revisión manual:', err);
      const cleanFileName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      // Detectar si el nombre del archivo contiene un número de guía o documento real
      const matchNum = selectedFile.name.match(/\d+/);
      const fGuia = matchNum ? matchNum[0] : '';
      const fFecha = today();
      const fSvc = 'HOSPITAL DE ALTO HOSPICIO';
      const fQuien = 'Erik Faundes';

      setDocHeader({
        fecha: fFecha,
        guia: fGuia,
        factura: '',
        oc: '',
        servicioDestino: fSvc,
        quienRecibe: fQuien,
        institucionExterna: '',
        observaciones: `Documento cargado: ${selectedFile.name}. Verifique los campos ingresados o complete los ítems.`,
      });

      // Crear un ítem limpio y vacío para edición manual sin inventar productos falsos
      const cleanSingleItem: ExtractedDocItem[] = [
        {
          id: `item_${Date.now()}_0`,
          nombreEquipo: '',
          marca: '',
          modelo: '',
          serie: '',
          lote: '',
          cantidad: 1,
          valorUnitario: 0,
          costoTotal: 0,
        },
      ];

      setDocItems(cleanSingleItem);
      setActiveItemIndex(0);
      setItemDisplayMode('table');

      if (activeModule === 'equipos') {
        setExtractedEquipo({
          fecha: fFecha,
          guia: fGuia,
          factura: '',
          oc: '',
          nombreEquipo: '',
          marca: '',
          modelo: '',
          nSerie: '',
          cantidad: 1,
          finalidad: 'Comodato Clínico / Demostración',
          institucionExterna: '',
          servClinico: fSvc,
          quienRecibe: fQuien,
          mantPreventivo: 'Vigente',
          accesorios: '',
          ingresoRetiro: 'Ingreso',
          valorUnitario: 0,
          costoTotal: 0,
          observaciones: '',
        });
      } else if (activeModule === 'herramientas') {
        setExtractedHerramienta({
          fecha: fFecha,
          descripcion: '',
          guia: fGuia,
          factura: '',
          oc: '',
          cantidad: 1,
          servicioDestino: fSvc,
          personaRecibe: fQuien,
          valorUnitario: 0,
          costoTotal: 0,
        });
      } else {
        setExtractedEquipoMenor({
          fecha: fFecha,
          nombreEquipo: '',
          marca: '',
          modelo: '',
          serie: '',
          lote: '',
          guia: fGuia,
          factura: '',
          oc: '',
          cantidad: 1,
          servicioDestino: fSvc,
          quienRecibe: fQuien,
          valorUnitario: 0,
          costoTotal: 0,
        });
      }

      setHasExtracted(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateDocItem = (index: number, field: keyof ExtractedDocItem, value: any) => {
    setDocItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const updated = { ...it, [field]: value };
        if (field === 'cantidad' || field === 'valorUnitario') {
          const c = field === 'cantidad' ? Number(value) || 1 : it.cantidad;
          const v = field === 'valorUnitario' ? Number(value) || 0 : it.valorUnitario;
          updated.costoTotal = c * v;
        }
        return updated;
      })
    );
  };

  const handleAddDocItem = () => {
    const newItem: ExtractedDocItem = {
      id: `item_${Date.now()}_${docItems.length}`,
      nombreEquipo: `Nuevo Producto #${docItems.length + 1}`,
      marca: '',
      modelo: '',
      serie: '',
      lote: '',
      cantidad: 1,
      valorUnitario: 0,
      costoTotal: 0,
    };
    setDocItems((prev) => [...prev, newItem]);
  };

  const handleRemoveDocItem = (index: number) => {
    if (docItems.length <= 1) {
      alert('La guía debe tener al menos un ítem.');
      return;
    }
    setDocItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveToSystem = () => {
    const adj = selectedFile ? { nombre: selectedFile.name, tipo: selectedFile.mimeType, data: selectedFile.base64 } : null;

    if (activeModule === 'equiposmenores') {
      const itemsToSave: Partial<EquipoMenor>[] = docItems.map((it) => ({
        fecha: docHeader.fecha || today(),
        nombreEquipo: it.nombreEquipo || 'Equipo Menor',
        marca: it.marca || '—',
        modelo: it.modelo || '—',
        serie: it.serie || '—',
        lote: it.lote || '—',
        guia: docHeader.guia || '—',
        factura: docHeader.factura || '—',
        oc: docHeader.oc || '—',
        cantidad: it.cantidad || 1,
        servicioDestino: docHeader.servicioDestino || 'HOSPITAL DE ALTO HOSPICIO',
        quienRecibe: docHeader.quienRecibe || '',
        valorUnitario: it.valorUnitario || 0,
        costoTotal: (it.cantidad || 1) * (it.valorUnitario || 0),
        adjunto: adj,
      }));

      if (onSaveMultipleEquiposMenores) {
        onSaveMultipleEquiposMenores(itemsToSave);
      } else if (onSaveEquipoMenor) {
        itemsToSave.forEach((item) => onSaveEquipoMenor(item));
      }
    } else if (activeModule === 'equipos') {
      const itemsToSave: Partial<TrazabilidadEquipo>[] = docItems.map((it) => ({
        fecha: docHeader.fecha || today(),
        guia: docHeader.guia || '',
        factura: docHeader.factura || '',
        oc: docHeader.oc || '',
        nombreEquipo: it.nombreEquipo || 'Equipo Médico',
        marca: it.marca || '—',
        modelo: it.modelo || '—',
        nSerie: it.serie || '—',
        lote: it.lote || '',
        cantidad: it.cantidad || 1,
        institucionExterna: docHeader.institucionExterna || 'GHC Global Health Care SpA',
        servClinico: docHeader.servicioDestino || 'UPC Adulto / Pabellón Central',
        quienRecibe: docHeader.quienRecibe || '',
        finalidad: it.finalidad || 'Comodato Clínico / Demostración',
        mantPreventivo: 'Vigente',
        accesorios: it.accesorios || '',
        ingresoRetiro: 'Ingreso',
        valorUnitario: it.valorUnitario || 0,
        costoTotal: (it.cantidad || 1) * (it.valorUnitario || 0),
        observaciones: docHeader.observaciones || '',
        adjunto: adj,
      }));

      if (onSaveMultipleEquipos) {
        onSaveMultipleEquipos(itemsToSave);
      } else if (onSaveEquipo) {
        itemsToSave.forEach((item) => onSaveEquipo(item));
      }
    } else if (activeModule === 'herramientas') {
      const itemsToSave: Partial<Herramienta>[] = docItems.map((it) => ({
        fecha: docHeader.fecha || today(),
        descripcion: it.nombreEquipo || 'Herramienta',
        guia: docHeader.guia || '—',
        factura: docHeader.factura || '—',
        oc: docHeader.oc || '—',
        cantidad: it.cantidad || 1,
        servicioDestino: docHeader.servicioDestino || 'Mantención',
        personaRecibe: docHeader.quienRecibe || '',
        valorUnitario: it.valorUnitario || 0,
        costoTotal: (it.cantidad || 1) * (it.valorUnitario || 0),
        adjunto: adj,
      }));

      if (onSaveMultipleHerramientas) {
        onSaveMultipleHerramientas(itemsToSave);
      } else if (onSaveHerramienta) {
        itemsToSave.forEach((item) => onSaveHerramienta(item));
      }
    }

    if (onClose) onClose();
  };

  const handleSaveSingleItem = (index: number) => {
    const it = docItems[index];
    if (!it) return;
    const adj = selectedFile ? { nombre: selectedFile.name, tipo: selectedFile.mimeType, data: selectedFile.base64 } : null;

    if (activeModule === 'equiposmenores') {
      const itemToSave: Partial<EquipoMenor> = {
        fecha: docHeader.fecha || today(),
        nombreEquipo: it.nombreEquipo || 'Equipo Menor',
        marca: it.marca || '—',
        modelo: it.modelo || '—',
        serie: it.serie || '—',
        lote: it.lote || '—',
        guia: docHeader.guia || '—',
        factura: docHeader.factura || '—',
        oc: docHeader.oc || '—',
        cantidad: it.cantidad || 1,
        servicioDestino: docHeader.servicioDestino || 'HOSPITAL DE ALTO HOSPICIO',
        quienRecibe: docHeader.quienRecibe || '',
        valorUnitario: it.valorUnitario || 0,
        costoTotal: (it.cantidad || 1) * (it.valorUnitario || 0),
        adjunto: adj,
      };
      if (onSaveMultipleEquiposMenores) {
        onSaveMultipleEquiposMenores([itemToSave]);
      } else if (onSaveEquipoMenor) {
        onSaveEquipoMenor(itemToSave);
      }
    } else if (activeModule === 'equipos') {
      const itemToSave: Partial<TrazabilidadEquipo> = {
        fecha: docHeader.fecha || today(),
        guia: docHeader.guia || '',
        factura: docHeader.factura || '',
        oc: docHeader.oc || '',
        nombreEquipo: it.nombreEquipo || 'Equipo Médico',
        marca: it.marca || '—',
        modelo: it.modelo || '—',
        nSerie: it.serie || '—',
        lote: it.lote || '',
        cantidad: it.cantidad || 1,
        institucionExterna: docHeader.institucionExterna || 'GHC Global Health Care SpA',
        servClinico: docHeader.servicioDestino || 'UPC Adulto / Pabellón Central',
        quienRecibe: docHeader.quienRecibe || '',
        finalidad: it.finalidad || 'Comodato Clínico / Demostración',
        mantPreventivo: 'Vigente',
        accesorios: it.accesorios || '',
        ingresoRetiro: 'Ingreso',
        valorUnitario: it.valorUnitario || 0,
        costoTotal: (it.cantidad || 1) * (it.valorUnitario || 0),
        observaciones: docHeader.observaciones || '',
        adjunto: adj,
      };
      if (onSaveMultipleEquipos) {
        onSaveMultipleEquipos([itemToSave]);
      } else if (onSaveEquipo) {
        onSaveEquipo(itemToSave);
      }
    } else if (activeModule === 'herramientas') {
      const itemToSave: Partial<Herramienta> = {
        fecha: docHeader.fecha || today(),
        descripcion: it.nombreEquipo || 'Herramienta',
        guia: docHeader.guia || '—',
        factura: docHeader.factura || '—',
        oc: docHeader.oc || '—',
        cantidad: it.cantidad || 1,
        servicioDestino: docHeader.servicioDestino || 'Mantención',
        personaRecibe: docHeader.quienRecibe || '',
        valorUnitario: it.valorUnitario || 0,
        costoTotal: (it.cantidad || 1) * (it.valorUnitario || 0),
        adjunto: adj,
      };
      if (onSaveMultipleHerramientas) {
        onSaveMultipleHerramientas([itemToSave]);
      } else if (onSaveHerramienta) {
        onSaveHerramienta(itemToSave);
      }
    }

    if (onClose) onClose();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setHasExtracted(false);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    stopCamera();
    setActiveMethod('upload');
  };

  return (
    <div
      style={{
        background: '#0d1635',
        border: '1px solid #2a4372',
        borderRadius: '14px',
        overflow: 'hidden',
        color: '#c8daf0',
        fontFamily: "'Segoe UI', sans-serif",
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
        width: '100%',
        maxWidth: isModal ? '1100px' : '100%',
        margin: '0 auto',
      }}
    >
      {/* ── TOP BANNER (FIEL A LA IMAGEN) ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0940cd 0%, #1557ff 100%)',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '19px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.2px',
            }}
          >
            <span>✨</span>
            <span>Escaneo y Extracción de Documentos de Trazabilidad</span>
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.88)',
              marginTop: '5px',
              maxWidth: '820px',
              lineHeight: 1.45,
            }}
          >
            Carga tus documentos oficiales (archivos PDF, imágenes de escáner o fotos con la cámara) de Guías de
            Despacho, Facturas Electrónicas y Órdenes de Compra. El sistema extraerá fielmente todas las columnas
            oficiales para tu revisión antes de guardar.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              background: '#0d2570',
              border: '1px solid #38bdf8',
              borderRadius: '24px',
              padding: '6px 14px',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{activeModule === 'equipos' ? '🩺 Equipos Médicos' : activeModule === 'herramientas' ? '🧰 Herramientas' : '🔬 Equipos Menores'}</span>
          </div>
          <div
            style={{
              background: '#0d2570',
              border: '1px solid #ffcc00',
              borderRadius: '24px',
              padding: '6px 14px',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: '#ffcc00' }}>⚡</span>
            <span>IA Gemini 3.8 Flash HAH</span>
          </div>
          {isModal && onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                fontSize: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── SELECTOR DE MÓDULO DE TRAZABILIDAD (EQUIPOS, HERRAMIENTAS, EQUIPOS MENORES) ── */}
      <div
        style={{
          background: '#0a122c',
          padding: '12px 24px',
          borderBottom: '1px solid #1e335a',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '11px', color: '#7096b8', textTransform: 'uppercase', fontWeight: 700 }}>
          Módulo de Destino:
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveModule('equipos')}
            style={{
              background: activeModule === 'equipos' ? '#00d4ff' : '#141f4d',
              color: activeModule === 'equipos' ? '#080d1f' : '#c8daf0',
              border: '1px solid #2a4372',
              borderRadius: '20px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🔧 1. Equipos en Préstamo
          </button>
          <button
            onClick={() => setActiveModule('herramientas')}
            style={{
              background: activeModule === 'herramientas' ? '#00d4ff' : '#141f4d',
              color: activeModule === 'herramientas' ? '#080d1f' : '#c8daf0',
              border: '1px solid #2a4372',
              borderRadius: '20px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            🧰 2. Herramientas
          </button>
          <button
            onClick={() => setActiveModule('equiposmenores')}
            style={{
              background: activeModule === 'equiposmenores' ? '#00d4ff' : '#141f4d',
              color: activeModule === 'equiposmenores' ? '#080d1f' : '#c8daf0',
              border: '1px solid #2a4372',
              borderRadius: '20px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ⚙️ 3. Equipos Menores
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* ── MÉTODOS 1 Y 2 (CARDS SUPERIORES EXACTAS A LA IMAGEN) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* Tarjeta Método 1 */}
          <div
            onClick={() => {
              stopCamera();
              setActiveMethod('upload');
            }}
            style={{
              background: activeMethod === 'upload' ? '#ffffff' : '#0e183e',
              border: activeMethod === 'upload' ? '2px solid #0940cd' : '1px solid #1e335a',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeMethod === 'upload' ? '0 4px 20px rgba(9, 64, 205, 0.25)' : 'none',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: '#0940cd',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}
            >
              📄
            </div>
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: activeMethod === 'upload' ? '#0940cd' : '#7096b8',
                  letterSpacing: '0.4px',
                }}
              >
                MÉTODO 1 {activeMethod === 'upload' && '✓'}
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: activeMethod === 'upload' ? '#080d1f' : '#ffffff',
                  marginTop: '2px',
                }}
              >
                Cargar Documento (PDF o Imagen)
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: activeMethod === 'upload' ? '#4a5568' : '#7096b8',
                  marginTop: '2px',
                }}
              >
                Soporta Facturas PDF, DTEs oficiales, fotos JPG, PNG o WEBP
              </div>
            </div>
          </div>

          {/* Tarjeta Método 2 */}
          <div
            onClick={startCamera}
            style={{
              background: activeMethod === 'camera' ? '#ffffff' : '#0e183e',
              border: activeMethod === 'camera' ? '2px solid #0940cd' : '1px solid #1e335a',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeMethod === 'camera' ? '0 4px 20px rgba(9, 64, 205, 0.25)' : 'none',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: activeMethod === 'camera' ? '#0940cd' : '#142555',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}
            >
              📷
            </div>
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: activeMethod === 'camera' ? '#0940cd' : '#7096b8',
                  letterSpacing: '0.4px',
                }}
              >
                MÉTODO 2 {activeMethod === 'camera' && '✓'}
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: activeMethod === 'camera' ? '#080d1f' : '#ffffff',
                  marginTop: '2px',
                }}
              >
                Escanear con Cámara en Vivo
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: activeMethod === 'camera' ? '#4a5568' : '#7096b8',
                  marginTop: '2px',
                }}
              >
                Captura directa con cámara web o cámara del celular / tablet
              </div>
            </div>
          </div>
        </div>

        {/* ── CUERPO PRINCIPAL: 2 COLUMNAS (IZQUIERDA: ENTRADA DOC, DERECHA: REGISTRO EXTRAÍDO) ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '440px 1fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* COLUMNA IZQUIERDA: SELECTORES Y CARGA */}
          <div>
            {/* Tipo de Documento */}
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#7096b8',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              TIPO DE DOCUMENTO A PROCESAR
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '18px' }}>
              {(['FACTURA', 'GUÍA DESPACHO', 'ORDEN COMPRA'] as DocumentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: docType === t ? '#0940cd' : '#0a122c',
                    color: docType === t ? '#ffffff' : '#8ab0cc',
                    border: docType === t ? '1px solid #0940cd' : '1px solid #1e335a',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Selector de Documento Header */}
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#7096b8',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              SELECCIONA TU DOCUMENTO (PDF, JPG, PNG, WEBP)
            </div>

            {/* Zona de Arrastre / Carga o Cámara en Vivo */}
            {activeMethod === 'upload' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed #00d4ff' : '2px dashed #2a4372',
                  borderRadius: '12px',
                  background: isDragging ? 'rgba(0, 212, 255, 0.05)' : '#080d1f',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '16px',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#0f2452',
                    border: '1px solid #20458a',
                    color: '#00d4ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    fontSize: '22px',
                  }}
                >
                  ⬆
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  {selectedFile ? selectedFile.name : 'Haz clic o arrastra el archivo aquí'}
                </div>
                <div style={{ fontSize: '11px', color: '#7096b8' }}>
                  {selectedFile
                    ? `Tamaño: ${selectedFile.size} · Listo para interpretar`
                    : 'Acepta documentos digitales en PDF o fotos escaneadas en JPG / PNG / WEBP'}
                </div>
              </div>
            ) : (
              <div
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#000000',
                  border: '2px solid #2a4372',
                  marginBottom: '16px',
                  position: 'relative',
                }}
              >
                <video ref={videoRef} playsInline autoPlay muted style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '2px dashed rgba(0, 212, 255, 0.6)',
                    margin: '12px',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    padding: '8px',
                    display: 'flex',
                    justifyContent: 'center',
                    background: '#080d1f',
                  }}
                >
                  <button
                    onClick={capturePhoto}
                    style={{
                      background: '#0940cd',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#ffffff',
                      padding: '8px 16px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    📸 Capturar Fotografía
                  </button>
                </div>
              </div>
            )}

            {/* Botón Principal: Interpretar y Extraer Datos del Documento */}
            <button
              onClick={handleExtractData}
              disabled={isProcessing}
              style={{
                width: '100%',
                background: isProcessing
                  ? '#304c89'
                  : 'linear-gradient(135deg, #74a0ff 0%, #4175fc 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(65, 117, 252, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              <span>{isProcessing ? '⏳' : '✨'}</span>
              <span>{isProcessing ? 'Interpretando Documento con IA...' : 'Interpretar y Extraer Datos del Documento'}</span>
            </button>

            {errorMsg && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  background: 'rgba(255, 77, 109, 0.12)',
                  border: '1px solid #ff4d6d',
                  borderRadius: '6px',
                  color: '#ff4d6d',
                  fontSize: '11px',
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: REGISTRO EXTRAÍDO (100% MODIFICABLE) */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '12px',
              }}
            >
              <span>📄</span>
              <span>Registro Extraído (100% Modificable)</span>
            </div>

            {!hasExtracted ? (
              /* ESTADO VACÍO (EXACTO A LA IMAGEN) */
              <div
                style={{
                  border: '2px dashed #20355c',
                  borderRadius: '12px',
                  padding: '70px 24px',
                  textAlign: 'center',
                  background: '#080e23',
                  minHeight: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '8px',
                    border: '2px solid #335084',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    color: '#7096b8',
                    marginBottom: '14px',
                  }}
                >
                  📄
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#c8daf0', marginBottom: '6px' }}>
                  Aún no se ha realizado ninguna lectura de documento.
                </div>
                <div style={{ fontSize: '11.5px', color: '#7096b8', maxWidth: '380px', lineHeight: 1.45 }}>
                  Carga un archivo (PDF o Imagen) o captura con la cámara para activar el reconocimiento inteligente de
                  columnas del Hospital HAH.
                </div>
              </div>
            ) : (
              /* FORMULARIO ESTRUCTURADO 100% MODIFICABLE */
              <div
                style={{
                  background: '#080e23',
                  border: '1px solid #1e335a',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                    borderBottom: '1px solid #1e335a',
                    paddingBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#00cc55', fontWeight: 700 }}>
                    ✅ Datos extraídos automáticamente · Puedes corregir cualquier campo
                  </span>
                  <span style={{ fontSize: '11px', color: '#7096b8' }}>
                    Doc: <b>{docType}</b>
                  </span>
                </div>

                {/* SECCIÓN MULTI-ÍTEM UNIFICADA Y COMPLETA PARA TODOS LOS MÓDULOS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* 1. CABECERA GENERAL DEL DOCUMENTO */}
                  <div
                    style={{
                      background: '#0e1838',
                      border: '1px solid #1e335a',
                      borderRadius: '10px',
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                        borderBottom: '1px solid #1f3763',
                        paddingBottom: '6px',
                      }}
                    >
                      <span style={{ fontSize: '11px', color: '#00d4ff', fontWeight: 700, textTransform: 'uppercase' }}>
                        📑 Datos Generales del Documento (Cabecera Común)
                      </span>
                      <span style={{ fontSize: '11px', color: '#8aa8c9' }}>
                        Módulo: <b>{activeModule === 'equiposmenores' ? 'Equipos Menores' : activeModule === 'herramientas' ? 'Herramientas' : 'Equipos en Préstamo'}</b>
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '10.5px', color: '#7096b8', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                          Fecha Emisión / Guía
                        </label>
                        <input
                          type="date"
                          className="field-input"
                          value={docHeader.fecha || today()}
                          onChange={(e) => setDocHeader({ ...docHeader, fecha: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10.5px', color: '#00d4ff', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                          N° Guía de Despacho *
                        </label>
                        <input
                          className="field-input"
                          style={{ borderColor: '#00d4ff', color: '#00d4ff', fontWeight: 700 }}
                          value={docHeader.guia || ''}
                          placeholder="Ej. 0000046950"
                          onChange={(e) => setDocHeader({ ...docHeader, guia: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10.5px', color: '#7096b8', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                          N° Factura
                        </label>
                        <input
                          className="field-input"
                          value={docHeader.factura || ''}
                          placeholder="Ej. FAC-4819"
                          onChange={(e) => setDocHeader({ ...docHeader, factura: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10.5px', color: '#7096b8', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                          N° Orden Compra (OC)
                        </label>
                        <input
                          className="field-input"
                          value={docHeader.oc || ''}
                          placeholder="Ej. OC-2024-912 / NUEVO"
                          onChange={(e) => setDocHeader({ ...docHeader, oc: e.target.value })}
                        />
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ fontSize: '10.5px', color: '#ffcc00', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                          Proveedor / Empresa Emisora
                        </label>
                        <input
                          className="field-input"
                          style={{ borderColor: '#ffcc00', fontWeight: 600, color: '#fff' }}
                          value={docHeader.institucionExterna || ''}
                          placeholder="Ej. GHC Global Health Care SpA"
                          onChange={(e) => setDocHeader({ ...docHeader, institucionExterna: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10.5px', color: '#7096b8', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                          Servicio Destino HAH
                        </label>
                        <input
                          className="field-input"
                          value={docHeader.servicioDestino || ''}
                          placeholder="Ej. HOSPITAL DE ALTO HOSPICIO / UCI"
                          onChange={(e) => setDocHeader({ ...docHeader, servicioDestino: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10.5px', color: '#7096b8', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                          Funcionario Receptor
                        </label>
                        <input
                          className="field-input"
                          value={docHeader.quienRecibe || ''}
                          placeholder="Ej. Erik Faundes"
                          onChange={(e) => setDocHeader({ ...docHeader, quienRecibe: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. BARRA DE CONTROL DE ÍTEMS DETECTADOS */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #0e234e 0%, #15336c 100%)',
                      border: '1px solid #234f9a',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>📦</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                          Se detectaron {docItems.length} productos / ítems en este documento
                        </span>
                        <span
                          style={{
                            background: '#00cc55',
                            color: '#041d0f',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 800,
                          }}
                        >
                          {docItems.length} Ítems
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0c4f0', marginTop: '3px' }}>
                        Puedes modificar directamente cualquier celda o agregar más productos antes de guardar en el sistema.
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setItemDisplayMode('table')}
                        style={{
                          background: itemDisplayMode === 'table' ? '#00d4ff' : '#0d1838',
                          color: itemDisplayMode === 'table' ? '#060f24' : '#c8daf0',
                          border: '1px solid #2a4c84',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        📊 Vista Tabla Completa ({docItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemDisplayMode('detail')}
                        style={{
                          background: itemDisplayMode === 'detail' ? '#00d4ff' : '#0d1838',
                          color: itemDisplayMode === 'detail' ? '#060f24' : '#c8daf0',
                          border: '1px solid #2a4c84',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        📝 Ficha por Producto
                      </button>
                      <button
                        type="button"
                        onClick={handleAddDocItem}
                        style={{
                          background: '#183c28',
                          color: '#00ff88',
                          border: '1px solid #00cc55',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ➕ Agregar Ítem
                      </button>
                    </div>
                  </div>

                  {/* 3. VISTA 1: TABLA COMPLETA DE TODOS LOS ÍTEMS */}
                  {itemDisplayMode === 'table' && (
                    <div
                      style={{
                        background: '#091129',
                        border: '1px solid #1a2f55',
                        borderRadius: '10px',
                        overflowX: 'auto',
                      }}
                    >
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', color: '#c8daf0' }}>
                        <thead>
                          <tr style={{ background: '#0e1c3e', borderBottom: '1px solid #223f72', color: '#88aed4', textAlign: 'left' }}>
                            <th style={{ padding: '8px 6px', width: '32px', textAlign: 'center' }}>#</th>
                            <th style={{ padding: '8px 8px', minWidth: '220px' }}>Nombre / Descripción del Producto *</th>
                            <th style={{ padding: '8px 6px', width: '90px' }}>Marca</th>
                            <th style={{ padding: '8px 6px', width: '90px' }}>Modelo</th>
                            <th style={{ padding: '8px 6px', width: '95px' }}>N° Serie</th>
                            <th style={{ padding: '8px 6px', width: '95px' }}>Lote</th>
                            <th style={{ padding: '8px 6px', width: '55px', textAlign: 'center' }}>Cant.</th>
                            <th style={{ padding: '8px 6px', width: '90px', textAlign: 'right' }}>Val. Unit. ($)</th>
                            <th style={{ padding: '8px 6px', width: '95px', textAlign: 'right' }}>Total ($)</th>
                            <th style={{ padding: '8px 6px', width: '40px', textAlign: 'center' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {docItems.map((it, idx) => (
                            <tr
                              key={it.id || idx}
                              style={{
                                borderBottom: '1px solid #152747',
                                background: idx % 2 === 0 ? 'rgba(10, 18, 42, 0.6)' : 'rgba(15, 27, 60, 0.6)',
                              }}
                            >
                              <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700, color: '#00d4ff' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  className="field-input"
                                  style={{ padding: '4px 6px', fontSize: '11px', color: '#fff', fontWeight: 600 }}
                                  value={it.nombreEquipo || ''}
                                  onChange={(e) => handleUpdateDocItem(idx, 'nombreEquipo', e.target.value)}
                                  placeholder="Descripción del ítem..."
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  className="field-input"
                                  style={{ padding: '4px 6px', fontSize: '11px' }}
                                  value={it.marca || ''}
                                  onChange={(e) => handleUpdateDocItem(idx, 'marca', e.target.value)}
                                  placeholder="Marca"
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  className="field-input"
                                  style={{ padding: '4px 6px', fontSize: '11px' }}
                                  value={it.modelo || ''}
                                  onChange={(e) => handleUpdateDocItem(idx, 'modelo', e.target.value)}
                                  placeholder="Modelo"
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  className="field-input"
                                  style={{ padding: '4px 6px', fontSize: '11px' }}
                                  value={it.serie || ''}
                                  onChange={(e) => handleUpdateDocItem(idx, 'serie', e.target.value)}
                                  placeholder="N° Serie"
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  className="field-input"
                                  style={{ padding: '4px 6px', fontSize: '11px' }}
                                  value={it.lote || ''}
                                  onChange={(e) => handleUpdateDocItem(idx, 'lote', e.target.value)}
                                  placeholder="Lote"
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  type="number"
                                  min="1"
                                  className="field-input"
                                  style={{ padding: '4px 4px', fontSize: '11px', textAlign: 'center', fontWeight: 700, color: '#00ff88' }}
                                  value={it.cantidad ?? 1}
                                  onChange={(e) => handleUpdateDocItem(idx, 'cantidad', e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '6px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  className="field-input"
                                  style={{ padding: '4px 4px', fontSize: '11px', textAlign: 'right', color: '#ffcc00' }}
                                  value={it.valorUnitario ?? 0}
                                  onChange={(e) => handleUpdateDocItem(idx, 'valorUnitario', e.target.value)}
                                />
                              </td>
                              <td style={{ padding: '6px', textAlign: 'right', fontWeight: 700, color: '#00d4ff' }}>
                                {fmtMoney(it.costoTotal || (it.cantidad || 1) * (it.valorUnitario || 0))}
                              </td>
                              <td style={{ padding: '6px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDocItem(idx)}
                                  title="Eliminar este ítem"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ff4d6d',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                  }}
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* RESUMEN DE TOTALES */}
                      <div
                        style={{
                          background: '#0d1838',
                          padding: '10px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid #1f3763',
                          fontSize: '12px',
                        }}
                      >
                        <span style={{ color: '#88aed4' }}>
                          Total de Productos: <b style={{ color: '#fff' }}>{docItems.length}</b> · Unidades Totales:{' '}
                          <b style={{ color: '#00ff88' }}>
                            {docItems.reduce((acc, it) => acc + (Number(it.cantidad) || 1), 0)}
                          </b>
                        </span>
                        <span>
                          <span style={{ color: '#88aed4', marginRight: '8px' }}>Costo Total Guía:</span>
                          <b style={{ color: '#00d4ff', fontSize: '14px' }}>
                            {fmtMoney(docItems.reduce((acc, it) => acc + (Number(it.costoTotal) || 0), 0))}
                          </b>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4. VISTA 2: DETALLE FICHA POR ÍTEM */}
                  {itemDisplayMode === 'detail' && (
                    <div>
                      {/* Píldoras selectoras de ítem */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {docItems.map((it, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveItemIndex(idx)}
                            style={{
                              background: activeItemIndex === idx ? '#00d4ff' : '#101d42',
                              color: activeItemIndex === idx ? '#050f24' : '#c8daf0',
                              border: '1px solid #23477d',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '11.5px',
                              fontWeight: activeItemIndex === idx ? 800 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>#{idx + 1}</span>
                            <span>{it.nombreEquipo ? it.nombreEquipo.slice(0, 22) + (it.nombreEquipo.length > 22 ? '...' : '') : 'Producto'}</span>
                            <span style={{ opacity: 0.8, fontSize: '10px' }}>({it.cantidad} uds)</span>
                          </button>
                        ))}
                      </div>

                      {/* Formulario del ítem activo */}
                      {docItems[activeItemIndex] && (
                        <div
                          style={{
                            background: '#091129',
                            border: '1px solid #1a2f55',
                            borderRadius: '10px',
                            padding: '14px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                          }}
                        >
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '11px', color: '#7096b8', textTransform: 'uppercase' }}>
                              Nombre o Descripción del Ítem #{activeItemIndex + 1} *
                            </label>
                            <input
                              className="field-input"
                              style={{ fontWeight: 600, color: '#fff' }}
                              value={docItems[activeItemIndex].nombreEquipo || ''}
                              onChange={(e) => handleUpdateDocItem(activeItemIndex, 'nombreEquipo', e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', color: '#7096b8', textTransform: 'uppercase' }}>Marca</label>
                            <input
                              className="field-input"
                              value={docItems[activeItemIndex].marca || ''}
                              onChange={(e) => handleUpdateDocItem(activeItemIndex, 'marca', e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', color: '#7096b8', textTransform: 'uppercase' }}>Modelo</label>
                            <input
                              className="field-input"
                              value={docItems[activeItemIndex].modelo || ''}
                              onChange={(e) => handleUpdateDocItem(activeItemIndex, 'modelo', e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', color: '#7096b8', textTransform: 'uppercase' }}>N° Serie</label>
                            <input
                              className="field-input"
                              value={docItems[activeItemIndex].serie || ''}
                              onChange={(e) => handleUpdateDocItem(activeItemIndex, 'serie', e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', color: '#7096b8', textTransform: 'uppercase' }}>Lote</label>
                            <input
                              className="field-input"
                              value={docItems[activeItemIndex].lote || ''}
                              onChange={(e) => handleUpdateDocItem(activeItemIndex, 'lote', e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', color: '#7096b8', textTransform: 'uppercase' }}>Cantidad</label>
                            <input
                              type="number"
                              min="1"
                              className="field-input"
                              value={docItems[activeItemIndex].cantidad ?? 1}
                              onChange={(e) => handleUpdateDocItem(activeItemIndex, 'cantidad', e.target.value)}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', color: '#7096b8', textTransform: 'uppercase' }}>Valor Unitario ($)</label>
                            <input
                              type="number"
                              min="0"
                              className="field-input"
                              value={docItems[activeItemIndex].valorUnitario ?? 0}
                              onChange={(e) => handleUpdateDocItem(activeItemIndex, 'valorUnitario', e.target.value)}
                            />
                          </div>

                          <div style={{ gridColumn: 'span 2' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: '#0e1838',
                                borderRadius: '6px',
                                border: '1px solid #1c3258',
                              }}
                            >
                              <span style={{ fontSize: '12px', color: '#88aed4' }}>Costo Total Calculado para este Ítem:</span>
                              <b style={{ color: '#00d4ff', fontSize: '13px' }}>
                                {fmtMoney(docItems[activeItemIndex].costoTotal || 0)}
                              </b>
                            </div>
                          </div>

                          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleSaveSingleItem(activeItemIndex)}
                              className="btn btn-cyan btn-sm"
                            >
                              💾 Guardar Sólo Ítem #{activeItemIndex + 1}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocItem(activeItemIndex)}
                              className="btn btn-red btn-sm"
                            >
                              🗑️ Eliminar Ítem #{activeItemIndex + 1}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 5. ACCIONES DE GUARDADO */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      marginTop: '8px',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#091129',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #1a2f55',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleReset}
                      className="btn"
                      style={{ background: '#141f4d', border: '1px solid #2a4372', color: '#c8daf0', fontSize: '12px' }}
                    >
                      🔄 Reintentar / Cargar Otro Documento
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleSaveToSystem}
                        className="btn btn-green"
                        style={{
                          fontSize: '13px',
                          padding: '10px 20px',
                          fontWeight: 800,
                          boxShadow: '0 4px 14px rgba(0, 204, 85, 0.35)',
                        }}
                      >
                        💾 Guardar Todos los Ítems ({docItems.length}) en {activeModule === 'equiposmenores' ? 'Equipos Menores' : activeModule === 'herramientas' ? 'Herramientas' : 'Trazabilidad'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
