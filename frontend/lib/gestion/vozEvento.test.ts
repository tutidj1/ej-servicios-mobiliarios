import { describe, expect, it } from 'vitest';
import { esEventoNuevo, interpretar } from './voz';
import { interpretarEvento } from './vozEvento';

const items = [
  { id: 'sillas', nombre: 'Sillas', alias: ['silla'] },
  { id: 'tablones', nombre: 'Tablones de madera', alias: ['tablón', 'tablones', 'mesa de tablón'] },
  { id: 'platos', nombre: 'Plato principal', alias: ['plato', 'platos'] },
  { id: 'mesas', nombre: 'Mesa redonda', alias: ['mesa', 'mesas redondas'] },
];
const HOY = '2026-11-06';

// Mensaje real que mandaría la mamá de Tomás
const MENSAJE =
  'Hola Quiero subir a subir un nuevo evento este evento es de Javier de yacosta lo que tiene es son 100 sillas 10 talones y 100 set de vajilla completo La Silla las cobro $800 los talones los cobró 4000 y el set de vajilla completo los cobró 2000 cada uno lo que quiero es que armar eso es flete incluido el flete me sale en total la ida de la vuelta $100,000 más y me va a enseñar con el 50% Así que no sé cuánto del total Pero quiero saber cuánto es cuando lo calcules vos Así que nada eso';

describe('mensaje completo de la operadora', () => {
  const b = interpretarEvento(MENSAJE, items, HOY);

  it('se reconoce como un evento nuevo', () => {
    expect(esEventoNuevo(MENSAJE)).toBe(true);
    expect(interpretar(MENSAJE, items, HOY).intencion).toBe('evento');
  });
  it('cliente', () => expect(b.cliente).toBe('Javier de Yacosta'));
  it('sillas: 100 a $800', () => expect(b.lineas.find((l) => l.itemId === 'sillas')).toMatchObject({ cantidad: 100, precio: 800 }));
  it('"talones" es tablones: 10 a $4000', () => expect(b.lineas.find((l) => l.itemId === 'tablones')).toMatchObject({ cantidad: 10, precio: 4000 }));
  it('set de vajilla completo (no está en el inventario): 100 a $2000', () => {
    expect(b.lineas.find((l) => l.itemId === null)).toMatchObject({ nombreDicho: 'set de vajilla completo', cantidad: 100, precio: 2000 });
  });
  it('no inventa artículos de más', () => expect(b.lineas).toHaveLength(3));
  it('flete incluido y flete pagado $100.000', () => {
    expect(b.fleteIncluido).toBe(true);
    expect(b.fleteCobrado).toBeNull();
    expect(b.fletePagado).toBe(100000);
  });
  it('seña del 50%', () => expect(b.senaPorcentaje).toBe(50));
  it('sin fecha: no la inventa', () => expect(b.fecha).toBeNull());
  it('los montos dan el total de $320.000', () => {
    const total = b.lineas.reduce((t, l) => t + (l.cantidad ?? 0) * (l.precio ?? 0), 0);
    expect(total).toBe(320000);
    expect((total * b.senaPorcentaje!) / 100).toBe(160000);
  });
});

describe('otras formas de pedirlo', () => {
  it('precio en la misma frase y fecha', () => {
    const b = interpretarEvento('Quiero cargar un evento para María López el 21 de diciembre, 50 sillas a 900 y 5 mesas a 3 mil, seña de 100 mil', items, HOY);
    expect(b.cliente).toBe('María López');
    expect(b.fecha).toBe('2026-12-21');
    expect(b.lineas).toMatchObject([{ itemId: 'sillas', cantidad: 50, precio: 900 }, { itemId: 'mesas', cantidad: 5, precio: 3000 }]);
    expect(b.senaMonto).toBe(100000);
  });
  it('personas', () => {
    expect(interpretarEvento('nuevo evento de Ana para 80 personas', items, HOY).personas).toBe(80);
  });
  it('flete cobrado aparte', () => {
    expect(interpretarEvento('nuevo evento de Ana, 10 sillas a 800, le cobro flete 20 mil', items, HOY).fleteCobrado).toBe(20000);
  });
  it('sin precio dicho deja el precio vacío', () => {
    expect(interpretarEvento('nuevo evento de Ana, 10 sillas', items, HOY).lineas).toMatchObject([{ itemId: 'sillas', cantidad: 10, precio: null }]);
  });
});

// Segundo mensaje real de la operadora (con otras palabras)
const MENSAJE_2 =
  'El cliente se llama Javier de la Costa, la dirección es Sarmiento, me contactó por WhatsApp, alquiló para 100 personas 100 sillas a un costo de 800 pesos, diez tablones a un costo de 4000 pesos, y 7 vajillas completo a un costo de 2000 pesos. El flete me sale 50 ida y 50 de vuelta, o sea que son 100000 pesos de flete.';
const itemsConSet = [...items, { id: 'set', nombre: 'Set de vajilla completo', alias: [] as string[] }];

describe('segundo mensaje de la operadora', () => {
  const b = interpretarEvento(MENSAJE_2, itemsConSet, HOY);

  it('se reconoce como evento completo', () => {
    expect(b.lineas.length).toBeGreaterThanOrEqual(2);
    expect(b.cliente).not.toBe('');
  });
  it('cliente con "de la"', () => expect(b.cliente).toBe('Javier de la Costa'));
  it('dirección', () => expect(b.lugar).toBe('Sarmiento'));
  it('canal: WhatsApp', () => expect(b.canal).toBe('whatsapp'));
  it('para 100 personas', () => expect(b.personas).toBe(100));
  it('100 sillas a 800', () => expect(b.lineas.find((l) => l.itemId === 'sillas')).toMatchObject({ cantidad: 100, precio: 800 }));
  it('"diez tablones" a 4000', () => expect(b.lineas.find((l) => l.itemId === 'tablones')).toMatchObject({ cantidad: 10, precio: 4000 }));
  it('"7 vajillas completo" es el Set de vajilla completo, a 2000', () => {
    expect(b.lineas.find((l) => l.itemId === 'set')).toMatchObject({ cantidad: 7, precio: 2000 });
  });
  it('no inventa artículos de más', () => expect(b.lineas).toHaveLength(3));
  it('flete: 50 ida + 50 vuelta = $100.000 (el total dicho manda)', () => {
    expect(b.fletePagado).toBe(100000);
    expect(b.fleteCobrado).toBeNull();
  });
  it('total de artículos: 80.000 + 40.000 + 14.000', () => {
    expect(b.lineas.reduce((t, l) => t + (l.cantidad ?? 0) * (l.precio ?? 0), 0)).toBe(134000);
  });
});

describe('flete ida y vuelta', () => {
  it('suma las dos partes si no dice el total', () => {
    expect(interpretarEvento('evento de Ana, el flete me sale 50 mil ida y 50 mil vuelta', items, HOY).fletePagado).toBe(100000);
  });
  it('un solo monto "ida y vuelta"', () => {
    expect(interpretarEvento('evento de Ana, el flete me sale 80 mil ida y vuelta', items, HOY).fletePagado).toBe(80000);
  });
});

describe('reservas de varios días seguidos', () => {
  it('"del 21 al 23 de noviembre"', () => {
    const b = interpretarEvento('nuevo evento de Ana, del 21 al 23 de noviembre, 10 sillas a 800', items, HOY);
    expect(b.fecha).toBe('2026-11-21');
    expect(b.fechaHasta).toBe('2026-11-23');
  });
  it('"del 28 al 2" pasa al mes siguiente', () => {
    const b = interpretarEvento('nuevo evento de Ana, del 28 al 2 de diciembre', items, HOY);
    expect(b.fecha).toBe('2026-11-28');
    expect(b.fechaHasta).toBe('2026-12-02');
  });
  it('"el sábado por tres días"', () => {
    const b = interpretarEvento('nuevo evento de Ana, el sábado por tres días', items, HOY);
    expect(b.fecha).toBe('2026-11-07');
    expect(b.fechaHasta).toBe('2026-11-09');
  });
  it('un solo día no inventa fecha de fin', () => {
    expect(interpretarEvento('nuevo evento de Ana, para el 21 de noviembre', items, HOY).fechaHasta).toBeNull();
  });
});
