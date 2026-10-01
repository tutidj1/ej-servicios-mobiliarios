'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Banner } from '@/lib/banners';

export const Nosotros: React.FC<{ banner: Banner }> = ({ banner }) => {
  const stats = [
    { value: '+40', label: 'Eventos equipados' },
    { value: '100%', label: 'Flete incluido' },
    { value: '0', label: 'Lavado a tu cargo' },
  ];

  return (
    <section id="nosotros" className="bg-blanco-puro py-24 border-b border-gris-borde overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Texto Izquierda - 60% en desktop */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 text-left flex flex-col justify-center"
          >
            <span className="font-manrope text-xs font-bold uppercase tracking-[0.2em] text-gris-suave mb-4 block">
              Nuestra Historia
            </span>
            <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon leading-tight mb-8">
              Un emprendimiento familiar, pensado para vos
            </h2>
            
            <p className="font-manrope text-sm leading-relaxed text-gris-suave mb-10 max-w-xl">
              <strong>EJ Servicios Mobiliarios</strong> es un proyecto familiar que nace en <strong>2026</strong> en Santa Fe Capital.
              Detrás de cada alquiler hay una atención personal, cercana y honesta. Contamos con mobiliario propio para equipar
              eventos de cualquier tamaño: sillas, tablones, vajilla completa y mantelería. Nuestro compromiso es simple:
              que vos solo te ocupes de disfrutar tu evento.
            </p>

            {/* Stats Block */}
            <div className="grid grid-cols-3 gap-6 border-t border-gris-borde pt-10">
              {stats.map((stat, index) => (
                <div key={index} className="text-left">
                  <div className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon mb-2">
                    {stat.value}
                  </div>
                  <div className="font-manrope text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gris-suave">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Imagen Derecha - 40% en desktop */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-5 h-[480px] w-full relative flex items-center justify-center"
          >
            <Image
              src={banner.imagen_url}
              alt={banner.alt}
              width={600}
              height={800}
              className="rounded-lg shadow-xl object-cover h-full w-full"
            />
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Nosotros;
