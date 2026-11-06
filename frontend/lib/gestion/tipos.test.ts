import { describe, expect, it } from 'vitest';
import { leerMonto } from './tipos';

describe('leerMonto (como lo escribe la operadora)', () => {
  it.each([
    ['1000', 1000],
    ['1.000', 1000],
    ['150.000', 150000],
    ['$ 1.500,50', 1500.5],
    ['1500.5', 1500.5],
    ['0', 0],
  ])('%s → %s', (texto, esperado) => {
    expect(leerMonto(texto)).toBe(esperado);
  });

  it('vacío o inválido → null', () => {
    expect(leerMonto('')).toBeNull();
    expect(leerMonto('abc')).toBeNull();
    expect(leerMonto('-5')).toBeNull();
  });
});
