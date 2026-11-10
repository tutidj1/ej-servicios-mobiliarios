// Páginas de producto (auditoría SEO, Tanda 2 / T2).
// Los textos son BORRADORES: Tomás tiene que confirmar medidas, materiales y cantidades de
// referencia antes de publicar. Lo que no está confirmado lleva un TODO(Tomás) y no se muestra.
// Regla: nunca prometer stock (todo "sujeto a disponibilidad").

export interface PreguntaFrecuente {
  question: string;
  answer: string;
}

export interface PaginaProducto {
  slug: string;
  /** ≤ 60 caracteres, ya incluye "| EJ" */
  title: string;
  /** ≤ 155 caracteres */
  description: string;
  h1: string;
  /** Nombre corto para menús y enlaces */
  nombreCorto: string;
  /** Fecha de la última edición del contenido (se usa como lastmod en el sitemap) */
  actualizado: string;
  intro: string;
  incluye: string[];
  referencia: string[];
  entrega: string[];
  preguntas: PreguntaFrecuente[];
  mensajeWhatsapp: string;
  /** Qué productos del catálogo (Supabase) se muestran como fotos reales en la página */
  filtroFotos: { categorias?: string[]; nombreIncluye?: string[] };
}

const ENTREGA_COMUN = [
  'Flete incluido dentro de Santa Fe ciudad: llevamos y retiramos el pedido en el lugar del evento (salón, quinta o casa).',
  'Si preferís, podés retirar y devolver el pedido vos.',
  'Al terminar el evento hacemos el conteo de todo lo alquilado. Si algo se rompe o se pierde, se cobra el valor de reposición del producto.',
];

export const paginasProducto: PaginaProducto[] = [
  {
    slug: 'alquiler-de-sillas-santa-fe',
    title: 'Alquiler de sillas para eventos en Santa Fe | EJ',
    description:
      'Alquilá sillas de plástico reforzado para casamientos, cumpleaños y 15 años en Santa Fe. Entrega y retiro. Pedí tu cotización por WhatsApp.',
    h1: 'Alquiler de sillas para eventos en Santa Fe',
    nombreCorto: 'Sillas',
    actualizado: '2026-11-06',
    intro:
      'Si estás organizando un casamiento, un cumpleaños de 15 o una reunión familiar en Santa Fe, te alquilamos las sillas y te las llevamos al lugar. Vos nos decís cuántos invitados esperás y armamos el pedido con vos.',
    incluye: [
      'Sillas blancas de plástico reforzado, apilables y cómodas.',
      'Las podés combinar en el mismo pedido con tablones, caballetes, vajilla y mantelería.',
      'Contrato de alquiler por escrito con el detalle de lo que se entrega.',
      // Tomás (2026-11-06): color blanco confirmado; las medidas de la silla no se publican.
    ],
    referencia: [
      'Como referencia, se calcula una silla por invitado. Si vas a tener mesa dulce o un sector de estar, sumá algunas más.',
      'Las cantidades están sujetas a disponibilidad para la fecha de tu evento: consultanos con tiempo, sobre todo en temporada de fiestas.',
    ],
    entrega: ENTREGA_COMUN,
    preguntas: [
      {
        question: '¿Cuántas sillas puedo alquilar?',
        answer:
          'Desde unas pocas hasta las que necesite tu evento. La cantidad final depende de la disponibilidad para la fecha, por eso conviene consultar por WhatsApp apenas tengas el día confirmado.',
      },
      {
        question: '¿Puedo pedir sillas y mesas juntas?',
        answer:
          'Sí. En el mismo pedido podés sumar tablones con caballetes, vajilla y mantelería, y te llevamos todo junto.',
      },
      {
        question: '¿Qué pasa si se rompe una silla durante el evento?',
        answer:
          'Al retirar hacemos el conteo de lo alquilado. Si una silla se rompe o falta, se cobra el valor de reposición del producto.',
      },
    ],
    mensajeWhatsapp:
      'Hola! Quiero consultar por el alquiler de sillas para un evento en Santa Fe. Fecha: ... Cantidad de invitados: ...',
    filtroFotos: { nombreIncluye: ['silla'] },
  },
  {
    slug: 'alquiler-de-vajilla-santa-fe',
    title: 'Alquiler de vajilla para eventos en Santa Fe | EJ',
    description:
      'Platos, cubiertos, copas y mantelería para tu evento en Santa Fe. Vajilla lavada y lista, con entrega y retiro. Cotizá por WhatsApp.',
    h1: 'Alquiler de vajilla para eventos en Santa Fe',
    nombreCorto: 'Vajilla',
    actualizado: '2026-11-06',
    intro:
      'Te alquilamos la vajilla completa para que la mesa de tu evento quede prolija sin tener que comprar nada ni lavar nada después. La recibís limpia y lista para usar, y cuando termina la fiesta la retiramos y la lavamos nosotros.',
    incluye: [
      'Vajilla de loza blanca: plato principal, plato de postre, taza de té con platillo, tetera y azucarera.',
      'Cubiertos de acero inoxidable: cuchillo y tenedor de mesa, cuchara de postre, tenedor de postre y cucharita de té.',
      'Copas de vino o agua y copas de champagne para el brindis.',
      'Mantelería blanca o negra y servilletas de tela.',
      'Accesorios de servicio: bandejas, ensaladera, compotera, frasco dispenser, frapera y hielera.',
    ],
    referencia: [
      'Como referencia, se calcula un juego de plato, cubiertos y copa por invitado, más lo que haga falta para la mesa dulce.',
      'Podés alquilar solo algunas piezas: no hay cantidad mínima. Todo queda sujeto a disponibilidad para la fecha.',
    ],
    entrega: [
      'No tenés que lavar nada: retiramos la vajilla y la mantelería usadas y las lavamos en nuestras instalaciones.',
      ...ENTREGA_COMUN,
    ],
    preguntas: [
      {
        question: '¿Tengo que devolver la vajilla lavada?',
        answer:
          'No. Retirás o recibís la vajilla limpia y la devolvés tal como quedó después del evento; el lavado lo hacemos nosotros.',
      },
      {
        question: '¿Puedo alquilar solo copas o solo cubiertos?',
        answer:
          'Sí. No hay cantidad mínima: podés pedir solo las piezas que te falten para completar tu mesa.',
      },
      {
        question: '¿Qué pasa si se rompe un plato o una copa?',
        answer:
          'Al finalizar el evento contamos todo lo alquilado. Si algo se rompe o se pierde, se cobra el valor de reposición de esa pieza.',
      },
    ],
    mensajeWhatsapp:
      'Hola! Quiero consultar por el alquiler de vajilla para un evento en Santa Fe. Fecha: ... Cantidad de invitados: ...',
    // Misma lista que la pestaña Vajilla del catálogo de la home
    filtroFotos: { categorias: ['vajilla', 'cubiertos', 'cristaleria'], nombreIncluye: ['ensaladera', 'frasco', 'bandeja de mozo'] },
  },
  {
    slug: 'alquiler-de-tablones-santa-fe',
    title: 'Alquiler de tablones y caballetes en Santa Fe | EJ',
    description:
      'Tablones de madera de 220 x 60 cm con caballetes de hierro para tus mesas de evento en Santa Fe. Consultá disponibilidad por WhatsApp.',
    h1: 'Alquiler de tablones y caballetes en Santa Fe',
    nombreCorto: 'Tablones',
    actualizado: '2026-11-06',
    intro:
      'Para armar mesas largas de banquete, alquilamos tablones de madera con caballetes de hierro. Son firmes, se arman rápido y se visten con nuestra mantelería para que la mesa quede lista para servir.',
    incluye: [
      // TODO(Tomás): confirmar medida (220 x 60 cm) y material antes de publicar.
      'Tablones de madera de 220 x 60 cm.',
      'Caballetes de hierro para apoyar cada tablón de forma segura.',
      'Mantelería blanca o negra para vestir las mesas, si la sumás al pedido.',
    ],
    referencia: [
      // TODO(Tomás): confirmar la referencia de 10 personas por tablón.
      'Como referencia, en cada tablón se sientan alrededor de 10 personas. Con la cantidad de invitados te calculamos cuántos tablones necesitás.',
      'Las cantidades están sujetas a disponibilidad para la fecha de tu evento.',
    ],
    entrega: ENTREGA_COMUN,
    preguntas: [
      {
        question: '¿Cuántos tablones necesito para mi evento?',
        answer:
          'Depende de la cantidad de invitados y de cómo quieras armar las mesas. Pasanos el número de personas por WhatsApp y te sugerimos la cantidad.',
      },
      {
        question: '¿Los caballetes se piden aparte?',
        answer:
          'Los caballetes van junto con los tablones. Al cotizar te indicamos cuántos lleva tu pedido para que las mesas queden firmes.',
      },
      {
        question: '¿Tienen manteles para los tablones?',
        answer:
          'Sí, tenemos mantelería blanca y negra. La podés sumar al mismo pedido y te la llevamos junto con las mesas.',
      },
    ],
    mensajeWhatsapp:
      'Hola! Quiero consultar por el alquiler de tablones y caballetes para un evento en Santa Fe. Fecha: ... Cantidad de invitados: ...',
    filtroFotos: { nombreIncluye: ['tablon', 'caballete'] },
  },
];

export function getPaginaProducto(slug: string) {
  return paginasProducto.find((p) => p.slug === slug);
}

const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Filtra los productos del catálogo que corresponden a la página (para mostrar sus fotos reales). */
export function productoCorresponde(
  filtro: PaginaProducto['filtroFotos'],
  producto: { nombre: string; categoria: string }
) {
  const nombre = normalizar(producto.nombre);
  const categoria = normalizar(producto.categoria);
  if (filtro.categorias?.some((c) => categoria.includes(c))) return true;
  if (filtro.nombreIncluye?.some((n) => nombre.includes(n))) return true;
  return false;
}
