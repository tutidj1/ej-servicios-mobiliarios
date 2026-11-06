// Entiende frases dictadas en español rioplatense. Sin servicios externos: todo corre en el navegador.
// Regla de la especificación: nunca se inventan montos, fechas ni artículos; lo que no se entiende queda
// vacío y la persona lo completa en la pantalla de confirmación. Nada se guarda sin confirmar.

import { sumarDias } from './calculos';

export type Intencion = 'evento' | 'pago' | 'costo' | 'subalquiler' | 'disponibilidad' | 'desconocido';
export type TipoPagoVoz = 'seña' | 'saldo' | 'otro';
export type TipoCostoVoz = 'flete' | 'lavado' | 'rotura' | 'ayudante' | 'otro';

export interface ItemVoz {
  id: string;
  nombre: string;
  alias: string[];
}

export interface Interpretacion {
  intencion: Intencion;
  monto: number | null;
  cantidad: number | null;
  costoUnitario: number | null;
  /** Artículos que podrían ser el mencionado (más de uno = ambiguo: se pregunta). */
  itemIds: string[];
  tipoPago: TipoPagoVoz | null;
  medio: 'efectivo' | 'transferencia' | null;
  tipoCosto: TipoCostoVoz | null;
  fecha: string | null;
}

/** ¿Es el pedido de cargar un evento completo (y no un pago o un gasto suelto)? */
export function esEventoNuevo(texto: string): boolean {
  const t = normalizar(texto);
  return /\b(nuevo|nueva|subir|cargar|armar|crear|agregar|anotar)\b.{0,40}\b(evento|alquiler)\b/.test(t) || /\bevento (es )?(de|para|del)\b/.test(t);
}

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[$¿?¡!;:()"“”]/g, ' ')
    .replace(/[,.](?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(texto: string): string[] {
  return normalizar(texto).split(' ').filter(Boolean);
}

// ---------------------------------------------------------------------------
// Números en palabras y cifras
// ---------------------------------------------------------------------------
const PALABRAS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
  seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};
const MIL = new Set(['mil', 'luca', 'lucas']);
const MILLON = new Set(['millon', 'millones']);

function cifra(t: string): number | null {
  if (!/^\d+([.,]\d+)*$/.test(t)) return null;
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  if (/^\d{1,3}(,\d{3})+$/.test(t)) return Number(t.replace(/,/g, ''));
  return Number(t.replace(',', '.'));
}

const esNumero = (t: string | undefined): boolean =>
  !!t && (t in PALABRAS || MIL.has(t) || MILLON.has(t) || cifra(t) !== null);

export interface CorridaNumerica {
  valor: number;
  desde: number;
  hasta: number;
}

/** Todos los números que aparecen, con su posición en la frase ("cincuenta mil" → 50000). */
export function extraerNumeros(partes: string[]): CorridaNumerica[] {
  const res: CorridaNumerica[] = [];
  let i = 0;
  while (i < partes.length) {
    if (!esNumero(partes[i])) {
      i++;
      continue;
    }
    const desde = i;
    let total = 0;
    let actual = 0;
    while (i < partes.length) {
      const t = partes[i];
      if (MIL.has(t)) {
        total += (actual || 1) * 1000;
        actual = 0;
      } else if (MILLON.has(t)) {
        total += (actual || 1) * 1000000;
        actual = 0;
      } else if (t in PALABRAS) {
        actual += PALABRAS[t];
      } else if (cifra(t) !== null) {
        // Dos cifras seguidas ("21 30") no forman un solo número
        if (i > desde && cifra(partes[i - 1]) !== null) break;
        actual += cifra(t)!;
      } else if (t === 'y' && i > desde && esNumero(partes[i + 1]) && partes[i + 1] in PALABRAS) {
        // "treinta y cinco"
      } else {
        break;
      }
      i++;
    }
    res.push({ valor: total + actual, desde, hasta: i - 1 });
  }
  return res;
}

// ---------------------------------------------------------------------------
// Artículos
// ---------------------------------------------------------------------------
const raiz = (t: string) => (t.length > 5 && t.endsWith('es') ? t.slice(0, -2) : t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t);

function distanciaUno(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

/** Mismo término: igual, plural, o parecido (el micrófono escribe "talones" por "tablones"). */
export const mismo = (a: string, b: string) =>
  a === b || a + 's' === b || a + 'es' === b || b + 's' === a || b + 'es' === a ||
  (a.length >= 5 && b.length >= 5 && a[0] === b[0] && distanciaUno(raiz(a), raiz(b)));

/** Busca el artículo mencionado. Gana el nombre más largo; si empatan, devuelve todos (ambiguo). */
export function buscarItems(partes: string[], items: ItemVoz[]): { ids: string[]; desde: number; hasta: number } | null {
  let mejor = 0;
  let ganadores: { id: string; desde: number; hasta: number }[] = [];
  for (const item of items) {
    for (const forma of [item.nombre, ...item.alias]) {
      const f = tokens(forma);
      if (!f.length || f.length < mejor) continue;
      for (let i = 0; i + f.length <= partes.length; i++) {
        if (f.every((p, j) => mismo(p, partes[i + j]))) {
          if (f.length > mejor) {
            mejor = f.length;
            ganadores = [];
          }
          if (!ganadores.some((g) => g.id === item.id)) ganadores.push({ id: item.id, desde: i, hasta: i + f.length - 1 });
          break;
        }
      }
    }
  }
  if (!ganadores.length) return null;
  return { ids: ganadores.map((g) => g.id), desde: Math.min(...ganadores.map((g) => g.desde)), hasta: Math.max(...ganadores.map((g) => g.hasta)) };
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const pad = (n: number) => String(n).padStart(2, '0');

function valida(y: number, m0: number, d: number): boolean {
  const f = new Date(Date.UTC(y, m0, d));
  return f.getUTCFullYear() === y && f.getUTCMonth() === m0 && f.getUTCDate() === d;
}

/** "hoy", "mañana", "el 21", "21 de noviembre", "el sábado". Devuelve YYYY-MM-DD o null. */
export function interpretarFecha(partes: string[], hoy: string): string | null {
  const [hy, hm, hd] = hoy.split('-').map(Number);
  const t = partes.join(' ');
  if (/\bpasado manana\b/.test(t)) return sumarDias(hoy, 2);
  if (/\bmanana\b/.test(t)) return sumarDias(hoy, 1);
  if (/\bhoy\b/.test(t)) return hoy;

  for (let i = 0; i < partes.length - 1; i++) {
    const dia = cifra(partes[i]) ?? (partes[i] in PALABRAS ? PALABRAS[partes[i]] : null);
    const mes = partes[i + 1] === 'de' ? MESES.indexOf(partes[i + 2] ?? '') : -1;
    if (dia !== null && mes >= 0 && dia >= 1 && dia <= 31) {
      let y = hy;
      if (!valida(y, mes, dia)) return null;
      if (`${y}-${pad(mes + 1)}-${pad(dia)}` < hoy) y++;
      return valida(y, mes, dia) ? `${y}-${pad(mes + 1)}-${pad(dia)}` : null;
    }
  }

  for (let i = 0; i < partes.length - 1; i++) {
    const despues = partes[i + 1] === 'dia' ? partes[i + 2] : partes[i + 1];
    if (partes[i] === 'el' || partes[i] === 'dia') {
      const dia = cifra(despues ?? '');
      if (dia !== null && dia >= 1 && dia <= 31) {
        for (let k = 0; k < 13; k++) {
          const y = hy + Math.floor((hm - 1 + k) / 12);
          const m0 = (hm - 1 + k) % 12;
          if (valida(y, m0, dia) && `${y}-${pad(m0 + 1)}-${pad(dia)}` >= hoy) return `${y}-${pad(m0 + 1)}-${pad(dia)}`;
        }
      }
    }
  }

  const idx = DIAS_SEMANA.findIndex((d) => partes.includes(d));
  if (idx >= 0) {
    const actual = new Date(Date.UTC(hy, hm - 1, hd)).getUTCDay();
    return sumarDias(hoy, (idx - actual + 7) % 7);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Frase completa
// ---------------------------------------------------------------------------
export function interpretar(texto: string, items: ItemVoz[], hoy: string): Interpretacion {
  const p = tokens(texto);
  const t = p.join(' ');
  const numeros = extraerNumeros(p);
  const item = buscarItems(p, items);
  const vacio: Interpretacion = {
    intencion: 'desconocido', monto: null, cantidad: null, costoUnitario: null,
    itemIds: item?.ids ?? [], tipoPago: null, medio: null, tipoCosto: null, fecha: null,
  };

  // Evento completo: "quiero subir un nuevo evento de Javier, 100 sillas..."
  if (esEventoNuevo(texto)) return { ...vacio, intencion: 'evento' };

  // Subalquiler: "subalquilé 50 sillas a mil"
  if (/\bsubalquil/.test(t)) {
    const antes = item ? [...numeros].reverse().find((n) => n.hasta < item.desde) : numeros[0];
    const despues = item ? numeros.find((n) => n.desde > item.hasta) : numeros.find((n) => n !== antes);
    return { ...vacio, intencion: 'subalquiler', cantidad: antes?.valor ?? null, costoUnitario: despues?.valor ?? null };
  }

  // Disponibilidad: "¿tengo 150 sillas para el 21?"
  if (/\b(tengo|tenemos|hay|queda|quedan|disponible|disponibles|disponibilidad|alcanzan|alcanza)\b/.test(t) && (item || /\bpara\b/.test(t))) {
    const antes = item ? [...numeros].reverse().find((n) => n.hasta < item.desde) : numeros[0];
    return { ...vacio, intencion: 'disponibilidad', cantidad: antes?.valor ?? null, fecha: interpretarFecha(p, hoy) };
  }

  // Pago del cliente: "me dejó 50 mil de seña"
  const medio = /\btransfer|\btransfir/.test(t) ? 'transferencia' : /\befectivo\b/.test(t) ? 'efectivo' : null;
  if (/\bsena\b/.test(t) || /\bsaldo\b/.test(t) || /\bme (dejo|dio|pago|transfirio|entrego|mando|abono|cancelo|giro)\b/.test(t) || /\b(cancelo|cancelaron)\b/.test(t)) {
    return {
      ...vacio, intencion: 'pago', monto: numeros[0]?.valor ?? null, medio,
      tipoPago: /\bsena\b/.test(t) ? 'seña' : /\b(saldo|cancelo|cancelaron|resto)\b/.test(t) ? 'saldo' : 'otro',
    };
  }

  // Costo propio: "pagué 30 mil de flete"
  if (/\b(pague|gaste|abone|puse|costo|me costo|pagamos|gastamos)\b/.test(t)) {
    const tipoCosto: TipoCostoVoz = /\bflete|\bfletero\b/.test(t) ? 'flete'
      : /\blavad|\blavanderia\b/.test(t) ? 'lavado'
      : /\brot[ao]|\brotura|\bromp/.test(t) ? 'rotura'
      : /\bayudante|\bpeon|\bmozo\b/.test(t) ? 'ayudante' : 'otro';
    return { ...vacio, intencion: 'costo', monto: numeros[0]?.valor ?? null, tipoCosto };
  }

  return vacio;
}

/** Si la frase nombra a un cliente de un único evento, lo propone (la persona igual lo confirma). */
export function eventoPorNombre(texto: string, eventos: { id: string; nombre: string }[]): string | null {
  const p = new Set(tokens(texto));
  const coinciden = eventos.filter((e) => tokens(e.nombre).some((n) => n.length >= 4 && p.has(n)));
  return coinciden.length === 1 ? coinciden[0].id : null;
}
