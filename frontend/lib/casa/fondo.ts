/**
 * Fondo de gastos anuales (privado de cada persona). Centavos enteros.
 * Los gastos que no son mensuales (patente, seguro, matrícula, útiles, uniformes, cuota anual del club) son los que
 * rompen el presupuesto: marzo suele juntar varios. Provisionando un doceavo por mes, marzo pasa a ser un mes normal.
 * La app calcula cuánto apartar, cuánto hay apartado y cuánto falta; no necesita una cuenta aparte, aunque funciona
 * mejor si la plata está físicamente separada.
 */
import { moverMes, type Mes } from './dinero';

export type ItemFondo = {
  id: string;
  concepto: string;
  monto: number;
  mes: number; // 1-12: mes en que vence cada año
  apartado: number;
  pagado_anio: number | null;
};

const indice = (m: Mes) => m.anio * 12 + (m.mes - 1);

/** Próximo vencimiento sin pagar. Si este año ya está pagado, el ciclo pasa al año siguiente. */
export function proximoVencimiento(f: Pick<ItemFondo, 'mes' | 'pagado_anio'>, hoy: Mes): Mes {
  let anio = hoy.mes <= f.mes ? hoy.anio : hoy.anio + 1;
  if (f.pagado_anio !== null && f.pagado_anio >= anio) anio = f.pagado_anio + 1;
  return { anio, mes: f.mes };
}

/** Meses que quedan para apartar (este mes incluido); como mínimo 1, aunque venza ahora. */
export function mesesParaApartar(vence: Mes, hoy: Mes): number {
  return Math.max(1, indice(vence) - indice(hoy));
}

export type EstadoItem = {
  vence: Mes;
  meses: number;
  falta: number;
  /** Cuánto apartar por mes, desde hoy, para llegar con todo el monto al vencimiento. */
  apartarPorMes: number;
  /** Porcentaje ya apartado (0–100). */
  porcentaje: number;
};

export function estadoItem(f: ItemFondo, hoy: Mes): EstadoItem {
  const vence = proximoVencimiento(f, hoy);
  const meses = mesesParaApartar(vence, hoy);
  const falta = Math.max(f.monto - f.apartado, 0);
  return {
    vence,
    meses,
    falta,
    // Hacia arriba y al peso entero: apartar de menos es llegar corto, y los centavos sueltos no sirven para apartar
    apartarPorMes: Math.ceil(falta / meses / 100) * 100,
    porcentaje: f.monto > 0 ? Math.min(Math.floor((f.apartado * 100) / f.monto), 100) : 0,
  };
}

export type ResumenFondo = {
  /** Suma de todo lo que se paga en el año. */
  totalAnual: number;
  /** Un doceavo por mes: lo que entra en la cuenta del excedente. */
  porMes: number;
  apartado: number;
  falta: number;
  /** Lo que habría que apartar por mes, desde hoy, para llegar a cada vencimiento. */
  apartarPorMesHoy: number;
};

export function resumenFondo(items: ItemFondo[], hoy: Mes): ResumenFondo {
  const estados = items.map((f) => estadoItem(f, hoy));
  const totalAnual = items.reduce((t, f) => t + f.monto, 0);
  return {
    totalAnual,
    porMes: Math.round(totalAnual / 12),
    apartado: items.reduce((t, f) => t + Math.min(f.apartado, f.monto), 0),
    falta: estados.reduce((t, e) => t + e.falta, 0),
    apartarPorMesHoy: estados.reduce((t, e) => t + e.apartarPorMes, 0),
  };
}

export type MesCalendario = { mes: Mes; items: { id: string; concepto: string; monto: number }[]; total: number };

/** Los próximos 12 meses con lo que vence en cada uno (así se ve a tiempo el mes que se junta todo). */
export function calendarioAnual(items: ItemFondo[], hoy: Mes): MesCalendario[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = moverMes(hoy, i);
    const delMes = items.filter((f) => {
      const v = proximoVencimiento(f, hoy);
      return v.anio === mes.anio && v.mes === mes.mes;
    });
    return {
      mes,
      items: delMes.map((f) => ({ id: f.id, concepto: f.concepto, monto: f.monto })),
      total: delMes.reduce((t, f) => t + f.monto, 0),
    };
  });
}

/** Marca como pagado el vencimiento actual: el apartado se usó y el ciclo pasa al año siguiente. */
export function alPagar(f: Pick<ItemFondo, 'mes' | 'pagado_anio'>, hoy: Mes): { apartado: number; pagado_anio: number } {
  return { apartado: 0, pagado_anio: proximoVencimiento(f, hoy).anio };
}
