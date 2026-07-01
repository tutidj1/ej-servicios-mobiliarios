'use client';

import React from 'react';
import { Phone, MapPin } from 'lucide-react';
import Button from './ui/Button';
import { Input } from './ui/Input';

const Contacto: React.FC = () => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nombre = formData.get('nombre') as string;
    const email = formData.get('email') as string;
    const mensaje = formData.get('mensaje') as string;

    if (!nombre.trim() || !mensaje.trim()) {
      alert('Por favor, completa los campos requeridos (Nombre y Mensaje).');
      return;
    }

    const texto = `✉️ *NUEVO MENSAJE DE CONTACTO — EJ*\n\n👤 *Nombre:* ${nombre}\n📧 *Correo:* ${email || '_No especificado_'}\n\n💬 *Mensaje:*\n"${mensaje}"\n\n—\n_Enviado desde ejserviciosmobiliarios.com_`;
    
    const NUMERO_MAMA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5493425068365';
    const url = `https://wa.me/${NUMERO_MAMA}?text=${encodeURIComponent(texto)}`;
    window.location.href = url;
  };

  return (
    <section id="contacto" className="bg-blanco-puro py-20 border-b border-gris-borde">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="font-playfair text-4xl md:text-5xl text-negro-carbon text-center mb-12">
          Contactános
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Información */}
          <div className="space-y-6">
            <a
              href="https://wa.me/5493425068365"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 hover:opacity-70 transition-opacity"
            >
              <Phone className="h-6 w-6 text-negro-carbon" />
              <span className="font-manrope text-lg text-negro-carbon">+54 342 506 8365 (WhatsApp)</span>
            </a>
            <div className="flex items-center space-x-3">
              <MapPin className="h-6 w-6 text-negro-carbon" />
              <span className="font-manrope text-lg text-negro-carbon">
                Santa Fe Capital, Argentina
              </span>
            </div>
          </div>
          {/* Formulario rápido */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nombre *" required {...{ name: 'nombre' }} />
            <Input label="Correo" type="email" {...{ name: 'email' }} />
            <textarea
              name="mensaje"
              placeholder="Mensaje *"
              aria-label="Mensaje *"
              required
              className="w-full border border-gris-borde p-3 focus:outline-none resize-none h-32 font-manrope text-negro-carbon"
            />
            <Button type="submit" variant="primary" size="full">
              Enviar a WhatsApp
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};
export default Contacto;

