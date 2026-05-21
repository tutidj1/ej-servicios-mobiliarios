export interface CotizacionData {
  nombre: string;
  whatsapp: string;
  fechaEvento: string;        // ISO date
  tipoEvento: string;
  cantidadInvitados: number;
  ubicacion?: string;
  mobiliarioSolicitado: string[];
  mensaje?: string;
  cotizacionId?: string;
}

export function generarMensajeWhatsapp(data: CotizacionData): string {
  // Ajustar zona horaria local para evitar corrimientos de fecha al formatear en el servidor
  let fechaFormateada = data.fechaEvento;
  try {
    const parts = data.fechaEvento.split('-');
    if (parts.length === 3) {
      // Formato YYYY-MM-DD
      fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
      const dateObj = new Date(data.fechaEvento);
      fechaFormateada = dateObj.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC' // Las fechas cargadas en inputs tipo date no traen hora, se interpretan en UTC
      });
    }
  } catch (e) {
    console.error('Error al formatear fecha:', e);
  }

  const mobiliarioTexto = data.mobiliarioSolicitado.length > 0
    ? data.mobiliarioSolicitado.map(item => `• ${item}`).join('\n')
    : '_No especificado_';

  const idCorto = data.cotizacionId
    ? data.cotizacionId.substring(0, 4).toUpperCase()
    : '----';

  return `🪑 *NUEVA COTIZACIÓN — EJ*

👤 *Cliente:* ${data.nombre}
📱 *WhatsApp:* ${data.whatsapp}

📅 *Fecha del evento:* ${fechaFormateada}
🎉 *Tipo:* ${data.tipoEvento}
👥 *Invitados:* ${data.cantidadInvitados} personas
📍 *Ubicación:* ${data.ubicacion || '_No especificada_'}

🛒 *Necesita:*\n${mobiliarioTexto}

💬 *Mensaje:*\n${data.mensaje ? `"${data.mensaje}"` : '_Sin mensaje adicional_'}

—
_Enviado desde ejserviciosmobiliarios.com_
_Cotización #${idCorto}_`;
}

export function generarUrlWhatsapp(data: CotizacionData): string {
  const NUMERO_MAMA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5493425068365';  // Argentina + 9 + cod área + número
  const mensaje = generarMensajeWhatsapp(data);
  return `https://wa.me/${NUMERO_MAMA}?text=${encodeURIComponent(mensaje)}`;
}

export interface CotizacionDataForDb {
  nombre: string;
  whatsapp: string;
  fecha_evento: string;
  tipo_evento: string;
  cantidad_invitados: number;
  ubicacion?: string;
  mobiliario_solicitado: string[];
  mensaje?: string;
}
