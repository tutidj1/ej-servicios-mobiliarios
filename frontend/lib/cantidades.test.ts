import { describe, expect, it } from 'vitest';
import { cantidadSugerida } from './cantidades';

describe('cantidadSugerida', () => {
  it('100 invitados: 10 tablones, 20 caballetes, 10 manteles, 100 sillas', () => {
    expect(cantidadSugerida('Tablones de madera 220cm x 60cm', 100, true)).toBe(10);
    expect(cantidadSugerida('Caballetes de hierro', 100, true)).toBe(20);
    expect(cantidadSugerida('Mantelería blanca', 100, true)).toBe(10);
    expect(cantidadSugerida('Sillas de plástico reforzado', 100, true)).toBe(100);
  });
  it('redondea para arriba', () => {
    expect(cantidadSugerida('Tablones de madera', 85, true)).toBe(9);
    expect(cantidadSugerida('Caballetes de hierro', 85, true)).toBe(18);
  });
  it('las servilletas van una por invitado y lo que no depende de invitados no lleva cantidad', () => {
    expect(cantidadSugerida('Servilletas de tela', 80, true)).toBe(80);
    expect(cantidadSugerida('Azucarera', 80, false)).toBeNull();
  });
});
