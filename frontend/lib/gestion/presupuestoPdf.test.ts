// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generarPresupuestoPdf, nombreArchivoPresupuesto, totalPresupuesto } from './presupuestoPdf';

const datos = {
  cliente: { nombre: 'Javier de la Costa', telefono: '342 000 0000' },
  evento: { fecha: '2026-11-21', lugar: 'Sarmiento', personas: 100, tipo: null },
  lineas: [
    { nombre: 'Sillas', cantidad: 100, precio: 800 },
    { nombre: 'Tablones de madera', cantidad: 10, precio: 4000 },
    { nombre: 'Set de vajilla completo', cantidad: 7, precio: 2000 },
  ],
  fleteCobrado: 100000,
  emitido: '2026-11-07',
};

describe('presupuesto PDF', () => {
  it('el total incluye el flete cobrado', () => {
    expect(totalPresupuesto(datos)).toBe(80000 + 40000 + 14000 + 100000);
  });
  it('sin flete cobrado, solo los artículos', () => {
    expect(totalPresupuesto({ ...datos, fleteCobrado: 0 })).toBe(134000);
  });
  it('genera un PDF válido', async () => {
    const blob = await generarPresupuestoPdf(datos);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1500);
  });
  it('con muchos artículos pasa a otra página sin romperse', async () => {
    const muchas = Array.from({ length: 60 }, (_, i) => ({ nombre: `Artículo ${i + 1}`, cantidad: 1, precio: 100 }));
    const blob = await generarPresupuestoPdf({ ...datos, lineas: muchas });
    const texto = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()));
    expect((texto.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it('nombre de archivo sin tildes ni espacios', () => {
    expect(nombreArchivoPresupuesto('Javier de la Cóstá', '2026-11-21')).toBe('Presupuesto-Javier-de-la-Costa-2026-11-21.pdf');
  });
});
