import { describe, expect, it } from 'vitest';
import { diaReal, estadoVencimiento, medianaUltimosTres, periodosPendientes, siguientePeriodo, totalesDelMes } from './obligaciones';

describe('obligaciones del hogar', () => {
  it('siguiente período según la recurrencia', () => {
    expect(siguientePeriodo('2026-11-01', 'mensual')).toBe('2026-12-01');
    expect(siguientePeriodo('2026-12-01', 'mensual')).toBe('2027-01-01');
    expect(siguientePeriodo('2026-11-01', 'bimestral')).toBe('2027-01-01');
    expect(siguientePeriodo('2026-03-01', 'anual')).toBe('2027-03-01');
  });

  it('genera las instancias que faltan, sin repetir ni pasarse del mes actual', () => {
    // Primera vez: arranca en el mes de alta
    expect(periodosPendientes(null, 'mensual', '2026-11-01', '2026-11-01')).toEqual(['2026-11-01']);
    // Ya estaba al día
    expect(periodosPendientes('2026-11-01', 'mensual', '2026-11-01', '2026-11-01')).toEqual([]);
    // Pasó un tiempo sin abrir la app: se completan los meses salteados
    expect(periodosPendientes('2026-08-01', 'mensual', '2026-11-01', '2026-08-01')).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    // Bimestral: solo los meses que le tocan
    expect(periodosPendientes('2026-07-01', 'bimestral', '2026-11-01', '2026-07-01')).toEqual(['2026-09-01', '2026-11-01']);
    // Anual: no hay nada hasta que llegue su mes
    expect(periodosPendientes('2026-03-01', 'anual', '2026-11-01', '2026-03-01')).toEqual([]);
    expect(periodosPendientes('2026-03-01', 'anual', '2027-03-01', '2026-03-01')).toEqual(['2027-03-01']);
    // Alta en un mes futuro: todavía no se crea
    expect(periodosPendientes(null, 'mensual', '2026-11-01', '2026-12-01')).toEqual([]);
  });

  it('el día 31 vence el último día de meses cortos', () => {
    expect(diaReal('2026-02-01', 31)).toBe(28);
    expect(diaReal('2028-02-01', 31)).toBe(29);
    expect(diaReal('2026-04-01', 31)).toBe(30);
    expect(diaReal('2026-11-01', 14)).toBe(14);
  });

  it('estado del vencimiento', () => {
    const hoy = new Date(2026, 10, 7);
    expect(estadoVencimiento('2026-11-01', 14, hoy, false)).toEqual({ clase: 'ok', dias: 7 });
    expect(estadoVencimiento('2026-11-01', 10, hoy, false)).toEqual({ clase: 'pronto', dias: 3 });
    expect(estadoVencimiento('2026-11-01', 7, hoy, false)).toEqual({ clase: 'pronto', dias: 0 });
    expect(estadoVencimiento('2026-11-01', 5, hoy, false)).toEqual({ clase: 'vencida', dias: -2 });
    expect(estadoVencimiento('2026-11-01', 5, hoy, true).clase).toBe('pagada');
  });

  it('el estimado se actualiza con la mediana de los últimos tres pagos', () => {
    expect(medianaUltimosTres([8_500_000, 9_000_000, 20_000_000])).toBe(9_000_000); // un mes raro no arrastra el número
    expect(medianaUltimosTres([8_000_000, 8_200_000])).toBeNull(); // con menos de tres, se deja el estimado
    expect(medianaUltimosTres([1, 5, 3, 99])).toBe(3); // solo cuentan los tres más recientes (los primeros)
  });

  it('totales del mes: lo real si se pagó, lo estimado si no', () => {
    expect(totalesDelMes([
      { estado: 'pagado', monto_real: 8_700_000, monto_estimado: 8_500_000 },
      { estado: 'pendiente', monto_real: null, monto_estimado: 5_000_000 },
      { estado: 'pagado', monto_real: null, monto_estimado: 2_000_000 },
    ])).toEqual({ total: 15_700_000, pagado: 10_700_000, pendientes: 1 });
    expect(totalesDelMes([])).toEqual({ total: 0, pagado: 0, pendientes: 0 });
  });
});
