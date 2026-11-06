import Image from 'next/image';
import { MessageCircle, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import type { Producto } from '@/lib/productos';
import { paginasProducto, productoCorresponde, type PaginaProducto } from '@/lib/paginasProducto';
import { faqLd, jsonLd, negocioLd, NEGOCIO_ID } from '@/lib/jsonld';
import { linkWhatsappNegocio, SITE_URL } from '@/lib/site';

// Página de producto (servidor): todo el contenido sale en el HTML inicial.
export default function PaginaProductoView({ pagina, productos }: { pagina: PaginaProducto; productos: Producto[] }) {
  const whatsapp = linkWhatsappNegocio(pagina.mensajeWhatsapp);
  const url = `${SITE_URL}/${pagina.slug}`;

  // Fotos reales del catálogo (las que se cargan desde /admin)
  const fotos = productos
    .filter((p) => p.imagen_url?.startsWith('http') && productoCorresponde(pagina.filtroFotos, p))
    .slice(0, 8);

  const otras = paginasProducto.filter((p) => p.slug !== pagina.slug);

  const servicio = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: pagina.h1,
    description: pagina.description,
    url,
    serviceType: pagina.h1.replace(' en Santa Fe', ''),
    provider: { '@id': NEGOCIO_ID },
    areaServed: { '@type': 'City', name: 'Santa Fe' },
  };

  const migas = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: pagina.h1, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(negocioLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(servicio) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(migas) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqLd(pagina.preguntas)) }} />

      <Navbar cotizarHref={whatsapp} solida />

      <main className="pt-28">
        {/* Encabezado */}
        <section className="border-b border-gris-borde pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <nav aria-label="Ruta" className="font-manrope text-xs text-gris-suave mb-6">
              <a href="/" className="hover:text-negro-carbon underline-offset-2 hover:underline">Inicio</a>
              <span className="mx-2">/</span>
              <span className="text-negro-carbon">{pagina.nombreCorto}</span>
            </nav>
            <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon mb-6 leading-tight">
              {pagina.h1}
            </h1>
            <p className="font-manrope text-base leading-relaxed text-gris-suave max-w-3xl mb-8">{pagina.intro}</p>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-negro-carbon text-crema-base border border-negro-carbon px-6 py-4 font-manrope text-sm font-semibold uppercase tracking-cta hover:bg-transparent hover:text-negro-carbon transition-all duration-300"
            >
              <MessageCircle size={18} /> Consultar por WhatsApp
            </a>
          </div>
        </section>

        {/* Fotos reales */}
        {fotos.length > 0 && (
          <section className="py-16 border-b border-gris-borde">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <h2 className="font-playfair text-3xl font-bold text-negro-carbon mb-8">Lo que te llevamos</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {fotos.map((p) => (
                  <figure key={p.id} className="bg-blanco-puro border border-gris-borde">
                    <div className="relative aspect-square">
                      <Image
                        src={p.imagen_url}
                        alt={p.nombre}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                    <figcaption className="font-manrope text-xs font-semibold text-negro-carbon px-3 py-3">
                      {p.nombre}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Detalle */}
        <section className="py-16 border-b border-gris-borde">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { titulo: 'Qué incluye', items: pagina.incluye },
              { titulo: 'Cantidades de referencia', items: pagina.referencia },
              { titulo: 'Entrega y retiro', items: pagina.entrega },
            ].map((bloque) => (
              <div key={bloque.titulo}>
                <h2 className="font-playfair text-2xl font-bold text-negro-carbon mb-5">{bloque.titulo}</h2>
                <ul className="space-y-3">
                  {bloque.items.map((item) => (
                    <li key={item} className="flex gap-3 font-manrope text-sm leading-relaxed text-gris-suave">
                      <Check size={16} className="flex-shrink-0 mt-0.5 text-negro-carbon" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <FAQ preguntas={pagina.preguntas} />

        {/* Cierre */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-playfair text-3xl font-bold text-negro-carbon mb-4">¿Querés saber si hay disponibilidad para tu fecha?</h2>
            <p className="font-manrope text-sm text-gris-suave mb-8">
              Escribinos por WhatsApp con la fecha y la cantidad de invitados y te pasamos la cotización.
            </p>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-negro-carbon text-crema-base border border-negro-carbon px-6 py-4 font-manrope text-sm font-semibold uppercase tracking-cta hover:bg-transparent hover:text-negro-carbon transition-all duration-300"
            >
              <MessageCircle size={18} /> Pedir cotización
            </a>

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 font-manrope text-sm">
              <span className="text-gris-suave">También alquilamos:</span>
              {otras.map((p) => (
                <a key={p.slug} href={`/${p.slug}`} className="font-semibold text-negro-carbon underline underline-offset-4 hover:text-gris-suave">
                  {p.nombreCorto}
                </a>
              ))}
              <a href="/#catalogo" className="font-semibold text-negro-carbon underline underline-offset-4 hover:text-gris-suave">
                Ver todo el catálogo
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
