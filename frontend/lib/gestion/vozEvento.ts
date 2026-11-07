// Arma un evento completo a partir de un mensaje hablado o escrito, como lo diría una persona:
// "El cliente se llama Javier, la dirección es Sarmiento, me contactó por WhatsApp, alquiló para 100
// personas 100 sillas a un costo de 800 pesos... el flete me sale 50 ida y 50 de vuelta, son 100000".
// No inventa nada: lo que no se dice queda vacío y se completa en la pantalla de revisión.

import { extraerNumeros, interpretarFecha, mismo, normalizar, type ItemVoz } from './voz';
import type { Canal } from './tipos';
import { sumarDias } from './calculos';

export interface LineaBorrador {
  /** null = el artículo no existe todavía en el inventario (se propone crearlo). */
  itemId: string | null;
  nombreDicho: string;
  cantidad: number | null;
  precio: number | null;
}

export interface BorradorEvento {
  cliente: string;
  lugar: string;
  canal: Canal | null;
  lineas: LineaBorrador[];
  personas: number | null;
  fecha: string | null;
  /** Último día si se reserva más de un día seguido ("del 21 al 23", "por 3 días"). */
  fechaHasta: string | null;
  /** "flete incluido": el flete va dentro del precio, no se cobra aparte. */
  fleteIncluido: boolean;
  fleteCobrado: number | null;
  /** Lo que le cuesta a ella el flete (ida y vuelta, total). */
  fletePagado: number | null;
  senaPorcentaje: number | null;
  senaMonto: number | null;
  /** "el total de todos son 199.600": total acordado, sin el precio de cada artículo. */
  total: number | null;
}

// Palabras que cortan un nombre de artículo ("100 sillas a un costo de 800")
const PARAR = new Set([
  'y', 'la', 'el', 'los', 'las', 'lo', 'que', 'quiero', 'quiere', 'me', 'es', 'son', 'flete', 'cada', 'mas', 'por',
  'a', 'con', 'cobro', 'cobre', 'cobra', 'cobran', 'cobrar', 'cuesta', 'sale', 'tiene', 'va', 'hola', 'pero', 'porciento',
  'pesos', 'peso', 'costo', 'precio', 'valor', 'para', 'o',
]);
// Palabras que cortan el nombre del cliente
const PARAR_NOMBRE = new Set([
  'lo', 'que', 'tiene', 'tienen', 'son', 'quiere', 'quieren', 'necesita', 'necesitan', 'pidio', 'pide', 'alquila', 'alquilo',
  'alquilar', 'con', 'y', 'el', 'para', 'es', 'fecha', 'tengo', 'hace', 'va', 'pagar', 'a', 'se', 'le', 'quiero', 'hola',
  'direccion', 'domicilio', 'vive', 'celular', 'telefono', 'me', 'contacto', 'llamo', 'en', 'sin', 'doble',
]);
const PARAR_LUGAR = new Set([
  'me', 'el', 'alquilo', 'alquilar', 'para', 'que', 'con', 'flete', 'cliente', 'se', 'contacto', 'y', 'es', 'son', 'tiene', 'quiere',
]);
const PERSONAS = new Set(['personas', 'invitados', 'gente', 'comensales', 'pax']);
// Palabras que no identifican a un artículo por sí solas
const GENERICAS = new Set(['de', 'del', 'la', 'el', 'con', 'para', 'principal', 'postre', 'madera', 'blanca', 'redonda', 'celeste', 'pastel', 'cuadrados', 'cuadrado']);

const MESES_NOMBRES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// Palabras que, al venir primero, indican que lo que sigue a un número no es un artículo
const NO_ES_ARTICULO = new Set(['de', 'del', 'en', 'al', 'a', 'un', 'una', 'nuevo', 'nueva', 'dia', 'dias', 'mes', 'meses', 'hs', 'horas']);

function distancia(a: string, b: string): number {
  const f = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = f[0];
    f[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = f[j];
      f[j] = Math.min(f[j] + 1, f[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = temp;
    }
  }
  return f[b.length];
}

/** Para palabras mal entendidas por el micrófono ("raperas" por "fraperas"): el artículo cuyo nombre se parece. */
function itemParecido(nombre: string, items: ItemVoz[]): string | null {
  const palabras = nombre.split(' ').filter(Boolean);
  for (let k = Math.min(3, palabras.length); k >= 1; k--) {
    const dicho = palabras.slice(0, k).join(' ');
    if (dicho.length < 5) continue;
    for (const it of items) {
      for (const cand of [it.nombre, ...it.alias]) {
        const c = normalizar(cand);
        if (c.length >= 5 && distancia(dicho, c) <= (c.length >= 8 ? 2 : 1)) return it.id;
      }
    }
  }
  return null;
}

function tokensDe(texto: string): string[] {
  const t = normalizar(texto.replace(/%/g, ' porciento ')).replace(/\bpor ciento\b/g, 'porciento');
  return t.split(' ').filter(Boolean);
}

/** Mismas palabras y en el mismo orden, pero conservando tildes (para escribir bien los nombres). */
function tokensConTildes(texto: string): string[] {
  const t = texto
    .replace(/%/g, ' porciento ')
    .toLowerCase()
    .replace(/[$¿?¡!;:()"“”]/g, ' ')
    .replace(/[,.](?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bpor ciento\b/g, 'porciento');
  return t.split(' ').filter(Boolean);
}

interface Mencion {
  itemId: string;
  desde: number;
  hasta: number;
}

/** Todas las veces que se nombra un artículo (nombre completo, alias o una parte clara del nombre). */
function menciones(p: string[], items: ItemVoz[]): Mencion[] {
  const todas: (Mencion & { puntaje: number })[] = [];
  const probar = (itemId: string, f: string[], puntaje: number) => {
    if (!f.length) return;
    for (let i = 0; i + f.length <= p.length; i++) {
      if (f.every((w, j) => mismo(w, p[i + j]))) todas.push({ itemId, desde: i, hasta: i + f.length - 1, puntaje });
    }
  };
  for (const it of items) {
    const nombre = normalizar(it.nombre).split(' ').filter(Boolean);
    probar(it.id, nombre, nombre.length);
    for (const a of it.alias) {
      const f = normalizar(a).split(' ').filter(Boolean);
      probar(it.id, f, f.length);
    }
    // "vajillas completo" alcanza para "Set de vajilla completo"
    for (let largo = nombre.length - 1; largo >= 1; largo--) {
      for (let d = 0; d + largo <= nombre.length; d++) {
        const ventana = nombre.slice(d, d + largo);
        if (ventana.every((w) => GENERICAS.has(w))) continue;
        if (largo === 1 && !(nombre.length >= 3 && ventana[0].length >= 6)) continue;
        probar(it.id, ventana, largo - 0.5);
      }
    }
  }
  todas.sort((a, b) => b.puntaje - a.puntaje || a.desde - b.desde);
  const ocupado = new Set<number>();
  const res: Mencion[] = [];
  for (const m of todas) {
    let libre = true;
    for (let k = m.desde; k <= m.hasta; k++) if (ocupado.has(k)) libre = false;
    if (!libre) continue;
    for (let k = m.desde; k <= m.hasta; k++) ocupado.add(k);
    res.push({ itemId: m.itemId, desde: m.desde, hasta: m.hasta });
  }
  return res.sort((a, b) => a.desde - b.desde);
}

const mayuscula = (w: string, i: number) => (i > 0 && ['de', 'del', 'la', 'los', 'las', 'y'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1));

/** Dónde empieza el nombre del cliente: "se llama X", "el cliente es X", "evento de X", "a nombre de X". */
function inicioCliente(p: string[]): number {
  for (let k = 0; k < p.length; k++) {
    if (p[k] === 'cliente') {
      let j = k + 1;
      if (p[j] === 'es' || p[j] === 'se') j++;
      if (p[j] === 'llama') j++;
      if (p[j] === 'de') j++;
      return j;
    }
    if (p[k] === 'llama' && p[k - 1] === 'se') return k + 1;
    if (p[k] === 'evento') {
      let j = k + 1;
      if (p[j] === 'es') j++;
      if (['de', 'para', 'del'].includes(p[j])) return j + 1;
    }
    if (p[k] === 'nombre' && p[k + 1] === 'de') return k + 2;
  }
  return -1;
}

function detectarCanal(p: string[]): Canal | null {
  const CUE = ['contacto', 'conocio', 'escribio', 'llego', 'vino', 'hablo', 'llamo', 'encontro', 'por', 'desde'];
  for (let i = 0; i < p.length; i++) {
    if (!CUE.includes(p[i])) continue;
    for (const w of p.slice(i + 1, i + 7)) {
      if (/^(whats|wasap|guasap)/.test(w)) return 'whatsapp';
      if (/^insta/.test(w)) return 'instagram';
      if (/^(facebook|face|fb)$/.test(w)) return 'facebook';
      if (/^(pagina|web|sitio)$/.test(w)) return 'web';
      if (/^(recomend|referid|amig|conocid)/.test(w)) return 'recomendación';
    }
  }
  return null;
}

export function interpretarEvento(texto: string, items: ItemVoz[], hoy: string): BorradorEvento {
  const p = tokensDe(texto);
  const conTildes = tokensConTildes(texto);
  const alineado = conTildes.length === p.length;
  const original = (desde: number, n: number) => (alineado ? conTildes.slice(desde, desde + n) : p.slice(desde, desde + n));
  const runs = extraerNumeros(p);
  const usado = new Set<number>(); // índices de runs ya explicados
  const enRun = new Set<number>();
  runs.forEach((r) => { for (let k = r.desde; k <= r.hasta; k++) enRun.add(k); });
  const runEn = (idx: number) => runs.findIndex((r) => r.desde === idx);
  const mens = menciones(p, items);

  const res: BorradorEvento = {
    cliente: '', lugar: '', canal: detectarCanal(p), lineas: [], personas: null, fecha: null, fechaHasta: null, fleteIncluido: false,
    fleteCobrado: null, fletePagado: null, senaPorcentaje: null, senaMonto: null, total: null,
  };

  // ---- Cliente
  const ini = inicioCliente(p);
  if (ini >= 0) {
    const nombre: string[] = [];
    for (let i = ini; i < p.length && nombre.length < 6; i++) {
      if (enRun.has(i) || PARAR_NOMBRE.has(p[i])) break;
      if (['la', 'los', 'las'].includes(p[i]) && p[i - 1] !== 'de') break;
      nombre.push(p[i]);
    }
    while (nombre.length && ['de', 'del', 'la', 'los', 'las'].includes(nombre[nombre.length - 1])) nombre.pop();
    if (nombre.length) res.cliente = original(ini, nombre.length).map(mayuscula).join(' ');
  }

  // ---- Dirección: "la dirección es Sarmiento", "el evento es en la calle X"
  for (let i = 0; i < p.length; i++) {
    let j = -1;
    if (['direccion', 'domicilio', 'lugar'].includes(p[i])) j = i + 1;
    else if (p[i] === 'en' && ['calle', 'salon', 'quinta', 'club', 'casa', 'barrio'].includes(p[i + 1])) j = i;
    if (j < 0) continue;
    while (['es', 'en', 'de'].includes(p[j]) && j < i + 3) j++;
    const partes: string[] = [];
    for (let k = j; k < p.length && partes.length < 6; k++) {
      if (PARAR_LUGAR.has(p[k])) break;
      partes.push(p[k]);
    }
    if (partes.length) {
      res.lugar = original(j, partes.length).map(mayuscula).join(' ');
      break;
    }
  }

  // ---- Lugar sin la palabra "dirección": "...de 2026 en Monte Vera Formosa 1875 son 25 platos"
  if (!res.lugar) {
    for (let i = 1; i < p.length; i++) {
      if (p[i] !== 'en') continue;
      const despuesDeFecha = p.slice(Math.max(0, i - 3), i).some((w) => MESES_NOMBRES.includes(w) || (/^[0-9]{4}$/.test(w) && Number(w) >= 2000));
      if (!despuesDeFecha) continue;
      const partes: string[] = [];
      for (let k = i + 1; k < p.length && partes.length < 8; k++) {
        if (PARAR_LUGAR.has(p[k])) break;
        partes.push(p[k]);
      }
      if (partes.length) res.lugar = original(i + 1, partes.length).map(mayuscula).join(' ');
      break;
    }
  }

  // ---- Flete: "flete incluido", "el flete me sale 50 ida y 50 de vuelta, o sea que son 100000"
  for (let i = 0; i < p.length; i++) {
    if (p[i] !== 'flete') continue;
    if (['incluido', 'incluida', 'incluye'].includes(p[i + 1]) || ['incluye', 'incluido'].includes(p[i - 1])) {
      res.fleteIncluido = true;
      continue;
    }
    // La ventana termina donde empieza otro tema (la seña, otra mención del flete)
    let fin = Math.min(p.length, i + 21);
    for (let k = i + 1; k < fin; k++) if (/^(en)?sen(a|ar|ia|iar)/.test(p[k]) || p[k] === 'flete') { fin = k; break; }
    const ventana = p.slice(i + 1, fin);
    const enVentana = runs.map((r, k) => ({ r, k })).filter(({ r, k }) => !usado.has(k) && r.desde > i && r.desde < fin && p[r.hasta + 1] !== 'porciento');
    if (!enVentana.length) continue;
    const costo = ventana.some((w) => ['sale', 'cuesta', 'pago', 'pague', 'cobran', 'costo', 'total', 'ida', 'vuelta', 'sea'].includes(w));
    const cobrado = p.slice(Math.max(0, i - 3), i).some((w) => ['cobro', 'cobre', 'cobra', 'cobrar'].includes(w));
    // "o sea que son 100000", "en total 100000": el total manda sobre las partes
    const cue = ventana.findIndex((w) => ['sea', 'total', 'son', 'entre'].includes(w));
    const total = cue >= 0 ? enVentana.find(({ r }) => r.desde > i + 1 + cue) : undefined;
    const tieneIdaVuelta = ventana.includes('ida') && ventana.includes('vuelta');
    let monto: number;
    if (total) monto = total.r.valor;
    else if (tieneIdaVuelta && enVentana.length >= 2) monto = enVentana[0].r.valor + enVentana[1].r.valor;
    else monto = enVentana[0].r.valor;
    if (cobrado && !costo) res.fleteCobrado = monto;
    else if (costo || !cobrado) res.fletePagado = monto;
    enVentana.forEach(({ k }) => usado.add(k));
  }

  // ---- Total acordado: "el total de todos son 199,600 pesos" (sin el precio de cada artículo)
  for (let i = 0; i < p.length; i++) {
    if (p[i] !== 'total') continue;
    const ri = runs.findIndex((r, k) => !usado.has(k) && r.desde > i && r.desde <= i + 6 && p[r.hasta + 1] !== 'porciento');
    if (ri >= 0) {
      res.total = runs[ri].valor;
      usado.add(ri);
      break;
    }
  }

  // ---- Artículos: "100 sillas a un costo de 800 pesos", "10 talones y 100 set de vajilla completo"
  interface Cand { itemId: string | null; nombre: string; cantidad: number; precio: number | null; fin: number }
  const cands: Cand[] = [];

  /** "a 800", "a un costo de 800 pesos", "cada uno a 2000": devuelve el precio dicho justo después del artículo. */
  const precioDespues = (i: number): { valor: number; hasta: number } | null => {
    let j = i;
    if (p[j] === 'cada') j += 2; // "cada uno"
    if (p[j] !== 'a' && p[j] !== 'por') return null;
    j++;
    const saltar = new Set(['un', 'una', 'uno', 'costo', 'precio', 'valor', 'de', 'cada', 'el', 'la']);
    const marcar: number[] = [];
    for (let n = 0; n < 6 && j < p.length; n++, j++) {
      const ri = runEn(j);
      if (saltar.has(p[j])) {
        if (ri >= 0) marcar.push(ri);
        continue;
      }
      if (ri >= 0 && !usado.has(ri)) {
        marcar.forEach((m) => usado.add(m));
        usado.add(ri);
        return { valor: runs[ri].valor, hasta: runs[ri].hasta };
      }
      return null;
    }
    return null;
  };

  runs.forEach((r, ri) => {
    if (usado.has(ri) || p[r.hasta + 1] === 'porciento') return;
    // Números de una fecha ("el 15 del 11 de 2026"): no son cantidades de artículos
    const sigueFecha =
      (p[r.hasta + 1] === 'de' && (MESES_NOMBRES.includes(p[r.hasta + 2]) || runEn(r.hasta + 2) >= 0)) ||
      (p[r.hasta + 1] === 'del' && (runEn(r.hasta + 2) >= 0 || MESES_NOMBRES.includes(p[r.hasta + 2]))) ||
      (r.valor >= 2000 && r.valor <= 2100 && p[r.desde - 1] === 'de');
    if (sigueFecha) {
      usado.add(ri);
      return;
    }
    const noun: string[] = [];
    let i = r.hasta + 1;
    while (i < p.length && noun.length < 5 && !enRun.has(i) && !PARAR.has(p[i])) noun.push(p[i++]);
    if (!noun.length) return;
    if (PERSONAS.has(noun[0])) {
      res.personas = r.valor;
      usado.add(ri);
      return;
    }
    const m = mens.find((x) => x.desde === r.hasta + 1);
    usado.add(ri);
    const pr = precioDespues(i);
    const parecido = m ? null : itemParecido(noun.join(' '), items);
    cands.push({ itemId: m?.itemId ?? parecido ?? null, nombre: m || parecido ? '' : noun.join(' '), cantidad: r.valor, precio: pr?.valor ?? null, fin: pr?.hasta ?? i - 1 });
  });

  // ---- Precios dichos aparte: "la silla las cobro 800", "el set de vajilla completo los cobró 2000 cada uno"
  for (const c of cands) {
    if (c.precio !== null) continue;
    let posiciones: { desde: number; hasta: number }[];
    if (c.itemId) posiciones = mens.filter((m) => m.itemId === c.itemId && m.desde > c.fin);
    else {
      const w = c.nombre.split(' ').slice(0, 2);
      posiciones = [];
      for (let i = c.fin + 1; i + w.length <= p.length; i++) if (w.every((x, j) => mismo(x, p[i + j]))) posiciones.push({ desde: i, hasta: i + w.length - 1 });
    }
    for (const pos of posiciones) {
      const ri = runs.findIndex((r, k) => !usado.has(k) && r.desde > pos.hasta && r.desde <= pos.hasta + 8 && p[r.hasta + 1] !== 'porciento');
      if (ri >= 0) {
        c.precio = runs[ri].valor;
        usado.add(ri);
        break;
      }
    }
  }

  // Un nombre que no está en el inventario y no tiene precio no es un artículo ("un nuevo evento")
  const vistos = new Set<string>();
  for (const c of cands) {
    const nombreValido = c.nombre.length >= 3 && !NO_ES_ARTICULO.has(c.nombre.split(' ')[0]) && !/\d/.test(c.nombre);
    if (!c.itemId && c.precio === null && !(res.total !== null && nombreValido)) continue;
    const clave = c.itemId ?? c.nombre;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    res.lineas.push({ itemId: c.itemId, nombreDicho: c.nombre, cantidad: c.cantidad, precio: c.precio });
  }

  // ---- Seña: "me va a señar con el 50%", "seña de 100 mil"
  for (let i = 0; i < p.length; i++) {
    if (!/^(en)?sen(a|ar|ia|iar)/.test(p[i])) continue;
    const ri = runs.findIndex((r, k) => !usado.has(k) && r.desde > i && r.desde <= i + 8);
    if (ri >= 0) {
      if (p[runs[ri].hasta + 1] === 'porciento') res.senaPorcentaje = runs[ri].valor;
      else res.senaMonto = runs[ri].valor;
      usado.add(ri);
    } else if (p.slice(i, i + 8).includes('mitad')) res.senaPorcentaje = 50;
    if (res.senaPorcentaje !== null || res.senaMonto !== null) break;
  }
  if (res.senaPorcentaje === null && res.senaMonto === null) {
    const ri = runs.findIndex((r, k) => !usado.has(k) && p[r.hasta + 1] === 'porciento');
    if (ri >= 0) res.senaPorcentaje = runs[ri].valor;
  }

  // ---- Fecha (sin confundir "con el 50 por ciento" con "el 50")
  const sinPorcentaje = p.map((w, i) => (enRun.has(i) && p[runs.find((r) => i >= r.desde && i <= r.hasta)!.hasta + 1] === 'porciento' ? '_' : w));
  res.fecha = interpretarFecha(sinPorcentaje, hoy);

  // ---- Varios días seguidos: "del 21 al 23 de noviembre", "por tres días"
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  for (let i = 0; i < p.length - 3; i++) {
    if (p[i] !== 'del') continue;
    const a = runs.find((x) => x.desde === i + 1);
    if (!a || p[a.hasta + 1] !== 'al') continue;
    const b = runs.find((x) => x.desde === a.hasta + 2);
    if (!b || a.valor < 1 || a.valor > 31 || b.valor < 1 || b.valor > 31) continue;
    const mes = p[b.hasta + 1] === 'de' && MESES.includes(p[b.hasta + 2]) ? p[b.hasta + 2] : null;
    const dd = (n: number) => String(n).padStart(2, '0');
    const valido = (f: string, dia: number) => new Date(`${f}T00:00:00Z`).getUTCDate() === dia;
    let desde: string | null;
    let hasta: string;
    if (mes) {
      // el mes que se dice al final es el del último día: "del 28 al 2 de diciembre"
      const finDia = interpretarFecha(['el', String(b.valor), 'de', mes], hoy);
      if (!finDia) continue;
      hasta = finDia;
      if (a.valor <= b.valor) desde = `${finDia.slice(0, 8)}${dd(a.valor)}`;
      else {
        const [y, m] = finDia.split('-').map(Number);
        desde = `${new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 8)}${dd(a.valor)}`;
      }
    } else {
      desde = interpretarFecha(['el', String(a.valor)], hoy);
      if (!desde) continue;
      hasta = `${desde.slice(0, 8)}${dd(b.valor)}`;
      if (hasta < desde) {
        const [y, m] = desde.split('-').map(Number);
        hasta = `${new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 8)}${dd(b.valor)}`;
      }
    }
    if (valido(desde, a.valor) && valido(hasta, b.valor) && desde <= hasta) {
      res.fecha = desde;
      res.fechaHasta = hasta;
    }
    break;
  }
  if (res.fecha && !res.fechaHasta) {
    for (let i = 0; i < p.length - 2; i++) {
      if (p[i] !== 'por' && p[i] !== 'durante') continue;
      const rn = runs.find((x) => x.desde === i + 1);
      if (rn && ['dias', 'dia'].includes(p[rn.hasta + 1]) && rn.valor >= 2 && rn.valor <= 30) {
        res.fechaHasta = sumarDias(res.fecha, rn.valor - 1);
        break;
      }
    }
  }
  return res;
}
