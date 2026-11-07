'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import Button from './ui/Button';
import { paginasProducto } from '@/lib/paginasProducto';

interface NavbarProps {
  /** En la home abre el modal de cotización */
  onOpenCotizar?: () => void;
  /** En las páginas internas el botón "Cotizar" abre WhatsApp con este link */
  cotizarHref?: string;
  /** Fondo claro siempre (páginas sin imagen de portada) */
  solida?: boolean;
}

export default function Navbar({ onOpenCotizar, cotizarHref, solida = false }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolledReal, setScrolled] = useState(false);
  const scrolled = solida || scrolledReal;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Los enlaces apuntan a "/#seccion" para que funcionen también desde las páginas de producto
  const navLinks = [
    { name: 'Inicio', href: '/#inicio' },
    { name: 'Servicios', href: '/#servicios' },
    { name: 'Nosotros', href: '/#nosotros' },
    ...paginasProducto.map((p) => ({ name: p.nombreCorto, href: `/${p.slug}` })),
    { name: 'Catálogo', href: '/#catalogo' },
    { name: 'Contacto', href: '/#contacto' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsOpen(false);
    const id = href.split('#')[1];
    const target = id ? document.getElementById(id) : null;
    // Si la sección está en esta página, desplazamiento suave; si no, navegación normal
    if (target) {
      e.preventDefault();
      const lenis = (window as unknown as { __lenis?: { scrollTo: (el: Element, o?: object) => void } }).__lenis;
      if (lenis) lenis.scrollTo(target, { offset: -70 });
      else target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const botonCotizar = (size: 'sm' | 'full') =>
    cotizarHref ? (
      <a
        href={cotizarHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center justify-center font-manrope font-semibold uppercase tracking-cta border bg-negro-carbon text-crema-base border-negro-carbon hover:bg-transparent hover:text-negro-carbon transition-all duration-300 ${size === 'sm' ? 'px-4 py-2 text-xs' : 'w-full py-4 text-sm'}`}
      >
        Cotizar evento
      </a>
    ) : (
      <Button variant="primary" size={size} onClick={() => { setIsOpen(false); onOpenCotizar?.(); }}>
        Cotizar evento
      </Button>
    );

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-crema-base/80 backdrop-blur-md border-b border-gris-borde py-4' : 'bg-transparent py-6'}`} data-scrolled={scrolled ? 'true' : 'false'}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3" aria-label="EJ Servicios Mobiliarios, inicio">
            <div className="w-10 h-10 rounded-none bg-negro-carbon flex items-center justify-between text-crema-base font-playfair font-bold text-lg select-none px-2.5 shrink-0">
              <span>EJ</span>
            </div>
            <div className="hidden sm:flex flex-col text-left gap-0.5">
              <span className={`font-playfair font-bold text-sm tracking-wide uppercase transition-colors duration-300 ${scrolled ? 'text-negro-carbon' : 'md:text-blanco-puro text-negro-carbon'}`}>
                EJ Servicios Mobiliarios
              </span>
              <span className={`font-manrope text-[10px] uppercase tracking-wider transition-colors duration-300 ${scrolled ? 'text-gris-suave' : 'md:text-crema-base/70 text-gris-suave'}`}>
                Exclusivo para vos
              </span>
            </div>
          </a>

          <div className="hidden lg:flex items-center gap-5 xl:gap-7">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className={`font-manrope text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${
                  scrolled
                    ? 'text-negro-carbon hover:text-gris-suave'
                    : 'text-blanco-puro hover:text-crema-base/80'
                }`}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden lg:block">{botonCotizar('sm')}</div>

          <button
            className={`lg:hidden p-1 outline-none transition-colors duration-300 ${scrolled ? 'text-negro-carbon' : 'text-blanco-puro'}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-0 z-30 bg-negro-carbon/60 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      <div
        data-lenis-prevent className={`fixed top-0 right-0 h-full w-[280px] overflow-y-auto bg-crema-base z-50 shadow-2xl p-8 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between border-b border-gris-borde pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-negro-carbon flex items-center justify-center text-crema-base font-playfair font-bold text-sm">
                EJ
              </div>
              <span className="font-playfair font-bold text-xs uppercase text-negro-carbon">
                EJ Mobiliarios
              </span>
            </div>
            <button className="text-negro-carbon" onClick={() => setIsOpen(false)} aria-label="Cerrar menú">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="font-manrope text-sm font-semibold uppercase tracking-wider text-negro-carbon hover:text-gris-suave transition-colors duration-200 text-left"
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-top border-gris-borde pt-6">
          {botonCotizar('full')}
          <a
            href="https://wa.me/5493425068365"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 font-manrope text-xs font-semibold text-negro-carbon uppercase tracking-wider py-3 border border-negro-carbon hover:bg-negro-carbon hover:text-crema-base transition-all duration-300"
          >
            <Phone size={14} /> +54 342 506 8365
          </a>
        </div>
      </div>
    </>
  );
}
