'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Percent, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

interface PromoBannerProps {
  onOpenCotizar: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ onOpenCotizar }) => {
  return (
    <section className="bg-acento-amarillo py-16 text-negro-carbon border-b border-negro-carbon overflow-hidden relative">
      {/* Decorative large percentage icon background */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 opacity-10 pointer-events-none select-none hidden lg:block">
        <Percent size={320} className="stroke-[1.5]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          
          {/* Promo Left Panel */}
          <div className="text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-negro-carbon text-acento-amarillo text-xs font-bold uppercase tracking-widest px-4 py-1.5 mb-6">
              <span>🎉 PROMO MAYO</span>
            </div>
            
            <h2 className="font-playfair text-4xl sm:text-5xl md:text-6xl font-bold text-negro-carbon leading-tight mb-4">
              Si señás en mayo...
            </h2>
            
            <p className="font-manrope text-sm sm:text-base font-semibold leading-relaxed text-negro-carbon/80 max-w-xl">
              ...para eventos a realizarse en los meses de **junio, julio y agosto**, obtenés un descuento exclusivo directo sobre el total presupuestado.
            </p>
          </div>

          {/* Promo Right Panel with Highlight & Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-8 bg-blanco-puro border-2 border-negro-carbon p-8 sm:p-10 w-full lg:w-auto relative">
            {/* Badge */}
            <div className="text-center sm:text-left lg:text-center xl:text-left">
              <span className="font-manrope text-[10px] font-bold uppercase tracking-wider text-gris-suave block mb-1">
                Beneficio Exclusivo
              </span>
              <span className="font-playfair text-5xl sm:text-6xl font-bold text-negro-carbon block leading-none">
                25% OFF
              </span>
              <span className="font-manrope text-xs font-bold text-negro-carbon uppercase tracking-wide block mt-1">
                En el total de tu alquiler
              </span>
            </div>

            <div className="flex flex-col justify-center w-full sm:w-auto">
              <Button
                variant="primary"
                size="md"
                onClick={onOpenCotizar}
                className="font-bold flex items-center justify-center gap-2 group w-full"
              >
                ¡Reservá ya!
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
              <span className="font-manrope text-[10px] text-gris-suave mt-3 block text-center">
                *Válido para señas confirmadas en mayo de 2026.
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
