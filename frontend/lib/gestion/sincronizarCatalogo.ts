import type { SupabaseClient } from '@supabase/supabase-js';

// El catálogo de la web (tabla "productos") y los artículos del presupuesto (tabla "items") son dos listas.
// Lo que se agrega al catálogo también tiene que poder elegirse al armar un presupuesto: acá se crea el artículo
// que le corresponde (con el vínculo producto_id) y se evita duplicar los que ya existen.

export type CategoriaArticulo = 'mobiliario' | 'vajilla' | 'mantelería' | 'otros';

export interface ProductoCatalogo {
  id: string;
  nombre: string;
  categoria: string;
  created_at: string | null;
}

export interface ArticuloExistente {
  id: string;
  nombre: string;
  alias: string[] | null;
  producto_id: string | null;
}

/**
 * Productos del catálogo original que ya están en el inventario con otro nombre (los artículos de la plantilla del
 * contrato). Sin esto se crearían duplicados: "Sillas de plástico reforzado" ya es el artículo "Sillas".
 */
export const EQUIVALENCIAS: Record<string, string> = {
  'sillas de plastico reforzado': 'sillas',
  'caballetes de hierro': 'caballetes',
  'tablones de madera 220cm x 60cm': 'tablones de madera',
  'cuchillo de mesa': 'cuchillos',
  'tenedor de mesa': 'tenedores',
  'tenedor de postre': 'tenedores de postre',
  'cucharita de te': 'cucharas de te',
  'copa de vino / agua': 'copas de vino / agua',
  'ensaladera de acero inoxidable': 'ensaladera',
  'frasco dispenser de vidrio x2 con canilla.': 'frasco dispensador',
  'frapera de plastico': 'frapera',
  'hielera de plastico': 'hielera con pinza',
  'servilletas de tela': 'servilletas',
  'plato para mesa dulce': 'platos de postre',
};

export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Categoría del catálogo (Mobiliario, Vajilla, Cubiertos, Cristalería, Mantelería, Accesorios…) → categoría del inventario. */
export function categoriaDeProducto(categoria: string): CategoriaArticulo {
  const c = normalizar(categoria);
  if (c.includes('mantel')) return 'mantelería';
  if (c.includes('mobiliario')) return 'mobiliario';
  if (c.includes('vajilla') || c.includes('cubierto') || c.includes('cristal') || c.includes('accesorio')) return 'vajilla';
  return 'otros';
}

export interface PlanSincronizacion {
  /** Productos sin artículo: hay que crear uno. */
  crear: ProductoCatalogo[];
  /** Productos que ya tienen un artículo con el mismo nombre pero sin vínculo: solo se vinculan. */
  vincular: { productoId: string; articuloId: string }[];
}

export function planSincronizacion(
  productos: ProductoCatalogo[],
  articulos: ArticuloExistente[],
  filtro: { desde?: string; ids?: string[] } = {},
): PlanSincronizacion {
  const vinculados = new Set(articulos.map((a) => a.producto_id).filter(Boolean));
  const porNombre = new Map<string, ArticuloExistente>();
  for (const a of articulos) {
    porNombre.set(normalizar(a.nombre), a);
    for (const alias of a.alias ?? []) if (!porNombre.has(normalizar(alias))) porNombre.set(normalizar(alias), a);
  }

  const plan: PlanSincronizacion = { crear: [], vincular: [] };
  const usados = new Set<string>();
  for (const p of productos) {
    if (filtro.ids && !filtro.ids.includes(p.id)) continue;
    if (!filtro.ids && filtro.desde && (p.created_at ?? '') < filtro.desde) continue;
    if (vinculados.has(p.id)) continue;
    const igual = porNombre.get(normalizar(p.nombre)) ?? porNombre.get(EQUIVALENCIAS[normalizar(p.nombre)] ?? '');
    if (igual) {
      if (!igual.producto_id && !usados.has(igual.id)) {
        plan.vincular.push({ productoId: p.id, articuloId: igual.id });
        usados.add(igual.id);
      }
      continue;
    }
    plan.crear.push(p);
    // Dos productos con el mismo nombre no pueden crear dos artículos iguales
    porNombre.set(normalizar(p.nombre), { id: '', nombre: p.nombre, alias: [], producto_id: p.id });
  }
  return plan;
}

/**
 * Completa el presupuesto con lo que está en el catálogo. Sin `ids` revisa todos los productos; con `ids`, solo esos
 * (al guardar un producto nuevo). Devuelve los nombres de los artículos que se crearon.
 */
export async function sincronizarCatalogo(
  supabase: SupabaseClient,
  filtro: { ids?: string[] } = {},
): Promise<{ creados: number; nombres: string[]; error?: string }> {
  const [pr, ar] = await Promise.all([
    supabase.from('productos').select('id, nombre, categoria, created_at'),
    supabase.from('items').select('id, nombre, alias, producto_id'),
  ]);
  if (pr.error || ar.error) return { creados: 0, nombres: [], error: (pr.error ?? ar.error)?.message ?? 'No se pudo leer' };

  const plan = planSincronizacion((pr.data as ProductoCatalogo[]) ?? [], (ar.data as ArticuloExistente[]) ?? [], {
    ids: filtro.ids,
  });

  for (const v of plan.vincular) {
    await supabase.from('items').update({ producto_id: v.productoId }).eq('id', v.articuloId).is('producto_id', null);
  }

  if (!plan.crear.length) return { creados: 0, nombres: [] };
  const filas = plan.crear.map((p) => ({
    nombre: p.nombre.trim().slice(0, 120),
    categoria: categoriaDeProducto(p.categoria),
    stock_total: null, // sin límite: no se controla hasta que se cargue el stock en Inventario
    sugerencia: 'ninguna',
    activo: true,
    alias: [],
    producto_id: p.id,
  }));
  const { error } = await supabase.from('items').insert(filas);
  if (error) return { creados: 0, nombres: [], error: error.message };
  return { creados: filas.length, nombres: filas.map((f) => f.nombre) };
}
