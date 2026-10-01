'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, MessageCircle, X } from 'lucide-react';
import {
  cotizacionSchema,
  CotizacionInput,
  hoyArgentina,
} from '@/lib/validators/cotizacionValidator';
import type { Producto } from '@/lib/productos';
import Button from './ui/Button';
import { Input } from './ui/Input';

interface ModalCotizacionProps {
  isOpen: boolean;
  onClose: () => void;
  productos: Producto[];
  selectedProducts: string[];
  onSelectionChange: (nombres: string[]) => void;
}

const TIPOS_EVENTO = [
  'Casamiento',
  'Cumpleaños',
  'Cumpleaños de 15',
  'Aniversario',
  'Reunión familiar',
  'Bautismo / Comunión',
  'Otro',
];

const PASOS = ['Tu evento', 'Qué necesitás', 'Tus datos'];

const CAMPOS_PASO_1: (keyof CotizacionInput)[] = ['tipoEvento', 'fechaEvento', 'cantidadInvitados'];

interface Exito {
  url: string;
}

export const ModalCotizacion: React.FC<ModalCotizacionProps> = ({
  isOpen,
  onClose,
  productos,
  selectedProducts,
  onSelectionChange,
}) => {
  const {
    register,
    handleSubmit,
    trigger,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CotizacionInput>({
    resolver: zodResolver(cotizacionSchema),
    mode: 'onTouched',
    defaultValues: { tipoEvento: '', mensaje: '' },
  });

  const [paso, setPaso] = useState(0);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [errorItems, setErrorItems] = useState(false);
  const [exito, setExito] = useState<Exito | null>(null);

  const tiempoEntrada = useRef(0);
  const trampaRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cuerpoRef = useRef<HTMLDivElement>(null);

  const tipoEvento = watch('tipoEvento');

  // Categorías en el orden en que aparecen en el catálogo
  const categorias = useMemo(() => {
    const mapa = new Map<string, Producto[]>();
    productos.forEach((p) => {
      const lista = mapa.get(p.categoria) ?? [];
      lista.push(p);
      mapa.set(p.categoria, lista);
    });
    return Array.from(mapa.entries());
  }, [productos]);

  // Al abrir: bloquear scroll de fondo, marcar el inicio y darle foco al diálogo
  useEffect(() => {
    if (!isOpen) return;
    tiempoEntrada.current = Date.now();
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Cada cambio de paso vuelve al inicio del contenido
  useEffect(() => {
    cuerpoRef.current?.scrollTo({ top: 0 });
  }, [paso, exito]);

  useEffect(() => {
    if (selectedProducts.length > 0) setErrorItems(false);
  }, [selectedProducts]);

  const alternarProducto = (nombre: string) => {
    onSelectionChange(
      selectedProducts.includes(nombre)
        ? selectedProducts.filter((n) => n !== nombre)
        : [...selectedProducts, nombre]
    );
  };

  const alternarCategoria = (lista: Producto[]) => {
    const nombres = lista.map((p) => p.nombre);
    const todos = nombres.every((n) => selectedProducts.includes(n));
    onSelectionChange(
      todos
        ? selectedProducts.filter((n) => !nombres.includes(n))
        : Array.from(new Set([...selectedProducts, ...nombres]))
    );
  };

  const siguiente = async () => {
    if (paso === 0) {
      if (await trigger(CAMPOS_PASO_1)) setPaso(1);
      return;
    }
    if (paso === 1) {
      if (selectedProducts.length === 0) {
        setErrorItems(true);
        return;
      }
      setPaso(2);
    }
  };

  const cerrar = () => {
    // Si ya se envió, se limpia todo para una próxima cotización
    if (exito) {
      reset({ tipoEvento: '', mensaje: '' });
      onSelectionChange([]);
      setPaso(0);
      setExito(null);
    }
    setErrorEnvio('');
    onClose();
  };

  const onSubmit = async (data: CotizacionInput) => {
    setErrorEnvio('');
    if (selectedProducts.length === 0) {
      setPaso(1);
      setErrorItems(true);
      return;
    }

    try {
      const res = await fetch('/api/cotizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          items: selectedProducts,
          website: trampaRef.current?.value ?? '',
          tiempoMs: Date.now() - tiempoEntrada.current,
        }),
      });
      const resultado = await res.json().catch(() => null);

      if (!res.ok || !resultado?.success || !resultado?.urlWhatsapp) {
        setErrorEnvio(resultado?.error || 'No pudimos enviar tu consulta. Intentá de nuevo.');
        return;
      }

      const url: string = resultado.urlWhatsapp;
      setExito({ url });

      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead');
      }

      // En celular se abre la app directamente; en computadora, una pestaña nueva
      const esCelular = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setTimeout(() => {
        if (esCelular) {
          window.location.assign(url);
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }, 700);
    } catch (e) {
      console.error(e);
      setErrorEnvio('No hay conexión. Revisá tu internet e intentá de nuevo.');
    }
  };

  if (!isOpen) return null;

  const claseCampo = (conError: boolean) =>
    `w-full min-h-[48px] bg-crema-base text-negro-carbon border ${
      conError ? 'border-red-600' : 'border-gris-borde focus:border-negro-carbon'
    } px-4 py-3 outline-none text-base sm:text-sm`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cotizacion"
        className="bg-blanco-puro w-full h-dvh sm:h-auto sm:max-h-[90vh] sm:max-w-lg flex flex-col sm:border sm:border-gris-borde shadow-2xl outline-none"
      >
        {/* Encabezado */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-gris-borde">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="titulo-cotizacion" className="font-playfair text-2xl font-bold text-negro-carbon">
                {exito ? '¡Consulta lista!' : 'Contanos sobre tu evento'}
              </h2>
              <p className="font-manrope text-sm text-gris-suave mt-1">
                {exito
                  ? 'Ya podés enviarla por WhatsApp'
                  : `Paso ${paso + 1} de ${PASOS.length} · ${PASOS[paso]}`}
              </p>
            </div>
            <button
              type="button"
              onClick={cerrar}
              className="-mr-2 -mt-2 h-11 w-11 shrink-0 flex items-center justify-center text-negro-carbon hover:text-gris-suave"
              aria-label="Cerrar"
            >
              <X size={22} />
            </button>
          </div>
          {!exito && (
            <div className="flex gap-1.5 mt-4" aria-hidden="true">
              {PASOS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 transition-colors duration-300 ${i <= paso ? 'bg-negro-carbon' : 'bg-gris-borde'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contenido */}
        <div ref={cuerpoRef} className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {exito ? (
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-negro-carbon text-acento-amarillo flex items-center justify-center mb-6">
                <Check size={32} />
              </div>
              <p className="font-manrope text-sm text-gris-suave mb-8 max-w-xs mx-auto leading-relaxed">
                Se abre WhatsApp con tu consulta ya escrita. Solo tenés que tocar <strong>Enviar</strong>.
                Si no se abrió, usá el botón.
              </p>
              <a
                href={exito.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full min-h-[52px] bg-negro-carbon text-crema-base border border-negro-carbon font-manrope text-sm font-semibold uppercase tracking-cta"
              >
                <MessageCircle size={18} /> Abrir WhatsApp
              </a>
            </div>
          ) : (
            <form
              id="form-cotizacion"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              onKeyDown={(e) => {
                // "Ir" del teclado del celular: avanza de paso en lugar de enviar a medias
                if (e.key === 'Enter' && paso < PASOS.length - 1 && (e.target as HTMLElement).tagName === 'INPUT') {
                  e.preventDefault();
                  siguiente();
                }
              }}
            >
              {/* Campo trampa anti-bots: invisible para personas */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  No completar
                  <input ref={trampaRef} type="text" name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              {/* PASO 1 — Evento */}
              <div className={paso === 0 ? 'block' : 'hidden'}>
                <fieldset className="mb-5">
                  <legend className="block text-xs font-semibold uppercase tracking-wider text-negro-carbon mb-2">
                    Tipo de evento *
                  </legend>
                  <input type="hidden" {...register('tipoEvento')} />
                  <div className="grid grid-cols-2 gap-2">
                    {TIPOS_EVENTO.map((tipo) => {
                      const activo = tipoEvento === tipo;
                      return (
                        <button
                          key={tipo}
                          type="button"
                          aria-pressed={activo}
                          onClick={() => setValue('tipoEvento', tipo, { shouldValidate: true, shouldDirty: true })}
                          className={`min-h-[48px] px-3 py-2 border font-manrope text-sm text-left transition-colors ${
                            activo
                              ? 'bg-negro-carbon text-crema-base border-negro-carbon font-semibold'
                              : 'bg-blanco-puro text-negro-carbon border-gris-borde active:border-negro-carbon'
                          }`}
                        >
                          {tipo}
                        </button>
                      );
                    })}
                  </div>
                  {errors.tipoEvento && (
                    <p role="alert" className="mt-2 text-xs text-red-600 font-medium">{errors.tipoEvento.message}</p>
                  )}
                </fieldset>

                <Input
                  label="Fecha del evento *"
                  type="date"
                  min={hoyArgentina()}
                  error={errors.fechaEvento?.message}
                  {...register('fechaEvento')}
                />

                <Input
                  label="Cantidad de invitados *"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  placeholder="Ej: 80"
                  error={errors.cantidadInvitados?.message}
                  {...register('cantidadInvitados', {
                    valueAsNumber: true,
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 7);
                    },
                  })}
                />
              </div>

              {/* PASO 2 — Artículos */}
              <div className={paso === 1 ? 'block' : 'hidden'}>
                <p className="font-manrope text-sm text-gris-suave mb-5 leading-relaxed">
                  Tocá lo que necesitás. Podés elegir una categoría completa con <strong>Elegir todo</strong>.
                </p>
                <div className="space-y-6">
                  {categorias.map(([categoria, lista]) => {
                    const elegidos = lista.filter((p) => selectedProducts.includes(p.nombre)).length;
                    const todos = elegidos === lista.length;
                    return (
                      <section key={categoria} aria-label={categoria}>
                        <div className="flex items-center justify-between mb-2 border-b border-gris-borde pb-1">
                          <h3 className="font-manrope text-xs font-bold uppercase tracking-wider text-negro-carbon">
                            {categoria}
                            {elegidos > 0 && <span className="ml-2 text-gris-suave font-semibold">({elegidos})</span>}
                          </h3>
                          <button
                            type="button"
                            onClick={() => alternarCategoria(lista)}
                            className="min-h-[44px] pl-3 font-manrope text-xs font-semibold underline underline-offset-2 text-negro-carbon"
                          >
                            {todos ? 'Quitar todo' : 'Elegir todo'}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
                          {lista.map((p) => {
                            const activo = selectedProducts.includes(p.nombre);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                aria-pressed={activo}
                                onClick={() => alternarProducto(p.nombre)}
                                className={`min-h-[48px] px-3 py-2 border flex items-center gap-2 text-left font-manrope text-sm transition-colors ${
                                  activo
                                    ? 'bg-negro-carbon text-crema-base border-negro-carbon font-semibold'
                                    : 'bg-blanco-puro text-negro-carbon border-gris-borde active:border-negro-carbon'
                                }`}
                              >
                                <span
                                  className={`h-5 w-5 shrink-0 flex items-center justify-center border ${
                                    activo ? 'bg-acento-amarillo border-acento-amarillo text-negro-carbon' : 'border-gris-borde'
                                  }`}
                                  aria-hidden="true"
                                >
                                  {activo && <Check size={14} strokeWidth={3} />}
                                </span>
                                <span className="leading-tight">{p.nombre}</span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
                {errorItems && (
                  <p role="alert" className="mt-4 text-sm text-red-600 font-medium">
                    Elegí al menos un artículo para continuar.
                  </p>
                )}
              </div>

              {/* PASO 3 — Datos */}
              <div className={paso === 2 ? 'block' : 'hidden'}>
                <Input
                  label="Nombre y apellido *"
                  autoComplete="name"
                  autoCapitalize="words"
                  error={errors.nombre?.message}
                  {...register('nombre')}
                />
                <Input
                  label="Tu teléfono *"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ej: 342 506 8365"
                  error={errors.numero?.message}
                  {...register('numero')}
                />
                <Input
                  label="Dirección o zona del evento *"
                  autoComplete="street-address"
                  placeholder="Calle, número y barrio"
                  error={errors.direccion?.message}
                  {...register('direccion')}
                />
                <div className="mb-2">
                  <label
                    htmlFor="mensaje-adicional"
                    className="block text-xs font-semibold uppercase tracking-wider text-negro-carbon mb-2"
                  >
                    Algo más que quieras contarnos
                  </label>
                  <textarea
                    id="mensaje-adicional"
                    rows={3}
                    maxLength={500}
                    className={`${claseCampo(Boolean(errors.mensaje))} resize-none`}
                    {...register('mensaje')}
                  />
                  {errors.mensaje && (
                    <p role="alert" className="mt-1 text-xs text-red-600 font-medium">{errors.mensaje.message}</p>
                  )}
                </div>
                <p className="font-manrope text-xs text-gris-suave leading-relaxed">
                  Al enviar, se abre WhatsApp con tu consulta lista para mandar.
                </p>
                {errorEnvio && (
                  <p role="alert" className="mt-4 p-3 border border-red-600 text-sm text-red-700 font-medium">
                    {errorEnvio}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Pie fijo con los botones */}
        {!exito && (
          <div className="shrink-0 border-t border-gris-borde px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-blanco-puro">
            {paso === 1 && (
              <p className="font-manrope text-xs text-gris-suave mb-2 text-center">
                {selectedProducts.length === 0
                  ? 'Todavía no elegiste artículos'
                  : `${selectedProducts.length} ${selectedProducts.length === 1 ? 'artículo elegido' : 'artículos elegidos'}`}
              </p>
            )}
            <div className="flex gap-3">
              {paso > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPaso(paso - 1)}
                  className="min-h-[52px] px-4"
                  aria-label="Volver al paso anterior"
                >
                  <ArrowLeft size={18} />
                </Button>
              )}
              {paso < PASOS.length - 1 ? (
                <Button type="button" variant="primary" onClick={siguiente} className="flex-1 min-h-[52px] gap-2">
                  Siguiente <ArrowRight size={16} />
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="form-cotizacion"
                  variant="primary"
                  loading={isSubmitting}
                  className="flex-1 min-h-[52px] gap-2"
                >
                  <MessageCircle size={18} /> Enviar por WhatsApp
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
