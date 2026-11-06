export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ejserviciomobiliarios.com').replace(/\/$/, '');
export const SITE_NAME = 'EJ Servicios Mobiliarios';
export const TELEFONO_NEGOCIO = '+54 342 506 8365';
// Formato E.164 para datos estructurados (schema.org)
export const TELEFONO_E164 = '+5493425068365';
export const WHATSAPP_NUMERO = '5493425068365';

/** Link de WhatsApp con un mensaje precargado (abre el chat con el texto listo para enviar). */
export function linkWhatsappNegocio(mensaje?: string): string {
  return mensaje
    ? `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`
    : `https://wa.me/${WHATSAPP_NUMERO}`;
}

// Title y description de la home (auditoría SEO, T4): title ≤ 60 y description ≤ 155 caracteres
export const HOME_TITLE = 'Alquiler de sillas, vajilla y tablones en Santa Fe | EJ'; // 55
export const HOME_DESCRIPTION =
  'Alquiler de sillas, tablones, vajilla y mantelería para casamientos, cumpleaños y 15 años en Santa Fe. Entrega y lavado incluidos. Cotizá por WhatsApp.'; // 151

// Imagen para compartir (WhatsApp, Facebook): archivo propio del dominio, 1200x630.
// URL absoluta fija al dominio para que nunca quede apuntando a un deploy de preview de Vercel.
export const OG_IMAGE = {
  url: 'https://ejserviciomobiliarios.com/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'Mesa de evento armada con vajilla, copas y mantelería',
};

export const REDES = [
  'https://www.facebook.com/profile.php?id=61573364191460',
  'https://www.instagram.com/ej.serviciomobiliarios/',
];

// Palabras clave de búsqueda (van en metadatos y datos estructurados, no se muestran en pantalla)
export const PALABRAS_CLAVE = [
  'alquiler de mobiliario para eventos',
  'alquiler de mobiliario santa fe',
  'alquiler de sillas santa fe',
  'alquiler de sillas y mesas',
  'alquiler de tablones',
  'alquiler de tablones y caballetes',
  'alquiler de caballetes',
  'alquiler de vajilla',
  'alquiler de vajilla santa fe',
  'alquiler de vajilla para eventos',
  'alquiler de vajilla para fiestas',
  'alquiler de cubiertos',
  'alquiler de copas',
  'alquiler de cristalería',
  'alquiler de mantelería',
  'alquiler de manteles',
  'alquiler de bandejas',
  'alquiler para cumpleaños',
  'alquiler para cumpleaños de 15',
  'alquiler para casamientos',
  'alquiler para bautismos',
  'alquiler para comuniones',
  'alquiler para reuniones familiares',
  'alquiler para fiestas',
  'alquiler para eventos sociales',
  'equipamiento para eventos',
  'organización de eventos santa fe',
  'servicio de vajilla con flete',
  'vajilla con entrega a domicilio',
  'alquiler con flete incluido',
  'alquiler de sillas sin límite de invitados',
  'eventos santa fe capital',
  'fiestas santa fe',
  'casamientos santa fe',
  'cumpleaños santa fe',
  'ej servicios mobiliarios',
];
