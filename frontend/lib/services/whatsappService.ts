import { SITE_URL } from '@/lib/site';

// Armado del mensaje de WhatsApp para una cotización.
// Se genera siempre en el servidor a partir de datos ya validados.

export interface ItemCotizacion {
  nombre: string;
  categoria: string;
  // Nombre alternativo para el mensaje (opcional)
  etiqueta?: string | null;
  // Si es true se muestra la cantidad de invitados: "Sillas (80)"
  cantidadSegunInvitados?: boolean;
}

export interface CotizacionData {
  nombre: string;
  telefono: string;
  fechaEvento: string; // YYYY-MM-DD
  tipoEvento: string;
  cantidadInvitados: number;
  ubicacion?: string;
  items: ItemCotizacion[];
  mensaje?: string;
  codigo?: string;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const EMOJI_CATEGORIA: Record<string, string> = {
  mobiliario: '🪑',
  vajilla: '🍽️',
  cubiertos: '🍴',
  cristalería: '🥂',
  cristaleria: '🥂',
  mantelería: '🧺',
  manteleria: '🧺',
  accesorios: '🧊',
};

// Caracteres que WhatsApp interpreta como formato (*negrita*, _cursiva_, ~tachado~, `código`)
function limpiar(texto: string): string {
  return texto.replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();
}

export function formatearFecha(fechaIso: string): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  if (!anio || !mes || !dia) return fechaIso;
  const diaSemana = DIAS[new Date(Date.UTC(anio, mes - 1, dia, 12)).getUTCDay()];
  const dd = String(dia).padStart(2, '0');
  const mm = String(mes).padStart(2, '0');
  return `${diaSemana} ${dd}/${mm}/${anio}`;
}

export function generarMensajeWhatsapp(data: CotizacionData): string {
  // Agrupar por categoría respetando el orden en que llegan los productos
  const grupos = new Map<string, string[]>();
  for (const item of data.items) {
    const lista = grupos.get(item.categoria) ?? [];
    let linea = limpiar(item.etiqueta || item.nombre);
    if (item.cantidadSegunInvitados) linea += ` (${data.cantidadInvitados})`;
    lista.push(`• ${linea}`);
    grupos.set(item.categoria, lista);
  }

  const bloquesItems: string[] = [];
  grupos.forEach((lineas, categoria) => {
    const emoji = EMOJI_CATEGORIA[categoria.toLowerCase()] ?? '📦';
    bloquesItems.push(`${emoji} *${limpiar(categoria)}*`, ...lineas, '');
  });

  const lineas: string[] = [
    '¡Hola EJ! 👋 Quiero cotizar un evento.',
    '',
    '*📋 DATOS DEL EVENTO*',
    `🎉 ${limpiar(data.tipoEvento)}`,
    `📅 ${formatearFecha(data.fechaEvento)}`,
    `👥 ${data.cantidadInvitados} invitados`,
    `📍 ${limpiar(data.ubicacion || '') || 'A definir'}`,
    '',
    '*🛒 QUIERO ALQUILAR*',
    ...(bloquesItems.length > 0 ? bloquesItems : ['A definir', '']),
  ];

  const comentario = limpiar(data.mensaje || '');
  if (comentario) {
    lineas.push('*💬 COMENTARIOS*', comentario, '');
  }

  lineas.push(
    '*👤 MIS DATOS*',
    limpiar(data.nombre),
    `📞 ${limpiar(data.telefono)}`,
    '',
    `Cotización #${data.codigo || '------'} · ${SITE_URL.replace('https://', '').replace('http://', '')}`
  );

  return lineas.join('\n');
}

export function generarUrlWhatsapp(data: CotizacionData): string {
  // El mensaje siempre se envía al número del negocio
  const numeroDestino = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5493425068365').replace(/\D/g, '');
  const mensaje = generarMensajeWhatsapp(data);
  // wa.me abre directo la app en celulares (api.whatsapp.com hace una redirección extra)
  return `https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`;
}
