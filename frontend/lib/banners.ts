// Banners de la web editables desde /admin (tabla `banners`). Si Supabase no responde se usan estos valores.
export interface Banner {
  clave: string;
  etiqueta: string;
  titulo: string | null;
  subtitulo: string | null;
  imagen_url: string;
  alt: string;
}

export const BANNERS_POR_DEFECTO: Record<string, Banner> = {
  hero: {
    clave: 'hero',
    etiqueta: 'Banner principal (inicio)',
    titulo: 'Exclusivo para vos',
    subtitulo: 'Llevamos, traemos y lavamos la vajilla. Vos solo disfrutá tu evento.',
    imagen_url: '/hero-banner.png',
    alt: 'EJ Servicios Mobiliarios Banner',
  },
  nosotros: {
    clave: 'nosotros',
    etiqueta: 'Imagen de "Nuestra historia"',
    titulo: null,
    subtitulo: null,
    imagen_url: '/images/emprendimiento-familiar.jpg',
    alt: 'Vajilla EJ Servicios Mobiliarios',
  },
};
