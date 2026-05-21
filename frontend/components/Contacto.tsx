// 'use client';

import React from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Phone, Mail, MapPin } from 'lucide-react';

export const Contacto: React.FC = () => {
  return (
    <section id="contacto" className="bg-blanco-puro py-20 border-b border-gris-borde">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="font-playfair text-4xl md:text-5xl text-negro-carbon text-center mb-12">
          Contactános
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Información */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <Phone className="h-6 w-6 text-negro-carbon" />
              <span className="font-manrope text-lg text-negro-carbon">+54 342 506 8365</span>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="h-6 w-6 text-negro-carbon" />
              <span className="font-manrope text-lg text-negro-carbon">info@ejservicios.com</span>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="h-6 w-6 text-negro-carbon" />
              <span className="font-manrope text-lg text-negro-carbon">
                Santa Fe Capital, Argentina
              </span>
            </div>
          </div>
          {/* Formulario rápido */}
          <form className="space-y-4">
            <Input label="Nombre" {...{ name: 'nombre' }} />
            <Input label="Correo" type="email" {...{ name: 'email' }} />
            <textarea
              name="mensaje"
              placeholder="Mensaje"
              className="w-full border border-gris-borde p-3 focus:outline-none resize-none h-32 font-manrope text-negro-carbon"
            />
            <Button type="submit" variant="primary" size="full">
              Enviar mensaje
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};
