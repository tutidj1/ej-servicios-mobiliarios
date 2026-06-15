import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

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
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1152161817444763';

  return (
    <html lang="es" className={`${playfair.variable} ${manrope.variable} scroll-smooth`}>
      <head>
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen bg-crema-base text-negro-carbon font-manrope">
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
