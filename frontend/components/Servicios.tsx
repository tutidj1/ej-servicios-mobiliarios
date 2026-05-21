'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Armchair, MapPin, GlassWater, ShieldCheck } from 'lucide-react';

export const Servicios: React.FC = () => {
  const services = [
    {
      icon: <Armchair className="w-6 h-6 text-negro-carbon stroke-[1.25]" />,
      title: 'Mobiliario completo',
      description: 'Disponemos de sillas reforzadas, tablones de madera, caballetes, vajilla completa, mantelería y cristalería para eventos de hasta 100 invitados.',
    },
    {
      icon: <MapPin className="w-6 h-6 text-negro-carbon stroke-[1.25]" />,
      title: 'Logística integrada',
      description: 'Llevamos y traemos todo el mobiliario alquilado directamente a tu salón, quinta o casa familiar en Santa Fe Capital y zonas de influencia.',
    },
    {
      icon: <GlassWater className="w-6 h-6 text-negro-carbon stroke-[1.25]" />,
      title: 'Sin lavado posterior',
      description: 'Disfrutá al máximo de tu reunión. Al finalizar, nos encargamos de retirar toda la vajilla y mantelería sucia para lavarla en nuestras instalaciones.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-negro-carbon stroke-[1.25]" />,
      title: 'Respaldo y seguridad',
      description: 'Firmamos un contrato formal de alquiler que detalla la entrega, el stock solicitado y las condiciones, garantizando la seriedad de nuestro servicio.',
    },
  ];

  return (
    <section id="servicios" className="bg-crema-base py-24 border-b border-gris-borde">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header de sección */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-manrope text-xs font-bold uppercase tracking-[0.2em] text-gris-suave mb-4 block">
            Nuestros Servicios
          </span>
          <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon mb-6">
            Todo resuelto en un solo lugar
          </h2>
          <p className="font-manrope text-sm leading-relaxed text-gris-suave">
            Nos enfocamos en brindarte comodidad y seguridad. Olvidate del traslado pesado y del lavado de platos.
          </p>
        </div>

        {/* Grid de servicios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-blanco-puro border border-gris-borde p-10 text-left hover:shadow-sm transition-all duration-300 flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-crema-base border border-gris-borde rounded-none">
                {service.icon}
              </div>
              <div>
                <h3 className="font-playfair text-xl font-bold text-negro-carbon mb-3">
                  {service.title}
                </h3>
                <p className="font-manrope text-xs leading-relaxed text-gris-suave">
                  {service.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
