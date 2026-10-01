import { useEffect, useState } from 'react';

/**
 * Bloquea el scroll de la página de fondo mientras hay un panel abierto.
 * En iPhone `overflow: hidden` no alcanza: se fija el body y se restaura la posición al cerrar.
 */
export function useBloqueoScroll(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const y = window.scrollY;
    const body = document.body;
    const previo = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = previo.position;
      body.style.top = previo.top;
      body.style.width = previo.width;
      body.style.overflow = previo.overflow;
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    };
  }, [activo]);
}

/**
 * Tamaño real de la pantalla visible. Cuando aparece el teclado en iPhone, el panel se ajusta a esa
 * zona; así el cursor de escritura no se desplaza ni los campos "saltan" al tocarlos.
 */
export function useVisualViewport(activo: boolean) {
  const [vp, setVp] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!activo || !vv) {
      setVp(null);
      return;
    }
    const actualizar = () => setVp({ top: vv.offsetTop, height: vv.height });
    actualizar();
    vv.addEventListener('resize', actualizar);
    vv.addEventListener('scroll', actualizar);
    return () => {
      vv.removeEventListener('resize', actualizar);
      vv.removeEventListener('scroll', actualizar);
    };
  }, [activo]);

  return vp ? ({ top: vp.top, height: vp.height, bottom: 'auto' } as const) : undefined;
}
