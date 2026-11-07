// Ganancia neta agrupada por mes y por semana. Un evento cuenta en el período de su fecha de evento.
// Los importes vienen en centavos (como los devuelve resultadoEvento).

import { sumarDias } from './calculos';

export interface ResumenGanancia {
  ingresos: number;
  costos: number;
  ganancia: number;
  eventos: number;
}

export interface EventoParaGanancia {
  id: string;
  fecha_evento: string;
}

type Resultados = Record<string, { ingresos: number; costos: number; ganancia: number } | undefined>;

const vacio = (): ResumenGanancia => ({ ingresos: 0, costos: 0, ganancia: 0, eventos: 0 });

function sumar(t: ResumenGanancia, r: { ingresos: number; costos: number; ganancia: number }): ResumenGanancia {
  return { ingresos: t.ingresos + r.ingresos, costos: t.costos + r.costos, ganancia: t.ganancia + r.ganancia, eventos: t.eventos + 1 };
}

/** 12 meses del año (índice 0 = enero) con su ganancia neta. */
export function gananciaPorMes(eventos: EventoParaGanancia[], res: Resultados, anio: number): ResumenGanancia[] {
  const meses = Array.from({ length: 12 }, vacio);
  for (const e of eventos) {
    const r = res[e.id];
    if (!r || Number(e.fecha_evento.slice(0, 4)) !== anio) continue;
    const m = Number(e.fecha_evento.slice(5, 7)) - 1;
    meses[m] = sumar(meses[m], r);
  }
  return meses;
}

/** Lunes de la semana de un día (YYYY-MM-DD). */
export function lunesDe(dia: string): string {
  const [y, m, d] = dia.split('-').map(Number);
  const diaSemana = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0 = domingo
  return sumarDias(dia, -((diaSemana + 6) % 7));
}

export interface SemanaGanancia extends ResumenGanancia {
  /** lunes de la semana */
  desde: string;
  /** domingo de la semana */
  hasta: string;
}

/** Semanas (lunes a domingo) que tocan el mes indicado ("YYYY-MM"), con la ganancia de los eventos de ese mes. */
export function gananciaPorSemana(eventos: EventoParaGanancia[], res: Resultados, mes: string): SemanaGanancia[] {
  const primero = `${mes}-01`;
  const [y, m] = mes.split('-').map(Number);
  const ultimo = `${mes}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
  const semanas: SemanaGanancia[] = [];
  for (let l = lunesDe(primero); l <= ultimo; l = sumarDias(l, 7)) semanas.push({ ...vacio(), desde: l, hasta: sumarDias(l, 6) });
  for (const e of eventos) {
    const r = res[e.id];
    if (!r || e.fecha_evento.slice(0, 7) !== mes) continue;
    const s = semanas.find((x) => e.fecha_evento >= x.desde && e.fecha_evento <= x.hasta);
    if (s) Object.assign(s, sumar(s, r), { desde: s.desde, hasta: s.hasta });
  }
  return semanas;
}

export function totalGanancia(lista: ResumenGanancia[]): ResumenGanancia {
  return lista.reduce((t, x) => ({ ingresos: t.ingresos + x.ingresos, costos: t.costos + x.costos, ganancia: t.ganancia + x.ganancia, eventos: t.eventos + x.eventos }), vacio());
}
