import type { EstadoEvento, Sugerencia } from './calculos';

export type Categoria = 'mobiliario' | 'vajilla' | 'mantelería' | 'otros';
export const CATEGORIAS: Categoria[] = ['mobiliario', 'vajilla', 'mantelería', 'otros'];

export type Canal = 'web' | 'instagram' | 'facebook' | 'whatsapp' | 'recomendación' | 'otro';
export const CANALES: Canal[] = ['web', 'instagram', 'facebook', 'whatsapp', 'recomendación', 'otro'];

export type TipoCosto = 'flete' | 'lavado' | 'rotura' | 'ayudante' | 'otro';
export const TIPOS_COSTO: TipoCosto[] = ['flete', 'lavado', 'rotura', 'ayudante', 'otro'];

export type TipoPago = 'seña' | 'saldo' | 'otro';
export const TIPOS_PAGO: TipoPago[] = ['seña', 'saldo', 'otro'];

export type MedioPago = 'efectivo' | 'transferencia' | 'otro';
export const MEDIOS_PAGO: MedioPago[] = ['efectivo', 'transferencia', 'otro'];

export interface Item {
  id: string;
  nombre: string;
  categoria: Categoria;
  stock_total: number;
  orden_contrato: number | null;
  costo_compra_unitario: number | null;
  activo: boolean;
  alias: string[];
  sugerencia: Sugerencia;
}

export interface Cliente {
  id: string;
  nombre_apellido: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  canal_origen: Canal;
  lead_id: string | null;
  notas: string | null;
  created_at?: string;
}

export interface Evento {
  id: string;
  cliente_id: string;
  lugar: string | null;
  tipo_evento: string | null;
  cantidad_personas: number | null;
  fecha_evento: string;
  fecha_entrega: string;
  fecha_devolucion: string;
  estado: EstadoEvento;
  flete_cobrado: number;
  notas: string | null;
  cerrado_en: string | null;
  created_at?: string;
}

export interface EventoConCliente extends Evento {
  clientes: Pick<Cliente, 'id' | 'nombre_apellido' | 'telefono' | 'canal_origen'> | null;
}

export interface Linea {
  id?: string;
  evento_id?: string;
  item_id: string;
  cantidad_total: number;
  cantidad_propia: number;
  cantidad_subalquilada: number;
  precio_unitario: number | null;
  costo_subalquiler_unitario: number | null;
}

export interface Costo {
  id?: string;
  evento_id?: string;
  tipo: TipoCosto;
  monto: number;
  descripcion: string | null;
  fecha: string;
}

export interface Pago {
  id?: string;
  evento_id?: string;
  tipo: TipoPago;
  monto: number;
  fecha: string;
  medio: MedioPago;
}

export interface FilaDisponibilidad {
  item_id: string;
  dia: string;
  stock_total: number;
  reservado: number;
  tentativo: number;
  disponible: number;
}

export interface Configuracion {
  personas_por_mesa: number;
  mostrar_ultimo_precio: boolean;
}

export const COLOR_ESTADO_EVENTO: Record<EstadoEvento, string> = {
  presupuesto: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-emerald-100 text-emerald-800',
  entregado: 'bg-sky-100 text-sky-800',
  devuelto: 'bg-stone-200 text-stone-700',
  cancelado: 'bg-red-100 text-red-700',
};

/** Convierte lo que escribe la persona ("1.500,50", "1500") a número, o null si está vacío. */
export function leerMonto(texto: string): number | null {
  const limpio = texto.trim().replace(/\$/g, '').replace(/\s/g, '');
  if (!limpio) return null;
  // Formato argentino: punto de miles y coma decimal
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio.replace(/\.(?=\d{3}(\D|$))/g, '');
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function mostrarMonto(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n);
}

/** Texto de error de Supabase entendible para la operadora. */
export function mensajeError(error: { message?: string } | null | undefined, porDefecto: string): string {
  const m = error?.message ?? '';
  // Los mensajes que escribimos en los triggers ya están en castellano
  if (/^(El evento|Hay artículos|Solo se puede|Sin permiso)/.test(m)) return m;
  if (/violates foreign key/.test(m)) return 'No se puede borrar: está en uso en otro registro.';
  if (/eventos_rango_fechas/.test(m)) return 'Revisá las fechas: la entrega va antes o el mismo día del evento, y la devolución después o el mismo día.';
  if (/duplicate key|unique/.test(m)) return 'Ya existe uno con ese nombre.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sin conexión. Revisá internet y probá de nuevo.';
  return porDefecto;
}
