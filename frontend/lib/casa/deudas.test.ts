import { describe, expect, it } from 'vitest';
import {
  claveMes, comprometidoMensual, cuotasRestantes, liberaciones, mesFinCronograma, porcentajePagado,
  proyeccionCuotas, ritmoSinCronograma, ultimaCuota, type Deuda,
} from './deudas';

const cuota = (id: string, valor: number, total: number, pagas: number): Deuda => ({
  id, descripcion: id, tipo: 'con_cronograma', monto_total: valor * total, saldo: valor * (total - pagas),
  valor_cuota: valor, cuotas_total: total, cuotas_pagas: pagas, tasa: null, mes_fin: null,
});

const HOY = { anio: 2026, mes: 11 };

describe('deudas y cuotas', () => {
  it('porcentaje pagado', () => {
    expect(porcentajePagado(1_000_000, 750_000)).toBe(25);
    expect(porcentajePagado(1_000_000, 0)).toBe(100);
    expect(porcentajePagado(1_000_000, 1_000_000)).toBe(0);
    expect(porcentajePagado(0, 0)).toBe(0);
    expect(porcentajePagado(1_000_000, 2_000_000)).toBe(0); // saldo mayor al original (intereses): no negativo
  });

  it('cuotas restantes y mes de la última cuota', () => {
    const d = cuota('lavarropas', 6_000_000, 12, 9);
    expect(cuotasRestantes(d)).toBe(3);
    expect(mesFinCronograma(HOY, 3)).toEqual({ anio: 2027, mes: 1 });
    expect(mesFinCronograma(HOY, 1)).toEqual(HOY);
    expect(mesFinCronograma(HOY, 0)).toBeNull();
    expect(claveMes({ anio: 2027, mes: 1 })).toBe('2027-01-01');
  });

  it('comprometido por mes: solo cuentan las cuotas que siguen andando', () => {
    const deudas = [cuota('a', 6_000_000, 12, 9), cuota('b', 10_000_000, 6, 6), cuota('c', 2_000_000, 24, 1)];
    expect(comprometidoMensual(deudas)).toBe(8_000_000);
  });

  it('última cuota de todas', () => {
    const deudas = [cuota('a', 100, 12, 9), cuota('c', 100, 24, 1)];
    expect(ultimaCuota(deudas, HOY)).toEqual({ anio: 2028, mes: 9 }); // 23 restantes: nov 2026 + 22 meses
    expect(ultimaCuota([cuota('b', 100, 6, 6)], HOY)).toBeNull();
  });

  it('proyección y liberaciones: "en febrero se liberan $180.000"', () => {
    // 180.000 en cuotas que terminan en enero; 50.000 que siguen
    const deudas = [cuota('lavarropas', 18_000_000, 3, 0), cuota('celu', 5_000_000, 12, 0)];
    const p = proyeccionCuotas(deudas, HOY, 6);
    expect(p.map((x) => x.monto)).toEqual([23_000_000, 23_000_000, 23_000_000, 5_000_000, 5_000_000, 5_000_000]);
    expect(liberaciones(p)).toEqual([{ mes: { anio: 2027, mes: 2 }, libera: 18_000_000 }]);
  });

  it('ritmo de una deuda sin cronograma, con los pagos de los últimos 90 días', () => {
    const hoy = new Date(2026, 10, 7);
    const pagos = [
      { deuda_id: 'x', monto: 3_000_000, fecha: '2026-11-01' },
      { deuda_id: 'x', monto: 3_000_000, fecha: '2026-10-01' },
      { deuda_id: 'x', monto: 3_000_000, fecha: '2026-09-15' },
      { deuda_id: 'x', monto: 9_999_999, fecha: '2026-01-01' }, // fuera de la ventana
    ];
    const r = ritmoSinCronograma(9_000_000, pagos, hoy)!;
    expect(r.promedioMensual).toBe(3_000_000);
    expect(r.mesFin).toEqual({ anio: 2027, mes: 2 }); // 3 meses más desde noviembre
    expect(ritmoSinCronograma(9_000_000, [], hoy)).toBeNull();
    expect(ritmoSinCronograma(0, pagos, hoy)).toBeNull();
  });
});

import { parseTasaMensual, simularDeuda } from './deudas';

describe('interés de las deudas (tasa mensual)', () => {
  const HOY_M = { anio: 2026, mes: 11 };

  it('lee la tasa mensual', () => {
    expect(parseTasaMensual('3,5')).toBe(3.5);
    expect(parseTasaMensual('3.5')).toBe(3.5);
    expect(parseTasaMensual(' 12 ')).toBe(12);
    expect(parseTasaMensual('0,0001')).toBe(0.0001);
    for (const x of ['', '0', '-1', 'abc', '101', '1,23456', '1,2,3']) expect(parseTasaMensual(x), x).toBeNull();
  });

  it('sin interés es pagar el saldo en cuotas iguales', () => {
    const r = simularDeuda(30_000_000, null, 10_000_000, HOY_M);
    expect(r).toEqual({ sinFin: false, meses: 3, totalInteres: 0, totalPagado: 30_000_000, mesFin: { anio: 2027, mes: 2 } });
  });

  it('con interés: cálculo mes a mes, y lo pagado = saldo + interés', () => {
    // Saldo $100.000, 10% mensual, pago $60.000: mes1 interés 10.000 → 110.000-60.000=50.000; mes2 interés 5.000 → 55.000-55.000(último pago)=0
    const r = simularDeuda(10_000_000, 10, 6_000_000, HOY_M);
    expect(r).toEqual({ sinFin: false, meses: 2, totalInteres: 1_500_000, totalPagado: 11_500_000, mesFin: { anio: 2027, mes: 1 } });
    if (!r?.sinFin) expect(r!.totalPagado).toBe(10_000_000 + r!.totalInteres);
  });

  it('pagar más por mes adelanta la fecha y baja el interés total', () => {
    const poco = simularDeuda(60_000_000, 5, 4_000_000, HOY_M);
    const mas = simularDeuda(60_000_000, 5, 8_000_000, HOY_M);
    expect(poco && !poco.sinFin && mas && !mas.sinFin).toBe(true);
    if (poco && !poco.sinFin && mas && !mas.sinFin) {
      expect(mas.meses).toBeLessThan(poco.meses);
      expect(mas.totalInteres).toBeLessThan(poco.totalInteres);
    }
  });

  it('si el pago no cubre ni el interés del mes, la deuda nunca baja', () => {
    // 5% de $1.000.000 = $50.000 de interés por mes; pagando $50.000 no se avanza
    expect(simularDeuda(100_000_000, 5, 5_000_000, HOY_M)).toEqual({ sinFin: true, interesPrimerMes: 5_000_000 });
    expect(simularDeuda(100_000_000, 5, 4_000_000, HOY_M)).toEqual({ sinFin: true, interesPrimerMes: 5_000_000 });
  });

  it('sin saldo o sin pago no hay simulación', () => {
    expect(simularDeuda(0, 5, 1_000_000, HOY_M)).toBeNull();
    expect(simularDeuda(1_000_000, 5, 0, HOY_M)).toBeNull();
  });
});
