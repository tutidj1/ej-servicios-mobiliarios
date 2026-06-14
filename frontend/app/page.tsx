'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Diferenciales from '@/components/Diferenciales';
import Servicios from '@/components/Servicios';
import Nosotros from '@/components/Nosotros';
import PromoBanner from '@/components/PromoBanner';
import Catalogo from '@/components/Catalogo';
import Contacto from '@/components/Contacto';
import Footer from '@/components/Footer';
import { ModalCotizacion } from '@/components/ModalCotizacion';

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleOpenCotizar = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleToggleProduct = (productName: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productName)
        ? prev.filter((p) => p !== productName)
        : [...prev, productName]
    );
  };

  return (
    <>
      <Navbar onOpenCotizar={handleOpenCotizar} />
      <Hero onOpenCotizar={handleOpenCotizar} />
      <Diferenciales />
      <Servicios />
      <Nosotros />
      <PromoBanner onOpenCotizar={handleOpenCotizar} />
      <Catalogo
        selectedProducts={selectedProducts}
        onToggleProduct={handleToggleProduct}
        onOpenCotizar={handleOpenCotizar}
      />
      <Contacto />
      <Footer />
      <ModalCotizacion isOpen={isModalOpen} onClose={handleCloseModal} selectedProducts={selectedProducts} />
    </>
  );
}
