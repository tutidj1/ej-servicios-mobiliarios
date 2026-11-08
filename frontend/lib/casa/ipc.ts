/**
 * IPC (índice de precios) de EJ Casa: una fila por mes, cargada a mano.
 * Se guarda el índice del mes en cada gasto/movimiento (mes_ipc) para que corregir un índice viejo
 * no cambie el historial que alguien ya leyó.
 */
import { moverMes, type Mes } from './dinero';

export type FilaIpc = { mes: string; indice: number }; // mes = 'YYYY-MM-01'

/** "7.012,5" o "7012.5" → 7012.5 (hasta 4 decimales, mayor que cero). Si no es un número válido, null. */
export function parseIndice(texto: string): number | null {
  const t = texto.trim().replace(/\s/g, '');
  // Con coma decimal, los puntos son de miles ("7.012,5"); sin coma, un solo punto es decimal ("7012.5").
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  if (!/^\d{1,10}(\.\d{1,4})?$/.test(normal)) return null;
  // "7.012" sin coma es ambiguo (¿siete mil doce o siete con doce?): se pide la coma para los decimales
  if (!t.includes(',') && /^\d+\.\d{3}$/.test(t)) return null;
  const n = Number(normal);
  return n > 0 ? n : null;
}

/** 'YYYY-MM' (campo de mes del navegador) → 'YYYY-MM-01'. */
export function claveDeMes(valor: string): string | null {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) ? `${valor}-01` : null;
}

const aMes = (clave: string): Mes => ({ anio: Number(clave.slice(0, 4)), mes: Number(clave.slice(5, 7)) });
const aClave = (m: Mes) => `${m.anio}-${String(m.mes).padStart(2, '0')}-01`;

/** Del más nuevo al más viejo, con la variación contra el mes anterior (un decimal) si ese mes está cargado. */
export function conVariacion(filas: FilaIpc[]): (FilaIpc & { variacionPct: number | null })[] {
  const porMes = new Map(filas.map((f) => [f.mes, f.indice]));
  return [...filas]
    .sort((a, b) => (a.mes < b.mes ? 1 : -1))
    .map((f) => {
      const previo = porMes.get(aClave(moverMes(aMes(f.mes), -1)));
      return { ...f, variacionPct: previo ? Math.round((f.indice / previo - 1) * 1000) / 10 : null };
    });
}

/** Meses sin cargar entre el primero y el último que sí están. */
export function mesesFaltantes(meses: string[]): string[] {
  if (meses.length < 2) return [];
  const orden = [...meses].sort();
  const tiene = new Set(orden);
  const faltan: string[] = [];
  let m = aMes(orden[0]);
  const ultimo = orden[orden.length - 1];
  for (let i = 0; i < 600; i++) {
    m = moverMes(m, 1);
    const c = aClave(m);
    if (c >= ultimo) break;
    if (!tiene.has(c)) faltan.push(c);
  }
  return faltan;
}
