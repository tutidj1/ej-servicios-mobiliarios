import { describe, expect, it } from 'vitest';
import { acumulado, dolaresDesdePesos, equivalenteEnPesos, porcentajeAvance, proyeccionObjetivo, ritmoNetoMensual, type MovObjetivo } from './objetivos';

const mov = (monto: number, tipo: 'aporte' | 'retiro', fecha: string, moneda: 'ARS' | 'USD' = 'ARS', tc: number | null = null): MovObjetivo => ({
  objetivo_id: 'o', monto, moneda, tc_del_dia: tc, tipo, fecha,
});

const HOY = new Date(2026, 10, 7);

describe('objetivos personales', () => {
  it('avance neto y porcentaje', () => {
    const movs = [mov(20_000_000, 'aporte', '2026-10-01'), mov(5_000_000, 'retiro', '2026-10-15')];
    expect(acumulado(movs)).toBe(15_000_000);
    expect(porcentajeAvance(60_000_000, 15_000_000)).toBe(25);
    expect(porcentajeAvance(60_000_000, 90_000_000)).toBe(100);
    expect(porcentajeAvance(60_000_000, -5)).toBe(0);
  });

  it('pesos a dólares con el tipo de cambio del día', () => {
    // $140.000 a $1.400 por dólar = US$100
    expect(dolaresDesdePesos(14_000_000, 140_000)).toBe(10_000);
    // $100.000 a $1.480,50 → US$67,54
    expect(dolaresDesdePesos(10_000_000, 148_050)).toBe(6_754);
  });

  it('el equivalente en pesos usa el TC guardado en cada movimiento, no el de hoy', () => {
    const movs = [
      mov(10_000, 'aporte', '2026-08-01', 'USD', 120_000), // US$100 a $1.200
      mov(10_000, 'aporte', '2026-10-01', 'USD', 140_000), // US$100 a $1.400
      mov(5_000, 'retiro', '2026-10-20', 'USD', 140_000),  // US$50 a $1.400
    ];
    expect(equivalenteEnPesos(movs)).toBe(12_000_000 + 14_000_000 - 7_000_000);
  });

  it('el ritmo es el aporte NETO de los últimos 3 meses', () => {
    const movs = [
      mov(20_000_000, 'aporte', '2026-10-01'),
      mov(15_000_000, 'retiro', '2026-10-20'),
      mov(99_000_000, 'aporte', '2026-01-01'), // fuera de los 90 días
    ];
    expect(ritmoNetoMensual(movs, HOY)).toBe(1_666_667); // 5.000.000 / 3
  });

  it('proyección: alcanzado, sin ritmo, o llega en tal mes', () => {
    expect(proyeccionObjetivo(100, 100, 10, HOY)).toEqual({ estado: 'alcanzado' });
    expect(proyeccionObjetivo(100, 20, 0, HOY)).toEqual({ estado: 'sin_ritmo' });
    expect(proyeccionObjetivo(100, 20, -5, HOY)).toEqual({ estado: 'sin_ritmo' });
    expect(proyeccionObjetivo(100_000_000, 20_000_000, 10_000_000, HOY)).toEqual({ estado: 'llega', mes: { anio: 2027, mes: 7 }, meses: 8 });
  });
});
