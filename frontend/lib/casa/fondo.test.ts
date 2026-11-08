import { describe, expect, it } from 'vitest';
import { alPagar, calendarioAnual, estadoItem, mesesParaApartar, proximoVencimiento, resumenFondo, type ItemFondo } from './fondo';

const item = (id: string, monto: number, mes: number, apartado = 0, pagado_anio: number | null = null): ItemFondo => ({ id, concepto: id, monto, mes, apartado, pagado_anio });
const HOY = { anio: 2026, mes: 11 };

describe('fondo de gastos anuales', () => {
  it('próximo vencimiento: este año si todavía no pasó, el que viene si ya pasó', () => {
    expect(proximoVencimiento({ mes: 12, pagado_anio: null }, HOY)).toEqual({ anio: 2026, mes: 12 });
    expect(proximoVencimiento({ mes: 11, pagado_anio: null }, HOY)).toEqual({ anio: 2026, mes: 11 }); // vence este mes
    expect(proximoVencimiento({ mes: 3, pagado_anio: null }, HOY)).toEqual({ anio: 2027, mes: 3 });
  });

  it('si el vencimiento ya está pagado, el ciclo pasa al año siguiente', () => {
    expect(proximoVencimiento({ mes: 12, pagado_anio: 2026 }, HOY)).toEqual({ anio: 2027, mes: 12 });
    expect(proximoVencimiento({ mes: 3, pagado_anio: 2027 }, HOY)).toEqual({ anio: 2028, mes: 3 });
    expect(proximoVencimiento({ mes: 3, pagado_anio: 2026 }, HOY)).toEqual({ anio: 2027, mes: 3 }); // pagado el de este año, el próximo es el que viene
  });

  it('meses para apartar: este mes incluido y como mínimo 1', () => {
    expect(mesesParaApartar({ anio: 2027, mes: 3 }, HOY)).toBe(4);
    expect(mesesParaApartar({ anio: 2026, mes: 12 }, HOY)).toBe(1);
    expect(mesesParaApartar({ anio: 2026, mes: 11 }, HOY)).toBe(1); // vence ahora
  });

  it('cuánto apartar por mes, cuánto hay y cuánto falta', () => {
    // Matrícula de $840.000 en marzo, con $120.000 apartados: faltan $720.000 en 4 meses → $180.000 por mes
    const e = estadoItem(item('matricula', 84_000_000, 3, 12_000_000), HOY);
    expect(e.vence).toEqual({ anio: 2027, mes: 3 });
    expect(e.meses).toBe(4);
    expect(e.falta).toBe(72_000_000);
    expect(e.apartarPorMes).toBe(18_000_000);
    expect(e.porcentaje).toBe(14);
  });

  it('redondea hacia arriba lo que hay que apartar (para no llegar corto) y si ya está cubierto es cero', () => {
    expect(estadoItem(item('x', 10_000_001, 3), HOY).apartarPorMes).toBe(2_500_100); // 25.000,0025 → $25.001
    const cubierto = estadoItem(item('y', 5_000_000, 3, 6_000_000), HOY);
    expect(cubierto.falta).toBe(0);
    expect(cubierto.apartarPorMes).toBe(0);
    expect(cubierto.porcentaje).toBe(100);
  });

  it('resumen: total anual, un doceavo por mes, apartado y faltante', () => {
    const r = resumenFondo([
      item('patente', 60_000_000, 3, 10_000_000),
      item('seguro', 24_000_000, 6, 0),
      item('utiles', 12_000_000, 3, 12_000_000),
    ], HOY);
    expect(r.totalAnual).toBe(96_000_000);
    expect(r.porMes).toBe(8_000_000);
    expect(r.apartado).toBe(22_000_000);
    expect(r.falta).toBe(50_000_000 + 24_000_000);
    // patente: 50M/4 = 12,5M; seguro: vence jun 2027 → 7 meses, 24M/7 = 3.428.571,4 → al peso hacia arriba 3.428.600; útiles: ya cubierto
    expect(r.apartarPorMesHoy).toBe(12_500_000 + 3_428_600);
  });

  it('calendario: marzo junta varios gastos y se ve a tiempo', () => {
    const cal = calendarioAnual([item('patente', 60_000_000, 3), item('matricula', 84_000_000, 3), item('seguro', 24_000_000, 6)], HOY);
    expect(cal).toHaveLength(12);
    const marzo = cal.find((m) => m.mes.mes === 3)!;
    expect(marzo.mes.anio).toBe(2027);
    expect(marzo.items.map((i) => i.id)).toEqual(['patente', 'matricula']);
    expect(marzo.total).toBe(144_000_000);
    expect(cal.filter((m) => m.total === 0).length).toBe(10);
  });

  it('al pagar, el apartado vuelve a cero y el ciclo pasa al año siguiente', () => {
    const f = item('seguro', 24_000_000, 12, 24_000_000);
    const r = alPagar(f, HOY);
    expect(r).toEqual({ apartado: 0, pagado_anio: 2026 });
    expect(proximoVencimiento({ mes: 12, pagado_anio: r.pagado_anio }, HOY)).toEqual({ anio: 2027, mes: 12 });
  });
});
