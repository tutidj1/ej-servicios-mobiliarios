import React from 'react';
import { Facebook, Instagram } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-negro-carbon text-crema-base py-12 border-t border-gris-borde">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="font-playfair text-xl font-bold">EJ Servicios Mobiliarios</h3>
          <p className="font-manrope text-sm">
            Santa Fe Capital, Argentina<br />
            WhatsApp: +54 342 506 8365
          </p>
        </div>
        {/* Quick Links */}
        <div className="space-y-4">
          <h4 className="font-manrope font-semibold uppercase text-sm">Navegación</h4>
          <ul className="space-y-2 font-manrope text-sm">
            <li><a href="#hero" className="hover:text-acento-amarillo transition-colors">Inicio</a></li>
            <li><a href="#catalogo" className="hover:text-acento-amarillo transition-colors">Catálogo</a></li>
            <li><a href="#servicios" className="hover:text-acento-amarillo transition-colors">Servicios</a></li>
            <li><a href="#contacto" className="hover:text-acento-amarillo transition-colors">Contacto</a></li>
          </ul>
        </div>
        {/* Social Media */}
        <div className="space-y-4 flex flex-col items-start">
          <h4 className="font-manrope font-semibold uppercase text-sm">Síguenos</h4>
          <div className="flex space-x-4">
            <a 
              href="https://www.facebook.com/profile.php?id=61573364191460" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Facebook" 
              className="text-crema-base hover:text-acento-amarillo transition-colors"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a 
              href="https://www.instagram.com/ej.serviciomobiliarios/" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Instagram" 
              className="text-crema-base hover:text-acento-amarillo transition-colors"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-gris-borde pt-4 text-center font-manrope text-xs text-gris-suave">
        © {new Date().getFullYear()} EJ Servicios Mobiliarios. Todos los derechos reservados.
      </div>
    </footer>
  );
};

export default Footer;
