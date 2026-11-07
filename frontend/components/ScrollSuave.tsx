'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Scroll suave con inercia para la rueda del mouse y las flechas (el dedo en el celular usa el scroll nativo, que ya es fluido).
// No se usa en el panel /admin. Se apaga solo si la persona pidió menos movimiento.
export default function ScrollSuave() {
  const pathname = usePathname();
  const esAdmin = pathname?.startsWith('/admin');

  useEffect(() => {
    if (esAdmin) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // En celulares y tablets (dedo) se deja el scroll nativo: es el más fluido y no choca con el teclado
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let detenido = false;
    let raf = 0;
    let lenis: import('lenis').default | null = null;

    import('lenis').then(({ default: Lenis }) => {
      if (detenido) return;
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
        smoothWheel: true,
        wheelMultiplier: 0.9,
      });
      (window as unknown as { __lenis?: unknown }).__lenis = lenis;
      const bucle = (tiempo: number) => {
        lenis?.raf(tiempo);
        raf = requestAnimationFrame(bucle);
      };
      raf = requestAnimationFrame(bucle);
    });

    return () => {
      detenido = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
      (window as unknown as { __lenis?: unknown }).__lenis = undefined;
    };
  }, [esAdmin]);

  return null;
}
