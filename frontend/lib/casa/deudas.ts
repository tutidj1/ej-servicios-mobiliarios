/**
 * Cálculos de deudas y cuotas de EJ Casa. Todo en centavos enteros.
 * La app registra y muestra números con su referencia; no opina ni recomienda.
 */
import { fechaLocalISO, haceDias, moverMes, type Mes } from './dinero';

export type TipoDeuda = 'con_cronograma' | 'sin_cronograma';

export type Deuda = {
  id: string;
  descripcion: string;
  tipo: TipoDeuda;
  monto_total: number;
  saldo: number;
  valor_cuota: number | null;
  cuotas_total: number | null;
  cuotas_pagas: number | null;
  tasa: number | null;
  mes_fin: string | null;
};

export type PagoDeuda = { deuda_id: string; monto: number; fecha: string };

/** Porcentaje pagado sobre el monto original (0–100, entero). */
export function porcentajePagado(total: number, saldo: number): number {
  if (total <= 0) return 0;
  const pagado = Math.min(Math.max(total - saldo, 0), total);
  return Math.floor((pagado * 100) / total);
}

export function cuotasRestantes(d: Pick<Deuda, 'tipo' | 'cuotas_total' | 'cuotas_pagas'>): number {
  if (d.tipo !== 'con_cronograma') return 0;
  return Math.max((d.cuotas_total ?? 0) - (d.cuotas_pagas ?? 0), 0);
}

/** Mes de la última cuota: la próxima cuota impaga cae este mes. */
export function mesFinCronograma(hoy: Mes, restantes: number): Mes | null {
  return restantes > 0 ? moverMes(hoy, restantes - 1) : null;
}

export function claveMes(m: Mes): string {
  return `${m.anio}-${String(m.mes).padStart(2, '0')}-01`;
}

/** Cuánto está comprometido por mes en cuotas que siguen andando. */
export function comprometidoMensual(deudas: Deuda[]): number {
  return deudas.reduce((t, d) => (cuotasRestantes(d) > 0 ? t + (d.valor_cuota ?? 0) : t), 0);
}

/** Cuándo cae la última cuota de todas. */
export function ultimaCuota(deudas: Deuda[], hoy: Mes): Mes | null {
  let ultimo: Mes | null = null;
  for (const d of deudas) {
    const fin = mesFinCronograma(hoy, cuotasRestantes(d));
    if (!fin) continue;
    if (!ultimo || fin.anio * 12 + fin.mes > ultimo.anio * 12 + ultimo.mes) ultimo = fin;
  }
  return ultimo;
}

/** Cómo baja el compromiso mensual de cuotas, mes a mes, desde este mes. */
export function proyeccionCuotas(deudas: Deuda[], hoy: Mes, meses = 12): { mes: Mes; monto: number }[] {
  return Array.from({ length: meses }, (_, i) => ({
    mes: moverMes(hoy, i),
    monto: deudas.reduce((t, d) => (cuotasRestantes(d) > i ? t + (d.valor_cuota ?? 0) : t), 0),
  }));
}

/** Meses en que el compromiso baja, y cuánto se libera ("en febrero se liberan $180.000"). */
export function liberaciones(proyeccion: { mes: Mes; monto: number }[]): { mes: Mes; libera: number }[] {
  const out: { mes: Mes; libera: number }[] = [];
  for (let i = 1; i < proyeccion.length; i++) {
    const baja = proyeccion[i - 1].monto - proyeccion[i].monto;
    if (baja > 0) out.push({ mes: proyeccion[i].mes, libera: baja });
  }
  return out;
}

/**
 * Para deudas sin cronograma: con lo pagado en los últimos 90 días (promedio por mes),
 * cuándo se terminaría de pagar el saldo. Null si no hubo pagos o ya no queda saldo.
 */
export function ritmoSinCronograma(saldo: number, pagos: PagoDeuda[], hoy: Date): { promedioMensual: number; mesFin: Mes } | null {
  if (saldo <= 0) return null;
  const desde = fechaLocalISO(haceDias(hoy, 90));
  const total = pagos.filter((p) => p.fecha >= desde).reduce((t, p) => t + p.monto, 0);
  const promedio = Math.round(total / 3);
  if (promedio <= 0) return null;
  const meses = Math.ceil(saldo / promedio);
  const base: Mes = { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };
  return { promedioMensual: promedio, mesFin: moverMes(base, meses) };
}
