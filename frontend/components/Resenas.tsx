'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const Resenas: React.FC = () => {
  const reviews = [
    {
      text: 'Alquilamos platos y vasos, impecable, buen precio, súper amable en todo momento.',
      author: 'Cliente EJ',
      event: 'Evento en Santa Fe',
    },
    {
      text: 'Excelente servicio, rápida respuesta y muy buena predisposición. Lo recomiendo a todos mis contactos, gracias.',
      author: 'Cliente EJ',
      event: 'Evento en Santa Fe',
    },
    {
      text: 'Excelente servicio. Muchas gracias.',
      author: 'Cliente EJ',
      event: 'Evento en Santa Fe',
    },
  ];

  return (
    <section className="bg-blanco-puro py-24 border-b border-gris-borde">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-manrope text-xs font-bold uppercase tracking-[0.2em] text-gris-suave mb-4 block">
            Testimonios
          </span>
          <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon mb-6">
            Lo que dicen nuestros clientes
          </h2>
          <p className="font-manrope text-sm leading-relaxed text-gris-suave">
            La confianza de las familias santafesinas es nuestro orgullo más grande. Compartimos la experiencia de quienes nos eligieron.
          </p>
        </div>

        {/* Reviews Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-crema-base/20 border border-gris-borde p-8 flex flex-col justify-between items-start text-left hover:shadow-sm transition-all duration-300 relative"
            >
              <div>
                {/* Quote icon */}
                <Quote size={28} className="text-acento-amarillo mb-4 fill-current" />
                {/* 5 Stars */}
                <div className="flex items-center gap-1 mb-5 text-negro-carbon">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" className="stroke-none" />
                  ))}
                </div>
                {/* Text */}
                <p className="font-playfair italic text-base sm:text-lg leading-relaxed text-negro-carbon mb-8">
                  "{review.text}"
                </p>
              </div>

              {/* Author Footer */}
              <div className="border-t border-gris-borde/70 pt-4 w-full">
                <span className="font-manrope text-sm font-bold text-negro-carbon block">
                  {review.author}
                </span>
                <span className="font-manrope text-[10px] text-gris-suave uppercase tracking-wider block mt-0.5">
                  {review.event}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Resenas;
