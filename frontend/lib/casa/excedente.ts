/**
 * Excedente de EJ Casa (privado de cada persona). Centavos enteros.
 *
 *   excedente = ingreso − obligaciones asignadas − piso personal − cuotas del mes − gastos anuales / 12
 *
 * Los dos últimos términos son los que casi todas las apps se olvidan: si el número no los resta, miente.
 * Mientras el mes no cerró es una ESTIMACIÓN (faltan pagos y puede faltar ingreso): la pantalla lo dice.
 * La app hace la cuenta y muestra la consecuencia; qué conviene hacer con esa plata no lo decide ella.
 */
import { moverMes, type Mes } from './dinero';
import { equivalenteMensual, type OblPiso } from './piso';

export type IngresoMes = { monto: number; esperado_o_real: 'esperado' | 'real' };

/**
 * Ingreso del mes: el mayor entre lo cobrado y lo esperado. Así, si cargaste lo que esperabas cobrar y después
 * lo cobrado, el mismo ingreso no cuenta dos veces; y si cobraste más de lo esperado, manda lo cobrado.
 */
export function ingresoDelMes(ingresos: IngresoMes[]): { ingreso: number; cobrado: number; esperado: number } {
  const suma = (t: 'real' | 'esperado') => ingresos.filter((i) => i.esperado_o_real === t).reduce((s, i) => s + i.monto, 0);
  const cobrado = suma('real');
  const esperado = suma('esperado');
  return { ingreso: Math.max(cobrado, esperado), cobrado, esperado };
}

/** Lo asignado a una persona, separado en mensual/bimestral y anual (este último a 1/12 por mes). */
export function asignadoDetalle(obls: OblPiso[], personaId: string): { mensuales: number; anuales: number } {
  let mensuales = 0, anuales = 0;
  for (const o of obls) {
    if (o.responsable_id !== personaId) continue;
    const m = equivalenteMensual(o.monto_estimado, o.recurrencia);
    if (o.recurrencia === 'anual') anuales += m;
    else mensuales += m;
  }
  return { mensuales, anuales };
}

export type EntradasExcedente = {
  ingreso: number;
  asignadas: number;
  anuales: number;
  pisoPersonal: number;
  cuotas: number;
};

export function calcularExcedente(e: EntradasExcedente): number {
  return e.ingreso - e.asignadas - e.pisoPersonal - e.cuotas - e.anuales;
}

/** Reparte el excedente en deuda / ahorro e inversión / libre (porcentajes enteros; lo que sobra del redondeo va a "libre"). */
export function repartir(excedente: number, deudaPct: number, ahorroPct: number): { deuda: number; ahorro: number; libre: number } {
  if (excedente <= 0) return { deuda: 0, ahorro: 0, libre: 0 };
  const dp = Math.min(Math.max(Math.round(deudaPct), 0), 100);
  const ap = Math.min(Math.max(Math.round(ahorroPct), 0), 100 - dp);
  const deuda = Math.floor((excedente * dp) / 100);
  const ahorro = Math.floor((excedente * ap) / 100);
  return { deuda, ahorro, libre: excedente - deuda - ahorro };
}

/** Regla general difundida (no una recomendación para tu caso): apartar entre el 10% y el 20% de lo que entra. */
export function reglaDifundida(ingreso: number): { minimo: number; maximo: number } {
  return { minimo: Math.round(ingreso * 0.1), maximo: Math.round(ingreso * 0.2) };
}

/**
 * Cuándo terminarías de pagar las deudas sin cronograma si a lo que ya pagás por mes (ritmo actual)
 * le sumás `extra` por mes. Sin ritmo ni extra no hay fecha. No incluye intereses: no hay tasa cargada.
 */
export function salidaDeudas(saldoTotal: number, ritmoActual: number, extra: number, hoy: Mes): { meses: number; mesFin: Mes } | null {
  const porMes = ritmoActual + extra;
  if (saldoTotal <= 0 || porMes <= 0) return null;
  const meses = Math.ceil(saldoTotal / porMes);
  return { meses, mesFin: moverMes(hoy, meses) };
}
