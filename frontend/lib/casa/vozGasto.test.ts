import { describe, expect, it } from 'vitest';
import { corregirMonto, parsearGasto } from './vozGasto';

const HOY = '2026-11-08';
const p = (t: string, ctx = {}) => parsearGasto(t, HOY, ctx);

describe('lo que el spec dice que tiene que entender', () => {
  it('"gasté quince lucas en el súper" → $15.000 en Comida', () => {
    const r = p('gasté quince lucas en el súper');
    expect(r.monto).toBe(1_500_000);
    expect(r.categoria).toBe('Comida y supermercado');
    expect(r.fecha).toBe(HOY);
  });

  it('"dos palos de mobiliario" → $2.000.000 (sin categoría: se pregunta)', () => {
    const r = p('dos palos de mobiliario');
    expect(r.monto).toBe(200_000_000);
    expect(r.categoria).toBeNull();
  });

  it('"cargá 45 mil de nafta, ayer" → $45.000 en Transporte, con fecha de ayer', () => {
    const r = p('cargá 45 mil de nafta, ayer');
    expect(r.monto).toBe(4_500_000);
    expect(r.categoria).toBe('Transporte y nafta');
    expect(r.fecha).toBe('2026-11-07');
  });

  it('"pagué la luz, 85" → $85.000 si el estimado de la luz ronda eso; si no, pregunta', () => {
    const conEstimado = p('pagué la luz, 85', { obligaciones: [{ concepto: 'Luz', monto_estimado: 8_500_000 }] });
    expect(conEstimado.monto).toBe(8_500_000);
    expect(conEstimado.resueltoPorEstimado).toBe('Luz');
    expect(conEstimado.categoria).toBe('Impuestos y servicios');

    const sinEstimado = p('pagué la luz, 85');
    expect(sinEstimado.monto).toBeNull();
    expect(sinEstimado.montoAmbiguo).toEqual([8_500, 8_500_000]);

    // El estimado no cierra con ninguna de las dos lecturas: pregunta en vez de inventar
    const noCierra = p('pagué la luz, 85', { obligaciones: [{ concepto: 'Luz', monto_estimado: 40_000_000 }] });
    expect(noCierra.monto).toBeNull();
    expect(noCierra.montoAmbiguo).not.toBeNull();
  });
});

describe('montos argentinos', () => {
  it('lucas, mil, palos, millones y cifras con puntos', () => {
    expect(p('veinte lucas de farmacia').monto).toBe(2_000_000);
    expect(p('gasté 20 lucas').monto).toBe(2_000_000);
    expect(p('compré 1.500 pesos de pan').monto).toBe(150_000);
    expect(p('pagué 45.000 de gas').monto).toBe(4_500_000);
    expect(p('arreglo del techo, un palo').monto).toBe(100_000_000);
    expect(p('dos millones de reforma').monto).toBe(200_000_000);
    expect(p('treinta y cinco mil de remedios').monto).toBe(3_500_000);
  });

  it('"dos y medio": palos, lucas y mil', () => {
    expect(p('dos y medio palos de arreglo').monto).toBe(250_000_000);
    expect(p('dos palos y medio de arreglo').monto).toBe(250_000_000);
    expect(p('dos lucas y media de farmacia').monto).toBe(250_000);
    expect(p('dos y media lucas').monto).toBe(250_000);
  });

  it('un número chico con la palabra "pesos" es exacto, no ambiguo', () => {
    const r = p('gasté 500 pesos en el kiosco');
    expect(r.monto).toBe(50_000);
    expect(r.montoAmbiguo).toBeNull();
  });

  it('un número chico sin unidad es ambiguo: no inventa', () => {
    const r = p('gasté 15 en el súper');
    expect(r.monto).toBeNull();
    expect(r.montoAmbiguo).toEqual([1_500, 1_500_000]);
  });

  it('sin monto no hay monto', () => {
    const r = p('fui al súper');
    expect(r.monto).toBeNull();
    expect(r.montoAmbiguo).toBeNull();
    expect(r.categoria).toBe('Comida y supermercado');
  });
});

describe('fechas y categorías', () => {
  it('ayer, anteayer, hoy y "el 3"', () => {
    expect(p('20 lucas de farmacia ayer').fecha).toBe('2026-11-07');
    expect(p('20 lucas de farmacia anteayer').fecha).toBe('2026-11-06');
    expect(p('20 lucas de farmacia antes de ayer').fecha).toBe('2026-11-06');
    expect(p('20 lucas de farmacia hoy').fecha).toBe(HOY);
    expect(p('20 lucas de farmacia el 3').fecha).toBe('2026-11-03');
  });

  it('el número de una fecha no es el monto', () => {
    const r = p('el 3 pagué 20 lucas de farmacia');
    expect(r.monto).toBe(2_000_000);
    expect(r.fecha).toBe('2026-11-03');
    expect(p('el 12 de octubre gasté 30 mil en la ferretería').monto).toBe(3_000_000);
  });

  it('categorías más comunes', () => {
    const cat = (t: string) => p(t).categoria;
    expect(cat('10 lucas de colectivo')).toBe('Transporte y nafta');
    expect(cat('cena con amigos 40 mil')).toBe('Salidas, ropa y regalos');
    expect(cat('pagué el club 15 mil')).toBe('Escuela y club de los chicos');
    expect(cat('el plomero 30 mil')).toBe('Hogar y mantenimiento');
    expect(cat('compré algo por 5 mil')).toBeNull();
  });
});

describe('transferencias a los hijos', () => {
  it('"le transferí a <hijo> 30 mil" no es un gasto suelto: se deriva a transferencias', () => {
    const r = p('le transferí 30 mil a Bauti', { hijos: ['Bautista', 'Tomás'] });
    expect(r.esTransferenciaAHijo).toBe(false); // "Bauti" no es "Bautista": hace falta el primer nombre exacto
    const r2 = p('le transferí 30 mil a Bautista', { hijos: ['Bautista', 'Tomás'] });
    expect(r2.esTransferenciaAHijo).toBe(true);
    expect(r2.categoria).toBe('Transferencias a los hijos');
    expect(r2.monto).toBe(3_000_000);
    expect(p('le pasé plata al nene, 20 lucas').esTransferenciaAHijo).toBe(true);
  });
});

describe('corregir un monto ("no, 20")', () => {
  it('toma la magnitud del monto anterior', () => {
    expect(corregirMonto('no, 20', 4_500_000)).toBe(2_000_000);          // antes $45.000 → $20.000
    expect(corregirMonto('no, 3', 200_000_000)).toBe(300_000_000);       // antes $2.000.000 → $3.000.000
    expect(corregirMonto('no, 20 mil', 150_000)).toBe(2_000_000);        // si lo dice completo, vale lo que dice
    expect(corregirMonto('no, 500 pesos', 4_500_000)).toBe(50_000);
    expect(corregirMonto('no es eso', 4_500_000)).toBeNull();
  });
});
