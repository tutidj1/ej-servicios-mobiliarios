'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface BarraCotizarProps {
  cantidad: number;
  oculta: boolean;
  onOpenCotizar: () => void;
}

// Botón fijo al pie, pensado para el pulgar: aparece al pasar el inicio y siempre
// deja a un toque pedir la cotización (muestra cuántos artículos se eligieron).
export default function BarraCotizar({ cantidad, oculta, onOpenCotizar }: BarraCotizarProps) {
  const [pasoElInicio, setPasoElInicio] = useState(false);

  useEffect(() => {
    const onScroll = () => setPasoElInicio(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (oculta || (!pasoElInicio && cantidad === 0)) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 md:inset-x-auto md:right-6 md:bottom-6 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-0 bg-gradient-to-t from-black/20 to-transparent md:bg-none pointer-events-none">
      <button
        type="button"
        onClick={onOpenCotizar}
        className="pointer-events-auto w-full md:w-auto min-h-[56px] bg-negro-carbon text-crema-base border border-crema-base/20 shadow-xl px-5 flex items-center justify-center gap-3 font-manrope text-sm font-bold uppercase tracking-cta active:scale-[0.98] transition-transform"
      >
        {cantidad > 0 ? (
          <>
            <span className="min-w-8 h-8 px-2 bg-acento-amarillo text-negro-carbon flex items-center justify-center font-bold text-sm">
              {cantidad}
            </span>
            Ver mi cotización
          </>
        ) : (
          <>
            <MessageCircle size={18} /> Cotizar mi evento
          </>
        )}
      </button>
    </div>
  );
}
