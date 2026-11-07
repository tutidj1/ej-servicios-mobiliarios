import { describe, expect, it } from 'vitest';
import { paginasProducto, productoCorresponde } from './paginasProducto';

const vajilla = paginasProducto.find((p) => p.slug === 'alquiler-de-vajilla-santa-fe')!;

describe('página de vajilla', () => {
  it('muestra las 16 piezas de vajilla del catálogo y deja afuera mantelería y mobiliario', () => {
    const catalogo = [
      ['Cucharita de té', 'Cubiertos'], ['Tenedor de mesa', 'Cubiertos'], ['Taza de té', 'Vajilla'], ['Cuchara de postre', 'Cubiertos'],
      ['Copa de vino / agua', 'Cristalería'], ['Tetera de loza', 'Vajilla'], ['Plato para mesa dulce', 'Vajilla'], ['Plato principal', 'Vajilla'],
      ['Bandeja de mozo', 'Accesorios'], ['Copa de champagne', 'Cristalería'], ['Cuchillo de mesa', 'Cubiertos'], ['Platillo para taza de té', 'Vajilla'],
      ['Frasco dispenser de vidrio x2 con canilla.', 'Accesorios'], ['Compotera de vidrio', 'Cristalería'], ['Tenedor de postre', 'Cubiertos'],
      ['Ensaladera de acero inoxidable', 'Accesorios'],
    ];
    catalogo.forEach(([nombre, categoria]) => expect(productoCorresponde(vajilla.filtroFotos, { nombre, categoria })).toBe(true));
    ['Mantelería blanca', 'Servilletas de tela', 'Sillas de plástico reforzado', 'Frapera de plastico', 'Hielera de plástico', 'Azucarera'].forEach((nombre) =>
      expect(productoCorresponde(vajilla.filtroFotos, { nombre, categoria: nombre.startsWith('Mantel') || nombre.startsWith('Servil') ? 'Mantelería' : 'Accesorios' })).toBe(false),
    );
  });
});
