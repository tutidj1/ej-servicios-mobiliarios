'use client';

import { useEffect } from 'react';

// Mide como conversión cada clic a WhatsApp (botones de las páginas, menú y pie).
// Usa el Pixel de Meta que ya está instalado; si hay Google Analytics (gtag) también envía el evento.
// No guarda ni envía datos personales: solo el evento y la página de origen.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export default function MedirWhatsapp() {
  useEffect(() => {
    const alHacerClic = (e: MouseEvent) => {
      const enlace = (e.target as Element | null)?.closest?.('a[href*="wa.me/"]');
      if (!enlace) return;
      try {
        window.fbq?.('track', 'Contact', { content_name: 'whatsapp', pagina: window.location.pathname });
        window.gtag?.('event', 'whatsapp_click', { pagina: window.location.pathname });
      } catch {
        // la medición nunca debe romper el clic
      }
    };
    document.addEventListener('click', alHacerClic, { capture: true });
    return () => document.removeEventListener('click', alHacerClic, { capture: true });
  }, []);

  return null;
}
