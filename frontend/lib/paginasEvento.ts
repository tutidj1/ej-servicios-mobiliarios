// Páginas por tipo de evento (auditoría SEO, Tanda 3 / T6).
// Reglas: texto propio en cada una (sin párrafos repetidos), nada de precios ni stock prometido
// ("sujeto a disponibilidad"), localidad siempre Santa Fe ciudad (confirmado por Tomás) y
// nada de testimonios ni reseñas inventadas. Las fotos son las del catálogo real.

import type { PreguntaFrecuente } from '@/lib/paginasProducto';

export interface SeccionEvento {
  titulo: string;
  parrafos: string[];
}

export interface PaginaEvento {
  slug: string;
  /** ≤ 60 caracteres, ya incluye "| EJ" */
  title: string;
  /** ≤ 155 caracteres */
  description: string;
  h1: string;
  nombreCorto: string;
  /** Fecha de la última edición del contenido (lastmod del sitemap) */
  actualizado: string;
  intro: string;
  secciones: SeccionEvento[];
  /** Slugs de las páginas de producto a enlazar */
  productos: string[];
  preguntas: PreguntaFrecuente[];
  mensajeWhatsapp: string;
}

export const paginasEvento: PaginaEvento[] = [
  {
    slug: 'alquiler-para-casamientos-santa-fe',
    title: 'Alquiler para casamientos en Santa Fe | EJ',
    description:
      'Sillas, tablones, vajilla, copas y mantelería para tu casamiento en Santa Fe. Entrega, retiro y lavado. Consultá disponibilidad por WhatsApp.',
    h1: 'Alquiler para casamientos en Santa Fe',
    nombreCorto: 'Casamientos',
    actualizado: '2026-11-06',
    intro:
      'Un casamiento tiene mil cosas para resolver, y el mobiliario no debería ser una de las que te quitan el sueño. En EJ Servicios Mobiliarios alquilamos todo lo que hace falta para sentar y servir a tus invitados en Santa Fe: sillas, tablones con caballetes, vajilla, cubiertos, copas y mantelería. Te lo llevamos al salón o a la quinta, y después lo retiramos nosotros.',
    secciones: [
      {
        titulo: 'Lo que suele hacer falta en un casamiento',
        parrafos: [
          'Los casamientos tienen más momentos de servicio que otras fiestas: la recepción, la cena, el brindis y la mesa dulce. Por eso conviene pensar el pedido por etapas. Para la cena se necesita un plato principal, cubiertos y copa de vino o agua por invitado. Para el brindis, copas de champagne. Para la mesa dulce, platos de postre, cucharas, tazas de té con su platillo y algún accesorio como la azucarera o la tetera.',
          'Si vas a armar mesas largas, los tablones con caballetes se visten con mantelería blanca o negra y servilletas de tela, y la mesa queda pareja de punta a punta. Si preferís otra distribución, contanos cómo la imaginás y armamos el pedido a medida.',
        ],
      },
      {
        titulo: 'Cómo armamos el pedido',
        parrafos: [
          'Escribinos por WhatsApp con la fecha, el lugar y la cantidad de invitados. Con esos tres datos te decimos qué hay disponible y te pasamos la cotización. Podés pedir solo algunas piezas o el servicio completo: no hay cantidad mínima. Las cantidades quedan sujetas a disponibilidad para tu fecha, y en temporada de casamientos conviene consultar con tiempo.',
          'Antes de la entrega firmamos un contrato de alquiler que detalla cada artículo, para que los dos sepamos exactamente qué se lleva y qué se devuelve.',
        ],
      },
      {
        titulo: 'Entrega, retiro y lavado',
        parrafos: [
          'Podés retirar el pedido por tu cuenta o pedir que lo llevemos al lugar del casamiento. El costo del flete depende de la distancia y te lo informamos junto con la cotización. Cuando termina la fiesta, retiramos la vajilla y la mantelería usadas y las lavamos en nuestras instalaciones: ni vos ni tu familia tienen que lavar nada al día siguiente.',
          'Al finalizar hacemos el conteo de todo lo alquilado. Si algo se rompe o se pierde, se cobra el valor de reposición de la pieza.',
        ],
      },
    ],
    productos: ['alquiler-de-sillas-santa-fe', 'alquiler-de-vajilla-santa-fe', 'alquiler-de-tablones-santa-fe'],
    preguntas: [
      {
        question: '¿Con cuánto tiempo conviene reservar para un casamiento?',
        answer:
          'Cuanto antes, mejor: las fechas más pedidas se completan primero. Escribinos apenas tengas el día confirmado y te decimos qué hay disponible. Si falta poco, consultanos igual y vemos si podemos.',
      },
      {
        question: '¿Puedo alquilar solo la vajilla y las copas para el brindis?',
        answer:
          'Sí. No hay cantidad mínima, así que podés pedir solo las piezas que te falten, por ejemplo copas de champagne y platos de postre.',
      },
      {
        question: '¿Quién lava la vajilla después de la fiesta?',
        answer:
          'Nosotros. Retiramos la vajilla y la mantelería usadas y las lavamos en nuestras instalaciones.',
      },
    ],
    mensajeWhatsapp:
      'Hola! Quiero consultar por el alquiler para un casamiento en Santa Fe. Fecha: ... Lugar: ... Cantidad de invitados: ...',
  },
  {
    slug: 'alquiler-para-cumpleanos-santa-fe',
    title: 'Alquiler para cumpleaños en Santa Fe | EJ',
    description:
      'Alquilá sillas, tablones, vajilla y mantelería para tu cumpleaños en Santa Fe, de pocas piezas a mesas grandes. Cotizá por WhatsApp.',
    h1: 'Alquiler para cumpleaños en Santa Fe',
    nombreCorto: 'Cumpleaños',
    actualizado: '2026-11-06',
    intro:
      'Un cumpleaños en casa, en el patio o en un salón chico se disfruta más cuando no hay que pedir sillas prestadas ni juntar platos de cinco juegos distintos. Alquilamos sillas, tablones, vajilla, cubiertos, vasos, copas y mantelería para cumpleaños en Santa Fe, desde pocas piezas hasta una mesa grande para toda la familia.',
    secciones: [
      {
        titulo: 'Para cumpleaños chicos y grandes',
        parrafos: [
          'No todos los cumpleaños necesitan lo mismo. Si invitás a diez personas, quizás solo te faltan sillas y platos. Si es una reunión grande en el patio, tal vez necesites tablones con caballetes para armar una mesa larga y mantelería para vestirla. Por eso no pedimos una cantidad mínima: armamos el pedido con lo que realmente te hace falta.',
          'Para la mesa dulce o la merienda tenemos platos de postre, cucharas de postre, tazas de té con platillo, cucharitas y accesorios como la azucarera. Para las bebidas, copas de vino o agua y un frasco dispenser de vidrio para el jugo.',
        ],
      },
      {
        titulo: 'Reservar con poca anticipación',
        parrafos: [
          'Los cumpleaños suelen decidirse más sobre la hora que otros eventos. Podés reservar hasta un día antes: si tenemos disponibilidad para tu fecha, hacemos el alquiler. Lo ideal igual es escribirnos apenas sepas el día, porque los fines de semana se ocupan rápido y todo está sujeto a disponibilidad.',
          'Para cotizar necesitamos tres datos: la fecha, la dirección o el barrio donde se hace la fiesta y cuántas personas van a estar. Te respondemos por WhatsApp con las opciones.',
        ],
      },
      {
        titulo: 'Sin lavar platos al terminar',
        parrafos: [
          'Lo mejor de alquilar la vajilla es que después de soplar las velitas no te quedás con una pila de platos. Retiramos todo lo usado y lo lavamos nosotros. Si preferís, también podés pasar a buscar y devolver el pedido por tu cuenta, o pedir que lo llevemos y lo retiremos en tu domicilio; el flete se cotiza según la distancia.',
        ],
      },
    ],
    productos: ['alquiler-de-sillas-santa-fe', 'alquiler-de-vajilla-santa-fe', 'alquiler-de-tablones-santa-fe'],
    preguntas: [
      {
        question: '¿Puedo alquilar solo unas pocas sillas para un cumpleaños en casa?',
        answer:
          'Sí. No hay cantidad mínima: podés pedir desde unas pocas piezas hasta un montaje grande, según lo que necesites.',
      },
      {
        question: '¿Hasta cuándo puedo reservar?',
        answer:
          'Hasta un día antes del evento, siempre que tengamos disponibilidad para esa fecha. Cuanto antes nos escribas, más opciones tenés.',
      },
      {
        question: '¿Llevan el pedido a mi casa?',
        answer:
          'Sí, podés retirar por tu cuenta o pedir entrega y retiro a domicilio. El costo del flete varía según la distancia al lugar del cumpleaños.',
      },
    ],
    mensajeWhatsapp:
      'Hola! Quiero consultar por el alquiler para un cumpleaños en Santa Fe. Fecha: ... Cantidad de invitados: ...',
  },
  {
    slug: 'alquiler-para-15-anos-santa-fe',
    title: 'Alquiler para fiestas de 15 años en Santa Fe | EJ',
    description:
      'Sillas, tablones, vajilla, copas y mantelería para la fiesta de 15 años en Santa Fe. Entrega, retiro y lavado. Consultá por WhatsApp.',
    h1: 'Alquiler para fiestas de 15 años en Santa Fe',
    nombreCorto: '15 años',
    actualizado: '2026-11-06',
    intro:
      'La fiesta de 15 es una de las noches más esperadas de la familia, y suele reunir a mucha gente: amigos, compañeros, abuelos, tíos. Alquilamos sillas, tablones, vajilla, cubiertos, copas y mantelería para fiestas de 15 años en Santa Fe, para que la mesa esté lista y vos te ocupes de lo importante.',
    secciones: [
      {
        titulo: 'Pensar la fiesta por zonas',
        parrafos: [
          'En una fiesta de 15 conviven varios espacios: la mesa de los invitados adultos, el sector de los chicos, la mesa dulce y la barra de bebidas. Cada uno pide cosas distintas. Para la cena formal hacen falta plato principal, cubiertos y copas por persona; para la mesa dulce, platos de postre y cucharas; y para la barra, copas de champagne para el brindis y una hielera o frapera para mantener las bebidas frías.',
          'Si el salón o la quinta no incluye mobiliario, las sillas son lo primero a resolver, porque cada invitado necesita la suya. Como referencia se cuenta una silla por persona, y conviene sumar algunas más por si llegan acompañantes de último momento.',
        ],
      },
      {
        titulo: 'Un pedido a medida de tu lista de invitados',
        parrafos: [
          'Con la lista de invitados en la mano, el cálculo es simple: sillas y juegos de vajilla según la cantidad de personas, y tablones con caballetes según cómo quieras distribuir las mesas. Si no sabés cuántos van a ser, escribinos igual con un número aproximado y lo ajustamos más cerca de la fecha. Todo queda sujeto a disponibilidad para el día de tu fiesta.',
          'Antes de entregar firmamos un contrato con el detalle de lo alquilado, para que no haya sorpresas ni de tu lado ni del nuestro.',
        ],
      },
      {
        titulo: 'Sin preocuparte por el día después',
        parrafos: [
          'Terminada la fiesta, pasamos a retirar la vajilla y la mantelería usadas y las lavamos en nuestras instalaciones. Hacemos el conteo de lo alquilado y, si alguna pieza se rompió o se perdió, se cobra el valor de reposición. El flete de ida y vuelta depende de la distancia al salón y te lo pasamos junto con la cotización.',
        ],
      },
    ],
    productos: ['alquiler-de-sillas-santa-fe', 'alquiler-de-vajilla-santa-fe', 'alquiler-de-tablones-santa-fe'],
    preguntas: [
      {
        question: '¿Alquilan para fiestas de 15 con muchos invitados?',
        answer:
          'Sí, armamos desde pedidos chicos hasta montajes grandes. La cantidad final depende de la disponibilidad para tu fecha, así que conviene consultarnos con tiempo.',
      },
      {
        question: '¿Qué pasa si la cantidad de invitados cambia?',
        answer:
          'Escribinos y ajustamos el pedido. Cuanto más cerca de la fecha, más sujeto a disponibilidad queda, por eso conviene avisar apenas se sepa.',
      },
      {
        question: '¿Puedo alquilar solo las copas para el brindis?',
        answer:
          'Sí. No hay cantidad mínima, podés pedir solo las piezas que te falten, como copas de champagne.',
      },
    ],
    mensajeWhatsapp:
      'Hola! Quiero consultar por el alquiler para una fiesta de 15 años en Santa Fe. Fecha: ... Lugar: ... Cantidad de invitados: ...',
  },
  {
    slug: 'alquiler-para-eventos-de-empresas-santa-fe',
    title: 'Alquiler para eventos de empresas en Santa Fe | EJ',
    description:
      'Sillas, tablones, vajilla y mantelería para eventos de empresas, capacitaciones y cierres de año en Santa Fe. Cotizá por WhatsApp.',
    h1: 'Alquiler para eventos de empresas en Santa Fe',
    nombreCorto: 'Empresas',
    actualizado: '2026-11-06',
    intro:
      'Un evento de empresa, ya sea un cierre de año, una capacitación, un desayuno de trabajo o una inauguración, necesita que todo llegue en hora y esté en condiciones. Alquilamos sillas, tablones, vajilla, cubiertos, copas y mantelería para eventos de empresas en Santa Fe, con entrega y retiro en el lugar.',
    secciones: [
      {
        titulo: 'Mobiliario para reuniones y celebraciones',
        parrafos: [
          'Los eventos corporativos tienen formatos muy distintos. Una capacitación pide filas de sillas y alguna mesa de apoyo; un almuerzo de fin de año pide mesas servidas con vajilla completa; un desayuno o una merienda de trabajo pide tazas, platos de postre y una mesa bien vestida. Contanos el formato y armamos el pedido con las piezas que corresponden.',
          'Con los tablones y caballetes se pueden armar mesas largas de buffet o de trabajo, y la mantelería blanca o negra les da una terminación prolija. Para el servicio tenemos bandejas de mozo, ensaladera, frapera y hielera con pinza.',
        ],
      },
      {
        titulo: 'Coordinación y tiempos',
        parrafos: [
          'En un evento de empresa los horarios importan. Al cotizar te preguntamos la fecha, el lugar, el horario de armado y la cantidad de personas, y coordinamos la entrega y el retiro para que el mobiliario esté antes de que lleguen los asistentes. Todo queda sujeto a disponibilidad para la fecha, y en épocas de cierres de año conviene consultar con anticipación.',
          'Firmamos un contrato de alquiler con el detalle de cada artículo entregado, que sirve como constancia para ambas partes.',
        ],
      },
      {
        titulo: 'Condiciones de facturación y pago',
        parrafos: [
          'Si tu empresa necesita algún tipo de comprobante o una forma de pago específica, consultanos por WhatsApp antes de confirmar el pedido y te respondemos con las condiciones. Al terminar el evento retiramos todo, lavamos la vajilla y la mantelería en nuestras instalaciones y hacemos el conteo final de lo alquilado.',
        ],
      },
    ],
    productos: ['alquiler-de-sillas-santa-fe', 'alquiler-de-tablones-santa-fe', 'alquiler-de-vajilla-santa-fe'],
    preguntas: [
      {
        question: '¿Alquilan para capacitaciones o reuniones, no solo fiestas?',
        answer:
          'Sí. Alquilamos sillas, tablones con caballetes y vajilla para cualquier tipo de evento en Santa Fe, también de empresas.',
      },
      {
        question: '¿Se puede coordinar el horario de entrega y retiro?',
        answer:
          'Sí. Al cotizar nos pasás el horario del evento y coordinamos la entrega y el retiro para que el mobiliario esté listo a tiempo.',
      },
      {
        question: '¿Pueden dar un comprobante para la empresa?',
        answer:
          'Consultanos por WhatsApp antes de confirmar el pedido y te informamos las condiciones.',
      },
    ],
    mensajeWhatsapp:
      'Hola! Quiero consultar por el alquiler para un evento de empresa en Santa Fe. Fecha: ... Lugar: ... Cantidad de personas: ...',
  },
];

export function getPaginaEvento(slug: string) {
  return paginasEvento.find((p) => p.slug === slug);
}
