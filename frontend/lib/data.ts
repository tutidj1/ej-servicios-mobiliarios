import { createClient } from '@supabase/supabase-js';
import { productosEstaticos, Producto } from '@/lib/productos';
import { PROMO_POR_DEFECTO, PromoConfig } from '@/lib/promo';
import { BANNERS_POR_DEFECTO, Banner } from '@/lib/banners';

// Lectura pública de datos para componentes de servidor (RLS permite SELECT a anon).
// Si Supabase no responde se usa el catálogo estático / promo por defecto.

function clienteLectura() {
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!urlRaw || !key) return null;
  const url = urlRaw.replace(/\/rest\/v1\/?$/, '');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Sin caché: lo que se guarda en el panel /admin se ve en la web en el momento
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}

export async function getProductos(): Promise<Producto[]> {
  const supabase = clienteLectura();
  if (!supabase) return productosEstaticos;

  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return productosEstaticos;

    return data.map((item: any) => ({
      id: item.id,
      nombre: item.nombre,
      categoria: item.categoria,
      descripcion: item.descripcion || '',
      imagen_url: item.imagen_url || '',
      stock_disponible: item.stock_disponible || 0,
      activo: item.activo,
      orden: item.orden ?? 0,
      etiqueta_whatsapp: item.etiqueta_whatsapp ?? null,
      cantidad_segun_invitados: Boolean(item.cantidad_segun_invitados),
    }));
  } catch (err) {
    console.warn('No se pudo leer productos de Supabase, se usa el catálogo estático:', err);
    return productosEstaticos;
  }
}

export async function getPromo(): Promise<PromoConfig> {
  const supabase = clienteLectura();
  if (!supabase) return PROMO_POR_DEFECTO;

  try {
    const { data, error } = await supabase.from('promo_config').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    if (!data) return PROMO_POR_DEFECTO;
    return {
      activo: Boolean(data.activo),
      motivo: data.motivo || PROMO_POR_DEFECTO.motivo,
      descuento_texto: data.descuento_texto || PROMO_POR_DEFECTO.descuento_texto,
      beneficio_texto: data.beneficio_texto || PROMO_POR_DEFECTO.beneficio_texto,
      meses_vigencia: data.meses_vigencia || PROMO_POR_DEFECTO.meses_vigencia,
    };
  } catch (err) {
    console.warn('No se pudo leer promo_config, se usa la promo por defecto:', err);
    return PROMO_POR_DEFECTO;
  }
}

export async function getBanners(): Promise<Record<string, Banner>> {
  const supabase = clienteLectura();
  if (!supabase) return BANNERS_POR_DEFECTO;

  try {
    const { data, error } = await supabase.from('banners').select('*');
    if (error) throw error;

    // Cada banner del panel pisa al de respaldo; lo que falte o esté vacío conserva el valor original
    const resultado: Record<string, Banner> = { ...BANNERS_POR_DEFECTO };
    (data ?? []).forEach((b: any) => {
      const base = BANNERS_POR_DEFECTO[b.clave];
      resultado[b.clave] = {
        clave: b.clave,
        etiqueta: b.etiqueta || base?.etiqueta || b.clave,
        titulo: b.titulo ?? base?.titulo ?? null,
        subtitulo: b.subtitulo ?? base?.subtitulo ?? null,
        imagen_url: b.imagen_url || base?.imagen_url || '',
        alt: b.alt || base?.alt || '',
      };
    });
    return resultado;
  } catch (err) {
    console.warn('No se pudo leer banners, se usan los de respaldo:', err);
    return BANNERS_POR_DEFECTO;
  }
}
