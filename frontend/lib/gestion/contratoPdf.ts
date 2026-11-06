// Contrato de locación en PDF. Réplica de la plantilla "Contrato Alquiler.docx" (carpeta EJ SERVICIO del Drive):
// 2 páginas A4, logo de EJ arriba, título, locador / locatario, PRIMERA con la tabla de inventario de 4 columnas,
// tabla CONCEPTO / MONTO, cláusulas SEGUNDA a CUARTA y firmas. Nunca muestra subalquiler: solo la cantidad total.

import { fechaCorta, pesos } from './calculos';

/** Los datos del locador NO viven en el código (el repositorio es público): salen de la tabla "configuracion". */
export interface Locador {
  nombre: string;
  dni: string;
  telefono: string;
}

// Textos fijos de la plantilla (la TERCERA lleva la fecha de devolución)
export const CLAUSULAS = {
  objeto: 'El Locador entrega en alquiler al Locatario los bienes que se detallan a continuación, en perfecto estado de higiene y conservación:',
  segunda:
    'El Locatario asume la responsabilidad total por la guarda y conservación de los bienes desde su recepción hasta su devolución efectiva. En caso de rotura, daño parcial, total o pérdida de cualquier elemento del inventario, el Locatario se obliga a abonar el valor de reposición del producto. Dicho valor será determinado según el precio de mercado vigente al día de la fecha de pago, considerando un producto de idéntica marca, calidad y características al original.',
  terceraAntes: 'Los bienes deberán ser devueltos en la fecha acordada (',
  terceraDespues: '). El retraso en la devolución generará un cargo adicional por jornada.',
  cuarta:
    'Al firmar este contrato, el Locatario declara haber revisado el inventario y estar de pleno acuerdo con todas las cláusulas aquí escritas, reconociendo el estado del material recibido y las penalidades por daños establecidas.',
};

export interface ArticuloContrato {
  nombre: string;
  /** Cantidad total que se le alquila al cliente (propias + subalquiladas). 0 = se deja en blanco. */
  cantidad: number;
  orden: number | null;
}

export interface DatosContrato {
  /** Si algún dato está vacío, queda la línea en blanco para completar a mano. */
  locador: Locador;
  locatario: { nombre: string; dni: string | null; telefono: string | null };
  lugar: string | null;
  /** YYYY-MM-DD, fecha en que se firma */
  emision: string;
  /** YYYY-MM-DD */
  fechaDevolucion: string;
  articulos: ArticuloContrato[];
  /** pesos */
  fleteCobrado: number;
  total: number;
  sena: number | null;
  /** Logo en data URL (PNG/JPEG). Si falta, el contrato sale sin logo. */
  logo?: string;
}

const NOMBRE_EN_CONTRATO: Record<string, string> = {
  'Frasco dispensador': 'Frasco dispensador (2 unidad para jugo)',
};

/** Orden de la plantilla; los artículos que no están en la plantilla (y se alquilan) van al final. */
export function filasInventario(articulos: ArticuloContrato[]): ArticuloContrato[] {
  const enPlantilla = articulos.filter((a) => a.orden !== null).sort((a, b) => (a.orden as number) - (b.orden as number));
  const extras = articulos.filter((a) => a.orden === null && a.cantidad > 0);
  return [...enPlantilla, ...extras].map((a) => ({ ...a, nombre: NOMBRE_EN_CONTRATO[a.nombre] ?? a.nombre }));
}

/** Dos columnas como la plantilla: la izquierda llega hasta "Bandeja de mozo" (12) y la derecha sigue desde "Mantelería". */
export function repartirEnColumnas<T>(lista: T[]): { izq: T[]; der: T[] } {
  const mitad = lista.length >= 24 ? 12 : Math.ceil(lista.length / 2);
  return { izq: lista.slice(0, mitad), der: lista.slice(mitad) };
}

const monto = (n: number) => {
  const c = Math.round(n * 100);
  const texto = pesos(c).replace(/ /g, ' ');
  return c % 100 === 0 ? texto.replace(/,00$/, '') : texto;
};

export async function generarContratoPdf(d: DatosContrato): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ANCHO = 210;
  const L = 30; // margen izquierdo del texto
  const R = ANCHO - 30;
  const loc = d.locador;
  const [anio, mes, dia] = d.emision.split('-');

  const cuerpo = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
  };
  const negrita = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
  };
  cuerpo();

  const encabezado = () => {
    if (d.logo) doc.addImage(d.logo, 'PNG', (ANCHO - 37) / 2, 3, 37, 20);
  };
  const pie = (n: number) => {
    cuerpo();
    doc.text(String(n), L, 279);
  };

  /** Texto en partes; las que son valores se subrayan (como los campos llenados de la plantilla). */
  const campos = (partes: (string | { v: string; min?: number })[], x: number, y: number) => {
    let cx = x;
    for (const p of partes) {
      if (typeof p === 'string') {
        doc.text(p, cx, y);
        cx += doc.getTextWidth(p);
      } else {
        const t = p.v;
        const w = Math.max(doc.getTextWidth(t) + 2, p.min ?? 0);
        if (t) doc.text(t, cx + 1, y);
        doc.setLineWidth(0.15);
        doc.line(cx, y + 0.8, cx + w, y + 0.8);
        cx += w + 1.5;
      }
    }
  };

  // ======================= PÁGINA 1 =======================
  encabezado();
  negrita();
  doc.text('CONTRATO DE LOCACIÓN DE MUEBLES Y ENSERES', ANCHO / 2, 28, { align: 'center' });
  cuerpo();
  campos(['En la ciudad de Santa Fe, a los ', { v: String(Number(dia)), min: 6 }, ' días del mes de ', { v: String(Number(mes)), min: 6 }, ' de ', { v: anio, min: 12 }, ', entre:'], L, 36);

  negrita();
  doc.text('EL LOCADOR (PROVEEDOR):', L, 44.5);
  cuerpo();
  campos(['Nombre y Apellido: ', { v: loc.nombre, min: 60 }], L, 52.5);
  campos(['DNI: ', { v: loc.dni, min: 30 }, '  Teléfono: ', { v: loc.telefono, min: 30 }], L, 61);

  negrita();
  doc.text('EL LOCATARIO (CLIENTE):', L, 69.5);
  cuerpo();
  campos(['Nombre y Apellido: ', { v: d.locatario.nombre, min: 60 }], L, 78);
  campos(['DNI: ', { v: d.locatario.dni ?? '', min: 30 }, '  Teléfono: ', { v: d.locatario.telefono ?? '', min: 30 }], L, 86.5);
  campos(['Lugar del evento: ', { v: d.lugar ?? '', min: 60 }], L, 95);

  negrita();
  doc.text('PRIMERA: OBJETO E INVENTARIO', L, 103.5);
  cuerpo();
  doc.text(doc.splitTextToSize(CLAUSULAS.objeto, R - L), L, 112);

  // Tabla de inventario: MOBILIARIO / VAJILLA | CANT. | MOBILIARIO / VAJILLA | CANT.
  const TX = 29.8;
  const cols = [61.3, 18.9, 61.3, 19.2];
  const xs = [TX, TX + cols[0], TX + cols[0] + cols[1], TX + cols[0] + cols[1] + cols[2], TX + cols[0] + cols[1] + cols[2] + cols[3]];
  const { izq, der } = repartirEnColumnas(filasInventario(d.articulos));
  const filas = Math.max(izq.length, der.length);
  let y = 123;
  const ALTO_ENC = 14.5;
  const ALTO_FILA = 8;
  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  doc.rect(TX, y, xs[4] - TX, ALTO_ENC + filas * ALTO_FILA);
  doc.line(TX, y + ALTO_ENC, xs[4], y + ALTO_ENC);
  for (let i = 1; i <= 3; i++) doc.line(xs[i], y, xs[i], y + ALTO_ENC + filas * ALTO_FILA);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  ['MOBILIARIO / VAJILLA', 'CANT.', 'MOBILIARIO / VAJILLA', 'CANT.'].forEach((t, i) => doc.text(t, xs[i] + 1, y + 5.3));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  for (let i = 0; i < filas; i++) {
    const fy = y + ALTO_ENC + i * ALTO_FILA;
    if (i > 0) {
      doc.setLineWidth(0.15);
      doc.line(TX, fy, xs[4], fy);
    }
    const a = izq[i];
    const b = der[i];
    if (a) {
      doc.text(doc.splitTextToSize(a.nombre, cols[0] - 2), xs[0] + 1, fy + 4.2);
      if (a.cantidad > 0) doc.text(String(a.cantidad), xs[1] + 1, fy + 4.2);
    }
    if (b) {
      doc.text(doc.splitTextToSize(b.nombre, cols[2] - 2), xs[2] + 1, fy + 4.2);
      if (b.cantidad > 0) doc.text(String(b.cantidad), xs[3] + 1, fy + 4.2);
    }
  }
  pie(1);

  // ======================= PÁGINA 2 =======================
  doc.addPage();
  encabezado();
  const CX = 29.4;
  const mitad = 80.3;
  y = 32;
  const filasConcepto: [string, string][] = [
    ['Servicio Flete', d.fleteCobrado > 0 ? monto(d.fleteCobrado) : ''],
    ['Monto', monto(d.total)],
    ['seña', d.sena !== null && d.sena > 0 ? monto(d.sena) : ''],
    ['saldo', d.sena !== null && d.sena > 0 ? monto(d.total - d.sena) : ''],
  ];
  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  doc.rect(CX, y, mitad * 2, 16 + filasConcepto.length * 9.3);
  doc.line(CX, y + 16, CX + mitad * 2, y + 16);
  doc.line(CX + mitad, y, CX + mitad, y + 16 + filasConcepto.length * 9.3);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCEPTO', CX + 1, y + 5.3);
  doc.text('MONTO / DETALLE', CX + mitad + 1, y + 5.3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  filasConcepto.forEach(([c, v], i) => {
    const fy = y + 16 + i * 9.3;
    if (i > 0) {
      doc.setLineWidth(0.15);
      doc.line(CX, fy, CX + mitad * 2, fy);
    }
    doc.text(c, CX + 1, fy + 5.2);
    if (v) doc.text(v, CX + mitad + 1, fy + 5.2);
  });

  y = 96;
  const parrafo = (titulo: string, texto: string) => {
    negrita();
    doc.text(titulo, L, y);
    y += 8.6;
    cuerpo();
    const lineas = doc.splitTextToSize(texto, R - L) as string[];
    doc.text(lineas, L, y);
    y += lineas.length * 5.07 + 4.2;
  };
  parrafo('SEGUNDA: RESPONSABILIDAD POR DAÑOS O FALTANTES', CLAUSULAS.segunda);
  parrafo('TERCERA: CONDICIONES DE DEVOLUCIÓN', `${CLAUSULAS.terceraAntes}${fechaCorta(d.fechaDevolucion)}${CLAUSULAS.terceraDespues}`);
  parrafo('CUARTA: CONFORMIDAD', CLAUSULAS.cuarta);

  // Firmas
  const fy = 236;
  doc.setLineWidth(0.2);
  doc.line(L + 13, fy, L + 68, fy);
  doc.line(L + 90.7, fy, L + 145.7, fy);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9.5);
  doc.text('Firma del Locador (Proveedor)', L + 40.5, fy + 4, { align: 'center' });
  doc.text('Firma del Locatario (Cliente)', L + 118.2, fy + 4, { align: 'center' });
  pie(2);

  return doc.output('blob');
}

/** Contrato-Javier-de-la-Costa-2026-11-21.pdf */
export function nombreArchivoContrato(cliente: string, fecha: string): string {
  const limpio = cliente
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `Contrato-${limpio || 'cliente'}-${fecha}.pdf`;
}

/** Carga el logo del sitio como data URL para incrustarlo en el PDF. */
export async function cargarLogo(): Promise<string | undefined> {
  try {
    const res = await fetch('/images/logo-ej.png');
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string>((ok, mal) => {
      const lector = new FileReader();
      lector.onload = () => ok(String(lector.result));
      lector.onerror = () => mal(lector.error);
      lector.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
