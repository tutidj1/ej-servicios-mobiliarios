'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, AlertCircle, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { productosEstaticos, Producto } from '@/lib/productos';
import { Button } from './ui/Button';

interface CatalogoProps {
  selectedProducts: string[];
  onToggleProduct: (productName: string) => void;
  onOpenCotizar: () => void;
}

const Catalogo: React.FC<CatalogoProps> = ({
  selectedProducts,
  onToggleProduct,
  onOpenCotizar,
}) => {
  const [productos, setProductos] = useState<Producto[]>(productosEstaticos);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todo');

  const categories = [
    'Todo',
    'Mobiliario',
    'Vajilla',
    'Cubiertos',
    'Cristalería',
    'Mantelería',
    'Accesorios',
  ];

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('activo', true)
          .order('orden', { ascending: true });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          // Adaptar nombres de campos si difieren (snake_case en Postgres vs camelCase en TS)
          const mapped: Producto[] = data.map((item: any) => ({
            id: item.id,
            nombre: item.nombre,
            categoria: item.categoria,
            descripcion: item.descripcion || '',
            imagen_url: item.imagen_url || '',
            stock_disponible: item.stock_disponible || 0,
            activo: item.activo,
            orden: item.orden,
          }));
          setProductos(mapped);
        }
      } catch (err) {
        console.warn('Omitiendo carga desde Supabase (usando datos estáticos locales):', err);
        // Si hay error (ej: sin conexión o sin DB configurada), se mantienen los productos estáticos locales
        setProductos(productosEstaticos);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const filteredProducts = activeCategory === 'Todo'
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
            Disponemos de todo lo necesario para vestir tus mesas. Añadí artículos directamente para incluirlos en tu cotización rápida.
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

        {/* Floating Cart Indicator */}
        {selectedProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed bottom-6 right-6 z-30 bg-negro-carbon text-crema-base shadow-xl border border-gris-borde/10 px-5 py-4 flex items-center gap-4 transition-all duration-300 active:scale-[0.98] select-none"
          >
            <div className="w-8 h-8 bg-acento-amarillo text-negro-carbon flex items-center justify-center font-bold text-sm">
              {selectedProducts.length}
            </div>
            <div className="text-left">
              <span className="font-manrope text-[10px] font-bold text-gris-suave uppercase tracking-wider block leading-none">
                Items seleccionados
              </span>
              <span className="font-playfair font-bold text-xs text-blanco-puro block mt-1">
                Tu cotización está lista
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenCotizar} className="py-2.5 px-4 text-[10px] border-crema-base/40">
              Ver Presupuesto
            </Button>
          </motion.div>
        ) : null}

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((producto, index) => {
              // Mapeamos si la categoría solicitada coincide
              // Para el checkout del modal, maparemos productos seleccionados a las categorías correspondientes:
              // Sillas -> Sillas, Tablones/Caballetes -> Tablones / Caballetes, etc.
              const isSelected = selectedProducts.includes(producto.nombre);
              
              return (
                <motion.div
                  key={producto.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35 }}
                  className="bg-crema-base/30 border border-gris-borde group flex flex-col justify-between"
                >
                  {/* Imagen */}
                  <div className="relative aspect-square w-full bg-crema-base flex items-center justify-center overflow-hidden border-b border-gris-borde">
                    {/* Placeholder elegante / Imagen SVG o Fallback */}
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{
                        backgroundImage: `url('${producto.imagen_url}')`,
                        backgroundColor: '#DFD8CC', // Fallback
                      }}
                    />
                    
                    {/* Badge Categoría */}
                    <div className="absolute top-3 left-3 bg-blanco-puro/95 backdrop-blur-sm border border-gris-borde px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-negro-carbon">
                      {producto.categoria}
                    </div>

                    {/* Stock disponible info */}
                    {producto.stock_disponible > 0 && (
                      <div className="absolute bottom-3 right-3 bg-negro-carbon/80 backdrop-blur-sm text-[8px] font-bold uppercase tracking-widest text-crema-base px-2 py-0.5">
                        Stock: {producto.stock_disponible}
                      </div>
                    )}

                    {/* Selección overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-negro-carbon/25 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="w-12 h-12 bg-blanco-puro text-negro-carbon flex items-center justify-center shadow-lg border border-negro-carbon">
                          <Check size={24} className="stroke-[2.5]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detalle */}
                  <div className="p-5 text-left flex flex-col justify-between flex-grow">
                    <div>
                      <h3 className="font-playfair text-lg font-bold text-negro-carbon mb-2 line-clamp-1">
                        {producto.nombre}
                      </h3>
                      <p className="font-manrope text-[11px] leading-relaxed text-gris-suave mb-4 line-clamp-2 h-8">
                        {producto.descripcion}
                      </p>
                    </div>
                    
                    {/* Selector */}
                    <button
                      onClick={() => onToggleProduct(producto.nombre)}
                      className={`w-full mt-auto font-manrope text-[10px] font-bold uppercase tracking-wider border-t border-gris-borde pt-3 text-left flex items-center justify-between transition-colors duration-200 ${
                        isSelected 
                          ? 'text-red-600 hover:text-red-700' 
                          : 'text-negro-carbon hover:text-gris-suave'
                      }`}
                    >
                      <span>
                        {isSelected ? '✓ Quitar de cotización' : '+ Sumar a cotización'}
                      </span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Banner Inferior de Consulta */}
        <div className="mt-16 bg-negro-carbon text-crema-base p-10 border border-negro-carbon flex flex-col md:flex-row items-center justify-between gap-8 text-left">
          <div>
            <h3 className="font-playfair text-2xl font-bold mb-2">
              ¿Buscás algo que no encontrás en nuestro catálogo?
            </h3>
            <p className="font-manrope text-xs text-gris-suave max-w-xl">
              Escribinos. Hacemos lo posible por conseguir la vajilla o accesorios adicionales necesarios para que tu evento sea tal como lo soñás.
            </p>
          </div>
          <Button variant="outline" size="md" onClick={onOpenCotizar} className="border-2 font-bold w-full md:w-auto">
            Consultar ahora
          </Button>
        </div>

      </div>
    </section>
  );
}
export default Catalogo;
