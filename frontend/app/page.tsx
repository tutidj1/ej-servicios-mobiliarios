import HomeClient from '@/components/HomeClient';
import { getBanners, getProductos, getPromo } from '@/lib/data';
import { calcularMesesPromo } from '@/lib/promo';
import { faqs } from '@/lib/faq';
import { PALABRAS_CLAVE, REDES, SITE_NAME, SITE_URL, TELEFONO_NEGOCIO } from '@/lib/site';

// La página se arma en cada visita con los datos actuales de Supabase: lo que guardás en /admin
// (productos, banners, promo) se ve en la web en el momento.
export const dynamic = 'force-dynamic';

// Los datos estructurados ayudan a Google a entender el negocio y mostrarlo en búsquedas locales
function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\u003c');
}

export default async function HomePage() {
  const [productos, promo, banners] = await Promise.all([getProductos(), getPromo(), getBanners()]);
  const mesesPromo = calcularMesesPromo(promo.meses_vigencia);

  const negocio = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#negocio`,
    name: SITE_NAME,
    description:
      'Alquiler de sillas, tablones, caballetes, vajilla, cubiertos, cristalería y mantelería para eventos en Santa Fe Capital. Llevamos, traemos y lavamos todo.',
    url: SITE_URL,
    telephone: TELEFONO_NEGOCIO,
    image: `${SITE_URL}/hero-banner.png`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Santa Fe',
      addressRegion: 'Santa Fe',
      addressCountry: 'AR',
    },
    areaServed: [
      { '@type': 'City', name: 'Santa Fe' },
      { '@type': 'AdministrativeArea', name: 'Provincia de Santa Fe' },
    ],
    sameAs: REDES,
    keywords: PALABRAS_CLAVE.join(', '),
    knowsAbout: PALABRAS_CLAVE,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Catálogo de alquiler para eventos',
      itemListElement: productos.map((p) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Product', name: p.nombre, category: p.categoria, description: p.descripcion || undefined },
      })),
    },
  };

  const preguntas = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(negocio) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(preguntas) }} />
      <HomeClient productos={productos} promo={promo} mesesPromo={mesesPromo} banners={banners} />
    </>
  );
}
