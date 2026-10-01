// Configuración de la promo y cálculo automático de meses.
// El administrador solo edita el motivo/descuento en Supabase (tabla promo_config);
// el mes actual y los meses de vigencia se calculan solos.

export interface PromoConfig {
  activo: boolean;
  motivo: string;
  descuento_texto: string;
  beneficio_texto: string;
  meses_vigencia: number;
}

export const PROMO_POR_DEFECTO: PromoConfig = {
  activo: true,
  motivo: 'Promo especial',
  descuento_texto: '30% OFF',
  beneficio_texto: 'En el total de tu alquiler',
  meses_vigencia: 3,
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

export interface PromoMeses {
  mesActual: string;
  anio: number;
  mesesVigentes: string[];
}

/** Mes y año actuales en Argentina (no dependen de la zona horaria del servidor). */
export function mesActualArgentina(ahora: Date = new Date()): { mes: number; anio: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA,
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(ahora);
  const mes = Number(partes.find((p) => p.type === 'month')?.value ?? 1) - 1;
  const anio = Number(partes.find((p) => p.type === 'year')?.value ?? ahora.getFullYear());
  return { mes, anio };
}

export function calcularMesesPromo(cantidad: number, ahora: Date = new Date()): PromoMeses {
  const { mes, anio } = mesActualArgentina(ahora);
  const total = Math.min(Math.max(Math.round(cantidad) || 3, 1), 12);
  const mesesVigentes = Array.from({ length: total }, (_, i) => MESES[(mes + i) % 12]);
  return { mesActual: MESES[mes], anio, mesesVigentes };
}

/** ["julio"] → "julio" · ["julio","agosto"] → "julio y agosto" · 3+ → "julio, agosto y septiembre" */
export function listaEnEspanol(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
