// Estudio de precios por artículo: a cuánto se alquila cada cosa, cuál es el promedio por unidad
// y cuál es el precio "ganador" (el que más eventos consigue). Todo en pesos por unidad.

export interface LineaHistorial {
  item_id: string;
  evento_id: string;
  cantidad_total: number;
  precio_unitario: number;
}

export interface EstadisticaPrecio {
  precio: number;
  /** Cuántos eventos se alquilaron a este precio. */
  eventos: number;
  unidades: number;
  /** pesos */
  ingresos: number;
}

export interface EstadisticaItem {
  itemId: string;
  nombre: string;
  eventos: number;
  unidades: number;
  ingresos: number;
  /** Promedio por unidad, ponderado por las unidades alquiladas (el que cuenta para la plata). */
  precioPromedio: number;
  /** Promedio simple de los precios de cada evento. */
  precioPromedioPorEvento: number;
  minimo: number;
  maximo: number;
  /** Cada precio usado, del más exitoso al menos. */
  precios: EstadisticaPrecio[];
  /** El precio con más eventos (si empatan: más unidades, y después el más alto). */
  ganador: EstadisticaPrecio;
  /** Cuánto se separa el ganador del promedio, en %. Positivo = cobra más que el promedio. */
  ganadorVsPromedioPct: number;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

export function estadisticasPorItem(lineas: LineaHistorial[], nombres: Record<string, string>): EstadisticaItem[] {
  const porItem = new Map<string, LineaHistorial[]>();
  for (const l of lineas) {
    if (!(l.cantidad_total > 0) || !(l.precio_unitario >= 0)) continue;
    const lista = porItem.get(l.item_id) ?? [];
    lista.push(l);
    porItem.set(l.item_id, lista);
  }

  const res: EstadisticaItem[] = [];
  for (const [itemId, lista] of Array.from(porItem.entries())) {
    const porPrecio = new Map<number, { eventos: Set<string>; unidades: number; ingresos: number }>();
    let unidades = 0;
    let ingresos = 0;
    let sumaPrecios = 0;
    const eventos = new Set<string>();
    for (const l of lista) {
      const precio = redondear(Number(l.precio_unitario));
      const cant = Number(l.cantidad_total);
      const g = porPrecio.get(precio) ?? { eventos: new Set<string>(), unidades: 0, ingresos: 0 };
      g.eventos.add(l.evento_id);
      g.unidades += cant;
      g.ingresos += cant * precio;
      porPrecio.set(precio, g);
      unidades += cant;
      ingresos += cant * precio;
      sumaPrecios += precio;
      eventos.add(l.evento_id);
    }
    const precios: EstadisticaPrecio[] = Array.from(porPrecio.entries())
      .map(([precio, g]) => ({ precio, eventos: g.eventos.size, unidades: g.unidades, ingresos: redondear(g.ingresos) }))
      .sort((a, b) => b.eventos - a.eventos || b.unidades - a.unidades || b.precio - a.precio);
    const precioPromedio = unidades > 0 ? ingresos / unidades : 0;
    const ganador = precios[0];
    res.push({
      itemId,
      nombre: nombres[itemId] ?? 'Artículo',
      eventos: eventos.size,
      unidades,
      ingresos: redondear(ingresos),
      precioPromedio: redondear(precioPromedio),
      precioPromedioPorEvento: redondear(sumaPrecios / lista.length),
      minimo: Math.min(...precios.map((p) => p.precio)),
      maximo: Math.max(...precios.map((p) => p.precio)),
      precios,
      ganador,
      ganadorVsPromedioPct: precioPromedio > 0 ? redondear(((ganador.precio - precioPromedio) / precioPromedio) * 100) : 0,
    });
  }
  // Los que más facturan primero
  return res.sort((a, b) => b.ingresos - a.ingresos || b.eventos - a.eventos);
}

export interface ResumenGeneral {
  /** El artículo que más eventos consigue. */
  masPedido: EstadisticaItem | null;
  /** El que más plata deja. */
  masFactura: EstadisticaItem | null;
}

export function resumenGeneral(items: EstadisticaItem[]): ResumenGeneral {
  if (!items.length) return { masPedido: null, masFactura: null };
  const masPedido = [...items].sort((a, b) => b.eventos - a.eventos || b.unidades - a.unidades)[0];
  const masFactura = [...items].sort((a, b) => b.ingresos - a.ingresos)[0];
  return { masPedido, masFactura };
}
