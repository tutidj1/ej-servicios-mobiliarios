import { describe, expect, it } from 'vitest';
import { asignadoA, confiabilidad, equivalenteMensual, medianaDe, mesesDeDatos, pisoDeLaCasa, pisoPersonal, type GastoPiso } from './piso';

const HOY = { anio: 2026, mes: 11 };

describe('piso de la casa', () => {
  it('equivalente mensual: bimestral /2, anual /12', () => {
    expect(equivalenteMensual(8_500_000, 'mensual')).toBe(8_500_000);
    expect(equivalenteMensual(10_000_000, 'bimestral')).toBe(5_000_000);
    expect(equivalenteMensual(120_000_000, 'anual')).toBe(10_000_000);
  });

  it('obligaciones + hijos + anuales/12, sin contar nada dos veces', () => {
    const p = pisoDeLaCasa([
      { monto_estimado: 8_500_000, recurrencia: 'mensual', hijo_id: null },        // luz
      { monto_estimado: 12_000_000, recurrencia: 'bimestral', hijo_id: null },      // agua → 6.000.000
      { monto_estimado: 20_000_000, recurrencia: 'mensual', hijo_id: 'bauti' },     // escuela de Bauti
      { monto_estimado: 24_000_000, recurrencia: 'anual', hijo_id: 'bauti' },       // matrícula (hijo): va a hijos, no a anuales
      { monto_estimado: 60_000_000, recurrencia: 'anual', hijo_id: null },          // patente → 5.000.000
    ]);
    expect(p).toEqual({ obligaciones: 14_500_000, hijos: 22_000_000, anuales: 5_000_000, total: 41_500_000 });
  });

  it('sin obligaciones el piso es cero', () => {
    expect(pisoDeLaCasa([])).toEqual({ obligaciones: 0, hijos: 0, anuales: 0, total: 0 });
  });

  it('lo asignado a una persona', () => {
    const obls = [
      { monto_estimado: 8_000_000, recurrencia: 'mensual' as const, hijo_id: null, responsable_id: 'j' },
      { monto_estimado: 6_000_000, recurrencia: 'bimestral' as const, hijo_id: null, responsable_id: 'j' },
      { monto_estimado: 5_000_000, recurrencia: 'mensual' as const, hijo_id: null, responsable_id: 'e' },
      { monto_estimado: 1_000_000, recurrencia: 'mensual' as const, hijo_id: null, responsable_id: null },
    ];
    expect(asignadoA(obls, 'j')).toBe(11_000_000);
    expect(asignadoA(obls, 'e')).toBe(5_000_000);
  });
});

describe('confiabilidad', () => {
  it('meses de datos dentro de los últimos seis', () => {
    expect(mesesDeDatos(['2026-11-01', '2026-10-01', '2026-10-01', '2026-01-01'], HOY)).toBe(2);
    expect(mesesDeDatos([], HOY)).toBe(0);
    expect(mesesDeDatos(['2026-06-01', '2026-05-01'], HOY)).toBe(1); // mayo ya quedó fuera de la ventana de 6 meses
  });

  it('tres meses para ser utilizable, seis para ser bueno', () => {
    expect([0, 1, 2].map(confiabilidad)).toEqual(['baja', 'baja', 'baja']);
    expect([3, 4, 5].map(confiabilidad)).toEqual(['usable', 'usable', 'usable']);
    expect([6, 7].map(confiabilidad)).toEqual(['buena', 'buena']);
  });
});

const g = (fecha: string, monto: number, tipo: GastoPiso['tipo'] = 'variable_necesario', mes_ipc = fecha.slice(0, 7) + '-01'): GastoPiso => ({ monto, tipo, fecha, mes_ipc });

describe('piso personal', () => {
  it('mediana, no promedio: un mes con un arreglo de $800.000 no lo infla', () => {
    const r = pisoPersonal([
      g('2026-05-10', 40_000_000), g('2026-06-10', 42_000_000), g('2026-07-10', 41_000_000),
      g('2026-08-10', 80_000_000), // el mes del techo (variable necesario)
      g('2026-09-10', 43_000_000), g('2026-10-10', 41_500_000),
    ], HOY);
    expect(r.meses).toBe(6);
    expect(r.mediana).toBe(41_500_000 + (42_000_000 - 41_500_000) / 2); // mediana de 6 valores = promedio de los dos centrales
    expect(r.ajustado).toBe(false);
  });

  it('solo cuentan los variables necesarios; el resto marca que el mes tuvo datos', () => {
    const r = pisoPersonal([
      g('2026-09-05', 10_000_000, 'variable_necesario'), g('2026-09-06', 90_000_000, 'discrecional'), g('2026-09-07', 5_000_000, 'fijo_obligatorio'),
      g('2026-10-05', 12_000_000, 'variable_necesario'),
    ], HOY);
    expect(r.meses).toBe(2);
    expect(r.mediana).toBe(11_000_000);
  });

  it('un mes con gastos pero sin variables necesarios cuenta como cero (no se ignora)', () => {
    const r = pisoPersonal([g('2026-09-05', 90_000_000, 'discrecional'), g('2026-10-05', 12_000_000)], HOY);
    expect(r.mediana).toBe(6_000_000);
  });

  it('el mes en curso no entra (está a medias) y sin meses cerrados no hay número', () => {
    expect(pisoPersonal([g('2026-11-03', 50_000_000)], HOY)).toEqual({ mediana: null, meses: 0, ajustado: false, mesReferencia: null });
    expect(pisoPersonal([], HOY).mediana).toBeNull();
  });

  it('ajusta por IPC cuando está todo cargado; si falta algún mes, queda nominal', () => {
    const gastos = [g('2026-09-05', 10_000_000), g('2026-10-05', 10_000_000)];
    const ok = pisoPersonal(gastos, HOY, { '2026-09-01': 100, '2026-10-01': 110, '2026-11-01': 120 });
    expect(ok.ajustado).toBe(true);
    expect(ok.mesReferencia).toBe('2026-11-01');
    expect(ok.mediana).toBe(Math.round((12_000_000 + Math.round((10_000_000 * 120) / 110)) / 2));
    const incompleto = pisoPersonal(gastos, HOY, { '2026-10-01': 110, '2026-11-01': 120 });
    expect(incompleto.ajustado).toBe(false);
    expect(incompleto.mediana).toBe(10_000_000);
  });

  it('mediana', () => {
    expect(medianaDe([])).toBeNull();
    expect(medianaDe([5])).toBe(5);
    expect(medianaDe([1, 9, 3])).toBe(3);
    expect(medianaDe([1, 2, 3, 4])).toBe(3); // (2+3)/2 = 2,5 → redondea
  });
});
