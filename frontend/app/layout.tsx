import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import './globals.css';
import Script from 'next/script';
import { PALABRAS_CLAVE, SITE_NAME, SITE_URL } from '@/lib/site';

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
  title: {
    default: 'EJ Servicios Mobiliarios — Alquiler de Sillas, Vajilla y Mobiliario para Eventos en Santa Fe',
    template: '%s | EJ Servicios Mobiliarios',
  },
  description:
    'Alquiler de sillas, tablones, caballetes, vajilla, cubiertos, copas y mantelería para casamientos, cumpleaños, 15 años y eventos en Santa Fe Capital. Sin límite de invitados. Llevamos, traemos y lavamos todo. ¡Cotizá por WhatsApp!',
  keywords: PALABRAS_CLAVE,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  category: 'Alquiler de mobiliario para eventos',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'EJ Servicios Mobiliarios — Exclusivo para vos',
    description:
      'Alquiler de sillas, tablones y vajilla para eventos en Santa Fe Capital. Llevamos, traemos y lavamos todo.',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'es_AR',
    type: 'website',
    images: [{ url: '/hero-banner.png', alt: 'EJ Servicios Mobiliarios — alquiler de mobiliario para eventos' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EJ Servicios Mobiliarios — Alquiler para eventos en Santa Fe',
    description: 'Sillas, tablones, vajilla y mantelería para tu evento. Llevamos, traemos y lavamos todo.',
    images: ['/hero-banner.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  other: {
    'geo.region': 'AR-S',
    'geo.placename': 'Santa Fe',
  },
  verification: {
    google: 'CMsLwNqSSmUmIA3ociGTo_0Hwe17FYd7jbxsa1to9w0',
  },
};

export const viewport: Viewport = {
  themeColor: '#F5F1EA',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1152161817444763';

  return (
    <html lang="es-AR" className={`${playfair.variable} ${manrope.variable} scroll-smooth`}>
      <head>
        <link rel="preconnect" href="https://zwojxvbckhhzxhdlblfr.supabase.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="anonymous" />
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
