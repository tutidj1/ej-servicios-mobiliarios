/**
 * Carga de gastos por voz o texto libre de EJ Casa: "gasté quince lucas en el súper", "cargá 45 mil de nafta, ayer".
 * Es un intérprete LOCAL (sin servicios externos): sirve igual para lo que dicta el micrófono del navegador
 * y para el texto de un mensaje. Cuando no está seguro, NO inventa: devuelve la duda para preguntar
 * (un monto inventado contamina el piso familiar durante meses y nadie se entera).
 */
import { extraerNumeros, normalizar } from '../gestion/voz';

export type ObligacionVoz = { concepto: string; monto_estimado: number }; // monto en centavos

export type ContextoVoz = {
  /** Obligaciones de la casa (solo las ven los adultos): sirven para resolver "pagué la luz, 85". */
  obligaciones?: ObligacionVoz[];
  /** Nombres de los hijos, para reconocer "le transferí a ..." sin dejar nombres escritos en el código. */
  hijos?: string[];
};

export type ResultadoVoz = {
  texto: string;
  /** Monto en centavos, si se entendió sin dudas. */
  monto: number | null;
  /** Si el número es ambiguo (ej. "85"): las opciones en centavos, para preguntar. */
  montoAmbiguo: number[] | null;
  /** Cómo se resolvió el monto ambiguo: comparando contra el estimado de una obligación. */
  resueltoPorEstimado: string | null;
  /** Nombre exacto de la categoría, o null si no se pudo saber (se pregunta). */
  categoria: string | null;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  /** Dijo que le transfirió a un hijo: eso se carga con el botón de transferencias, no como un gasto suelto. */
  esTransferenciaAHijo: boolean;
};

const CATEGORIAS: { nombre: string; palabras: string[] }[] = [
  { nombre: 'Transferencias a los hijos', palabras: [] }, // se detecta aparte
  { nombre: 'Impuestos y servicios', palabras: ['luz', 'gas', 'agua', 'internet', 'wifi', 'cable', 'telefono', 'celular', 'abl', 'municipal', 'rentas', 'impuesto', 'impuestos', 'servicio', 'servicios', 'expensas'] },
  { nombre: 'Escuela y club de los chicos', palabras: ['escuela', 'colegio', 'club', 'jardin', 'utiles', 'uniforme', 'uniformes', 'natacion', 'futbol'] },
  { nombre: 'Salud y farmacia', palabras: ['farmacia', 'remedio', 'remedios', 'medico', 'medica', 'doctor', 'doctora', 'dentista', 'odontologo', 'analisis', 'obra', 'prepaga', 'psicologo', 'kinesiologo'] },
  { nombre: 'Transporte y nafta', palabras: ['nafta', 'combustible', 'gasoil', 'colectivo', 'sube', 'taxi', 'uber', 'cabify', 'peaje', 'estacionamiento', 'cochera', 'subte', 'tren', 'mecanico', 'lavadero'] },
  { nombre: 'Hogar y mantenimiento', palabras: ['arreglo', 'arreglos', 'plomero', 'electricista', 'ferreteria', 'pintura', 'pintor', 'reparacion', 'albanil', 'mantenimiento', 'gasista', 'cerrajero', 'techo'] },
  { nombre: 'Salidas, ropa y regalos', palabras: ['salida', 'cena', 'restaurante', 'resto', 'bar', 'cine', 'ropa', 'zapatillas', 'regalo', 'cumpleanos', 'helado', 'pizza', 'birra', 'cafe', 'boliche', 'remera', 'pantalon', 'campera'] },
  { nombre: 'Comida y supermercado', palabras: ['super', 'supermercado', 'carrefour', 'coto', 'disco', 'jumbo', 'verduleria', 'carniceria', 'panaderia', 'almacen', 'kiosco', 'comida', 'mercado', 'feria', 'fiambreria', 'pollo', 'carne', 'verdura', 'fruta'] },
];

const UNIDADES: Record<string, number> = { mil: 1000, luca: 1000, lucas: 1000, millon: 1_000_000, millones: 1_000_000 };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const pad = (n: number) => String(n).padStart(2, '0');

function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + dias));
  return `${f.getUTCFullYear()}-${pad(f.getUTCMonth() + 1)}-${pad(f.getUTCDate())}`;
}

function fechaDe(partes: string[], hoy: string): string {
  const t = partes.join(' ');
  if (/\b(anteayer|antes de ayer|antier)\b/.test(t)) return sumarDias(hoy, -2);
  if (/\bayer\b/.test(t)) return sumarDias(hoy, -1);
  const m = t.match(/\bel (\d{1,2})(?: de (\w+))?\b/);
  if (m) {
    const dia = Number(m[1]);
    const [y, mm] = hoy.split('-').map(Number);
    const mesPedido = m[2] ? MESES.indexOf(m[2]) + 1 : mm;
    if (dia >= 1 && dia <= 31 && mesPedido >= 1) {
      const iso = `${y}-${pad(mesPedido)}-${pad(dia)}`;
      if (!Number.isNaN(Date.parse(iso)) && iso <= hoy) return iso;
    }
  }
  return hoy;
}

type Corrida = { valor: number; desde: number; hasta: number; conUnidad: boolean };

/** Interpreta los números de la frase, incluidos "palos", "dos y medio" y "dos palos y medio". */
function corridas(partes: string[]): Corrida[] {
  const normalizadas = partes.map((p) => (p === 'palo' ? 'millon' : p === 'palos' ? 'millones' : p));
  const base = extraerNumeros(normalizadas);
  return base.map((c) => {
    let valor = c.valor;
    let hasta = c.hasta;
    const ultimo = normalizadas[c.hasta];
    const unidadFinal = UNIDADES[ultimo];
    const hayMedio = normalizadas[hasta + 1] === 'y' && (normalizadas[hasta + 2] === 'medio' || normalizadas[hasta + 2] === 'media');
    let conUnidad = normalizadas.slice(c.desde, c.hasta + 1).some((t) => t in UNIDADES);
    if (hayMedio && unidadFinal) {
      // "dos palos y medio", "dos lucas y media"
      valor += unidadFinal / 2;
      hasta += 2;
    } else if (hayMedio && UNIDADES[normalizadas[hasta + 3]]) {
      // "dos y medio palos", "dos y media lucas"
      valor = (valor + 0.5) * UNIDADES[normalizadas[hasta + 3]];
      hasta += 3;
      conUnidad = true;
    }
    return { valor, desde: c.desde, hasta, conUnidad };
  });
}

/** Un número que es parte de una fecha ("el 15", "21 de noviembre") o un año no es un monto. */
function esDeFecha(partes: string[], c: Corrida): boolean {
  if (partes[c.desde - 1] === 'el') return true;
  if (partes[c.hasta + 1] === 'de' && MESES.includes(partes[c.hasta + 2])) return true;
  if (c.valor >= 2000 && c.valor <= 2100 && partes[c.desde - 1] === 'de') return true;
  return false;
}

function categoriaDe(partes: string[]): string | null {
  for (const cat of CATEGORIAS) {
    if (cat.palabras.length && partes.some((p) => cat.palabras.includes(p))) return cat.nombre;
  }
  return null;
}

function obligacionMencionada(partes: string[], obls: ObligacionVoz[]): ObligacionVoz | null {
  for (const o of obls) {
    const palabras = normalizar(o.concepto).split(' ').filter((w) => w.length >= 3);
    if (palabras.length && palabras.every((w) => partes.includes(w))) return o;
  }
  return null;
}

export function parsearGasto(texto: string, hoy: string, ctx: ContextoVoz = {}): ResultadoVoz {
  const partes = normalizar(texto).split(' ').filter(Boolean);
  const base: ResultadoVoz = {
    texto,
    monto: null,
    montoAmbiguo: null,
    resueltoPorEstimado: null,
    categoria: null,
    fecha: fechaDe(partes, hoy),
    descripcion: texto.trim().slice(0, 80),
    esTransferenciaAHijo: false,
  };

  // ¿Le transfirió a un hijo?
  const nombresHijos = (ctx.hijos ?? []).map((h) => normalizar(h).split(' ')[0]).filter(Boolean);
  const hablaDeTransferir = partes.some((p) => p === 'transferi' || p === 'transferencia' || p === 'mande' || p === 'pase');
  if (hablaDeTransferir && (partes.some((p) => nombresHijos.includes(p)) || partes.some((p) => ['hijo', 'hija', 'hijos', 'nene', 'nena'].includes(p)))) {
    base.esTransferenciaAHijo = true;
    base.categoria = 'Transferencias a los hijos';
  } else {
    base.categoria = categoriaDe(partes);
  }

  // Monto
  const candidatos = corridas(partes).filter((c) => !esDeFecha(partes, c) && c.valor > 0);
  const elegido = candidatos[0];
  if (!elegido) return base;

  const dicePesos = ['pesos', 'mangos', 'pe'].includes(partes[elegido.hasta + 1] ?? '');
  const chico = elegido.valor < 1000 && !elegido.conUnidad && !dicePesos;
  if (!chico) {
    base.monto = Math.round(elegido.valor * 100);
    return base;
  }

  // Número chico sin unidad ("pagué la luz, 85"): ¿$85 o $85.000? Se resuelve solo si cierra con el estimado de la obligación.
  const pesos = Math.round(elegido.valor * 100);
  const miles = Math.round(elegido.valor * 1000 * 100);
  const obl = obligacionMencionada(partes, ctx.obligaciones ?? []);
  if (obl && obl.monto_estimado > 0) {
    const cerca = (c: number) => Math.abs(c - obl.monto_estimado) / obl.monto_estimado <= 0.4;
    const ok = [pesos, miles].filter(cerca);
    if (ok.length === 1) {
      base.monto = ok[0];
      base.resueltoPorEstimado = obl.concepto;
      return base;
    }
  }
  base.montoAmbiguo = [pesos, miles];
  return base;
}

/**
 * Corrección de un monto ("no, 20"): un número chico toma la magnitud del monto anterior,
 * así "no, 20" después de "45 mil" es $20.000 y no $20.
 */
export function corregirMonto(texto: string, montoPrevio: number): number | null {
  const partes = normalizar(texto).split(' ').filter(Boolean);
  const c = corridas(partes).find((x) => x.valor > 0);
  if (!c) return null;
  const dicePesos = ['pesos', 'mangos'].includes(partes[c.hasta + 1] ?? '');
  if (c.valor >= 1000 || c.conUnidad || dicePesos) return Math.round(c.valor * 100);
  const previoPesos = montoPrevio / 100;
  if (previoPesos >= 1_000_000 && previoPesos % 1_000_000 === 0) return Math.round(c.valor * 1_000_000 * 100);
  if (previoPesos >= 1000 && previoPesos % 1000 === 0) return Math.round(c.valor * 1000 * 100);
  return Math.round(c.valor * 100);
}
