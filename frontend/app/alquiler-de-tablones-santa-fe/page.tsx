import { metadataProducto, renderProducto } from '@/lib/rutaProducto';

// Las fotos salen del catálogo de Supabase: se arma en cada visita, igual que la home
export const dynamic = 'force-dynamic';

const SLUG = 'alquiler-de-tablones-santa-fe';

export const metadata = metadataProducto(SLUG);

export default function Page() {
  return renderProducto(SLUG);
}
