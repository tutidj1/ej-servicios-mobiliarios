import { describe, expect, it } from 'vitest';
import { desactualizada, netoAjustadoPorIpc, netoAportado, rendimiento } from './inversiones';

describe('inversiones', () => {
  it('neto aportado: aportes menos retiros', () => {
    expect(netoAportado([{ monto: 100_000_000, tipo: 'aporte' }, { monto: 20_000_000, tipo: 'retiro' }, { monto: 10_000_000, tipo: 'aporte' }])).toBe(90_000_000);
  });

  it('rendimiento nominal: puso 1.000.000 y hoy vale 1.150.000 → +15%', () => {
    expect(rendimiento(115_000_000, 100_000_000)).toEqual({ ganancia: 15_000_000, porcentaje: 15 });
    expect(rendimiento(90_000_000, 100_000_000)).toEqual({ ganancia: -10_000_000, porcentaje: -10 });
    expect(rendimiento(1_000, 3_000)).toEqual({ ganancia: -2_000, porcentaje: -66.7 });
    expect(rendimiento(100, 0)).toBeNull();
    expect(rendimiento(100, -5)).toBeNull();
  });

  it('real: +15% nominal con 30% de inflación es una pérdida', () => {
    // Un aporte de $1.000.000 hecho cuando el IPC era 100; hoy el IPC es 130 y la inversión vale $1.150.000
    const r = netoAjustadoPorIpc(
      [{ monto: 100_000_000, tipo: 'aporte', mes_ipc: '2025-11-01' }],
      { '2025-11-01': 100, '2026-10-01': 130 },
    );
    expect('base' in r).toBe(true);
    if ('base' in r) {
      expect(r.base).toBe(130_000_000); // tenía que llegar a $1.300.000 solo para empatar
      expect(r.mesReferencia).toBe('2026-10-01');
      expect(rendimiento(115_000_000, r.base)).toEqual({ ganancia: -15_000_000, porcentaje: -11.5 });
    }
  });

  it('no inventa: si falta el IPC de algún mes, lo dice', () => {
    const r = netoAjustadoPorIpc(
      [{ monto: 100, tipo: 'aporte', mes_ipc: '2026-03-01' }, { monto: 100, tipo: 'aporte', mes_ipc: '2026-04-01' }],
      { '2026-04-01': 110, '2026-10-01': 130 },
    );
    expect(r).toEqual({ faltan: ['2026-03-01'] });
    expect(netoAjustadoPorIpc([{ monto: 100, tipo: 'aporte', mes_ipc: '2026-03-01' }], {})).toEqual({ faltan: ['(no hay IPC cargado)'] });
  });

  it('retiros restan, ajustados también', () => {
    const r = netoAjustadoPorIpc(
      [{ monto: 200, tipo: 'aporte', mes_ipc: '2026-01-01' }, { monto: 100, tipo: 'retiro', mes_ipc: '2026-01-01' }],
      { '2026-01-01': 100, '2026-06-01': 120 },
    );
    expect(r).toEqual({ base: 120, mesReferencia: '2026-06-01' });
  });

  it('valuación vieja (más de 3 meses) se marca desactualizada', () => {
    const hoy = new Date(2026, 10, 7);
    expect(desactualizada('2026-10-12', hoy)).toBe(false);
    expect(desactualizada('2026-08-10', hoy)).toBe(false);
    expect(desactualizada('2026-07-01', hoy)).toBe(true);
    expect(desactualizada(null, hoy)).toBe(true);
  });
});
