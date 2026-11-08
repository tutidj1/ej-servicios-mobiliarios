import { describe, expect, it } from 'vitest';
import { claveDeMes, conVariacion, mesesFaltantes, parseIndice } from './ipc';

describe('IPC', () => {
  it('lee índices escritos a la argentina o con punto decimal', () => {
    expect(parseIndice('7012,5')).toBe(7012.5);
    expect(parseIndice('7.012,5')).toBe(7012.5);
    expect(parseIndice('7012.5')).toBe(7012.5);
    expect(parseIndice('7012')).toBe(7012);
    expect(parseIndice(' 100,1234 ')).toBe(100.1234);
  });

  it('rechaza lo que no es un índice', () => {
    // "7.012" sin coma es ambiguo (miles o decimales): se rechaza y se pide la coma
    for (const x of ['', '0', '-5', 'abc', '1,23456', '1.2.3', '7.012', '1e5']) expect(parseIndice(x), x).toBeNull();
  });

  it('clave de mes', () => {
    expect(claveDeMes('2026-11')).toBe('2026-11-01');
    expect(claveDeMes('2026-13')).toBeNull();
    expect(claveDeMes('')).toBeNull();
  });

  it('variación mensual contra el mes anterior, del más nuevo al más viejo', () => {
    const r = conVariacion([
      { mes: '2026-08-01', indice: 100 },
      { mes: '2026-10-01', indice: 105 },
      { mes: '2026-09-01', indice: 102 },
    ]);
    expect(r.map((x) => x.mes)).toEqual(['2026-10-01', '2026-09-01', '2026-08-01']);
    expect(r.map((x) => x.variacionPct)).toEqual([2.9, 2, null]);
  });

  it('sin el mes anterior no hay variación', () => {
    expect(conVariacion([{ mes: '2026-10-01', indice: 105 }, { mes: '2026-08-01', indice: 100 }])[0].variacionPct).toBeNull();
  });

  it('detecta meses sin cargar entre el primero y el último', () => {
    expect(mesesFaltantes(['2026-01-01', '2026-02-01', '2026-05-01'])).toEqual(['2026-03-01', '2026-04-01']);
    expect(mesesFaltantes(['2025-12-01', '2026-02-01'])).toEqual(['2026-01-01']);
    expect(mesesFaltantes(['2026-01-01'])).toEqual([]);
    expect(mesesFaltantes([])).toEqual([]);
  });
});
