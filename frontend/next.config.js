/** @type {import('next').Config} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // Para facilitar el deploy rápido y desarrollo local sin problemas de redimensionado de imágenes locales
  },
};

module.exports = nextConfig;
