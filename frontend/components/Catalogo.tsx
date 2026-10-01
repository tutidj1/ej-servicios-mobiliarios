'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import type { Producto } from '@/lib/productos';

interface CatalogoProps {
  productos: Producto[];
  selectedProducts: string[];
  onToggleProduct: (productName: string) => void;
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5493425068365';

// Si la imagen no carga (o no existe), se muestra un fondo neutro en lugar de un ícono roto
function ImagenProducto({ src, alt }: { src: string; alt: string }) {
  const [fallo, setFallo] = useState(false);

  if (!src || fallo) {
    return <div className="absolute inset-0 bg-[#DFD8CC]" />;
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
      onError={() => setFallo(true)}
    />
  );
}

const Catalogo: React.FC<CatalogoProps> = ({ productos, selectedProducts, onToggleProduct }) => {
  const [activeCategory, setActiveCategory] = useState('Todo');

  // Las categorías salen de los productos cargados en Supabase (se pueden crear nuevas desde el panel)
  const categories = useMemo(
    () => ['Todo', ...Array.from(new Set(productos.map((p) => p.categoria)))],
    [productos]
  );

  const filteredProducts =
    activeCategory === 'Todo'
      ? productos
      : productos.filter((p) => p.categoria.toLowerCase() === activeCategory.toLowerCase());

  return (
    <section id="catalogo" className="bg-blanco-puro py-24 border-b border-gris-borde">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-manrope text-xs font-bold uppercase tracking-[0.2em] text-gris-suave mb-4 block">
            Colección Completa
          </span>
          <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-negro-carbon mb-6">
            Nuestro catálogo
          </h2>
          <p className="font-manrope text-sm leading-relaxed text-gris-suave">
            Disponemos de todo lo necesario para vestir tus mesas. Tocá una tarjeta para seleccionarla e incluirla en tu cotización.
          </p>
        </div>

        {/* Categories Tabs Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 border ${
                activeCategory === category
                  ? 'bg-negro-carbon text-crema-base border-negro-carbon'
                  : 'bg-transparent text-negro-carbon border-gris-borde hover:border-negro-carbon'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((producto) => {
              const isSelected = selectedProducts.includes(producto.nombre);
              
              return (
                <motion.div
                  key={producto.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35 }}
                  className={`bg-crema-base/30 border group flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-negro-carbon shadow-md'
                      : 'border-gris-borde hover:border-negro-carbon/40'
                  }`}
                  onClick={() => onToggleProduct(producto.nombre)}
                  role="button"
                  aria-pressed={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggleProduct(producto.nombre); }}
                >
                  {/* Imagen — clickable area principal */}
                  <div className="relative aspect-square w-full bg-crema-base flex items-center justify-center overflow-hidden border-b border-gris-borde">
                    <ImagenProducto src={producto.imagen_url} alt={producto.nombre} />

                    {/* Badge Categoría */}
                    <div className="absolute top-3 left-3 bg-blanco-puro/95 backdrop-blur-sm border border-gris-borde px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-negro-carbon z-10">
                      {producto.categoria}
                    </div>

                    {/* Selección overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-negro-carbon/25 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <div className="w-12 h-12 bg-blanco-puro text-negro-carbon flex items-center justify-center shadow-lg border border-negro-carbon">
                          <Check size={24} className="stroke-[2.5]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detalle */}
                  <div className="p-4 text-left flex flex-col justify-between flex-grow">
                    <div>
                      {/* Nombre: wrap normal en mobile, sin truncado */}
                      <h3 className="font-playfair text-base sm:text-lg font-bold text-negro-carbon mb-1 whitespace-normal break-words">
                        {producto.nombre}
                      </h3>
                      <p className="font-manrope text-[11px] leading-relaxed text-gris-suave line-clamp-2">
                        {producto.descripcion}
                      </p>
                    </div>
                    
                    {/* Indicador visual de estado */}
                    <div
                      className={`mt-3 font-manrope text-[10px] font-bold uppercase tracking-wider border-t border-gris-borde pt-3 transition-colors duration-200 ${
                        isSelected 
                          ? 'text-negro-carbon' 
                          : 'text-gris-suave'
                      }`}
                    >
                      {isSelected ? '✓ Seleccionado' : 'Tocar para seleccionar'}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Banner Inferior de Consulta — redirige a WhatsApp */}
        <div className="mt-16 bg-negro-carbon text-crema-base p-10 border border-negro-carbon flex flex-col md:flex-row items-center justify-between gap-8 text-left">
          <div>
            <h3 className="font-playfair text-2xl font-bold mb-2">
              ¿Buscás algo que no encontrás en nuestro catálogo?
            </h3>
            <p className="font-manrope text-xs text-gris-suave max-w-xl">
              Escribinos. Hacemos lo posible por conseguir la vajilla o accesorios adicionales necesarios para que tu evento sea tal como lo soñás.
            </p>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Quería consultar sobre artículos que no encontré en el catálogo.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 border-2 border-crema-base text-crema-base font-manrope text-xs font-bold uppercase tracking-wider hover:bg-crema-base hover:text-negro-carbon transition-all duration-300 w-full md:w-auto whitespace-nowrap"
          >
            Consultar por WhatsApp
          </a>
        </div>

      </div>
    </section>
  );
}
export default Catalogo;
