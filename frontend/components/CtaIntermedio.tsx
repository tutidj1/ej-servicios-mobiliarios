'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';

interface CtaIntermedioProps {
  onOpenCotizar: () => void;
}

export const CtaIntermedio: React.FC<CtaIntermedioProps> = ({ onOpenCotizar }) => {
  return (
    <section className="bg-negro-carbon py-20 text-crema-base text-center relative overflow-hidden border-b border-gris-borde">
      {/* Visual embellishments */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 flex flex-col items-center">
        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-playfair text-4xl sm:text-5xl font-bold leading-tight text-crema-base mb-4"
        >
          Tu evento empieza con una buena mesa.
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="font-manrope text-sm sm:text-base text-gris-suave max-w-2xl mb-10 leading-relaxed"
        >
          Pedinos cotización sin compromiso. Te respondemos por WhatsApp en minutos con todo el presupuesto detallado.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full sm:w-auto"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={onOpenCotizar}
            className="w-full sm:w-auto border-2 border-crema-base font-bold bg-crema-base text-negro-carbon hover:bg-transparent hover:text-crema-base"
          >
            Cotizar ahora
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
