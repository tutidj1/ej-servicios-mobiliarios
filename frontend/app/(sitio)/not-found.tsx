import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { paginasEvento } from '@/lib/paginasEvento';
import { linkWhatsappNegocio } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Página no encontrada | EJ Servicios Mobiliarios',
  robots: { index: false, follow: true },
};

// Si alguien llega a una dirección que no existe, en vez de un error en inglés ve la marca,
// los caminos más usados y el WhatsApp.
export default function NoEncontrada() {
  const whatsapp = linkWhatsappNegocio('Hola! Quiero consultar por un alquiler para mi evento.');
  return (
    <>
      <Navbar cotizarHref={whatsapp} solida />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-32 text-center sm:pt-40">
        <p className="font-manrope text-sm font-semibold uppercase tracking-widest text-gris-suave">Error 404</p>
        <h1 className="mt-3 font-playfair text-4xl font-bold text-negro-carbon sm:text-5xl">Esta página no existe</h1>
        <p className="mx-auto mt-4 max-w-xl font-manrope text-base text-gris-suave">
          Puede que el link esté mal escrito o que la página se haya movido. Desde acá podés ver todo lo que alquilamos o escribirnos directamente.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-[48px] items-center rounded-full bg-negro-carbon px-6 font-manrope font-semibold text-white transition hover:bg-black">
            Ir al inicio
          </Link>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#25D366] px-6 font-manrope font-semibold text-white transition hover:brightness-95"
          >
            <MessageCircle size={18} /> Escribinos por WhatsApp
          </a>
        </div>
        <nav aria-label="Páginas por tipo de evento" className="mt-12">
          <p className="font-manrope text-sm text-gris-suave">O mirá lo que alquilamos para:</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {paginasEvento.map((p) => (
              <li key={p.slug}>
                <Link href={`/${p.slug}`} className="inline-block rounded-full bg-blanco-puro px-4 py-2 font-manrope text-sm text-negro-carbon ring-1 ring-gris-borde transition hover:ring-negro-carbon">
                  {p.h1}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <Footer />
    </>
  );
}
