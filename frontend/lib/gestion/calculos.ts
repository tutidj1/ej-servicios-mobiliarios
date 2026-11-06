// Lógica de negocio de la gestión de alquileres (sin dependencias de React ni de Supabase).
// Los montos se calculan en centavos enteros para no arrastrar errores de coma flotante.

export type EstadoEvento = 'presupuesto' | 'confirmado' | 'entregado' | 'devuelto' | 'cancelado';
export type Sugerencia = 'personas' | 'mesas' | 'ninguna';

export const ESTADOS_EVENTO: EstadoEvento[] = ['presupuesto', 'confirmado', 'entregado', 'devuelto', 'cancelado'];
export const ESTADOS_QUE_RESERVAN: EstadoEvento[] = ['confirmado', 'entregado'];

export interface LineaCalculo {
  cantidad_total: number;
  cantidad_subalquilada: number;
  precio_unitario: number | string | null;
  costo_subalquiler_unitario: number | string | null;
}

export interface CostoCalculo {
  tipo: string;
  monto: number | string;
}

export interface PagoCalculo {
  monto: number | string;
}

/** Pasa un monto (número o texto numérico de Postgres) a centavos enteros. Vacío → 0. */
export function aCentavos(valor: number | string | null | undefined): number {
  if (valor === null || valor === undefined || valor === '') return 0;
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function dePesos(centavos: number): number {
  return centavos / 100;
}

/**
 * Reparte la cantidad pedida entre stock propio y subalquiler.
 * propias = min(total, disponible en todo el rango); el resto se subalquila.
 */
export function repartirCantidad(total: number, disponibleRango: number): { propia: number; subalquilada: number } {
  const t = Math.max(0, Math.floor(total || 0));
  const libre = Math.max(0, Math.floor(disponibleRango || 0));
  const propia = Math.min(t, libre);
  return { propia, subalquilada: t - propia };
}

/** Aporte de una línea: lo que se cobra menos lo que cuesta subalquilar (en centavos). */
export function aporteLinea(l: LineaCalculo) {
  const ingreso = l.cantidad_total * aCentavos(l.precio_unitario);
  const costoSubalquiler = l.cantidad_subalquilada * aCentavos(l.costo_subalquiler_unitario);
  return { ingreso, costoSubalquiler, aporte: ingreso - costoSubalquiler };
}

export type EstadoCobro = 'sin cobrar' | 'señado' | 'pagado' | 'pagado de más';

export interface ResultadoEvento {
  ingresoArticulos: number;
  fleteCobrado: number;
  ingresos: number;
  costoSubalquiler: number;
  fletePagado: number;
  otrosCostos: number;
  costos: number;
  ganancia: number;
  /** Ganancia / ingresos, de 0 a 1. null si no hay ingresos. */
  margen: number | null;
  pagado: number;
  saldo: number;
  estadoCobro: EstadoCobro;
}

/**
 * Ganancia neta = Σ(total × precio) + flete cobrado − Σ(subalquiladas × costo) − flete pagado − otros costos.
 * Todos los importes devueltos están en centavos.
 */
export function resultadoEvento(params: {
  lineas: LineaCalculo[];
  fleteCobrado: number | string | null;
  costos: CostoCalculo[];
  pagos: PagoCalculo[];
}): ResultadoEvento {
  let ingresoArticulos = 0;
  let costoSubalquiler = 0;
  for (const l of params.lineas) {
    const a = aporteLinea(l);
    ingresoArticulos += a.ingreso;
    costoSubalquiler += a.costoSubalquiler;
  }
  const fleteCobrado = aCentavos(params.fleteCobrado);
  let fletePagado = 0;
  let otrosCostos = 0;
  for (const c of params.costos) {
    if (c.tipo === 'flete') fletePagado += aCentavos(c.monto);
    else otrosCostos += aCentavos(c.monto);
  }
  const ingresos = ingresoArticulos + fleteCobrado;
  const costos = costoSubalquiler + fletePagado + otrosCostos;
  const ganancia = ingresos - costos;
  const pagado = params.pagos.reduce((s, p) => s + aCentavos(p.monto), 0);
  const saldo = ingresos - pagado;
  let estadoCobro: EstadoCobro = 'sin cobrar';
  if (pagado > 0 && saldo > 0) estadoCobro = 'señado';
  else if (pagado > 0 && saldo === 0) estadoCobro = 'pagado';
  else if (saldo < 0) estadoCobro = 'pagado de más';
  return {
    ingresoArticulos,
    fleteCobrado,
    ingresos,
    costoSubalquiler,
    fletePagado,
    otrosCostos,
    costos,
    ganancia,
    margen: ingresos > 0 ? ganancia / ingresos : null,
    pagado,
    saldo,
    estadoCobro,
  };
}

/** Motivos por los que todavía no se puede generar presupuesto ni contrato. Vacío = listo. */
export function faltantesParaDocumento(params: {
  nombreLocatario: string | null | undefined;
  fechaEvento: string | null | undefined;
  fechaDevolucion: string | null | undefined;
  lineas: (LineaCalculo & { nombre?: string })[];
}): string[] {
  const faltan: string[] = [];
  if (!params.nombreLocatario?.trim()) faltan.push('Falta el nombre del cliente.');
  if (!params.fechaEvento) faltan.push('Falta la fecha del evento.');
  if (!params.fechaDevolucion) faltan.push('Falta la fecha de devolución.');
  for (const l of params.lineas) {
    if (l.cantidad_total > 0 && (l.precio_unitario === null || l.precio_unitario === '')) {
      faltan.push(`Falta el precio de ${l.nombre ?? 'un artículo'}.`);
    }
  }
  return faltan;
}

/** Cantidad sugerida por el asistente (nunca se aplica sin que la operadora la confirme). */
export function sugerirCantidad(sugerencia: Sugerencia, personas: number, personasPorMesa: number): number | null {
  if (!personas || personas <= 0) return null;
  if (sugerencia === 'personas') return personas;
  if (sugerencia === 'mesas') return Math.ceil(personas / Math.max(1, personasPorMesa));
  return null;
}

// ---------------------------------------------------------------------------
// Fechas de alquiler: son días sin hora (YYYY-MM-DD). Se opera en UTC para que
// el horario de verano / zona horaria del celular no corra un día.
// ---------------------------------------------------------------------------
function parseDia(dia: string): number {
  const [y, m, d] = dia.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function sumarDias(dia: string, n: number): string {
  return new Date(parseDia(dia) + n * 86400000).toISOString().slice(0, 10);
}

export function diasDelRango(desde: string, hasta: string): string[] {
  const res: string[] = [];
  for (let t = parseDia(desde); t <= parseDia(hasta); t += 86400000) {
    res.push(new Date(t).toISOString().slice(0, 10));
  }
  return res;
}

export function rangosSeCruzan(a: { desde: string; hasta: string }, b: { desde: string; hasta: string }): boolean {
  return a.desde <= b.hasta && b.desde <= a.hasta;
}

/** Hoy en Argentina, como YYYY-MM-DD. */
export function hoyArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------
const FORMATO_PESOS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });

export function pesos(centavos: number): string {
  return FORMATO_PESOS.format(centavos / 100);
}

export function fechaCorta(dia: string | null | undefined): string {
  if (!dia) return '—';
  const [y, m, d] = dia.split('-');
  return `${d}/${m}/${y}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function nombreMes(mes0: number): string {
  return MESES[mes0];
}

export function fechaLarga(dia: string): string {
  const t = new Date(parseDia(dia));
  const texto = `${DIAS_SEMANA[t.getUTCDay()]} ${t.getUTCDate()} de ${MESES[t.getUTCMonth()]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
