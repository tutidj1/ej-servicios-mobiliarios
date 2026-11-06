import Image from 'next/image';
import { MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import type { Producto } from '@/lib/productos';
import { getPaginaProducto, productoCorresponde } from '@/lib/paginasProducto';
import { paginasEvento, type PaginaEvento } from '@/lib/paginasEvento';
import { faqLd, jsonLd, negocioLd, NEGOCIO_ID } from '@/lib/jsonld';
import { linkWhatsappNegocio, SITE_URL } from '@/lib/site';

// Página por tipo de evento (servidor): todo el contenido sale en el HTML inicial.
export default function PaginaEventoView({ pagina, productos }: { pagina: PaginaEvento; productos: Producto[] }) {
  const whatsapp = linkWhatsappNegocio(pagina.mensajeWhatsapp);
  const url = `${SITE_URL}/${pagina.slug}`;
  const relacionadas = pagina.productos.map((s) => getPaginaProducto(s)).filter((p): p is NonNullable<typeof p> => !!p);
  const otrosEventos = paginasEvento.filter((p) => p.slug !== pagina.slug);

  // Fotos reales del catálogo: una por cada familia de producto enlazada
  const fotos = relacionadas
    .map((p) => productos.find((prod) => prod.imagen_url?.startsWith('http') && productoCorresponde(p.filtroFotos, prod)))
    .filter((p): p is Producto => !!p);

  const servicio = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: pagina.h1,
    description: pagina.description,
    url,
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
        <section className="border-b border-gris-borde pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <nav aria-label="Ruta" className="font-manrope text-xs text-gris-suave mb-6">
              <a href="/" className="hover:text-negro-carbon underline-offset-2 hover:underline">Inicio</a>
              <span className="mx-2">/</span>
              <span className="text-negro-carbon">{pagina.nombreCorto}</span>
            </nav>
            <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon mb-6 leading-tight">{pagina.h1}</h1>
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

        {pagina.secciones.map((s) => (
          <section key={s.titulo} className="py-12 border-b border-gris-borde">
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <h2 className="font-playfair text-3xl font-bold text-negro-carbon mb-5">{s.titulo}</h2>
              <div className="space-y-4">
                {s.parrafos.map((p) => (
                  <p key={p} className="font-manrope text-sm leading-relaxed text-gris-suave">{p}</p>
                ))}
              </div>
            </div>
          </section>
        ))}

        {fotos.length > 0 && (
          <section className="py-12 border-b border-gris-borde">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <h2 className="font-playfair text-3xl font-bold text-negro-carbon mb-8">Lo que más se pide</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {fotos.map((p) => (
                  <figure key={p.id} className="bg-blanco-puro border border-gris-borde">
                    <div className="relative aspect-square">
                      <Image src={p.imagen_url} alt={p.nombre} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                    </div>
                    <figcaption className="font-manrope text-xs font-semibold text-negro-carbon px-3 py-3">{p.nombre}</figcaption>
                  </figure>
                ))}
              </div>
              <nav aria-label="Alquiler por producto" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-manrope text-sm">
                {relacionadas.map((p) => (
                  <a key={p.slug} href={`/${p.slug}`} className="font-semibold text-negro-carbon underline underline-offset-4 hover:text-gris-suave">
                    {p.h1}
                  </a>
                ))}
              </nav>
            </div>
          </section>
        )}

        <FAQ preguntas={pagina.preguntas} />

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
            <div className="mt-12 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 font-manrope text-sm">
              <span className="text-gris-suave">También alquilamos para:</span>
              {otrosEventos.map((p) => (
                <a key={p.slug} href={`/${p.slug}`} className="font-semibold text-negro-carbon underline underline-offset-4 hover:text-gris-suave">
                  {p.nombreCorto}
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
