const isDev = process.env.NODE_ENV !== 'production';
const supabaseHost = 'https://zwojxvbckhhzxhdlblfr.supabase.co';

// 'unsafe-eval' solo en desarrollo (Next lo necesita para recargar en caliente); en producción no se permite.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://connect.facebook.net https://vercel.live`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: https://www.facebook.com ${supabaseHost}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseHost} https://connect.facebook.net https://www.facebook.com https://vitals.vercel-insights.com`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

// EJ Casa: base de datos propia, separada de la del negocio. Solo se expone la URL y la clave pública (anon).
const casaUrl = process.env.CASA_SUPABASE_URL || '';
const casaHost = casaUrl ? new URL(casaUrl).origin : '';

// /casa no carga nada de terceros (ni pixel ni la base del negocio): solo su propio origen y su Supabase.
const cspCasa = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${casaHost}`.trim(),
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_CASA_SUPABASE_URL: casaUrl,
    NEXT_PUBLIC_CASA_SUPABASE_ANON_KEY: process.env.CASA_SUPABASE_ANON_KEY || '',
  },
  images: {
    // Fotos del catálogo servidas en AVIF/WebP según el navegador
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zwojxvbckhhzxhdlblfr.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Todo el sitio menos /casa, que tiene sus propios encabezados más estrictos
        source: '/((?!casa(?:/|$)).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
        ],
      },
      {
        source: '/casa/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), publickey-credentials-get=(self), publickey-credentials-create=(self)' },
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Content-Security-Policy', value: cspCasa },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
