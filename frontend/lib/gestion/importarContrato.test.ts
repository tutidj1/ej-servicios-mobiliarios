// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generarContratoPdf } from './contratoPdf';
import { interpretarContrato, leerImporte, leerLineasPdf } from './importarContrato';

describe('leerImporte', () => {
  it('entiende el formato argentino', () => {
    expect(leerImporte('$ 320.000')).toBe(320000);
    expect(leerImporte('320.000,50')).toBe(320000.5);
    expect(leerImporte('85000')).toBe(85000);
    expect(leerImporte('sin monto')).toBeNull();
  });
});

describe('interpretarContrato', () => {
  it('lee un texto con la forma de la plantilla', () => {
    const r = interpretarContrato([
      'En la ciudad de Santa Fe, a los 6 días del mes de noviembre de 2026, entre:',
      'EL LOCATARIO (CLIENTE):',
      'Nombre y Apellido: Ana Pérez',
      'DNI: 30.111.222 Teléfono: 342 506 8365',
      'Lugar del evento: Salón Los Pinos',
      'Los bienes deberán ser devueltos en la fecha acordada (08/11/2026). El retraso',
      'CONCEPTO MONTO / DETALLE',
      'Servicio Flete $ 100.000',
      'Monto $ 320.000',
      'seña $ 160.000',
    ]);
    expect(r).toMatchObject({ cliente: 'Ana Pérez', telefono: '342 506 8365', lugar: 'Salón Los Pinos', fechaFirma: '2026-11-06', fechaDevolucion: '2026-11-08', total: 320000, sena: 160000, flete: 100000 });
  });
});

describe('contrato generado por la propia página → se vuelve a leer', () => {
  it('ida y vuelta del PDF', async () => {
    const blob = await generarContratoPdf({
      locador: { nombre: 'Locador de Prueba', dni: '11.111.111', telefono: '342 111 1111' },
      locatario: { nombre: 'Javier de la Costa', dni: null, telefono: '342 000 0000' },
      lugar: 'Sarmiento',
      emision: '2026-11-08',
      fechaDevolucion: '2026-11-22',
      articulos: [{ nombre: 'Sillas', orden: 1, cantidad: 100 }],
      fleteCobrado: 100000,
      total: 320000,
      sena: 160000,
    });
    const lineas = await leerLineasPdf(await blob.arrayBuffer());
    const r = interpretarContrato(lineas);
    expect(r.cliente).toBe('Javier de la Costa');
    expect(r.total).toBe(320000);
    expect(r.sena).toBe(160000);
    expect(r.fechaDevolucion).toBe('2026-11-22');
    expect(r.fechaFirma).toBe('2026-11-08');
  }, 30000);
});
