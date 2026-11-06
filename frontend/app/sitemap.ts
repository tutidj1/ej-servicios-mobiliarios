import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { paginasProducto } from '@/lib/paginasProducto';
import { getUltimaActualizacion } from '@/lib/data';

// Se genera en cada pedido para que lastmod refleje lo último que se guardó en el panel
export const dynamic = 'force-dynamic';

// Última edición del código/textos de la home (actualizar al cambiar contenido fijo de la home)
const HOME_EDITADA = new Date('2026-11-06');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const datos = await getUltimaActualizacion();
  const home = datos && datos > HOME_EDITADA ? datos : HOME_EDITADA;

  return [
    { url: SITE_URL, lastModified: home, changeFrequency: 'weekly', priority: 1 },
    ...paginasProducto.map((p) => ({
      url: `${SITE_URL}/${p.slug}`,
      lastModified: new Date(p.actualizado),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
