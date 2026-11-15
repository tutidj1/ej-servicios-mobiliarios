import HomeClient from '@/components/HomeClient';
import { getBanners, getProductos, getPromo } from '@/lib/data';
import { calcularMesesPromo, promoVencida } from '@/lib/promo';
import { faqs } from '@/lib/faq';
import { faqLd, jsonLd, negocioLd } from '@/lib/jsonld';

// La página se arma en cada visita con los datos actuales de Supabase: lo que guardás en /admin
// (productos, banners, promo) se ve en la web en el momento.
export const revalidate = 300; // se regenera cada 5 min y al instante cuando se guarda algo en /admin

export default async function HomePage() {
  const [productos, promo, banners] = await Promise.all([getProductos(), getPromo(), getBanners()]);
  const mesesPromo = calcularMesesPromo(promo.meses_vigencia);
  // La promo del 30% de noviembre se oculta sola desde el 1/12/2026 (hora de Argentina)
  const promoVigente = { ...promo, activo: promo.activo && !promoVencida() };

  return (
    <>
      {/* Datos estructurados: negocio local + las mismas 7 preguntas que se ven en la sección FAQ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(negocioLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd(faqs)) }} />
      <HomeClient productos={productos} promo={promoVigente} mesesPromo={mesesPromo} banners={banners} />
    </>
  );
}
