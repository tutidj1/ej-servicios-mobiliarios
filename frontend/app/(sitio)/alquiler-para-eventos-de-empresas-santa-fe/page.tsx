import { metadataEvento, renderEvento } from '@/lib/rutaEvento';

// Las fotos salen del catálogo de Supabase: se arma en cada visita, igual que la home
export const revalidate = 300; // se regenera cada 5 min y al instante cuando se guarda algo en /admin

const SLUG = 'alquiler-para-eventos-de-empresas-santa-fe';

export const metadata = metadataEvento(SLUG);

export default function Page() {
  return renderEvento(SLUG);
}
