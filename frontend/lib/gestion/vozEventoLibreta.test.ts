import { describe, expect, it } from 'vitest';
import { esEventoNuevo, interpretar } from './voz';
import { interpretarEvento } from './vozEvento';

const nuevo = (id: string, nombre: string, alias: string[]) => ({ id, nombre, alias });
const items = [
  nuevo('sillas', 'Sillas', ['silla']),
  nuevo('mesa', 'Mesa redonda', ['mesas redondas', 'mesa']),
  nuevo('cab', 'Caballetes', ['caballete']),
  nuevo('plato', 'Plato principal', ['platos principales', 'plato playo', 'plato']),
  nuevo('cuchillos', 'Cuchillos', ['cuchillo']),
  nuevo('postre', 'Platos de postre', ['plato de postre']),
  nuevo('champ', 'Copa de champagne', ['copas de champagne', 'copa de champán']),
  nuevo('cubre', 'Cubre sillas', ['cubre silla', 'cubresillas', 'fundas de sillas']),
  nuevo('ensal', 'Ensaladera', ['ensaladeras']),
  nuevo('mant', 'Mantelería blanca', ['manteles blancos', 'mantel blanco', 'manteles']),
  nuevo('servi', 'Servilletas', ['servilleta']),
  nuevo('camino', 'Caminos celeste pastel', ['camino de mesa', 'caminos']),
  nuevo('tenedores', 'Tenedores', ['tenedor']),
  nuevo('copas', 'Copas de vino / agua', ['copas de vino', 'copas de agua', 'copa']),
  nuevo('frapera', 'Frapera', ['fraperas']),
];

const MENSAJE =
  'las ventas el cliente se llama Luis batistella sin doble l Luis batistella es el 15 del 11 de 2026 en Monte Vera formosa 1875 son 25 platos principales 25 cuchillos 25 tenedores 25 copas 25 platos de postres 25 sillas 25 copa de champán dos manteles blancos Dos caminos celestes 25 cubrecillas tres raperas seis ensaladeras 25 servilletas el total de todos son 199,600 pesos';

describe('mensaje de la libreta (sin precios por artículo)', () => {
  const b = interpretarEvento(MENSAJE, items, '2026-11-08');
  const cant = (id: string) => b.lineas.find((l) => l.itemId === id)?.cantidad;
  it('se reconoce como un evento nuevo', () => {
    expect(esEventoNuevo(MENSAJE)).toBe(true);
    expect(interpretar(MENSAJE, items, '2026-11-08').intencion).toBe('evento');
  });
  it('cliente, fecha y lugar', () => {
    expect(b.cliente).toBe('Luis Batistella');
    expect(b.fecha).toBe('2026-11-15');
    expect(b.lugar).toBe('Monte Vera Formosa 1875');
  });
  it('el total sin precios por artículo', () => {
    expect(b.total).toBe(199600);
    expect(b.lineas.every((l) => l.precio === null)).toBe(true);
  });
  it('todas las cantidades, sin confundir la fecha con un artículo', () => {
    expect(b.lineas).toHaveLength(13);
    expect(cant('plato')).toBe(25);
    expect(cant('sillas')).toBe(25);
    expect(cant('mant')).toBe(2);
    expect(cant('camino')).toBe(2);
    expect(cant('ensal')).toBe(6);
    expect(cant('frapera')).toBe(3); // "raperas" = fraperas
    expect(cant('cubre')).toBe(25);
  });
});
