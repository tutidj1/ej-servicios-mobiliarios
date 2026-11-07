import { metadataProducto, renderProducto } from '@/lib/rutaProducto';

// Las fotos salen del catálogo de Supabase: se arma en cada visita, igual que la home
export const revalidate = 300; // se regenera cada 5 min y al instante cuando se guarda algo en /admin

const SLUG = 'alquiler-de-vajilla-santa-fe';

export const metadata = metadataProducto(SLUG);

export default function Page() {
  return renderProducto(SLUG);
}
