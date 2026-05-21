import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'negro-carbon': '#1A1A1A',      // Texto principal, headers, footer
        'crema-base': '#F5F1EA',         // Fondo principal
        'blanco-puro': '#FFFFFF',        // Cards, secciones de contraste
        'gris-suave': '#8A8A8A',         // Textos secundarios
        'gris-borde': '#E5E5E5',         // Bordes finos
        'acento-amarillo': '#FCD34D',    // Banner de promo 25% OFF
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        manrope: ['var(--font-manrope)', 'sans-serif'],
      },
      letterSpacing: {
        cta: '0.05em',
      },
    },
  },
  plugins: [],
};

export default config;
