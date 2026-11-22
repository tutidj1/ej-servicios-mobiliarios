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

describe('catálogo real vs inventario de la plantilla', () => {
  const inventario = [
    ['Sillas', ['silla']], ['Mesa redonda', ['mesas redondas', 'mesa']], ['Caballetes', ['caballete']],
    ['Plato principal', ['platos principales', 'plato playo', 'plato']], ['Cuchillos', ['cuchillo']], ['Platos de postre', ['plato de postre']],
    ['Cuchara de postre', ['cucharas de postre']], ['Copa de champagne', ['copas de champagne', 'copa de champán']],
    ['Frasco dispensador', ['dispensador', 'frasco para jugo']], ['Cubre sillas', ['cubre silla', 'cubresillas', 'fundas de sillas']],
    ['Ensaladera', ['ensaladeras']], ['Bandeja de mozo', ['bandejas de mozo', 'bandeja']],
    ['Mantelería blanca', ['manteles blancos', 'mantel blanco', 'manteles']], ['Servilletas', ['servilleta']],
    ['Caminos celeste pastel', ['camino de mesa', 'caminos']], ['Platos cuadrados', ['plato cuadrado']], ['Tenedores', ['tenedor']],
    ['Tenedores de postre', ['tenedor de postre']], ['Copas de vino / agua', ['copas de vino', 'copas de agua', 'copa']],
    ['Estaca para asado', ['estacas', 'estaca']], ['Taza de té', ['tazas de té', 'tazas', 'taza']], ['Cucharas de té', ['cucharita de té', 'cucharitas']],
    ['Frapera', ['fraperas']], ['Hielera con pinza', ['hielera', 'hieleras']], ['Tablones de madera', ['tablón', 'tablones', 'mesa de tablón']],
  ].map(([nombre, alias], i) => art('a' + i, nombre as string, null, alias as string[]));

  const catalogo: [string, string][] = [
    ['Plato de entrada', 'Vajilla'], ['Cubre Mantel Azul', 'Mantelería'], ['Panera', 'Accesorios'], ['Manteles negros rectangulares', 'Mantelería'],
    ['Manteles redondos Blancos', 'Mantelería'], ['Platina grande', 'Accesorios'], ['Platina Madiana', 'Accesorios'],
    ['Ensaladera de acero inoxidable', 'Accesorios'], ['Tenedor de postre', 'Cubiertos'], ['Compotera de vidrio', 'Cristalería'],
    ['Frasco dispenser de vidrio x2 con canilla.', 'Accesorios'], ['Bandeja de mesa', 'Accesorios'], ['Azucarera', 'Accesorios'],
    ['Servilletas de tela', 'Mantelería'], ['Cuchillo de mesa', 'Cubiertos'], ['Frapera de plastico', 'Accesorios'], ['Hielera de plástico', 'Accesorios'],
    ['Mantelería negra', 'Mantelería'], ['Platillo para taza de té', 'Vajilla'], ['Sillas de plástico reforzado', 'Mobiliario'],
    ['Copa de champagne', 'Cristalería'], ['Cucharita de té', 'Cubiertos'], ['Mantelería blanca', 'Mantelería'], ['Tenedor de mesa', 'Cubiertos'],
    ['Caballetes de hierro', 'Mobiliario'], ['Taza de té', 'Vajilla'], ['Cuchara de postre', 'Cubiertos'], ['Copa de vino / agua', 'Cristalería'],
    ['Tetera de loza', 'Vajilla'], ['Tablones de madera 220cm x 60cm', 'Mobiliario'], ['Plato para mesa dulce', 'Vajilla'],
    ['Plato principal', 'Vajilla'], ['Bandeja de mozo', 'Accesorios'],
  ];

  it('solo faltan en el presupuesto las piezas que de verdad no están', () => {
    const productos = catalogo.map(([nombre, categoria], i) => prod('p' + i, nombre, categoria));
    const plan = planSincronizacion(productos, inventario);
    expect(plan.crear.map((p) => p.nombre).sort()).toEqual(
      ['Azucarera', 'Bandeja de mesa', 'Compotera de vidrio', 'Cubre Mantel Azul', 'Manteles negros rectangulares', 'Manteles redondos Blancos',
        'Mantelería negra', 'Panera', 'Plato de entrada', 'Platillo para taza de té', 'Platina Madiana', 'Platina grande', 'Tetera de loza'].sort(),
    );
  });
});
