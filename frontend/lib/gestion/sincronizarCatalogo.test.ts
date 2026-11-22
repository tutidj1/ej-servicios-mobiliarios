import { describe, expect, it } from 'vitest';
import { categoriaDeProducto, planSincronizacion, type ArticuloExistente, type ProductoCatalogo } from './sincronizarCatalogo';

const prod = (id: string, nombre: string, categoria: string, creado = '2026-11-20T10:00:00Z'): ProductoCatalogo => ({
  id,
  nombre,
  categoria,
  created_at: creado,
});
const art = (id: string, nombre: string, producto_id: string | null = null, alias: string[] = []): ArticuloExistente => ({
  id,
  nombre,
  alias,
  producto_id,
});

describe('categoriaDeProducto', () => {
  it('traduce las categorías del catálogo a las del inventario', () => {
    expect(categoriaDeProducto('Mantelería')).toBe('mantelería');
    expect(categoriaDeProducto('Mobiliario')).toBe('mobiliario');
    expect(categoriaDeProducto('Vajilla')).toBe('vajilla');
    expect(categoriaDeProducto('Cubiertos')).toBe('vajilla');
    expect(categoriaDeProducto('Cristalería')).toBe('vajilla');
    expect(categoriaDeProducto('Accesorios')).toBe('vajilla');
    expect(categoriaDeProducto('Decoración')).toBe('otros');
  });
});

describe('planSincronizacion', () => {
  it('crea el artículo de un producto nuevo', () => {
    const plan = planSincronizacion([prod('p1', 'Manteles redondos Blancos', 'Mantelería')], [], { desde: '2026-11-15' });
    expect(plan.crear.map((p) => p.id)).toEqual(['p1']);
  });

  it('no duplica lo que ya tiene artículo vinculado', () => {
    const plan = planSincronizacion([prod('p1', 'Panera', 'Accesorios')], [art('a1', 'Panera', 'p1')], { desde: '2026-11-15' });
    expect(plan.crear).toEqual([]);
    expect(plan.vincular).toEqual([]);
  });

  it('si ya hay un artículo con ese nombre (o alias) sin vínculo, solo lo vincula', () => {
    const plan = planSincronizacion([prod('p1', 'Copa de champán', 'Cristalería')], [art('a1', 'Copa de champagne', null, ['copa de champán'])], {
      desde: '2026-11-15',
    });
    expect(plan.crear).toEqual([]);
    expect(plan.vincular).toEqual([{ productoId: 'p1', articuloId: 'a1' }]);
  });

  it('ignora los productos anteriores a la fecha de corte', () => {
    const plan = planSincronizacion([prod('p1', 'Silla vieja', 'Mobiliario', '2026-06-14T00:00:00Z')], [], { desde: '2026-11-15' });
    expect(plan.crear).toEqual([]);
  });

  it('con ids, procesa solo esos aunque sean viejos', () => {
    const plan = planSincronizacion([prod('p1', 'Silla vieja', 'Mobiliario', '2026-06-14T00:00:00Z')], [], { ids: ['p1'] });
    expect(plan.crear.map((p) => p.id)).toEqual(['p1']);
  });

  it('dos productos con el mismo nombre crean un solo artículo', () => {
    const plan = planSincronizacion([prod('p1', 'Platina', 'Accesorios'), prod('p2', 'platina', 'Accesorios')], [], { desde: '2026-11-15' });
    expect(plan.crear.map((p) => p.id)).toEqual(['p1']);
  });
});
