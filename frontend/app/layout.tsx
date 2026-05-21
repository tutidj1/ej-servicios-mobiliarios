import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import './globals.css';

// Configuración de la fuente Playfair Display para títulos elegantes
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

// Configuración de la fuente Manrope para el cuerpo del texto moderno
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EJ Servicios Mobiliarios — Alquiler de Mobiliario Exclusivo para Eventos',
  description: 'Alquiler de sillas, tablones, caballetes, vajilla y mantelería en Santa Fe Capital y alrededores. Emprendimiento familiar. Llevamos, traemos y lavamos todo. ¡Reservá hoy!',
  keywords: 'alquiler vajilla santa fe, alquiler de sillas santa fe, tablones de madera santa fe, vajilla para eventos santa fe, ej servicios mobiliarios, flete incluido santa fe, alquiler de caballetes argentina',
  authors: [{ name: 'EJ Servicios Mobiliarios' }],
  metadataBase: new URL('https://ejserviciosmobiliarios.com'),
  openGraph: {
    title: 'EJ Servicios Mobiliarios — Exclusivo para vos',
    description: 'Alquiler de sillas, tablones y vajilla para eventos en Santa Fe Capital. Llevamos, traemos y lavamos todo.',
    url: 'https://ejserviciosmobiliarios.com',
    siteName: 'EJ Servicios Mobiliarios',
    locale: 'es_AR',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#F5F1EA',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${playfair.variable} ${manrope.variable} scroll-smooth`}>
      <body className="antialiased min-h-screen bg-crema-base text-negro-carbon font-manrope">
        {children}
      </body>
    </html>
  );
}
