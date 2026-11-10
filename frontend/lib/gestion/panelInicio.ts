// Panel de inicio del admin: lo que hay que hacer hoy, lo que está atrasado y cómo viene el mes.
// Son cálculos puros sobre los eventos; la pantalla solo los muestra.
import { fechaCorta, sumarDias, type EstadoEvento } from './calculos';

export interface EventoPanel {
  id: string;
  cliente: string;
  lugar: string | null;
  estado: EstadoEvento;
  fecha_evento: string;
  fecha_entrega: string;
  fecha_devolucion: string;
  /** Total del alquiler en pesos (líneas + flete cobrado). */
  total: number;
  /** Lo que ya pagó el cliente, en pesos. */
  cobrado: number;
}

export type TipoAviso = 'devolucion_atrasada' | 'por_cobrar' | 'sin_precio';

export interface Aviso {
  tipo: TipoAviso;
  eventoId: string;
  cliente: string;
  /** Días de atraso (devoluciones) o días desde que terminó el evento (cobros). */
  dias: number;
  /** Lo que falta cobrar, en pesos. Solo en 'por_cobrar'. */
  monto?: number;
}

/** Diferencia en días entre dos fechas 'YYYY-MM-DD' (b − a). */
export function diasEntre(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export interface Movimiento {
  eventoId: string;
  cliente: string;
  lugar: string | null;
  tipo: 'entrega' | 'devolucion';
  dia: string;
}

/**
 * Entregas y devoluciones de los próximos `dias` días (hoy incluido), ordenadas por fecha.
 * Solo cuentan los eventos que ya están confirmados o entregados: un presupuesto todavía no se mueve.
 */
export function movimientos(eventos: EventoPanel[], hoy: string, dias = 7): Movimiento[] {
  const hasta = sumarDias(hoy, dias);
  const lista: Movimiento[] = [];
  for (const e of eventos) {
    if (e.estado !== 'confirmado' && e.estado !== 'entregado') continue;
    if (e.estado === 'confirmado' && e.fecha_entrega >= hoy && e.fecha_entrega <= hasta) {
      lista.push({ eventoId: e.id, cliente: e.cliente, lugar: e.lugar, tipo: 'entrega', dia: e.fecha_entrega });
    }
    if (e.fecha_devolucion >= hoy && e.fecha_devolucion <= hasta) {
      lista.push({ eventoId: e.id, cliente: e.cliente, lugar: e.lugar, tipo: 'devolucion', dia: e.fecha_devolucion });
    }
  }
  return lista.sort((a, b) => a.dia.localeCompare(b.dia) || a.cliente.localeCompare(b.cliente));
}

/**
 * Lo que se está pasando de fecha y conviene resolver:
 *  - devolución atrasada: el evento está entregado y la fecha de devolución ya pasó (hay que ir a buscar las cosas);
 *  - por cobrar: el evento ya terminó y todavía falta plata;
 *  - sin precio: un evento confirmado sin total cargado (no se puede saber cuánto cobrar).
 * Los cancelados no avisan nada. Lo más atrasado va primero.
 */
export function avisos(eventos: EventoPanel[], hoy: string): Aviso[] {
  const lista: Aviso[] = [];
  for (const e of eventos) {
    if (e.estado === 'cancelado') continue;
    if (e.estado === 'entregado' && e.fecha_devolucion < hoy) {
      lista.push({ tipo: 'devolucion_atrasada', eventoId: e.id, cliente: e.cliente, dias: diasEntre(e.fecha_devolucion, hoy) });
    }
    const termino = e.fecha_devolucion < hoy;
    const falta = Math.round((e.total - e.cobrado) * 100) / 100;
    if (termino && e.estado !== 'presupuesto' && e.total > 0 && falta > 0) {
      lista.push({ tipo: 'por_cobrar', eventoId: e.id, cliente: e.cliente, dias: diasEntre(e.fecha_devolucion, hoy), monto: falta });
    }
    if (e.estado === 'confirmado' && e.total <= 0) {
      lista.push({ tipo: 'sin_precio', eventoId: e.id, cliente: e.cliente, dias: diasEntre(hoy, e.fecha_evento) });
    }
  }
  const orden: Record<TipoAviso, number> = { devolucion_atrasada: 0, por_cobrar: 1, sin_precio: 2 };
  return lista.sort((a, b) => orden[a.tipo] - orden[b.tipo] || b.dias - a.dias);
}

export interface ResumenMes {
  eventos: number;
  total: number;
  cobrado: number;
  porCobrar: number;
}

/**
 * Cómo viene el mes del día `hoy`: eventos que no están cancelados ni en presupuesto,
 * cuánto suman, cuánto se cobró y cuánto falta. Un presupuesto todavía no es plata.
 */
export function resumenMes(eventos: EventoPanel[], hoy: string): ResumenMes {
  const mes = hoy.slice(0, 7);
  const delMes = eventos.filter((e) => e.fecha_evento.slice(0, 7) === mes && e.estado !== 'cancelado' && e.estado !== 'presupuesto');
  const total = delMes.reduce((t, e) => t + e.total, 0);
  const cobrado = delMes.reduce((t, e) => t + Math.min(e.cobrado, e.total), 0);
  return {
    eventos: delMes.length,
    total: Math.round(total * 100) / 100,
    cobrado: Math.round(cobrado * 100) / 100,
    porCobrar: Math.round((total - cobrado) * 100) / 100,
  };
}

/** "Hoy", "Mañana" o la fecha corta: para que la lista se lea de un vistazo. */
export function cuando(dia: string, hoy: string): string {
  const d = diasEntre(hoy, dia);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  return fechaCorta(dia);
}
