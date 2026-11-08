/**
 * Piso familiar de EJ Casa. Centavos enteros.
 *
 *  piso de la casa = obligaciones + costo de los hijos + gastos anuales / 12     (compartido: lo ven los dos)
 *  piso personal   = mediana de los gastos "variable necesario" de los últimos 6 meses cerrados  (privado)
 *
 * La suma de los dos NO aparece en ninguna pantalla compartida: entre dos personas revelaría el número del otro con una resta.
 * Mediana y no promedio: un mes con un arreglo de $800.000 no arrastra el piso medio año.
 */
import { moverMes, type Mes } from './dinero';
import type { Recurrencia } from './obligaciones';

export function equivalenteMensual(monto: number, rec: Recurrencia): number {
  if (rec === 'bimestral') return Math.round(monto / 2);
  if (rec === 'anual') return Math.round(monto / 12);
  return monto;
}

export type OblPiso = { monto_estimado: number; recurrencia: Recurrencia; hijo_id: string | null; responsable_id?: string | null };

export type PisoCasa = { obligaciones: number; hijos: number; transferencias: number; anuales: number; total: number };

/**
 * Cada obligación va a un solo renglón: si es a nombre de un hijo, "hijos"; si no y es anual, "anuales" (1/12 por mes);
 * si no, "obligaciones". Las transferencias a los hijos entran con su mediana mensual (ver `medianaTransferencias`).
 * Así el total nunca cuenta nada dos veces.
 */
export function pisoDeLaCasa(obls: OblPiso[], transferencias = 0): PisoCasa {
  let obligaciones = 0, hijos = 0, anuales = 0;
  for (const o of obls) {
    const m = equivalenteMensual(o.monto_estimado, o.recurrencia);
    if (o.hijo_id) hijos += m;
    else if (o.recurrencia === 'anual') anuales += m;
    else obligaciones += m;
  }
  return { obligaciones, hijos, transferencias, anuales, total: obligaciones + hijos + transferencias + anuales };
}

/** Lo asignado a una persona, en equivalente mensual (su "parte del reparto" por asignación, no por porcentaje). */
export function asignadoA(obls: OblPiso[], personaId: string): number {
  return obls.filter((o) => o.responsable_id === personaId).reduce((t, o) => t + equivalenteMensual(o.monto_estimado, o.recurrencia), 0);
}

const claveMes = (m: Mes) => `${m.anio}-${String(m.mes).padStart(2, '0')}-01`;

/** Cuántos de los últimos 6 meses (incluido el actual) tienen datos. */
export function mesesDeDatos(periodos: string[], hasta: Mes, ventana = 6): number {
  const dentro = new Set(Array.from({ length: ventana }, (_, i) => claveMes(moverMes(hasta, -i))));
  return new Set(periodos.filter((p) => dentro.has(p))).size;
}

export type Confiabilidad = 'baja' | 'usable' | 'buena';

/** Tres meses de datos para ser utilizable, seis para ser bueno. */
export function confiabilidad(meses: number): Confiabilidad {
  return meses >= 6 ? 'buena' : meses >= 3 ? 'usable' : 'baja';
}

export function medianaDe(numeros: number[]): number | null {
  if (numeros.length === 0) return null;
  const s = [...numeros].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * Transferencias a los hijos dentro del piso de la casa: mediana del total mensual (todos los hijos, ambos adultos)
 * de los últimos 3 meses CERRADOS. Un mes raro no infla el piso. Solo cuentan los meses desde que hay datos
 * compartidos (`primerMes`, 'YYYY-MM-01'): un mes sin transferencias, ya usando la app, cuenta como cero; uno anterior a la app, no.
 */
export function medianaTransferencias(
  transferencias: { fecha: string; monto: number }[],
  hoy: Mes,
  primerMes: string | null,
): { mediana: number | null; meses: number } {
  if (primerMes === null) return { mediana: null, meses: 0 };
  const cerrados = Array.from({ length: 3 }, (_, i) => claveMes(moverMes(hoy, -(i + 1)))).filter((m) => m >= primerMes);
  if (cerrados.length === 0) return { mediana: null, meses: 0 };
  const totales = cerrados.map((m) => transferencias.filter((t) => t.fecha.slice(0, 7) + '-01' === m).reduce((s, t) => s + t.monto, 0));
  return { mediana: medianaDe(totales), meses: cerrados.length };
}

export type GastoPiso = { monto: number; tipo: 'fijo_obligatorio' | 'variable_necesario' | 'discrecional'; fecha: string; mes_ipc: string };

export type PisoPersonal = { mediana: number | null; meses: number; ajustado: boolean; mesReferencia: string | null };

/**
 * Mediana de los gastos "variable necesario" por mes, sobre los últimos 6 meses CERRADOS (el mes en curso está a medias).
 * Solo cuentan los meses en los que hay algún gasto cargado (antes de empezar a usar la app no hay "cero gastado").
 * Si el IPC está cargado para todo lo que hace falta, se expresa en pesos del último mes con índice; si no, queda nominal.
 */
export function pisoPersonal(gastos: GastoPiso[], hoy: Mes, ipc: Record<string, number> = {}): PisoPersonal {
  const meses = Array.from({ length: 6 }, (_, i) => claveMes(moverMes(hoy, -(i + 1))));
  const mesDe = (fecha: string) => fecha.slice(0, 7) + '-01';
  const enVentana = gastos.filter((g) => meses.includes(mesDe(g.fecha)));
  const conDatos = meses.filter((m) => enVentana.some((g) => mesDe(g.fecha) === m));
  if (conDatos.length === 0) return { mediana: null, meses: 0, ajustado: false, mesReferencia: null };

  const indices = Object.keys(ipc).sort();
  const actual = indices.length ? indices[indices.length - 1] : null;
  const puedeAjustar = actual !== null && enVentana.every((g) => ipc[g.mes_ipc > actual ? actual : g.mes_ipc] !== undefined);

  const totales = conDatos.map((m) =>
    enVentana
      .filter((g) => mesDe(g.fecha) === m && g.tipo === 'variable_necesario')
      .reduce((t, g) => t + (puedeAjustar ? Math.round((g.monto * ipc[actual!]) / ipc[g.mes_ipc > actual! ? actual! : g.mes_ipc]) : g.monto), 0),
  );
  return { mediana: medianaDe(totales), meses: conDatos.length, ajustado: puedeAjustar, mesReferencia: puedeAjustar ? actual : null };
}
