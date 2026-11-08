import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import '../globals.css';
import { ProveedorCasa } from '@/lib/casa/sesion';
import Guardia from '@/components/casa/Guardia';
import RegistrarSW from '@/components/casa/RegistrarSW';

// Misma tipografía que el resto de EJ; lo que cambia es el color (ver paleta "casa" en tailwind.config.ts)
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-playfair', display: 'swap' });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: 'EJ Casa',
  description: 'Finanzas de la familia',
  manifest: '/casa-pwa/manifest.webmanifest',
  // Privada: que ningún buscador la indexe ni la siga
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  icons: {
    icon: [{ url: '/casa-pwa/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/casa-pwa/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'EJ Casa', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0E1B1A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function CasaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${playfair.variable} ${manrope.variable}`}>
      <body className="min-h-[100dvh] bg-casa-fondo font-manrope text-casa-texto antialiased [-webkit-tap-highlight-color:transparent]">
        <ProveedorCasa>
          <Guardia>{children}</Guardia>
        </ProveedorCasa>
        <RegistrarSW />
      </body>
    </html>
  );
}
