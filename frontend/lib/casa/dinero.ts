/**
 * Dinero de EJ Casa: SIEMPRE enteros de centavos. Nada de flotantes para guardar ni sumar.
 * Lo que la persona escribe son pesos enteros (solo dígitos); acá se pasa a centavos y se muestra con puntos.
 */

/** Tope de lo que se puede cargar de una vez: $999.999.999 */
export const MAX_DIGITOS = 9;

/** "12500" → 1250000 centavos. Vacío o inválido → null. */
export function digitosACentavos(digitos: string): number | null {
  if (!/^[0-9]{1,9}$/.test(digitos)) return null;
  const pesos = Number(digitos);
  if (pesos <= 0) return null;
  return pesos * 100;
}

/** Puntos de miles a mano (no depende del ICU del navegador): 1234567 → "1.234.567" */
export function conPuntos(entero: number | string): string {
  const s = String(entero).replace(/^0+(?=\d)/, '');
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Lo que se ve mientras se escribe: "12500" → "12.500" */
export function formatearDigitos(digitos: string): string {
  return digitos ? conPuntos(digitos) : '0';
}

/** Centavos → "$ 12.500" (con coma y dos decimales solo si hay centavos sueltos). */
export function formatearCentavos(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const pesos = Math.floor(abs / 100);
  const resto = abs % 100;
  const base = `$ ${conPuntos(pesos)}${resto ? ',' + String(resto).padStart(2, '0') : ''}`;
  return negativo ? `−${base}` : base;
}

/** Suma de montos en centavos (enteros): nunca pasa por decimales. */
export function sumarCentavos(montos: number[]): number {
  return montos.reduce((t, m) => t + m, 0);
}

// ---- Fechas (sin zona horaria: se trabaja con 'YYYY-MM-DD' locales) ----
const dos = (n: number) => String(n).padStart(2, '0');

export function fechaLocalISO(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function haceDias(base: Date, dias: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() - dias);
  return d;
}

export type Mes = { anio: number; mes: number }; // mes 1-12

export function mesDe(d: Date): Mes {
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

export function moverMes(m: Mes, delta: number): Mes {
  const total = m.anio * 12 + (m.mes - 1) + delta;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

/** Rango semiabierto [desde, hasta) de un mes, en 'YYYY-MM-DD'. */
export function rangoMes(m: Mes): { desde: string; hasta: string } {
  const sig = moverMes(m, 1);
  return { desde: `${m.anio}-${dos(m.mes)}-01`, hasta: `${sig.anio}-${dos(sig.mes)}-01` };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function nombreMes(m: Mes): string {
  return `${MESES[m.mes - 1]} ${m.anio}`;
}

/** 'YYYY-MM-DD' → "12 nov" */
export function diaCorto(iso: string): string {
  const [, mm, dd] = iso.split('-').map(Number);
  return `${dd} ${MESES[mm - 1].slice(0, 3)}`;
}
