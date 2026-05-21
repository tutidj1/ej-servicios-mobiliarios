'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const ComoTrabajamos: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Cotizás',
      description: 'Llenás el formulario web con los ítems elegidos o nos escribís directo por WhatsApp.',
    },
    {
      num: '02',
      title: 'Confirmamos',
      description: 'Te enviamos la cotización final adaptada y formalizamos con la firma del contrato.',
    },
    {
      num: '03',
      title: 'Entregamos',
      description: 'Trasladamos y descargamos todo el mobiliario en la fecha acordada para que prepares tu mesa.',
    },
    {
      num: '04',
      title: 'Retiramos y lavamos',
      description: 'Pasamos a buscar todo sucio al día siguiente. Vos solo te dedicás a descansar.',
    },
  ];

  return (
    <section className="bg-crema-base py-24 border-b border-gris-borde">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-manrope text-xs font-bold uppercase tracking-[0.2em] text-gris-suave mb-4 block">
            Nuestra Metodología
          </span>
          <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon mb-6">
            Cómo trabajamos
          </h2>
          <p className="font-manrope text-sm leading-relaxed text-gris-suave">
            Un proceso simple, ordenado y transparente pensado para que no tengas que preocuparte por nada.
          </p>
        </div>

        {/* Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          
          {/* Connector Line (Desktop only) */}
          <div className="absolute top-[2.25rem] left-[12%] right-[12%] h-[1px] bg-gris-borde z-0 hidden md:block" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left group"
            >
              {/* Step bubble */}
              <div className="w-12 h-12 bg-blanco-puro border border-gris-borde rounded-none flex items-center justify-center font-playfair font-bold text-sm text-negro-carbon mb-6 transition-all duration-300 group-hover:bg-negro-carbon group-hover:text-crema-base group-hover:border-negro-carbon">
                {step.num}
              </div>
              
              {/* Text */}
              <h3 className="font-playfair text-xl font-bold text-negro-carbon mb-3">
                {step.title}
              </h3>
              <p className="font-manrope text-xs leading-relaxed text-gris-suave max-w-xs md:max-w-none">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
