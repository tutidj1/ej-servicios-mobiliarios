/**
 * Objetivos personales de EJ Casa (privados). Centavos enteros.
 * Un objetivo en dólares se alimenta con aportes en pesos al tipo de cambio DEL DÍA del aporte,
 * y ese valor queda guardado: no se recalcula con la cotización de hoy.
 */
import { fechaLocalISO, haceDias, moverMes, type Mes } from './dinero';
import type { MonedaCasa } from './inversiones';

export type Objetivo = { id: string; nombre: string; meta: number; moneda: MonedaCasa; fecha_objetivo: string | null };

export type MovObjetivo = {
  objetivo_id: string;
  monto: number;
  moneda: MonedaCasa;
  tc_del_dia: number | null;
  tipo: 'aporte' | 'retiro';
  fecha: string;
};

const firmado = (m: Pick<MovObjetivo, 'monto' | 'tipo'>) => (m.tipo === 'aporte' ? m.monto : -m.monto);

/** Avance neto en la moneda del objetivo. */
export function acumulado(movs: Pick<MovObjetivo, 'monto' | 'tipo'>[]): number {
  return movs.reduce((t, m) => t + firmado(m), 0);
}

export function porcentajeAvance(meta: number, acum: number): number {
  if (meta <= 0) return 0;
  return Math.min(Math.max(Math.floor((acum * 100) / meta), 0), 100);
}

/** Pesos (centavos) → dólares (centavos) con el tipo de cambio del día (centavos de peso por dólar). */
export function dolaresDesdePesos(pesosCentavos: number, tcCentavos: number): number {
  return Math.round((pesosCentavos * 100) / tcCentavos);
}

/** Lo que valen en pesos los movimientos en dólares, con el TC que quedó guardado en cada uno. */
export function equivalenteEnPesos(movs: MovObjetivo[]): number {
  return movs.reduce((t, m) => {
    if (m.moneda === 'ARS') return t + firmado(m);
    if (m.tc_del_dia === null) return t;
    return t + (m.tipo === 'aporte' ? 1 : -1) * Math.round((m.monto * m.tc_del_dia) / 100);
  }, 0);
}

/** Aporte NETO por mes de los últimos 90 días (no el bruto: aportar 200 y retirar 150 es un ritmo de 50). */
export function ritmoNetoMensual(movs: MovObjetivo[], hoy: Date): number {
  const desde = fechaLocalISO(haceDias(hoy, 90));
  return Math.round(acumulado(movs.filter((m) => m.fecha >= desde)) / 3);
}

export type Proyeccion = { estado: 'alcanzado' } | { estado: 'sin_ritmo' } | { estado: 'llega'; mes: Mes; meses: number };

export function proyeccionObjetivo(meta: number, acum: number, ritmo: number, hoy: Date): Proyeccion {
  if (acum >= meta) return { estado: 'alcanzado' };
  if (ritmo <= 0) return { estado: 'sin_ritmo' };
  const meses = Math.ceil((meta - acum) / ritmo);
  return { estado: 'llega', mes: moverMes({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 }, meses), meses };
}
