import type { Metadata } from 'next';
import PaginaEventoView from '@/components/PaginaEventoView';
import { getProductos } from '@/lib/data';
import { getPaginaEvento } from '@/lib/paginasEvento';
import { OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/site';

function pagina(slug: string) {
  const p = getPaginaEvento(slug);
  if (!p) throw new Error(`Página de evento desconocida: ${slug}`);
  return p;
}

/** Metadatos propios de cada página de evento: title, description y canonical a sí misma. */
export function metadataEvento(slug: string): Metadata {
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

export async function renderEvento(slug: string) {
  const productos = await getProductos();
  return <PaginaEventoView pagina={pagina(slug)} productos={productos} />;
}
