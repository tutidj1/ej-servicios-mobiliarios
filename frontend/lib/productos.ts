export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  imagen_url: string;
  stock_disponible: number;
  activo: boolean;
  orden: number;
}

// Catálogo estático de respaldo para EJ Servicios Mobiliarios
// Carga exactamente los 20 productos autorizados por el cliente.
// No incluye categoría "Mesas" sino "Tablones de madera" y "Caballetes" dentro de "Mobiliario".
export const productosEstaticos: Producto[] = [
  // MOBILIARIO
  {
    id: 'mob-1',
    nombre: 'Sillas de plástico reforzado',
    categoria: 'Mobiliario',
    descripcion: 'Sillas apilables elegantes y cómodas, ideales para cualquier tipo de evento social. Capacidad hasta 100 personas.',
    imagen_url: '/productos/sillas.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 1,
  },
  {
    id: 'mob-2',
    nombre: 'Tablones de madera',
    categoria: 'Mobiliario',
    descripcion: 'Tablones de madera firmes y amplios para armar mesas largas de banquetes. Se combinan con caballetes.',
    imagen_url: '/productos/tablones.jpg',
    stock_disponible: 10,
    activo: true,
    orden: 2,
  },
  {
    id: 'mob-3',
    nombre: 'Caballetes de madera',
    categoria: 'Mobiliario',
    descripcion: 'Soportes de madera resistentes para armar los tablones de forma segura y firme.',
    imagen_url: '/productos/caballetes.jpg',
    stock_disponible: 20,
    activo: true,
    orden: 3,
  },

  // VAJILLA
  {
    id: 'vaj-1',
    nombre: 'Plato principal',
    categoria: 'Vajilla',
    descripcion: 'Plato playo principal de loza blanca clásica, elegante y minimalista para banquetes.',
    imagen_url: '/productos/plato-principal.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 4,
  },
  {
    id: 'vaj-2',
    nombre: 'Plato de postre',
    categoria: 'Vajilla',
    descripcion: 'Plato de postre de loza blanca combinada con el juego principal.',
    imagen_url: '/productos/plato-postre.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 5,
  },
  {
    id: 'vaj-3',
    nombre: 'Taza de té',
    categoria: 'Vajilla',
    descripcion: 'Taza de té de porcelana blanca para la mesa dulce o media tarde.',
    imagen_url: '/productos/taza-te.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 6,
  },
  {
    id: 'vaj-4',
    nombre: 'Platillo para taza de té',
    categoria: 'Vajilla',
    descripcion: 'Platillo a juego para apoyar la taza de té de forma segura.',
    imagen_url: '/productos/platillo.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 7,
  },
  {
    id: 'vaj-5',
    nombre: 'Tetera de loza',
    categoria: 'Vajilla',
    descripcion: 'Tetera clásica para servicio de té en mesa dulce.',
    imagen_url: '/productos/tetera.jpg',
    stock_disponible: 10,
    activo: true,
    orden: 8,
  },

  // CUBIERTOS
  {
    id: 'cub-1',
    nombre: 'Cuchillo de mesa',
    categoria: 'Cubiertos',
    descripcion: 'Cuchillo de mesa de acero inoxidable con excelente filo y diseño clásico.',
    imagen_url: '/productos/cuchillo.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 9,
  },
  {
    id: 'cub-2',
    nombre: 'Tenedor de mesa',
    categoria: 'Cubiertos',
    descripcion: 'Tenedor de mesa de acero inoxidable a juego con la cuchillería.',
    imagen_url: '/productos/tenedor.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 10,
  },
  {
    id: 'cub-3',
    nombre: 'Cuchara de postre',
    categoria: 'Cubiertos',
    descripcion: 'Cuchara de postre de acero inoxidable para la mesa dulce.',
    imagen_url: '/productos/cuchara-postre.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 11,
  },
  {
    id: 'cub-4',
    nombre: 'Cucharita de té',
    categoria: 'Cubiertos',
    descripcion: 'Cucharita de té para infusión de acero inoxidable.',
    imagen_url: '/productos/cucharita-te.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 12,
  },

  // CRISTALERÍA
  {
    id: 'cri-1',
    nombre: 'Copa de vino / agua',
    categoria: 'Cristalería',
    descripcion: 'Copa de vidrio transparente y elegante para servir vino, agua o gaseosa.',
    imagen_url: '/productos/copa-vino.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 13,
  },
  {
    id: 'cri-2',
    nombre: 'Copa de champagne',
    categoria: 'Cristalería',
    descripcion: 'Copa de champagne tipo flauta para el brindis final.',
    imagen_url: '/productos/copa-champagne.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 14,
  },

  // MANTELERÍA
  {
    id: 'man-1',
    nombre: 'Mantelería blanca',
    categoria: 'Mantelería',
    descripcion: 'Manteles blancos de tela de alta calidad, listos para vestir tablones de eventos.',
    imagen_url: '/productos/manteleria-blanca.jpg',
    stock_disponible: 15,
    activo: true,
    orden: 15,
  },
  {
    id: 'man-2',
    nombre: 'Mantelería negra',
    categoria: 'Mantelería',
    descripcion: 'Manteles negros de tela elegante que brindan un contraste sofisticado.',
    imagen_url: '/productos/manteleria-negra.jpg',
    stock_disponible: 15,
    activo: true,
    orden: 16,
  },
  {
    id: 'man-3',
    nombre: 'Servilletas de tela',
    categoria: 'Mantelería',
    descripcion: 'Servilletas de tela suave a juego en color blanco o negro.',
    imagen_url: '/productos/servilletas.jpg',
    stock_disponible: 100,
    activo: true,
    orden: 17,
  },

  // ACCESORIOS
  {
    id: 'acc-1',
    nombre: 'Bandeja de mozo',
    categoria: 'Accesorios',
    descripcion: 'Bandeja antideslizante profesional para el servicio de mesas.',
    imagen_url: '/productos/bandeja.jpg',
    stock_disponible: 5,
    activo: true,
    orden: 18,
  },
  {
    id: 'acc-2',
    nombre: 'Frapera de acero inoxidable',
    categoria: 'Accesorios',
    descripcion: 'Frapera elegante para mantener botellas bien frías en la mesa.',
    imagen_url: '/productos/frapera.jpg',
    stock_disponible: 10,
    activo: true,
    orden: 19,
  },
  {
    id: 'acc-3',
    nombre: 'Hielera con pinza',
    categoria: 'Accesorios',
    descripcion: 'Hielera de mesa con pinza metálica para servir hielo.',
    imagen_url: '/productos/hielera.jpg',
    stock_disponible: 10,
    activo: true,
    orden: 20,
  },
];
