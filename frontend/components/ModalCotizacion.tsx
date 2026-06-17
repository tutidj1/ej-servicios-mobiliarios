'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cotizacionSchema, CotizacionInput } from '@/lib/validators/cotizacionValidator';
import Button from './ui/Button';
import { Input } from './ui/Input';

interface ModalCotizacionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (urlWhatsapp: string) => void;
  selectedProducts?: string[];
}

export const ModalCotizacion: React.FC<ModalCotizacionProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedProducts = [],
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CotizacionInput>({
    resolver: zodResolver(cotizacionSchema),
  });

  const [mobiliario, setMobiliario] = useState<string[]>([]);
  const [vajillaItems, setVajillaItems] = useState<string[]>([]);
  const [accesoriosItems, setAccesoriosItems] = useState<string[]>([]);
  // Marca el tiempo de entrada del usuario al abrir el modal
  const tiempoEntrada = Date.now();

  // Prevenir scroll de la página cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Sincronizar selección del catálogo
  useEffect(() => {
    if (isOpen && selectedProducts && selectedProducts.length > 0) {
      const initialMobiliario = new Set<string>();
      const initialVajilla = new Set<string>();
      const initialAccesorios = new Set<string>();

      selectedProducts.forEach((prod) => {
        if (prod.toLowerCase().includes('silla')) {
          initialMobiliario.add('Sillas');
        }
        if (prod.toLowerCase().includes('tablón') || prod.toLowerCase().includes('tablon')) {
          initialMobiliario.add('Tablones');
        }
        if (prod.toLowerCase().includes('caballete')) {
          initialMobiliario.add('Caballetes');
        }
        if (prod.toLowerCase().includes('mantelería') || prod.toLowerCase().includes('manteleria')) {
          initialMobiliario.add('Mantelería');
        }
        
        // Vajilla items mapping
        if (prod === 'Plato principal') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Plato principal');
        }
        if (prod === 'Plato de postre') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Plato de postre');
        }
        if (prod === 'Taza de té') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Taza de té + platillo');
        }
        if (prod === 'Platillo para taza de té') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Taza de té + platillo');
        }
        if (prod === 'Tetera de loza') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Tetera de loza');
        }
        if (prod === 'Cuchillo de mesa') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Tenedor + cuchillo de mesa');
        }
        if (prod === 'Tenedor de mesa') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Tenedor + cuchillo de mesa');
        }
        if (prod === 'Cuchara de postre') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Cuchara de postre');
        }
        if (prod === 'Cucharita de té') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Cucharita de té');
        }
        if (prod === 'Copa de vino / agua') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Copa de vino');
          initialVajilla.add('Copa de agua');
        }
        if (prod === 'Copa de champagne') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Copa de champán');
        }
        if (prod === 'Servilletas de tela') {
          initialMobiliario.add('Vajilla Completa');
          initialVajilla.add('Servilleta de tela');
        }

        // Accesorios mapping — nombres exactos del catálogo (lib/productos.ts)
        if (prod === 'Bandeja de mozo') {
          initialMobiliario.add('Accesorios');
          initialAccesorios.add('Bandeja de mozo');
        }
        if (prod === 'Hielera de plástico') {
          initialMobiliario.add('Accesorios');
          initialAccesorios.add('Hielera de plástico + pinza');
        }
        if (prod === 'Frapera de plastico') {
          initialMobiliario.add('Accesorios');
          initialAccesorios.add('Frapera de plastico');
        }
        if (prod === 'Azucarera') {
          initialMobiliario.add('Accesorios');
          initialAccesorios.add('Azucarera');
        }
        if (prod === 'Bandeja de mesa') {
          initialMobiliario.add('Accesorios');
          initialAccesorios.add('Bandeja de mesa');
        }
      });

      setMobiliario(Array.from(initialMobiliario));
      setVajillaItems(Array.from(initialVajilla));
      setAccesoriosItems(Array.from(initialAccesorios));
    }
  }, [isOpen, selectedProducts]);

  const toggleMobiliario = (item: string) => {
    setMobiliario((prev) => {
      const updated = prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item];
      // Limpiar sub-apartados si se desmarca
      if (item === 'Vajilla Completa' && prev.includes('Vajilla Completa')) {
        setVajillaItems([]);
      }
      if (item === 'Accesorios' && prev.includes('Accesorios')) {
        setAccesoriosItems([]);
      }
      return updated;
    });
  };

  const toggleVajillaItem = (item: string) => {
    setVajillaItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleAccesoriosItem = (item: string) => {
    setAccesoriosItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const onSubmit = async (data: CotizacionInput) => {
    if (mobiliario.length === 0) {
      alert('Por favor, seleccioná al menos un artículo.');
      return;
    }

    // Calcula el tiempo que el usuario pasó en el formulario
    const tiempoPermanenciaSegundos = Math.round((Date.now() - tiempoEntrada) / 1000);
    const payload = {
      ...data,
      mobiliarioSolicitado: mobiliario,
      vajillaItems,
      accesoriosItems,
      // Duración en segundos que el usuario estuvo en el formulario
      tiempo_permanencia_segundos: tiempoPermanenciaSegundos,
    };

    let whatsappUrl = '';
    try {
      const res = await fetch('/api/cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success && result.urlWhatsapp) {
        whatsappUrl = result.urlWhatsapp;
        reset();
        setMobiliario([]);
        setVajillaItems([]);
        setAccesoriosItems([]);
        onClose();
      } else {
        alert('Error al enviar la cotización. Por favor, intente nuevamente.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red. Verifique su conexión.');
    }

    if (whatsappUrl) {
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead');
      }
      if (onSuccess) {
        onSuccess(whatsappUrl);
      } else {
        setTimeout(() => {
          window.location.href = whatsappUrl;
        }, 100);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-hidden" onClick={onClose}>
      <div className="bg-blanco-puro rounded-none w-full max-w-lg max-w-full mx-4 p-6 relative max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl border border-gris-borde" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-negro-carbon hover:text-gris-suave font-bold text-lg"
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
          <Input label="Fecha del evento *" type="date" error={errors.fechaEvento?.message} {...register('fechaEvento')} />
          
          <div className="space-y-2">
            <label className="font-manrope text-xs font-semibold text-negro-carbon">Tipo de evento *</label>
            <select
              className={`w-full border ${errors.tipoEvento ? 'border-red-500' : 'border-gris-borde'} p-3 focus:outline-none bg-blanco-puro font-manrope text-sm text-negro-carbon`}
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
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Dirección" error={errors.direccion?.message} {...register('direccion')} />
            <Input label="Número" error={errors.numero?.message} {...register('numero')} />
          </div>

          <div className="space-y-2">
            <span className="font-manrope text-xs font-semibold text-negro-carbon block border-b border-gris-borde pb-1">Mobiliario que necesitás *</span>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                'Sillas',
                'Tablones',
                'Caballetes',
                'Vajilla Completa',
                'Mantelería',
                'Accesorios',
              ].map((item) => (
                <label key={item} className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={mobiliario.includes(item)}
                    onChange={() => toggleMobiliario(item)}
                    className="h-4 w-4 text-negro-carbon border-gray-300 rounded-none accent-negro-carbon"
                  />
                  <span className="font-manrope text-sm text-negro-carbon">{item}</span>
                </label>
              ))}
            </div>
            {mobiliario.length === 0 && (
              <p className="text-red-500 text-xs mt-1">Seleccioná al menos una opción.</p>
            )}
          </div>

          {/* Sub-apartado Vajilla Completa */}
          {mobiliario.includes('Vajilla Completa') && (
            <div className="ml-4 mt-2 p-4 border-l-2 border-acento-amarillo bg-crema-base/20 space-y-4">
              <p className="font-manrope font-bold text-xs text-negro-carbon">¿Qué vajilla completa necesitás?</p>
              
              <div>
                <p className="font-manrope text-[10px] font-bold text-gris-suave uppercase tracking-wider mb-2">Loza</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Plato principal', 'Plato de postre', 'Taza de té + platillo', 'Tetera de loza'].map((subItem) => (
                    <label key={subItem} className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={vajillaItems.includes(subItem)}
                        onChange={() => toggleVajillaItem(subItem)}
                        className="h-3.5 w-3.5 text-negro-carbon border-gray-300 rounded-none accent-negro-carbon"
                      />
                      <span className="font-manrope text-xs text-negro-carbon">{subItem}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-manrope text-[10px] font-bold text-gris-suave uppercase tracking-wider mb-2">Cubiertos</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Tenedor + cuchillo de mesa', 'Cuchara de postre', 'Cucharita de té'].map((subItem) => (
                    <label key={subItem} className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={vajillaItems.includes(subItem)}
                        onChange={() => toggleVajillaItem(subItem)}
                        className="h-3.5 w-3.5 text-negro-carbon border-gray-300 rounded-none accent-negro-carbon"
                      />
                      <span className="font-manrope text-xs text-negro-carbon">{subItem}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-manrope text-[10px] font-bold text-gris-suave uppercase tracking-wider mb-2">Cristalería</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Copa de vino', 'Copa de agua', 'Copa de champán'].map((subItem) => (
                    <label key={subItem} className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={vajillaItems.includes(subItem)}
                        onChange={() => toggleVajillaItem(subItem)}
                        className="h-3.5 w-3.5 text-negro-carbon border-gray-300 rounded-none accent-negro-carbon"
                      />
                      <span className="font-manrope text-xs text-negro-carbon">{subItem}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-manrope text-[10px] font-bold text-gris-suave uppercase tracking-wider mb-2">Otros</p>
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={vajillaItems.includes('Servilleta de tela')}
                    onChange={() => toggleVajillaItem('Servilleta de tela')}
                    className="h-3.5 w-3.5 text-negro-carbon border-gray-300 rounded-none accent-negro-carbon"
                  />
                  <span className="font-manrope text-xs text-negro-carbon">Servilleta de tela</span>
                </label>
              </div>
            </div>
          )}

          {/* Sub-apartado Accesorios */}
          {mobiliario.includes('Accesorios') && (
            <div className="ml-4 mt-2 p-4 border-l-2 border-acento-amarillo bg-crema-base/20 space-y-3">
              <p className="font-manrope font-bold text-xs text-negro-carbon">¿Qué accesorios necesitás?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Azucarera',
                  'Bandeja de mesa',
                  'Frapera de plastico',
                  'Hielera de plástico + pinza',
                  'Bandeja de mozo',
                ].map((subItem) => (
                  <label key={subItem} className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={accesoriosItems.includes(subItem)}
                      onChange={() => toggleAccesoriosItem(subItem)}
                      className="h-3.5 w-3.5 text-negro-carbon border-gray-300 rounded-none accent-negro-carbon"
                    />
                    <span className="font-manrope text-xs text-negro-carbon">{subItem}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="font-manrope text-xs font-semibold text-negro-carbon">Mensaje adicional</label>
            <textarea
              className="w-full border border-gris-borde p-3 focus:outline-none resize-none font-manrope text-sm text-negro-carbon"
              rows={3}
              maxLength={500}
              {...register('mensaje')}
            />
            {errors.mensaje && (
              <p className="text-red-500 text-xs mt-1">{errors.mensaje.message}</p>
            )}
          </div>
          <p className="text-xs text-gris-suave mt-2 font-manrope">
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
