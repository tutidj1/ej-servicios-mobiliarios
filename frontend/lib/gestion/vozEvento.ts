// Arma un evento completo a partir de un mensaje hablado o escrito, como lo diría una persona:
// "Quiero subir un evento de Javier: 100 sillas, 10 tablones... las sillas las cobro 800... el flete
// me sale 100 mil... me va a señar con el 50%". No inventa nada: lo que no se dice queda vacío.

import { extraerNumeros, interpretarFecha, mismo, normalizar, type ItemVoz } from './voz';

export interface LineaBorrador {
  /** null = el artículo no existe todavía en el inventario (se propone crearlo). */
  itemId: string | null;
  nombreDicho: string;
  cantidad: number | null;
  precio: number | null;
}

export interface BorradorEvento {
  cliente: string;
  lineas: LineaBorrador[];
  personas: number | null;
  fecha: string | null;
  /** "flete incluido": el flete va dentro del precio, no se cobra aparte. */
  fleteIncluido: boolean;
  fleteCobrado: number | null;
  /** Lo que le cuesta a ella el flete (ida y vuelta). */
  fletePagado: number | null;
  senaPorcentaje: number | null;
  senaMonto: number | null;
}

const PARAR = new Set([
  'y', 'la', 'el', 'los', 'las', 'lo', 'que', 'quiero', 'quiere', 'me', 'es', 'son', 'flete', 'cada', 'mas', 'por',
  'a', 'con', 'cobro', 'cobre', 'cobra', 'cobran', 'cobrar', 'cuesta', 'sale', 'tiene', 'va', 'hola', 'pero', 'porciento',
]);
const PARAR_NOMBRE = new Set([
  'lo', 'que', 'tiene', 'tienen', 'son', 'quiere', 'quieren', 'necesita', 'necesitan', 'pidio', 'pide', 'alquila', 'alquilar',
  'con', 'y', 'el', 'la', 'los', 'las', 'para', 'es', 'fecha', 'tengo', 'hace', 'va', 'pagar', 'a', 'se', 'le', 'quiero', 'hola',
]);
const PERSONAS = new Set(['personas', 'invitados', 'gente', 'comensales', 'pax']);

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

/** Todas las veces que se nombra un artículo del inventario (gana el nombre más largo, sin solaparse). */
function menciones(p: string[], items: ItemVoz[]): Mencion[] {
  const todas: (Mencion & { largo: number })[] = [];
  for (const it of items) {
    for (const forma of [it.nombre, ...it.alias]) {
      const f = normalizar(forma).split(' ').filter(Boolean);
      if (!f.length) continue;
      for (let i = 0; i + f.length <= p.length; i++) {
        if (f.every((w, j) => mismo(w, p[i + j]))) todas.push({ itemId: it.id, desde: i, hasta: i + f.length - 1, largo: f.length });
      }
    }
  }
  todas.sort((a, b) => b.largo - a.largo || a.desde - b.desde);
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

const mayuscula = (w: string, i: number) => (i > 0 && ['de', 'del', 'la', 'los', 'y'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1));

export function interpretarEvento(texto: string, items: ItemVoz[], hoy: string): BorradorEvento {
  const p = tokensDe(texto);
  const conTildes = tokensConTildes(texto);
  const runs = extraerNumeros(p);
  const usado = new Set<number>(); // índices de runs ya explicados
  const enRun = new Set<number>();
  runs.forEach((r) => { for (let k = r.desde; k <= r.hasta; k++) enRun.add(k); });
  const runEn = (idx: number) => runs.findIndex((r) => r.desde === idx);
  const mens = menciones(p, items);

  const res: BorradorEvento = {
    cliente: '', lineas: [], personas: null, fecha: null, fleteIncluido: false, fleteCobrado: null, fletePagado: null,
    senaPorcentaje: null, senaMonto: null,
  };

  // ---- Cliente: "este evento es de Javier de Yacosta lo que tiene es..."
  for (let k = 0; k < p.length - 1; k++) {
    let j = -1;
    if (p[k] === 'evento') j = p[k + 1] === 'es' ? k + 2 : k + 1;
    else if (p[k] === 'nombre' && p[k + 1] === 'de') j = k + 2;
    else if (p[k] === 'cliente') j = k + 1;
    if (j < 0) continue;
    if (['de', 'para', 'del'].includes(p[j]) || p[k] !== 'evento') {
      const inicio = p[k] === 'evento' ? j + 1 : j;
      const nombre: string[] = [];
      for (let i = inicio; i < p.length && nombre.length < 5; i++) {
        if (enRun.has(i) || PARAR_NOMBRE.has(p[i])) break;
        nombre.push(p[i]);
      }
      if (nombre.length && !['de', 'del'].includes(nombre[nombre.length - 1])) {
        const desdeIdx = inicio;
        const original = conTildes.length === p.length ? conTildes.slice(desdeIdx, desdeIdx + nombre.length) : nombre;
        res.cliente = original.map(mayuscula).join(' ');
        break;
      }
    }
  }

  // ---- Cantidades: "100 sillas", "10 talones", "100 set de vajilla completo" (y precio si dice "a 800")
  interface Cand { itemId: string | null; nombre: string; cantidad: number; precio: number | null; fin: number }
  const cands: Cand[] = [];
  runs.forEach((r, ri) => {
    if (p[r.hasta + 1] === 'porciento') return;
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
    let precio: number | null = null;
    let fin = i - 1;
    if (p[i] === 'a' || (p[i] === 'cada' && p[i + 2] === 'a')) {
      const rj = runEn(p[i] === 'a' ? i + 1 : i + 3);
      if (rj >= 0) {
        precio = runs[rj].valor;
        usado.add(rj);
        fin = runs[rj].hasta;
      }
    }
    usado.add(ri);
    cands.push({ itemId: m?.itemId ?? null, nombre: m ? '' : noun.join(' '), cantidad: r.valor, precio, fin });
  });

  // ---- Precios: "la silla las cobro 800", "el set de vajilla completo los cobró 2000 cada uno"
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
    if (!c.itemId && c.precio === null) continue;
    const clave = c.itemId ?? c.nombre;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    res.lineas.push({ itemId: c.itemId, nombreDicho: c.nombre, cantidad: c.cantidad, precio: c.precio });
  }

  // ---- Flete: "flete incluido", "el flete me sale 100 mil la ida y la vuelta"
  for (let i = 0; i < p.length; i++) {
    if (p[i] !== 'flete') continue;
    if (['incluido', 'incluida', 'incluye'].includes(p[i + 1]) || ['incluye', 'incluido'].includes(p[i - 1])) {
      res.fleteIncluido = true;
      continue;
    }
    const ventana = p.slice(i + 1, i + 13);
    const ri = runs.findIndex((r, k) => !usado.has(k) && r.desde > i && r.desde <= i + 12);
    if (ri < 0) continue;
    const cobrado = p.slice(Math.max(0, i - 3), i).some((w) => ['cobro', 'cobre', 'cobra', 'cobrar'].includes(w));
    const costo = ventana.some((w) => ['sale', 'cuesta', 'pago', 'pague', 'cobran', 'costo', 'total'].includes(w));
    if (cobrado && !costo) res.fleteCobrado = runs[ri].valor;
    else if (costo) res.fletePagado = runs[ri].valor;
    else continue;
    usado.add(ri);
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
  return res;
}
