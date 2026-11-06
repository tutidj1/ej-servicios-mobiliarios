import { describe, expect, it } from 'vitest';
import { eventoPorNombre, extraerNumeros, interpretar, interpretarFecha, normalizar } from './voz';

const items = [
  { id: 'sillas', nombre: 'Sillas', alias: ['silla'] },
  { id: 'tablones', nombre: 'Tablones de madera', alias: ['tablón', 'tablones', 'mesa de tablón'] },
  { id: 'caballetes', nombre: 'Caballetes', alias: ['caballete'] },
  { id: 'platos', nombre: 'Plato principal', alias: ['plato', 'platos'] },
  { id: 'postre', nombre: 'Platos de postre', alias: ['plato de postre'] },
];
const HOY = '2026-11-06';
const num = (t: string) => extraerNumeros(normalizar(t).split(' ')).map((n) => n.valor);

describe('números dichos en voz alta', () => {
  it.each([
    ['50 mil', [50000]],
    ['cincuenta mil', [50000]],
    ['mil', [1000]],
    ['mil quinientos', [1500]],
    ['2 mil 500', [2500]],
    ['treinta y cinco', [35]],
    ['150.000', [150000]],
    ['veinte lucas', [20000]],
    ['ciento cincuenta', [150]],
    ['dos millones', [2000000]],
  ])('%s', (texto, esperado) => expect(num(texto as string)).toEqual(esperado));
});

describe('fechas', () => {
  const f = (t: string) => interpretarFecha(normalizar(t).split(' '), HOY);
  it('hoy y mañana', () => {
    expect(f('para hoy')).toBe('2026-11-06');
    expect(f('para mañana')).toBe('2026-11-07');
  });
  it('"el 21" es el próximo 21', () => expect(f('para el 21')).toBe('2026-11-21'));
  it('un día ya pasado salta al mes siguiente', () => expect(f('para el 3')).toBe('2026-12-03'));
  it('con mes', () => expect(f('el 21 de diciembre')).toBe('2026-12-21'));
  it('mes ya pasado va al año siguiente', () => expect(f('el 10 de marzo')).toBe('2027-03-10'));
  it('día de la semana', () => expect(f('el sábado')).toBe('2026-11-07'));
  it('sin fecha → vacío', () => expect(f('sillas por favor')).toBeNull());
});

describe('frases del ejemplo de la especificación', () => {
  it('"subalquilé 50 sillas a mil"', () => {
    const r = interpretar('subalquilé 50 sillas a mil', items, HOY);
    expect(r).toMatchObject({ intencion: 'subalquiler', cantidad: 50, costoUnitario: 1000, itemIds: ['sillas'] });
  });
  it('"pagué 30 mil de flete"', () => {
    expect(interpretar('pagué 30 mil de flete', items, HOY)).toMatchObject({ intencion: 'costo', monto: 30000, tipoCosto: 'flete' });
  });
  it('"me dejó 50 mil de seña"', () => {
    expect(interpretar('me dejó 50 mil de seña', items, HOY)).toMatchObject({ intencion: 'pago', monto: 50000, tipoPago: 'seña' });
  });
  it('"¿tengo 150 sillas para el 21?"', () => {
    expect(interpretar('¿tengo 150 sillas para el 21?', items, HOY)).toMatchObject({
      intencion: 'disponibilidad', cantidad: 150, itemIds: ['sillas'], fecha: '2026-11-21',
    });
  });
});

describe('otras formas de decirlo', () => {
  it('saldo por transferencia', () => {
    expect(interpretar('me transfirió el saldo, cien mil', items, HOY)).toMatchObject({ intencion: 'pago', monto: 100000, tipoPago: 'saldo', medio: 'transferencia' });
  });
  it('rotura y lavado', () => {
    expect(interpretar('gasté cinco mil en lavado', items, HOY)).toMatchObject({ intencion: 'costo', monto: 5000, tipoCosto: 'lavado' });
    expect(interpretar('pagué 2 mil por unas copas rotas', items, HOY)).toMatchObject({ tipoCosto: 'rotura' });
  });
  it('plural y alias de tablones', () => {
    expect(interpretar('subalquilé 8 tablones a 3 mil', items, HOY)).toMatchObject({ cantidad: 8, costoUnitario: 3000, itemIds: ['tablones'] });
  });
  it('gana el nombre más largo (platos de postre, no plato)', () => {
    expect(interpretar('subalquilé 20 platos de postre a 500', items, HOY).itemIds).toEqual(['postre']);
  });
});

describe('no inventa', () => {
  it('sin monto deja el monto vacío', () => {
    expect(interpretar('me dejó la seña', items, HOY)).toMatchObject({ intencion: 'pago', monto: null });
  });
  it('sin fecha deja la fecha vacía', () => {
    expect(interpretar('tengo 80 sillas', items, HOY)).toMatchObject({ intencion: 'disponibilidad', cantidad: 80, fecha: null });
  });
  it('frase que no se entiende', () => {
    expect(interpretar('hola qué tal', items, HOY).intencion).toBe('desconocido');
  });
  it('artículo ambiguo devuelve todos los candidatos', () => {
    const dos = [...items, { id: 'copas', nombre: 'Copa de vino', alias: ['copa'] }, { id: 'copas2', nombre: 'Copa de agua', alias: ['copa'] }];
    expect(interpretar('subalquilé 10 copas a mil', dos, HOY).itemIds.sort()).toEqual(['copas', 'copas2']);
  });
});

describe('evento nombrado', () => {
  const eventos = [{ id: 'a', nombre: 'Valentina Fernandez' }, { id: 'b', nombre: 'Romina Perez' }];
  it('propone el único que coincide', () => expect(eventoPorNombre('me dejó 50 mil Valentina', eventos)).toBe('a'));
  it('si nombra a nadie, no elige', () => expect(eventoPorNombre('me dejó 50 mil', eventos)).toBeNull());
});
