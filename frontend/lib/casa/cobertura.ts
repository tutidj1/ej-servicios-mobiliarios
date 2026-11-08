/**
 * Cobertura de la casa y saldos entre los adultos. Centavos enteros.
 * La app suma lo que cada uno efectivamente pagó y lo que quedó pendiente entre ellos.
 * No calcula qué le "corresponde" a cada uno ni opina sobre si el reparto está bien.
 */
import { moverMes, type Mes } from './dinero';

export type InstanciaHogar = {
  obligacion_id: string;
  periodo: string; // 'YYYY-MM-01'
  estado: 'pendiente' | 'pagado';
  monto_real: number | null;
  pagado_por: string | null;
  responsable_id: string | null; // quién se hacía cargo ese mes (foto)
};

export type Liquidacion = { pagador_id: string; receptor_id: string; monto: number };

/** Monto de una instancia: lo real si se pagó; si no, el estimado de su obligación. */
function montoDe(i: InstanciaHogar, estimado: number): number {
  return i.estado === 'pagado' ? (i.monto_real ?? estimado) : estimado;
}

export type Cobertura = {
  total: number;
  pendiente: number;
  porPersona: { id: string; monto: number; porcentaje: number }[];
};

/**
 * Qué parte del total de la casa cubrió cada uno en el mes (suma de lo efectivamente pagado).
 * Los porcentajes son sobre el total del mes, incluidas las pendientes: el anillo se completa al pagar todo.
 */
export function coberturaDelMes(instancias: InstanciaHogar[], estimados: Map<string, number>): Cobertura {
  let total = 0;
  let pagado = 0;
  const por = new Map<string, number>();
  for (const i of instancias) {
    const m = montoDe(i, estimados.get(i.obligacion_id) ?? 0);
    total += m;
    if (i.estado === 'pagado') {
      pagado += m;
      const quien = i.pagado_por ?? 'sin-dato';
      por.set(quien, (por.get(quien) ?? 0) + m);
    }
  }
  return {
    total,
    pendiente: total - pagado,
    porPersona: Array.from(por.entries())
      .map(([id, monto]) => ({ id, monto, porcentaje: total > 0 ? Math.floor((monto * 100) / total) : 0 }))
      .sort((a, b) => b.monto - a.monto),
  };
}

export type Saldo = { deudor: string; acreedor: string; monto: number };

/**
 * Lo que uno le debe al otro: sumas de lo que PAGÓ uno y le tocaba al otro (según el responsable de ese mes),
 * menos las liquidaciones ya hechas. Pagos sin responsable ("cualquiera") o pagados por quien se hacía cargo no generan saldo.
 */
export function saldosEntreAdultos(instancias: InstanciaHogar[], estimados: Map<string, number>, liquidaciones: Liquidacion[]): Saldo[] {
  // deuda[a][b] = lo que a le debe a b
  const deuda = new Map<string, Map<string, number>>();
  const sumar = (a: string, b: string, m: number) => {
    const fila = deuda.get(a) ?? new Map<string, number>();
    fila.set(b, (fila.get(b) ?? 0) + m);
    deuda.set(a, fila);
  };

  for (const i of instancias) {
    if (i.estado !== 'pagado' || !i.pagado_por || !i.responsable_id || i.pagado_por === i.responsable_id) continue;
    sumar(i.responsable_id, i.pagado_por, montoDe(i, estimados.get(i.obligacion_id) ?? 0));
  }
  // Quien transfirió reduce lo que debía: a le pagó a b → a debe menos a b
  for (const l of liquidaciones) sumar(l.pagador_id, l.receptor_id, -l.monto);

  const personas = new Set<string>();
  deuda.forEach((fila, a) => { personas.add(a); fila.forEach((_, b) => personas.add(b)); });
  const lista = Array.from(personas).sort();
  const saldos: Saldo[] = [];
  for (let x = 0; x < lista.length; x++) {
    for (let y = x + 1; y < lista.length; y++) {
      const a = lista[x], b = lista[y];
      const neto = (deuda.get(a)?.get(b) ?? 0) - (deuda.get(b)?.get(a) ?? 0);
      if (neto > 0) saldos.push({ deudor: a, acreedor: b, monto: neto });
      else if (neto < 0) saldos.push({ deudor: b, acreedor: a, monto: -neto });
    }
  }
  return saldos.sort((p, q) => q.monto - p.monto);
}

/** Los últimos `cantidad` meses, del más viejo al más nuevo, terminando en `hasta`. */
export function ultimosMeses(hasta: Mes, cantidad = 6): Mes[] {
  return Array.from({ length: cantidad }, (_, i) => moverMes(hasta, i - (cantidad - 1)));
}

export const claveMes = (m: Mes) => `${m.anio}-${String(m.mes).padStart(2, '0')}-01`;

/** Totales pagados por persona en cada mes (para ver cómo se fue repartiendo con las estaciones). */
export function pagadoPorMes(instancias: InstanciaHogar[], estimados: Map<string, number>, meses: Mes[]): { mes: Mes; porPersona: Map<string, number>; total: number }[] {
  return meses.map((mes) => {
    const clave = claveMes(mes);
    const porPersona = new Map<string, number>();
    let total = 0;
    for (const i of instancias) {
      if (i.periodo !== clave || i.estado !== 'pagado') continue;
      const m = montoDe(i, estimados.get(i.obligacion_id) ?? 0);
      total += m;
      const quien = i.pagado_por ?? 'sin-dato';
      porPersona.set(quien, (porPersona.get(quien) ?? 0) + m);
    }
    return { mes, porPersona, total };
  });
}
