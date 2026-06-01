'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const Nosotros: React.FC = () => {
  const stats = [
    { value: '100', label: 'Personas de capacidad' },
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
              Detrás de cada alquiler hay una atención personal, cercana y honesta. Contamos con stock propio para eventos
              de hasta 100 personas: sillas, tablones, vajilla completa y mantelería. Nuestro compromiso es simple:
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
            className="lg:col-span-5 h-[480px] w-full relative border border-gris-borde bg-crema-base flex items-center justify-center overflow-hidden"
          >
            {/* Background Imagen real */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: "url('/galeria/mesa-mantel-blanco.jpg')",
                backgroundColor: '#DCD4C4' // Fallback elegante
              }}
            />
            {/* Overlay sutil y placeholder visual */}
            <div className="absolute inset-0 bg-black/5 hover:bg-transparent transition-all duration-300" />
            
            {/* Marco interior elegante estilo Polaroid/Galería */}
            <div className="absolute bottom-6 left-6 right-6 bg-blanco-puro/90 backdrop-blur-sm border border-gris-borde/50 p-4 text-left">
              <span className="font-playfair font-bold text-sm text-negro-carbon block mb-1">
                Servicio a domicilio
              </span>
              <span className="font-manrope text-[10px] text-gris-suave uppercase tracking-wider block">
                Mesa lista · Santa Fe Capital
              </span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Nosotros;
