'use client';

import { useCallback, useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Servicios from '@/components/Servicios';
import Nosotros from '@/components/Nosotros';
import PromoBanner from '@/components/PromoBanner';
import Catalogo from '@/components/Catalogo';
import Resenas from '@/components/Resenas';
import FAQ from '@/components/FAQ';
import Contacto from '@/components/Contacto';
import Footer from '@/components/Footer';
import BarraCotizar from '@/components/BarraCotizar';
import { ModalCotizacion } from '@/components/ModalCotizacion';
import type { Producto } from '@/lib/productos';
import type { PromoConfig, PromoMeses } from '@/lib/promo';
import type { Banner } from '@/lib/banners';

interface HomeClientProps {
  productos: Producto[];
  promo: PromoConfig;
  mesesPromo: PromoMeses;
  banners: Record<string, Banner>;
}

export default function HomeClient({ productos, promo, mesesPromo, banners }: HomeClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleOpenCotizar = () => setIsModalOpen(true);
  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  const handleToggleProduct = (productName: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productName) ? prev.filter((p) => p !== productName) : [...prev, productName]
    );
  };

  return (
    <>
      <Navbar onOpenCotizar={handleOpenCotizar} />
      <main>
        <Hero banner={banners.hero} onOpenCotizar={handleOpenCotizar} />
        <Servicios />
        <Nosotros banner={banners.nosotros} />
        <PromoBanner promo={promo} meses={mesesPromo} onOpenCotizar={handleOpenCotizar} />
        <Catalogo
          productos={productos}
          selectedProducts={selectedProducts}
          onToggleProduct={handleToggleProduct}
        />
        <Resenas />
        <FAQ />
        <Contacto />
      </main>
      <Footer />
      {/* Espacio para que la barra fija no tape el final de la página en celular */}
      <div className="h-20 md:hidden bg-negro-carbon" aria-hidden="true" />
      <BarraCotizar
        cantidad={selectedProducts.length}
        oculta={isModalOpen}
        onOpenCotizar={handleOpenCotizar}
      />
      <ModalCotizacion
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        productos={productos}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
      />
    </>
  );
}
