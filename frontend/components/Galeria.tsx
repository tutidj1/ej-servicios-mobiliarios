'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn } from 'lucide-react';

const Galeria: React.FC = () => {
  const [selectedImg, setSelectedImg] = useState<{ src: string; caption: string; tag: string } | null>(null);

  const images = [
    {
      src: '/galeria/mesa-mantel-blanco.jpg',
      caption: 'Mesa larga con vajilla completa y mantelería fina blanca.',
      tag: 'Vajilla clásica y mantelería',
      fallbackColor: '#D3CBBF',
    },
    {
      src: '/galeria/mesa-mantel-negro.jpg',
      caption: 'Plato principal con servilleta montado sobre mantel negro con tarjeta EJ.',
      tag: 'Contraste y elegancia',
      fallbackColor: '#2B2B2B',
    },
    {
      src: '/galeria/setup-cubiertos.jpg',
      caption: 'Setup de cubiertos de acero inoxidable con vela decorativa.',
      tag: 'Detalle de cubertería',
      fallbackColor: '#CDC5B9',
    },
    {
      src: '/galeria/tetera-vajilla.jpg',
      caption: 'Juego de taza de té, platillo y tetera de loza para mesa dulce.',
      tag: 'Mesa dulce',
      fallbackColor: '#E5DFD5',
    },
  ];

  return (
    <section id="galeria" className="bg-crema-base py-24 border-b border-gris-borde">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-manrope text-xs font-bold uppercase tracking-[0.2em] text-gris-suave mb-4 block">
            Galería de Fotos
          </span>
          <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon mb-6">
            Eventos que armamos
          </h2>
          <p className="font-manrope text-sm leading-relaxed text-gris-suave">
            Instantáneas reales de mesas vestidas con nuestro mobiliario y vajilla. Una muestra del cuidado y pulcritud de nuestro servicio.
          </p>
        </div>
        {/* Grid Masonry-style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {images.map((img, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => setSelectedImg(img)}
              className="group relative cursor-pointer overflow-hidden border border-gris-borde bg-blanco-puro aspect-[3/4]"
            >
              {/* Imagen de fondo */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                style={{
                  backgroundImage: `url('${img.src}')`,
                  backgroundColor: img.fallbackColor,
                }}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-negro-carbon/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6">
                <div className="flex justify-end">
                  <div className="w-10 h-10 bg-blanco-puro text-negro-carbon flex items-center justify-center border border-negro-carbon/10">
                    <ZoomIn size={18} />
                  </div>
                </div>
                <div className="text-left text-crema-base">
                  <span className="font-manrope text-[9px] font-bold uppercase tracking-widest text-acento-amarillo block mb-1">
                    {img.tag}
                  </span>
                  <p className="font-playfair text-sm font-semibold leading-relaxed">
                    {img.caption}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {/* Lightbox Modal Overlay */}
      <AnimatePresence>
        {selectedImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedImg(null)}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedImg(null)}
              className="absolute top-6 right-6 text-white hover:text-acento-amarillo p-2"
              aria-label="Cerrar"
            >
              <X size={28} />
            </button>
            {/* Content Container */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl w-full flex flex-col bg-negro-carbon border border-white/10"
            >
              {/* Image Frame */}
              <div className="w-full relative aspect-[4/3] sm:aspect-[16/10] bg-black flex items-center justify-center">
                <div
                  className="w-full h-full bg-contain bg-no-repeat bg-center"
                  style={{
                    backgroundImage: `url('${selectedImg.src}')`,
                  }}
                />
              </div>
              {/* Details Pane */}
              <div className="p-6 text-left bg-negro-carbon text-crema-base">
                <span className="font-manrope text-xs font-bold uppercase tracking-widest text-acento-amarillo block mb-2">
                  {selectedImg.tag}
                </span>
                <p className="font-playfair text-lg sm:text-xl font-medium leading-relaxed">
                  {selectedImg.caption}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Galeria;
