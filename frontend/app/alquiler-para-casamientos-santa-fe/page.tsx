import { metadataEvento, renderEvento } from '@/lib/rutaEvento';

// Las fotos salen del catálogo de Supabase: se arma en cada visita, igual que la home
export const dynamic = 'force-dynamic';

const SLUG = 'alquiler-para-casamientos-santa-fe';

export const metadata = metadataEvento(SLUG);

export default function Page() {
  return renderEvento(SLUG);
}
