'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cotizacionSchema, CotizacionInput } from '@/lib/validators/cotizacionValidator';
import { generarUrlWhatsapp } from '@/lib/services/whatsappService';
import Button from './ui/Button';
import { Input } from './ui/Input';
import { Checkbox } from './ui/Checkbox';

interface ModalCotizacionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (urlWhatsapp: string) => void;
}

export const ModalCotizacion: React.FC<ModalCotizacionProps> = ({ isOpen, onClose, onSuccess }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CotizacionInput>({
    resolver: zodResolver(cotizacionSchema),
  });

  const [mobiliario, setMobiliario] = useState<string[]>([]);

  // Prevenir scroll de la página cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleMobiliario = (item: string) => {
    setMobiliario((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const onSubmit = async (data: CotizacionInput) => {
    const payload = {
      ...data,
      mobiliarioSolicitado: mobiliario,
    };
    try {
      const res = await fetch('/api/cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success && result.urlWhatsapp) {
        if (onSuccess) onSuccess(result.urlWhatsapp);
        else window.location.href = result.urlWhatsapp;
        reset();
        setMobiliario([]);
        onClose();
      } else {
        alert('Error al enviar la cotización. Por favor, intente nuevamente.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red. Verifique su conexión.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden" onClick={onClose}>
      <div className="bg-blanco-puro rounded-none w-full max-w-lg mx-4 p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-negro-carbon hover:text-gris-suave"
          aria-label="Cerrar"
        >
          ✕
        </button>
        <h2 className="font-playfair text-2xl font-bold text-negro-carbon mb-2">
          Contanos sobre tu evento
        </h2>
        <p className="font-manrope text-sm text-gris-suave mb-6">
          Te respondemos por WhatsApp en minutos
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nombre completo *" error={errors.nombre?.message} {...register('nombre')} />
          <Input label="WhatsApp *" error={errors.whatsapp?.message} {...register('whatsapp')} />
          <Input label="Fecha del evento *" type="date" error={errors.fechaEvento?.message} {...register('fechaEvento')} />
          <div className="space-y-2">
            <label className="font-manrope text-xs font-semibold text-negro-carbon">Tipo de evento *</label>
            <select
              className={`w-full border ${errors.tipoEvento ? 'border-red-500' : 'border-gris-borde'} p-3 focus:outline-none`}
              {...register('tipoEvento')}
            >
              <option value="">Seleccioná una opción</option>
              <option value="Casamiento">Casamiento</option>
              <option value="Cumpleaños">Cumpleaños</option>
              <option value="Cumpleaños de 15">Cumpleaños de 15</option>
              <option value="Aniversario">Aniversario</option>
              <option value="Reunión familiar">Reunión familiar</option>
              <option value="Bautismo / Comunión">Bautismo / Comunión</option>
              <option value="Otro">Otro</option>
            </select>
            {errors.tipoEvento && (
              <p className="text-red-500 text-xs mt-1">{errors.tipoEvento.message}</p>
            )}
          </div>
          <Input label="Cantidad de invitados *" type="number" error={errors.cantidadInvitados?.message} {...register('cantidadInvitados', { valueAsNumber: true })} />
          <Input label="Ubicación del evento" error={errors.ubicacion?.message} {...register('ubicacion')} />
          <div className="space-y-2">
            <span className="font-manrope text-xs font-semibold text-negro-carbon">Mobiliario que necesitás *</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Sillas',
                'Tablones / Caballetes',
                'Vajilla completa',
                'Cubiertos',
                'Cristalería',
                'Mantelería',
                'Accesorios',
              ].map((item) => (
                <label key={item} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={mobiliario.includes(item)}
                    onChange={() => toggleMobiliario(item)}
                    className="h-4 w-4 text-negro-carbon border-gray-300 rounded-none"
                  />
                  <span className="font-manrope text-sm text-negro-carbon">{item}</span>
                </label>
              ))}
            </div>
            {mobiliario.length === 0 && (
              <p className="text-red-500 text-xs mt-1">Seleccioná al menos una opción.</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="font-manrope text-xs font-semibold text-negro-carbon">Mensaje adicional</label>
            <textarea
              className="w-full border border-gris-borde p-3 focus:outline-none resize-none"
              rows={3}
              maxLength={500}
              {...register('mensaje')}
            />
            {errors.mensaje && (
              <p className="text-red-500 text-xs mt-1">{errors.mensaje.message}</p>
            )}
          </div>
          <p className="text-xs text-gris-suave mt-2">
            Al enviar, abriremos WhatsApp con tu consulta lista para mandar.
          </p>
          <Button
            type="submit"
            variant="primary"
            size="full"
            disabled={isSubmitting || mobiliario.length === 0}
          >
            Enviar por WhatsApp
          </Button>
        </form>
      </div>
    </div>
  );
};
