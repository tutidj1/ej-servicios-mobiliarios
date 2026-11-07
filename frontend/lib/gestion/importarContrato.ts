// Lee un contrato en PDF que ya existía (hecho con la plantilla "Contrato Alquiler") y saca lo importante:
// cliente, teléfono, lugar, fechas y montos. Es una ayuda: lo que no se reconoce queda vacío y se completa a mano.
// No guarda DNI ni nada personal más que el nombre y el teléfono del cliente.

export interface DatosContratoLeido {
  cliente: string;
  telefono: string;
  lugar: string;
  /** YYYY-MM-DD, fecha de firma del contrato (se usa como fecha del evento si no hay otra) */
  fechaFirma: string;
  /** YYYY-MM-DD, fecha de devolución (cláusula TERCERA) */
  fechaDevolucion: string;
  /** pesos; null si no se encontró */
  total: number | null;
  sena: number | null;
  flete: number | null;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const dos = (n: number) => String(n).padStart(2, '0');

function iso(d: number, m: number, a: number): string {
  if (a < 100) a += 2000;
  if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && a >= 2000 && a <= 2100)) return '';
  return `${a}-${dos(m)}-${dos(d)}`;
}

/** "320.000", "$ 320.000,00", "320000" → 320000 (formato argentino) */
export function leerImporte(texto: string): number | null {
  const m = texto.match(/\$?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function valorDespues(linea: string, etiqueta: RegExp): string {
  const m = linea.match(etiqueta);
  if (!m) return '';
  return linea
    .slice((m.index ?? 0) + m[0].length)
    .replace(/[_.…]{2,}/g, ' ')
    .trim();
}

export function interpretarContrato(lineasPdf: string[]): DatosContratoLeido {
  const lineas = lineasPdf.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const r: DatosContratoLeido = { cliente: '', telefono: '', lugar: '', fechaFirma: '', fechaDevolucion: '', total: null, sena: null, flete: null };

  // Fecha de firma: "a los 6 días del mes de 11 de 2026" (o con el mes en letras)
  const todo = lineas.join(' ');
  const firma = todo.match(/a los\s+(\d{1,2})\s+d[ií]as del mes de\s+([a-záéíóú]+|\d{1,2})\s+de\s+(\d{4})/i);
  if (firma) {
    const mes = /^\d+$/.test(firma[2]) ? Number(firma[2]) : MESES.indexOf(sinTildes(firma[2])) + 1;
    r.fechaFirma = iso(Number(firma[1]), mes, Number(firma[3]));
  }

  // Cliente: el primer "Nombre y Apellido" que viene después de "LOCATARIO"
  const iLoc = lineas.findIndex((l) => /locatario/i.test(l) && /cliente|^el locatario/i.test(l));
  const desde = iLoc >= 0 ? iLoc : 0;
  const iNombre = lineas.findIndex((l, i) => i >= desde && /nombre y apellido/i.test(l));
  if (iNombre >= 0) r.cliente = valorDespues(lineas[iNombre], /nombre y apellido:?/i);
  for (let i = Math.max(iNombre, desde); i < Math.min(lineas.length, Math.max(iNombre, desde) + 4); i++) {
    if (!r.telefono && /tel[eé]fono/i.test(lineas[i])) {
      const t = valorDespues(lineas[i], /tel[eé]fono:?/i);
      r.telefono = (t.match(/[\d][\d\s\-()+]{5,}/)?.[0] ?? '').trim();
    }
  }
  const iLugar = lineas.findIndex((l) => /lugar del evento/i.test(l));
  if (iLugar >= 0) r.lugar = valorDespues(lineas[iLugar], /lugar del evento:?/i);

  // Devolución: "(06/11/2026)" en la cláusula TERCERA
  const dev = todo.match(/devueltos en la fecha acordada\s*\(\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/i);
  if (dev) r.fechaDevolucion = iso(Number(dev[1]), Number(dev[2]), Number(dev[3]));

  // Montos de la tabla CONCEPTO / MONTO
  for (const l of lineas) {
    if (/^monto\s*\/\s*detalle/i.test(l) || /^concepto/i.test(l)) continue;
    if (/^monto\b/i.test(l) && r.total === null) r.total = leerImporte(l.replace(/^monto\b/i, ''));
    else if (/^se[ñn]a\b/i.test(l) && r.sena === null) r.sena = leerImporte(l.replace(/^se[ñn]a\b/i, ''));
    else if (/^servicio flete\b/i.test(l) && r.flete === null) r.flete = leerImporte(l.replace(/^servicio flete\b/i, ''));
  }
  return r;
}

/** Junta el texto de cada página del PDF en renglones (las celdas de una misma fila quedan en el mismo renglón). */
export async function leerLineasPdf(archivo: File | ArrayBuffer): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
  if (typeof window !== 'undefined') pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  const datos = archivo instanceof ArrayBuffer ? archivo : await archivo.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(datos), useSystemFonts: true }).promise;
  const lineas: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const contenido = await pagina.getTextContent();
    const filas = new Map<number, { x: number; t: string }[]>();
    for (const it of contenido.items as { str: string; transform: number[] }[]) {
      if (!it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3);
      const fila = filas.get(y) ?? [];
      fila.push({ x: it.transform[4], t: it.str });
      filas.set(y, fila);
    }
    Array.from(filas.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([, fila]) => lineas.push(fila.sort((a, b) => a.x - b.x).map((c) => c.t).join(' ')));
  }
  return lineas;
}
