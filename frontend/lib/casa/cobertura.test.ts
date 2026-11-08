import { describe, expect, it } from 'vitest';
import { coberturaDelMes, claveMes, pagadoPorMes, saldosEntreAdultos, ultimosMeses, type InstanciaHogar } from './cobertura';

const J = 'javier', E = 'eugenia';
const est = new Map([['luz', 8_500_000], ['gas', 5_000_000], ['escuela', 20_000_000]]);

const inst = (obl: string, periodo: string, estado: 'pendiente' | 'pagado', real: number | null, pago: string | null, resp: string | null): InstanciaHogar => ({
  obligacion_id: obl, periodo, estado, monto_real: real, pagado_por: pago, responsable_id: resp,
});

describe('cobertura del mes', () => {
  it('suma lo efectivamente pagado por cada uno, sobre el total del mes', () => {
    const c = coberturaDelMes([
      inst('luz', '2026-11-01', 'pagado', 8_700_000, J, J),
      inst('escuela', '2026-11-01', 'pagado', 20_000_000, E, E),
      inst('gas', '2026-11-01', 'pendiente', null, null, E),
    ], est);
    expect(c.total).toBe(8_700_000 + 20_000_000 + 5_000_000);
    expect(c.pendiente).toBe(5_000_000);
    expect(c.porPersona).toEqual([
      { id: E, monto: 20_000_000, porcentaje: 59 },
      { id: J, monto: 8_700_000, porcentaje: 25 },
    ]);
  });

  it('mes sin movimientos', () => {
    expect(coberturaDelMes([], est)).toEqual({ total: 0, pendiente: 0, porPersona: [] });
  });
});

describe('saldar entre ellos', () => {
  it('lo que uno pagó y le tocaba al otro queda como saldo', () => {
    // Javier pagó el gas, que era de Eugenia: Eugenia le debe $50.000 a Javier
    const s = saldosEntreAdultos([inst('gas', '2026-11-01', 'pagado', 5_000_000, J, E)], est, []);
    expect(s).toEqual([{ deudor: E, acreedor: J, monto: 5_000_000 }]);
  });

  it('pagar lo propio, o algo de "cualquiera", no genera saldo', () => {
    expect(saldosEntreAdultos([
      inst('luz', '2026-11-01', 'pagado', 8_700_000, J, J),
      inst('gas', '2026-11-01', 'pagado', 5_000_000, J, null),
      inst('escuela', '2026-11-01', 'pendiente', null, null, E),
    ], est, [])).toEqual([]);
  });

  it('los favores cruzados se compensan', () => {
    const s = saldosEntreAdultos([
      inst('gas', '2026-10-01', 'pagado', 5_000_000, J, E),     // Eugenia le debe 50.000 a Javier
      inst('luz', '2026-11-01', 'pagado', 8_000_000, E, J),     // Javier le debe 80.000 a Eugenia
    ], est, []);
    expect(s).toEqual([{ deudor: J, acreedor: E, monto: 3_000_000 }]);
  });

  it('transferir vuelve el saldo a cero; una transferencia parcial lo reduce', () => {
    const base = [inst('gas', '2026-11-01', 'pagado', 5_000_000, J, E)];
    expect(saldosEntreAdultos(base, est, [{ pagador_id: E, receptor_id: J, monto: 5_000_000 }])).toEqual([]);
    expect(saldosEntreAdultos(base, est, [{ pagador_id: E, receptor_id: J, monto: 2_000_000 }])).toEqual([{ deudor: E, acreedor: J, monto: 3_000_000 }]);
  });

  it('usa el responsable de ese mes, no el actual (cambiar el acuerdo no reescribe el pasado)', () => {
    // En octubre el gas era de Eugenia y lo pagó Javier; en noviembre pasó a ser de Javier y lo pagó él.
    const s = saldosEntreAdultos([
      inst('gas', '2026-10-01', 'pagado', 5_000_000, J, E),
      inst('gas', '2026-11-01', 'pagado', 5_200_000, J, J),
    ], est, []);
    expect(s).toEqual([{ deudor: E, acreedor: J, monto: 5_000_000 }]);
  });

  it('si se transfirió de más, el saldo se invierte (no se pierde)', () => {
    const s = saldosEntreAdultos([inst('gas', '2026-11-01', 'pagado', 5_000_000, J, E)], est, [{ pagador_id: E, receptor_id: J, monto: 6_000_000 }]);
    expect(s).toEqual([{ deudor: J, acreedor: E, monto: 1_000_000 }]);
  });
});

describe('historial de seis meses', () => {
  it('últimos seis meses, del más viejo al más nuevo', () => {
    const m = ultimosMeses({ anio: 2026, mes: 11 }, 6);
    expect(m.map(claveMes)).toEqual(['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01']);
    expect(ultimosMeses({ anio: 2026, mes: 2 }, 3).map(claveMes)).toEqual(['2025-12-01', '2026-01-01', '2026-02-01']);
  });

  it('pagado por persona en cada mes', () => {
    const r = pagadoPorMes([
      inst('luz', '2026-10-01', 'pagado', 8_000_000, J, J),
      inst('gas', '2026-10-01', 'pagado', 5_000_000, E, E),
      inst('luz', '2026-11-01', 'pagado', 9_000_000, E, J),
      inst('gas', '2026-11-01', 'pendiente', null, null, E),
    ], est, [{ anio: 2026, mes: 10 }, { anio: 2026, mes: 11 }]);
    expect(r[0].total).toBe(13_000_000);
    expect(r[0].porPersona.get(J)).toBe(8_000_000);
    expect(r[1].total).toBe(9_000_000);
    expect(r[1].porPersona.get(E)).toBe(9_000_000);
  });
});
