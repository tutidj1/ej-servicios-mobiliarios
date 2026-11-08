import { describe, expect, it } from 'vitest';
import {
  conPuntos, digitosACentavos, diaCorto, fechaLocalISO, formatearCentavos, formatearDigitos, haceDias, mesDe,
  moverMes, nombreMes, rangoMes, sumarCentavos,
} from './dinero';

describe('dinero en centavos', () => {
  it('pasa pesos escritos a centavos enteros', () => {
    expect(digitosACentavos('15000')).toBe(1_500_000);
    expect(digitosACentavos('1')).toBe(100);
    expect(digitosACentavos('999999999')).toBe(99_999_999_900);
  });

  it('rechaza lo inválido (vacío, cero, letras, decimales, demasiado grande)', () => {
    for (const x of ['', '0', '000', '12a', '1.5', '1,5', '-5', '1000000000']) expect(digitosACentavos(x), x).toBeNull();
  });

  it('muestra pesos con puntos y solo muestra centavos si los hay', () => {
    expect(formatearCentavos(1_500_000)).toBe('$ 15.000');
    expect(formatearCentavos(123_456_700)).toBe('$ 1.234.567');
    expect(formatearCentavos(0)).toBe('$ 0');
    expect(formatearCentavos(150_050)).toBe('$ 1.500,50');
    expect(formatearCentavos(5)).toBe('$ 0,05');
    expect(formatearCentavos(-250_000)).toBe('−$ 2.500');
  });

  it('formatea mientras se escribe', () => {
    expect(formatearDigitos('')).toBe('0');
    expect(formatearDigitos('45000')).toBe('45.000');
    expect(conPuntos(1234)).toBe('1.234');
    expect(conPuntos('999')).toBe('999');
  });

  it('suma sin error de punto flotante', () => {
    // 0.1 + 0.2 en pesos con flotantes da 0.30000000000000004; en centavos enteros es exacto
    expect(sumarCentavos([10, 20])).toBe(30);
    expect(sumarCentavos(Array.from({ length: 1000 }, () => 10))).toBe(10_000);
  });
});

describe('fechas y meses', () => {
  it('fecha local y "ayer"', () => {
    const d = new Date(2026, 10, 1); // 1 nov 2026
    expect(fechaLocalISO(d)).toBe('2026-11-01');
    expect(fechaLocalISO(haceDias(d, 1))).toBe('2026-10-31');
    expect(fechaLocalISO(haceDias(new Date(2026, 2, 1), 1))).toBe('2026-02-28');
  });

  it('navega meses cruzando el año', () => {
    expect(moverMes({ anio: 2026, mes: 12 }, 1)).toEqual({ anio: 2027, mes: 1 });
    expect(moverMes({ anio: 2026, mes: 1 }, -1)).toEqual({ anio: 2025, mes: 12 });
    expect(moverMes({ anio: 2026, mes: 3 }, -15)).toEqual({ anio: 2024, mes: 12 });
    expect(mesDe(new Date(2026, 10, 7))).toEqual({ anio: 2026, mes: 11 });
  });

  it('rango del mes es semiabierto', () => {
    expect(rangoMes({ anio: 2026, mes: 11 })).toEqual({ desde: '2026-11-01', hasta: '2026-12-01' });
    expect(rangoMes({ anio: 2026, mes: 12 })).toEqual({ desde: '2026-12-01', hasta: '2027-01-01' });
  });

  it('nombres', () => {
    expect(nombreMes({ anio: 2026, mes: 11 })).toBe('noviembre 2026');
    expect(diaCorto('2026-11-07')).toBe('7 nov');
  });
});
