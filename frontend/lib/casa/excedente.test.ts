import { describe, expect, it } from 'vitest';
import { asignadoDetalle, calcularExcedente, ingresoDelMes, reglaDifundida, repartir, salidaDeudas } from './excedente';

describe('excedente', () => {
  it('ingreso del mes: el mayor entre lo cobrado y lo esperado, sin contar dos veces', () => {
    expect(ingresoDelMes([])).toEqual({ ingreso: 0, cobrado: 0, esperado: 0 });
    // Cargó lo esperado y después lo cobrado (el mismo ingreso): cuenta una vez
    expect(ingresoDelMes([{ monto: 85_000_000, esperado_o_real: 'esperado' }, { monto: 85_000_000, esperado_o_real: 'real' }]).ingreso).toBe(85_000_000);
    // Cobró de más: manda lo cobrado
    expect(ingresoDelMes([{ monto: 80_000_000, esperado_o_real: 'esperado' }, { monto: 95_000_000, esperado_o_real: 'real' }]).ingreso).toBe(95_000_000);
    // Cobró una parte: manda lo esperado
    expect(ingresoDelMes([{ monto: 85_000_000, esperado_o_real: 'esperado' }, { monto: 40_000_000, esperado_o_real: 'real' }]).ingreso).toBe(85_000_000);
  });

  it('obligaciones asignadas separadas en mensuales y anuales (1/12)', () => {
    const r = asignadoDetalle([
      { monto_estimado: 8_000_000, recurrencia: 'mensual', hijo_id: null, responsable_id: 'yo' },
      { monto_estimado: 6_000_000, recurrencia: 'bimestral', hijo_id: null, responsable_id: 'yo' },
      { monto_estimado: 60_000_000, recurrencia: 'anual', hijo_id: null, responsable_id: 'yo' },
      { monto_estimado: 9_000_000, recurrencia: 'mensual', hijo_id: null, responsable_id: 'otro' },
    ], 'yo');
    expect(r).toEqual({ mensuales: 11_000_000, anuales: 5_000_000 });
  });

  it('la cuenta del spec: si te dice que te sobran 500.000 pero hay 180.000 de cuotas y 70.000 para marzo, no te sobran 500.000', () => {
    // Ingreso 1.500.000, a cargo 400.000, piso personal 350.000 → sin cuotas ni anuales "sobrarían" 750.000
    const sinOlvidos = calcularExcedente({ ingreso: 150_000_000, asignadas: 40_000_000, pisoPersonal: 35_000_000, cuotas: 0, anuales: 0 });
    expect(sinOlvidos).toBe(75_000_000);
    const real = calcularExcedente({ ingreso: 150_000_000, asignadas: 40_000_000, pisoPersonal: 35_000_000, cuotas: 18_000_000, anuales: 7_000_000 });
    expect(real).toBe(50_000_000);
  });

  it('puede dar negativo (no alcanza)', () => {
    expect(calcularExcedente({ ingreso: 10_000_000, asignadas: 8_000_000, pisoPersonal: 5_000_000, cuotas: 0, anuales: 0 })).toBe(-3_000_000);
  });

  it('reparto en tres destinos, sin perder ni un centavo', () => {
    const r = repartir(25_000_001, 40, 35);
    expect(r.deuda).toBe(10_000_000);
    expect(r.ahorro).toBe(8_750_000);
    expect(r.libre).toBe(25_000_001 - 10_000_000 - 8_750_000);
    expect(r.deuda + r.ahorro + r.libre).toBe(25_000_001);
  });

  it('el reparto no se pasa de 100% y con excedente cero o negativo no reparte', () => {
    expect(repartir(1_000, 80, 80)).toEqual({ deuda: 800, ahorro: 200, libre: 0 }); // el ahorro se recorta a lo que queda
    expect(repartir(0, 50, 50)).toEqual({ deuda: 0, ahorro: 0, libre: 0 });
    expect(repartir(-5_000, 50, 50)).toEqual({ deuda: 0, ahorro: 0, libre: 0 });
  });

  it('regla general del 10% al 20% de lo que entra', () => {
    expect(reglaDifundida(150_000_000)).toEqual({ minimo: 15_000_000, maximo: 30_000_000 });
  });

  it('salida de deudas: pagar más por mes adelanta la fecha', () => {
    const hoy = { anio: 2026, mes: 11 };
    expect(salidaDeudas(30_000_000, 3_000_000, 0, hoy)).toEqual({ meses: 10, mesFin: { anio: 2027, mes: 9 } });
    expect(salidaDeudas(30_000_000, 3_000_000, 2_000_000, hoy)).toEqual({ meses: 6, mesFin: { anio: 2027, mes: 5 } });
    expect(salidaDeudas(30_000_000, 0, 5_000_000, hoy)).toEqual({ meses: 6, mesFin: { anio: 2027, mes: 5 } });
    expect(salidaDeudas(30_000_000, 0, 0, hoy)).toBeNull();
    expect(salidaDeudas(0, 3_000_000, 0, hoy)).toBeNull();
  });
});

import { consecuenciaDeudas } from './excedente';

describe('consecuencia de sumar plata a las deudas', () => {
  const HOY_M = { anio: 2026, mes: 11 };

  it('con más por mes, la fecha se adelanta y el interés total baja', () => {
    const deudas = [{ saldo: 30_000_000, tasa: 3, ritmo: 3_000_000 }];
    const base = consecuenciaDeudas(deudas, 0, HOY_M);
    const conExtra = consecuenciaDeudas(deudas, 4_000_000, HOY_M);
    expect(base.sinFecha).toBe(false);
    expect(conExtra.meses!).toBeLessThan(base.meses!);
    expect(conExtra.interesTotal).toBeLessThan(base.interesTotal);
  });

  it('lo extra se reparte en proporción al saldo y las deudas sin tasa no suman interés', () => {
    const r = consecuenciaDeudas([{ saldo: 20_000_000, tasa: null, ritmo: 0 }, { saldo: 10_000_000, tasa: null, ritmo: 0 }], 3_000_000, HOY_M);
    // 2.000.000 y 1.000.000 por mes: ambas en 10 meses
    expect(r).toEqual({ mesFin: { anio: 2027, mes: 9 }, meses: 10, interesTotal: 0, sinFecha: false });
  });

  it('una deuda sin pagos ni extra deja el resultado sin fecha; sin deudas tampoco hay fecha', () => {
    expect(consecuenciaDeudas([{ saldo: 10_000_000, tasa: 2, ritmo: 0 }], 0, HOY_M).sinFecha).toBe(true);
    expect(consecuenciaDeudas([], 5_000_000, HOY_M)).toEqual({ mesFin: null, meses: null, interesTotal: 0, sinFecha: false });
  });
});
