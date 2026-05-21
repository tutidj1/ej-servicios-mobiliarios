'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';

interface HeroProps {
  onOpenCotizar: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenCotizar }) => {
  const handleScrollToCatalogo = () => {
    const target = document.querySelector('#catalogo');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="inicio"
      className="relative h-screen min-h-[600px] w-full flex items-center justify-center overflow-hidden bg-negro-carbon text-crema-base"
    >
      {/* Background Image with Fallback gradient */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 select-none pointer-events-none"
        style={{
          backgroundImage: "url('/hero-banner.jpg')",
          // Fallback en caso de que no exista la imagen aún
          backgroundColor: '#1E2C22', 
        }}
      >
        {/* Overlay elegante de contraste */}
        <div className="absolute inset-0 bg-black/45 backdrop-brightness-[0.8]" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
        {/* Pre-título animado */}
        <motion.span
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-manrope text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-acento-amarillo mb-6 block"
        >
          Alquiler de Mobiliario para Eventos · Santa Fe
        </motion.span>

        {/* Título Principal */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="font-playfair text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight text-blanco-puro mb-6 leading-[1.1]"
        >
          Exclusivo para vos
        </motion.h1>

        {/* Subtítulo descriptivo */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-manrope text-base sm:text-lg md:text-xl text-crema-base/90 max-w-2xl mb-12 leading-relaxed"
        >
          Llevamos, traemos y lavamos la vajilla. Vos solo disfrutá tu evento.
        </motion.p>

        {/* Botones de acción */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center"
        >
          <Button
            variant="yellow"
            size="lg"
            onClick={onOpenCotizar}
            className="w-full sm:w-auto font-bold border-2 border-acento-amarillo"
          >
            Cotizar mi evento
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleScrollToCatalogo}
            className="w-full sm:w-auto font-bold border-2"
          >
            Ver catálogo
          </Button>
        </motion.div>
      </div>

      {/* Floating Indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        className="absolute bottom-8 z-10 cursor-pointer flex flex-col items-center gap-1.5"
        onClick={handleScrollToCatalogo}
      >
        <span className="font-manrope text-[10px] uppercase tracking-[0.3em] font-semibold opacity-70">
          Descubrir más
        </span>
        <ChevronDown size={18} className="opacity-70" />
      </motion.div>
    </section>
  );
};
