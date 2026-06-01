'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Truck, Sparkles, Zap, FileText } from 'lucide-react';

export default function Diferenciales() {
  const items = [
    {
      icon: <Truck className="w-8 h-8 text-negro-carbon stroke-[1.25]" />,
      title: 'Llevamos y traemos',
      description:
        'Flete incluido dentro de Santa Fe Capital. Comodidad absoluta, sin cargos sorpresa.',
    },
    {
      icon: <Sparkles className="w-8 h-8 text-negro-carbon stroke-[1.25]" />,
      title: 'Nosotros lavamos',
      description:
        'No te preocupes por limpiar la vajilla. Te la entregamos lista y la retiramos sucia.',
    },
    {
      icon: <Zap className="w-8 h-8 text-negro-carbon stroke-[1.25]" />,
      title: 'Sin antelación mínima',
      description:
        '¿Surgió un imprevisto? Si tenemos disponibilidad de stock, te lo alquilamos en el día.',
    },
    {
      icon: <FileText className="w-8 h-8 text-negro-carbon stroke-[1.25]" />,
      title: 'Contrato formal',
      description:
        'Tranquilidad total y respaldo formal en cada alquiler para garantizar tu evento.',
    },
  ];

  return (
    <section className="bg-crema-base py-16 border-b border-gris-borde">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-blanco-puro border border-gris-borde p-8 text-left hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div className="mb-6 flex items-center justify-center w-14 h-14 bg-crema-base border border-gris-borde rounded-none">
                {item.icon}
              </div>
              <div>
                <h3 className="font-playfair text-xl font-bold text-negro-carbon mb-3">
                  {item.title}
                </h3>
                <p className="font-manrope text-xs leading-relaxed text-gris-suave">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
