import type { Metadata } from 'next';
import PaginaProductoView from '@/components/PaginaProductoView';
import { getProductos } from '@/lib/data';
import { getPaginaProducto } from '@/lib/paginasProducto';
import { OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site';

function pagina(slug: string) {
  const p = getPaginaProducto(slug);
  if (!p) throw new Error(`Página de producto desconocida: ${slug}`);
  return p;
}

/** Metadatos propios de cada página de producto: title, description y canonical a sí misma. */
export function metadataProducto(slug: string): Metadata {
  const p = pagina(slug);
  const url = `${SITE_URL}/${p.slug}`;
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: url },
    openGraph: {
      title: p.title,
      description: p.description,
      url,
      siteName: SITE_NAME,
      locale: 'es_AR',
      type: 'website',
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title: p.title, description: p.description, images: [OG_IMAGE.url] },
  };
}

export async function renderProducto(slug: string) {
  const productos = await getProductos();
  return <PaginaProductoView pagina={pagina(slug)} productos={productos} />;
}
