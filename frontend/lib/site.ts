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
  alt: 'Silla blanca, tablón de madera, plato y copas que alquila EJ Servicios Mobiliarios',
};

export const REDES = [
  'https://www.facebook.com/profile.php?id=61573364191460',
  'https://www.instagram.com/ej.serviciomobiliarios/',
];
