import { describe, expect, it } from 'vitest';
import { estadisticasPorItem, resumenGeneral, type LineaHistorial } from './estadisticas';

const nombres = { sillas: 'Sillas', tablones: 'Tablones de madera' };
const l = (item_id: string, evento_id: string, cantidad_total: number, precio_unitario: number): LineaHistorial => ({ item_id, evento_id, cantidad_total, precio_unitario });

const historial = [
  l('sillas', 'e1', 100, 800),
  l('sillas', 'e2', 50, 800),
  l('sillas', 'e3', 30, 1000),
  l('sillas', 'e4', 200, 700),
  l('tablones', 'e1', 10, 4000),
  l('tablones', 'e3', 5, 4500),
];

describe('estudio de precios por artículo', () => {
  const r = estadisticasPorItem(historial, nombres);
  const sillas = r.find((x) => x.itemId === 'sillas')!;

  it('cuenta eventos y unidades', () => {
    expect(sillas.eventos).toBe(4);
    expect(sillas.unidades).toBe(380);
  });
  it('promedio por unidad ponderado por las unidades', () => {
    // (100*800 + 50*800 + 30*1000 + 200*700) / 380 = 290000 / 380
    expect(sillas.precioPromedio).toBeCloseTo(763.16, 2);
  });
  it('promedio simple por evento', () => {
    expect(sillas.precioPromedioPorEvento).toBe(825);
  });
  it('el precio ganador es el que más eventos consigue', () => {
    expect(sillas.ganador).toMatchObject({ precio: 800, eventos: 2, unidades: 150 });
  });
  it('lista los precios del más exitoso al menos', () => {
    expect(sillas.precios.map((p) => p.precio)).toEqual([800, 700, 1000]);
  });
  it('mínimo y máximo', () => {
    expect(sillas.minimo).toBe(700);
    expect(sillas.maximo).toBe(1000);
  });
  it('el ganador cobra más que el promedio (+4,8%)', () => {
    expect(sillas.ganadorVsPromedioPct).toBeCloseTo(4.83, 1);
  });
  it('cada artículo por separado', () => {
    expect(r.map((x) => x.nombre).sort()).toEqual(['Sillas', 'Tablones de madera']);
  });
  it('si empatan en eventos, gana el de más unidades', () => {
    const t = estadisticasPorItem([l('x', 'a', 10, 500), l('x', 'b', 90, 600)], { x: 'X' })[0];
    expect(t.ganador.precio).toBe(600);
  });
  it('ignora líneas sin cantidad o con precio inválido', () => {
    const t = estadisticasPorItem([l('x', 'a', 0, 500), l('x', 'b', 5, 600)], { x: 'X' });
    expect(t[0].eventos).toBe(1);
  });
  it('resumen: más pedido y el que más factura', () => {
    const g = resumenGeneral(r);
    expect(g.masPedido?.itemId).toBe('sillas');
    expect(g.masFactura?.itemId).toBe('sillas');
  });
  it('sin datos no explota', () => {
    expect(estadisticasPorItem([], {})).toEqual([]);
    expect(resumenGeneral([])).toEqual({ masPedido: null, masFactura: null });
  });
});
