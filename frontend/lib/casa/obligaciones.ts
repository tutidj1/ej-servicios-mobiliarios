/**
 * Obligaciones compartidas del hogar. Centavos enteros.
 * Cada obligación se define una vez y genera su instancia sola todos los meses (según su recurrencia).
 * La app registra lo acordado y lo hace visible: no propone repartos ni opina.
 */
import { moverMes, type Mes } from './dinero';

export type Recurrencia = 'mensual' | 'bimestral' | 'anual';

export const RECURRENCIAS: { valor: Recurrencia; etiqueta: string }[] = [
  { valor: 'mensual', etiqueta: 'Todos los meses' },
  { valor: 'bimestral', etiqueta: 'Cada 2 meses' },
  { valor: 'anual', etiqueta: 'Una vez al año' },
];

const PASO: Record<Recurrencia, number> = { mensual: 1, bimestral: 2, anual: 12 };

const aMes = (clave: string): Mes => ({ anio: Number(clave.slice(0, 4)), mes: Number(clave.slice(5, 7)) });
const aClave = (m: Mes) => `${m.anio}-${String(m.mes).padStart(2, '0')}-01`;

export function siguientePeriodo(clave: string, rec: Recurrencia): string {
  return aClave(moverMes(aMes(clave), PASO[rec]));
}

/**
 * Períodos que faltan crear hasta el mes `hasta` (inclusive), contando desde la última instancia.
 * Si todavía no hay ninguna, arranca en `inicio`. No hay columna de "mes de arranque": la cadena de
 * instancias es la que fija en qué meses cae una obligación bimestral o anual.
 */
export function periodosPendientes(ultimo: string | null, rec: Recurrencia, hasta: string, inicio: string): string[] {
  const out: string[] = [];
  let p = ultimo === null ? inicio : siguientePeriodo(ultimo, rec);
  for (let i = 0; i < 48 && p <= hasta; i++) {
    out.push(p);
    p = siguientePeriodo(p, rec);
  }
  return out;
}

/** Día de vencimiento dentro del mes: un "31" en febrero vence el 28 (o 29). */
export function diaReal(periodo: string, dia: number): number {
  const { anio, mes } = aMes(periodo);
  return Math.min(dia, new Date(anio, mes, 0).getDate());
}

export type EstadoVencimiento = { clase: 'pagada' | 'vencida' | 'pronto' | 'ok'; dias: number };

/** Para marcar lo que vence pronto o ya venció. `dias` = días hasta el vencimiento (negativo: pasó). */
export function estadoVencimiento(periodo: string, dia: number, hoy: Date, pagada: boolean): EstadoVencimiento {
  if (pagada) return { clase: 'pagada', dias: 0 };
  const { anio, mes } = aMes(periodo);
  const vence = new Date(anio, mes - 1, diaReal(periodo, dia));
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((vence.getTime() - base.getTime()) / 86_400_000);
  return { clase: dias < 0 ? 'vencida' : dias <= 3 ? 'pronto' : 'ok', dias };
}

/** El monto estimado se actualiza con la mediana de los últimos tres pagos (hacen falta tres). */
export function medianaUltimosTres(montos: number[]): number | null {
  if (montos.length < 3) return null;
  const tres = montos.slice(0, 3).sort((a, b) => a - b);
  return tres[1];
}

export type InstanciaMonto = { estado: 'pendiente' | 'pagado'; monto_real: number | null; monto_estimado: number };

/** Total del mes (lo real si ya se pagó, lo estimado si no), lo pagado y cuántas quedan pendientes. */
export function totalesDelMes(items: InstanciaMonto[]): { total: number; pagado: number; pendientes: number } {
  let total = 0, pagado = 0, pendientes = 0;
  for (const i of items) {
    const monto = i.estado === 'pagado' ? (i.monto_real ?? i.monto_estimado) : i.monto_estimado;
    total += monto;
    if (i.estado === 'pagado') pagado += monto;
    else pendientes += 1;
  }
  return { total, pagado, pendientes };
}
