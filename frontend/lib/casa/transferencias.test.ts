import { describe, expect, it } from 'vitest';
import { costoPorHijo, delMes, recibidoYQueda, type Transferencia } from './transferencias';

const T = (id: string, hijo: string, quien: string, monto: number, fecha = '2026-11-03'): Transferencia => ({ id, hijo_id: hijo, pagador_id: quien, monto, fecha, nota: '' });
const hijos = [
  { id: 'tomas', nombre: 'Tomás', persona_id: 't' },
  { id: 'bauti', nombre: 'Bautista', persona_id: null },
  { id: 'facu', nombre: 'Facundo', persona_id: null },
];

describe('costo por hijo', () => {
  it('uso personal con desglose por adulto + obligaciones a su nombre, separados', () => {
    const r = costoPorHijo(
      hijos,
      [T('1', 'tomas', 'javier', 6_000_000), T('2', 'tomas', 'eugenia', 4_000_000), T('3', 'bauti', 'javier', 2_000_000)],
      [
        { id: 'o1', concepto: 'Gimnasio', monto_estimado: 3_000_000, recurrencia: 'mensual', hijo_id: 'tomas' },
        { id: 'o2', concepto: 'Club', monto_estimado: 5_000_000, recurrencia: 'mensual', hijo_id: 'bauti' },
        { id: 'o3', concepto: 'Matrícula', monto_estimado: 12_000_000, recurrencia: 'anual', hijo_id: 'bauti' },
        { id: 'o4', concepto: 'Luz', monto_estimado: 8_000_000, recurrencia: 'mensual', hijo_id: null },
      ],
    );
    const tomas = r[0];
    expect(tomas.usoPersonal).toBe(10_000_000);
    expect(tomas.porAdulto).toEqual([{ id: 'javier', monto: 6_000_000 }, { id: 'eugenia', monto: 4_000_000 }]);
    expect(tomas.totalObligaciones).toBe(3_000_000);
    expect(tomas.total).toBe(13_000_000);

    const bauti = r[1];
    expect(bauti.usoPersonal).toBe(2_000_000);
    expect(bauti.obligaciones.map((o) => o.mensual)).toEqual([5_000_000, 1_000_000]); // la matrícula anual entra a 1/12
    expect(bauti.total).toBe(8_000_000);

    // Facundo: sin transferencias, solo obligaciones (aquí ninguna) → igual tiene tarjeta
    expect(r[2]).toMatchObject({ usoPersonal: 0, porAdulto: [], totalObligaciones: 0, total: 0 });
    // El orden es el de los hijos, no por costo
    expect(r.map((x) => x.hijo.id)).toEqual(['tomas', 'bauti', 'facu']);
  });

  it('la luz de la casa (sin hijo) no cuenta para ningún hijo', () => {
    const r = costoPorHijo(hijos, [], [{ id: 'o', concepto: 'Luz', monto_estimado: 8_000_000, recurrencia: 'mensual', hijo_id: null }]);
    expect(r.every((x) => x.total === 0)).toBe(true);
  });
});

describe('lo que le queda al hijo', () => {
  it('recibido menos gastado', () => {
    expect(recibidoYQueda(10_000_000, 3_500_000)).toEqual({ recibido: 10_000_000, gastado: 3_500_000, queda: 6_500_000 });
    expect(recibidoYQueda(1_000_000, 1_500_000).queda).toBe(-500_000);
  });

  it('transferencias del mes, la más nueva primero', () => {
    const r = delMes([T('a', 'x', 'p', 1, '2026-10-30'), T('b', 'x', 'p', 1, '2026-11-02'), T('c', 'x', 'p', 1, '2026-11-09')], '2026-11');
    expect(r.map((x) => x.id)).toEqual(['c', 'b']);
  });
});
