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
        'gris-suave': '#595959',         // Textos secundarios
        'gris-borde': '#E5E5E5',         // Bordes finos
        'acento-amarillo': '#FCD34D',    // Banner de promo 25% OFF
        // EJ Casa: paleta propia, oscura y con acento verde azulado. A propósito NO se parece al admin de EJ.
        casa: {
          fondo: '#0E1B1A',
          panel: '#142625',
          'panel-2': '#1B3231',
          borde: '#244340',
          texto: '#E7F1EF',
          suave: '#8FAAA6',
          acento: '#2DD4BF',
          'acento-fuerte': '#14B8A6',
          alerta: '#F59E0B',
          error: '#F87171',
        },
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
