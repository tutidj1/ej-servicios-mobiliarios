// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CLAUSULAS, filasInventario, generarContratoPdf, nombreArchivoContrato, repartirEnColumnas } from './contratoPdf';

const base = [
  ['Sillas', 1], ['Mesa redonda', 2], ['Caballetes', 3], ['Plato principal', 4], ['Cuchillos', 5], ['Platos de postre', 6],
  ['Cuchara de postre', 7], ['Copa de champagne', 8], ['Frasco dispensador', 9], ['Cubre sillas', 10], ['Ensaladera', 11],
  ['Bandeja de mozo', 12], ['Mantelería blanca', 13], ['Servilletas', 14], ['Caminos celeste pastel', 15], ['Platos cuadrados', 16],
  ['Tenedores', 17], ['Tenedores de postre', 18], ['Copas de vino / agua', 19], ['Estaca para asado', 20], ['Taza de té', 21],
  ['Cucharas de té', 22], ['Frapera', 23], ['Hielera con pinza', 24],
] as const;

const articulos = [
  ...base.map(([nombre, orden]) => ({ nombre, orden, cantidad: nombre === 'Sillas' ? 100 : 0 })),
  { nombre: 'Tablones de madera', orden: 25, cantidad: 10 },
  { nombre: 'Set de vajilla completo', orden: null, cantidad: 7 },
  { nombre: 'Artículo sin usar', orden: null, cantidad: 0 },
];

const locadorDePrueba = { nombre: 'Locador de Prueba', dni: '11.111.111', telefono: '342 111 1111' };

const datos = {
  locador: locadorDePrueba,
  locatario: { nombre: 'Javier de la Costa', dni: null, telefono: '342 000 0000' },
  lugar: 'Sarmiento',
  emision: '2026-11-08',
  fechaDevolucion: '2026-11-22',
  articulos,
  fleteCobrado: 100000,
  total: 234000,
  sena: 117000,
};

describe('contrato PDF (réplica de la plantilla)', () => {
  it('el inventario sigue el orden de la plantilla y suma lo alquilado que no está en ella', () => {
    const f = filasInventario(articulos);
    expect(f[0].nombre).toBe('Sillas');
    expect(f[8].nombre).toBe('Frasco dispensador (2 unidad para jugo)');
    expect(f.map((x) => x.nombre)).toContain('Set de vajilla completo');
    expect(f.map((x) => x.nombre)).not.toContain('Artículo sin usar');
  });
  it('dos columnas como la plantilla: 12 a la izquierda, el resto a la derecha', () => {
    const { izq, der } = repartirEnColumnas(filasInventario(articulos));
    expect(izq).toHaveLength(12);
    expect(der).toHaveLength(14);
  });
  it('la cláusula tercera lleva la fecha de devolución', async () => {
    expect(CLAUSULAS.terceraAntes + '22/11/2026' + CLAUSULAS.terceraDespues).toContain('(22/11/2026). El retraso');
  });
  it('genera un PDF de 2 páginas', async () => {
    const blob = await generarContratoPdf(datos);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const texto = new TextDecoder('latin1').decode(bytes);
    expect(texto.slice(0, 5)).toBe('%PDF-');
    expect((texto.match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
  });
  it('trae los datos del cliente y del locador, y nada de subalquiler', async () => {
    const texto = new TextDecoder('latin1').decode(new Uint8Array(await (await generarContratoPdf(datos)).arrayBuffer()));
    for (const t of ['CONTRATO DE LOCACI', 'Locador de Prueba', '11.111.111', 'Javier de la Costa', 'Sarmiento', 'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', '22/11/2026', 'Firma del Locador', 'Firma del Locatario', '234.000', '117.000'])
      expect(texto, t).toContain(t);
    expect(/subalquil/i.test(texto)).toBe(false);
  });
  it('con el logo incrustado sigue siendo válido', async () => {
    const png = readFileSync(new URL('../../public/images/logo-ej.png', import.meta.url));
    const logo = `data:image/png;base64,${png.toString('base64')}`;
    const blob = await generarContratoPdf({ ...datos, logo });
    expect(blob.size).toBeGreaterThan(50000);
  });
  it('sin seña acordada deja seña y saldo en blanco', async () => {
    const texto = new TextDecoder('latin1').decode(new Uint8Array(await (await generarContratoPdf({ ...datos, sena: null })).arrayBuffer()));
    expect(texto).not.toContain('117.000');
  });
  it('nombre de archivo', () => expect(nombreArchivoContrato('Javier de la Costa', '2026-11-21')).toBe('Contrato-Javier-de-la-Costa-2026-11-21.pdf'));
});
