export type Familia = 'ALI' | 'GOB' | 'EQM' | 'BOT' | string;
export type TipoProducto = 'Fijo' | 'Variable';
export type EstadoProducto = 'Activo' | 'Inactivo';

export interface FamiliaCatalogo {
  id: string; // ej. 'ALI', 'GOB', 'EQM', 'BOT' o creadas por usuario
  nombre: string;
  descripcion?: string;
  esFija?: boolean; // ALI, GOB, EQM, BOT son fijas del sistema
  color?: string;
}

export interface ScanResultData {
  modulo: 'equipos' | 'herramientas' | 'equiposmenores' | 'producto' | 'acta';
  tipoCodigo?: 'BARRA' | 'QR' | 'MANUAL';
  codigoEscaneado?: string;
  item: any;
}

export interface Producto {
  id: number;
  codigo: string;
  desc: string;
  familia: Familia;
  tipo: TipoProducto;
  stock: number;
  stockMin: number;
  valor: number;
  venc?: string;
  fechaIngreso?: string;
  estado: EstadoProducto;
}

export interface KardexMovimiento {
  id: string;
  fecha: string;
  fechaIngreso?: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  codigo: string;
  producto: string;
  guia: string;
  factura: string;
  oc: string;
  unidad: string;
  persona: string;
  cantidad: number;
  adjunto?: { nombre: string; tipo: string; data?: string } | null;
  adjuntos?: { nombre: string; tipo: string; data?: string }[];
  _saldoHistorico?: number;
}

export interface ItemDespacho {
  id: number;
  codigo: string;
  desc: string;
  familia: string;
  cantidad: number;
  maxStock?: number;
  sinCosto?: boolean;
  origenModulo?: 'producto' | 'equipos' | 'herramientas' | 'equiposmenores' | 'sincosto';
  itemId?: string;
  valorUnitario?: number;
}

export interface ItemIngresoPistola {
  id: number | string;
  codigo: string;
  desc: string;
  familia: string;
  cantidad: number;
  stockActual: number;
  valorUnitario?: number;
  origenModulo?: 'producto' | 'equipos' | 'herramientas' | 'equiposmenores' | 'sincosto';
  itemId?: string;
  vencimiento?: string;
  ubicacion?: string;
}

export interface ActaSalida {
  id: string;
  fecha: string;
  servicio: string;
  nroSolicitud: string;
  responsable: string;
  nota?: string;
  items: ItemDespacho[];
}

export interface DespachoSinCosto {
  id: string;
  fecha: string;
  cantidad: number;
  servicio: string;
  responsable: string;
  observacion?: string;
}

export interface SinCostoMovimiento {
  id: string;
  fecha: string;
  fechaIngreso?: string;
  tipo: 'ENTRADA' | 'SALIDA';
  codigo: string;
  desc: string;
  familia: string;
  guia: string;
  factura: string;
  oc: string;
  cantidad: number;
  unidad?: string;
  persona?: string;
  estado?: string;
  despachos?: DespachoSinCosto[];
  adjunto?: { id?: string; fileId?: string; nombre: string; tipo: string; data?: string };
  adjuntos?: { id?: string; fileId?: string; nombre: string; tipo: string; data?: string }[];
}

export interface TrazabilidadEquipo {
  id: string;
  codigo?: string; // Código local QR y Barras (ej. TRZ-EQ-001)
  fecha?: string;
  guia?: string;
  factura?: string;
  oc?: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  nSerie: string;
  lote?: string;
  cantidad?: number;
  finalidad: string;
  institucionExterna: string; // Empresa Emisora / Proveedor / Institución (ej. GHC Global Health Care SpA)
  servClinico: string;
  servicioDestino?: string; // Alias para compatibilidad con planillas
  quienRecibe?: string;
  personaRecibe?: string; // Alias para compatibilidad con planillas
  mantPreventivo: string;
  accesorios: string;
  ingresoRetiro: string;
  valorUnitario?: number;
  costoTotal?: number;
  observaciones: string;
  adjunto?: { nombre: string; tipo: string; data?: string } | null;
  despachos?: DespachoSinCosto[];
}

export interface Herramienta {
  id: string;
  codigo?: string; // Código local QR y Barras (ej. TRZ-HER-001)
  fecha: string;
  descripcion: string;
  guia: string;
  factura: string;
  oc: string;
  cantidad: number;
  servicioDestino: string;
  servClinico?: string;
  personaRecibe: string;
  quienRecibe?: string;
  valorUnitario: number;
  costoTotal: number;
  adjunto?: { nombre: string; tipo: string; data?: string } | null;
  documentoAdjunto?: any;
  despachos?: DespachoSinCosto[];
}

export interface EquipoMenor {
  id: string;
  codigo?: string; // Código local QR y Barras (ej. TRZ-EQM-001)
  fecha: string;
  nombreEquipo: string;
  marca: string;
  modelo: string;
  serie: string;
  lote: string;
  guia: string;
  factura: string;
  oc: string;
  cantidad: number;
  servicioDestino: string;
  servClinico?: string;
  quienRecibe: string;
  personaRecibe?: string;
  valorUnitario: number;
  costoTotal: number;
  adjunto?: { nombre: string; tipo: string; data?: string } | null;
  documentoAdjunto?: any;
  despachos?: DespachoSinCosto[];
}
