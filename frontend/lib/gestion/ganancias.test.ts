import { describe, expect, it } from 'vitest';
import { gananciaPorMes, gananciaPorSemana, lunesDe, totalGanancia } from './ganancias';

const eventos = [
  { id: 'a', fecha_evento: '2026-11-06' },
  { id: 'b', fecha_evento: '2026-11-20' },
  { id: 'c', fecha_evento: '2026-12-02' },
  { id: 'd', fecha_evento: '2025-11-06' },
];
const res = {
  a: { ingresos: 100000, costos: 20000, ganancia: 80000 },
  b: { ingresos: 50000, costos: 0, ganancia: 50000 },
  c: { ingresos: 10000, costos: 12000, ganancia: -2000 },
  d: { ingresos: 999, costos: 0, ganancia: 999 },
};

describe('ganancias', () => {
  it('suma por mes solo del año pedido', () => {
    const m = gananciaPorMes(eventos, res, 2026);
    expect(m[10]).toMatchObject({ ganancia: 130000, eventos: 2, ingresos: 150000, costos: 20000 });
    expect(m[11].ganancia).toBe(-2000);
    expect(totalGanancia(m).ganancia).toBe(128000);
  });
  it('el lunes de la semana', () => {
    expect(lunesDe('2026-11-06')).toBe('2026-11-02'); // viernes
    expect(lunesDe('2026-11-08')).toBe('2026-11-02'); // domingo
    expect(lunesDe('2026-11-02')).toBe('2026-11-02');
  });
  it('semanas del mes con su ganancia', () => {
    const s = gananciaPorSemana(eventos, res, '2026-11');
    expect(s[0].desde).toBe('2026-10-26');
    const conEvento = s.filter((x) => x.eventos > 0);
    expect(conEvento.map((x) => [x.desde, x.ganancia])).toEqual([['2026-11-02', 80000], ['2026-11-16', 50000]]);
    expect(totalGanancia(s).ganancia).toBe(130000);
  });
});
