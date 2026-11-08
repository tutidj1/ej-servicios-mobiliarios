/**
 * Transferencias a los hijos y costo de cada hijo. Centavos enteros.
 * El costo de cada hijo tiene dos partes que NO se mezclan:
 *   - uso personal: lo que se le transfiere (él decide cómo usarlo), con el desglose por adulto;
 *   - obligaciones a su nombre (gimnasio, club, escuela): ya vienen decididas.
 * Cada hijo es una tarjeta propia: no se ordenan ni se comparan entre hermanos.
 */
import { equivalenteMensual, type OblPiso } from './piso';

export type Transferencia = { id: string; hijo_id: string; pagador_id: string; monto: number; fecha: string; nota: string };
export type HijoFila = { id: string; nombre: string; persona_id: string | null };
export type OblHijo = OblPiso & { id: string; concepto: string };

export type CostoHijo = {
  hijo: HijoFila;
  usoPersonal: number;
  porAdulto: { id: string; monto: number }[];
  obligaciones: { id: string; concepto: string; mensual: number }[];
  totalObligaciones: number;
  total: number;
};

/** Costo de cada hijo en el período de las transferencias recibidas. Los hijos salen en el orden dado (no por costo). */
export function costoPorHijo(hijos: HijoFila[], transferencias: Transferencia[], obls: OblHijo[]): CostoHijo[] {
  return hijos.map((hijo) => {
    const mias = transferencias.filter((t) => t.hijo_id === hijo.id);
    const por = new Map<string, number>();
    for (const t of mias) por.set(t.pagador_id, (por.get(t.pagador_id) ?? 0) + t.monto);
    const obligaciones = obls
      .filter((o) => o.hijo_id === hijo.id)
      .map((o) => ({ id: o.id, concepto: o.concepto, mensual: equivalenteMensual(o.monto_estimado, o.recurrencia) }));
    const usoPersonal = mias.reduce((t, x) => t + x.monto, 0);
    const totalObligaciones = obligaciones.reduce((t, o) => t + o.mensual, 0);
    return {
      hijo,
      usoPersonal,
      porAdulto: Array.from(por.entries()).map(([id, monto]) => ({ id, monto })).sort((a, b) => b.monto - a.monto),
      obligaciones,
      totalObligaciones,
      total: usoPersonal + totalObligaciones,
    };
  });
}

/** Para el hijo: lo que le transfirieron, lo que gastó y lo que le queda de eso. */
export function recibidoYQueda(recibido: number, gastado: number): { recibido: number; gastado: number; queda: number } {
  return { recibido, gastado, queda: recibido - gastado };
}

/** Transferencias del mes ('YYYY-MM'), de la más nueva a la más vieja. */
export function delMes(transferencias: Transferencia[], mesISO: string): Transferencia[] {
  return transferencias
    .filter((t) => t.fecha.startsWith(mesISO))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}
