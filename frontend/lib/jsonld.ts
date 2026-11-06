import { OG_IMAGE, REDES, SITE_NAME, SITE_URL, TELEFONO_E164 } from '@/lib/site';

// Datos estructurados (schema.org) compartidos por la home y las páginas de producto.
// Reglas de la auditoría SEO: sin address ni openingHours hasta que Tomás los confirme,
// areaServed solo Santa Fe (sumar localidades cuando estén confirmadas) y nada de Review/AggregateRating.

/** Serializa para <script type="application/ld+json"> sin permitir cerrar la etiqueta. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export const NEGOCIO_ID = `${SITE_URL}/#negocio`;

export function negocioLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': NEGOCIO_ID,
    name: SITE_NAME,
    description:
      'Alquiler de sillas, tablones, caballetes, vajilla, cubiertos, copas y mantelería para eventos en Santa Fe. Entrega, retiro y lavado de la vajilla.',
    url: SITE_URL,
    telephone: TELEFONO_E164,
    image: OG_IMAGE.url,
    // TODO(Tomás): sumar localidades (Santo Tomé, Recreo, etc.) solo cuando estén confirmadas.
    areaServed: { '@type': 'City', name: 'Santa Fe' },
    sameAs: REDES,
  };
}

export function faqLd(preguntas: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: preguntas.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}
