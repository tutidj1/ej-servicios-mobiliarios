import HomeClient from '@/components/HomeClient';
import { getBanners, getProductos, getPromo } from '@/lib/data';
import { calcularMesesPromo } from '@/lib/promo';
import { faqs } from '@/lib/faq';
import { faqLd, jsonLd, negocioLd } from '@/lib/jsonld';

// La página se arma en cada visita con los datos actuales de Supabase: lo que guardás en /admin
// (productos, banners, promo) se ve en la web en el momento.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [productos, promo, banners] = await Promise.all([getProductos(), getPromo(), getBanners()]);
  const mesesPromo = calcularMesesPromo(promo.meses_vigencia);

  return (
    <>
      {/* Datos estructurados: negocio local + las mismas 7 preguntas que se ven en la sección FAQ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(negocioLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd(faqs)) }} />
      <HomeClient productos={productos} promo={promo} mesesPromo={mesesPromo} banners={banners} />
    </>
  );
}
