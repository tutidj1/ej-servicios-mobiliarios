// Presupuesto en PDF para el cliente. Muestra solo lo que se cobra: cantidad total, precio y subtotal.
// Nunca incluye subalquiler ni costos internos. Se genera en el navegador (no sale nada a ningún servidor).

import { fechaLarga, pesos } from './calculos';

export interface DatosPresupuesto {
  cliente: { nombre: string; telefono: string | null };
  evento: { fecha: string; lugar: string | null; personas: number | null; tipo: string | null };
  /** precio en pesos (no en centavos) */
  lineas: { nombre: string; cantidad: number; precio: number }[];
  fleteCobrado: number;
  /** YYYY-MM-DD */
  emitido: string;
}

const plata = (n: number) => pesos(Math.round(n * 100)).replace(/ /g, ' ');
const conAnio = (dia: string) => `${fechaLarga(dia)} de ${dia.slice(0, 4)}`;

export function totalPresupuesto(d: Pick<DatosPresupuesto, 'lineas' | 'fleteCobrado'>): number {
  const centavos = d.lineas.reduce((t, l) => t + Math.round(l.cantidad * l.precio * 100), 0) + Math.round(d.fleteCobrado * 100);
  return centavos / 100;
}

export async function generarPresupuestoPdf(d: DatosPresupuesto): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ANCHO = 210;
  const M = 20;
  let y = 24;

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('EJ Servicios Mobiliarios', M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text('Alquiler de mobiliario y vajilla para eventos · Santa Fe', M, y + 6);
  doc.text('WhatsApp 342 506 8365', M, y + 11);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PRESUPUESTO', ANCHO - M, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Emitido el ${conAnio(d.emitido)}`, ANCHO - M, y + 6, { align: 'right' });
  y += 20;
  doc.setDrawColor(200);
  doc.line(M, y, ANCHO - M, y);
  y += 8;

  // Cliente y evento
  const dato = (etiqueta: string, valor: string | null | undefined) => {
    if (!valor) return;
    doc.setFont('helvetica', 'bold');
    doc.text(`${etiqueta}:`, M, y);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, M + 32, y);
    y += 6;
  };
  dato('Cliente', d.cliente.nombre);
  dato('Teléfono', d.cliente.telefono);
  dato('Fecha del evento', conAnio(d.evento.fecha));
  dato('Lugar', d.evento.lugar);
  dato('Evento', d.evento.tipo);
  dato('Invitados', d.evento.personas ? String(d.evento.personas) : null);
  y += 4;

  // Tabla
  const xCant = M + 112;
  const xPrecio = M + 142;
  const xTotal = ANCHO - M - 2;
  const encabezado = () => {
    doc.setFillColor(35, 35, 35);
    doc.rect(M, y - 5.5, ANCHO - 2 * M, 8, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('Artículo', M + 2, y);
    doc.text('Cant.', xCant, y, { align: 'right' });
    doc.text('Precio unit.', xPrecio, y, { align: 'right' });
    doc.text('Subtotal', xTotal, y, { align: 'right' });
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    y += 8;
  };
  encabezado();

  const fila = (nombre: string, cant: string, precio: string, subtotal: string) => {
    if (y > 268) {
      doc.addPage();
      y = 24;
      encabezado();
    }
    doc.text(nombre, M + 2, y);
    doc.text(cant, xCant, y, { align: 'right' });
    doc.text(precio, xPrecio, y, { align: 'right' });
    doc.text(subtotal, xTotal, y, { align: 'right' });
    doc.setDrawColor(230);
    doc.line(M, y + 2.5, ANCHO - M, y + 2.5);
    y += 8;
  };

  for (const l of d.lineas) fila(l.nombre, String(l.cantidad), plata(l.precio), plata(Math.round(l.cantidad * l.precio * 100) / 100));
  if (d.fleteCobrado > 0) fila('Servicio de flete', '1', plata(d.fleteCobrado), plata(d.fleteCobrado));

  // Total
  if (y > 262) {
    doc.addPage();
    y = 24;
  }
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TOTAL', xPrecio - 20, y, { align: 'right' });
  doc.text(plata(totalPresupuesto(d)), xTotal, y, { align: 'right' });

  return doc.output('blob');
}

/** Nombre de archivo sin tildes ni espacios: Presupuesto-Javier-de-la-Costa-2026-11-21.pdf */
export function nombreArchivoPresupuesto(cliente: string, fecha: string): string {
  const limpio = cliente
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `Presupuesto-${limpio || 'cliente'}-${fecha}.pdf`;
}

/** En el celular abre el menú de compartir con el PDF adjunto (WhatsApp, mail…). Devuelve false si no se puede. */
export async function compartirArchivo(blob: Blob, nombre: string, texto: string): Promise<boolean> {
  const file = new File([blob], nombre, { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (!nav.canShare || !nav.canShare({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title: 'Presupuesto', text: texto });
    return true;
  } catch (e) {
    // Si la persona cierra el menú no es un error
    return (e as { name?: string }).name === 'AbortError';
  }
}

export function descargarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
