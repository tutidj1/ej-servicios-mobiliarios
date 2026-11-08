/**
 * Cálculos de inversiones de EJ Casa. Centavos enteros.
 * Cada inversión muestra SIEMPRE dos rendimientos juntos: nominal y real. La app mide, no recomienda.
 */
import { fechaLocalISO, haceDias } from './dinero';

export type MonedaCasa = 'ARS' | 'USD';
export type ClaseInversion = 'plazo_fijo' | 'dolares' | 'acciones' | 'bien' | 'prestamo' | 'otro';

export type Inversion = {
  id: string;
  descripcion: string;
  clase: ClaseInversion;
  moneda: MonedaCasa;
  modo_valuacion: 'automatico' | 'externo' | 'manual';
  valor_actual: number;
  valuado_el: string | null;
  objetivo_id: string | null;
};

export type MovInversion = {
  inversion_id: string;
  monto: number;
  moneda: MonedaCasa;
  tc_del_dia: number | null;
  tipo: 'aporte' | 'retiro';
  fecha: string;
  mes_ipc: string;
};

export const CLASES: { valor: ClaseInversion; etiqueta: string }[] = [
  { valor: 'plazo_fijo', etiqueta: 'Plazo fijo' },
  { valor: 'dolares', etiqueta: 'Dólares' },
  { valor: 'acciones', etiqueta: 'Acciones / CEDEARs' },
  { valor: 'bien', etiqueta: 'Un bien' },
  { valor: 'prestamo', etiqueta: 'Plata prestada' },
  { valor: 'otro', etiqueta: 'Otro' },
];

/** Lo que se puso menos lo que se retiró (en la moneda de la inversión). */
export function netoAportado(movs: Pick<MovInversion, 'monto' | 'tipo'>[]): number {
  return movs.reduce((t, m) => t + (m.tipo === 'aporte' ? m.monto : -m.monto), 0);
}

export type Rendimiento = { ganancia: number; porcentaje: number };

/** Ganancia = valor actual − neto aportado. Porcentaje con un decimal. Null si no hay base para comparar. */
export function rendimiento(valorActual: number, base: number): Rendimiento | null {
  if (base <= 0) return null;
  const ganancia = valorActual - base;
  return { ganancia, porcentaje: Math.round((ganancia * 1000) / base) / 10 };
}

/** Pasados más de tres meses sin valuar, el número se marca como desactualizado. */
export function desactualizada(valuadoEl: string | null, hoy: Date): boolean {
  if (!valuadoEl) return true;
  return valuadoEl < fechaLocalISO(haceDias(hoy, 92));
}

export type IpcPorMes = Record<string, number>; // 'YYYY-MM-01' → índice

/**
 * Aportes y retiros expresados en pesos del último mes con IPC cargado (monto × IPC_actual / IPC_del_mes).
 * Devuelve los meses de IPC que faltan si alguno no está (en ese caso no hay rendimiento real: no se inventa).
 */
export function netoAjustadoPorIpc(
  movs: Pick<MovInversion, 'monto' | 'tipo' | 'mes_ipc'>[],
  ipc: IpcPorMes,
): { base: number; mesReferencia: string } | { faltan: string[] } {
  const meses = Object.keys(ipc).sort();
  if (meses.length === 0) return { faltan: ['(no hay IPC cargado)'] };
  const actual = meses[meses.length - 1];
  const faltan = Array.from(new Set(movs.map((m) => m.mes_ipc))).filter((m) => ipc[m] === undefined).sort();
  if (faltan.length) return { faltan };
  const base = movs.reduce((t, m) => {
    const ajustado = Math.round((m.monto * ipc[actual]) / ipc[m.mes_ipc]);
    return t + (m.tipo === 'aporte' ? ajustado : -ajustado);
  }, 0);
  return { base, mesReferencia: actual };
}
