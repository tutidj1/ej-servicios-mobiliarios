export interface CotizacionData {
  nombre: string;
  whatsapp?: string;
  fechaEvento: string;        // ISO date
  tipoEvento: string;
  cantidadInvitados: number;
  ubicacion?: string;
  mobiliarioSolicitado: string[];
  mensaje?: string;
  cotizacionId?: string;
  vajillaItems?: string[];
  accesoriosItems?: string[];
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

  const itemsTextoLines: string[] = [];
  
  if (data.mobiliarioSolicitado.includes('Sillas')) {
    itemsTextoLines.push(`- Sillas (${data.cantidadInvitados})`);
  }
  if (data.mobiliarioSolicitado.includes('Tablones')) {
    itemsTextoLines.push(`- Tablones`);
  }
  if (data.mobiliarioSolicitado.includes('Caballetes')) {
    itemsTextoLines.push(`- Caballetes`);
  }
  
  if (data.mobiliarioSolicitado.includes('Vajilla Completa') || data.mobiliarioSolicitado.includes('Vajilla completa')) {
    itemsTextoLines.push(`- Vajilla Completa:`);
    if (data.vajillaItems && data.vajillaItems.length > 0) {
      data.vajillaItems.forEach(item => {
        itemsTextoLines.push(`  • ${item}`);
      });
    } else {
      itemsTextoLines.push(`  • (Todo)`);
    }
  }
  
  if (data.mobiliarioSolicitado.includes('Mantelería')) {
    itemsTextoLines.push(`- Mantelería`);
  }
  
  if (data.mobiliarioSolicitado.includes('Accesorios')) {
    itemsTextoLines.push(`- Accesorios:`);
    if (data.accesoriosItems && data.accesoriosItems.length > 0) {
      data.accesoriosItems.forEach(item => {
        itemsTextoLines.push(`  • ${item}`);
      });
    } else {
      itemsTextoLines.push(`  • (Todo)`);
    }
  }

  // Agregar otros ítems que no matcheen la lista anterior
  const otrosItems = data.mobiliarioSolicitado.filter(
    item => !['Sillas', 'Tablones', 'Caballetes', 'Vajilla Completa', 'Vajilla completa', 'Mantelería', 'Accesorios'].includes(item)
  );
  otrosItems.forEach(item => {
    itemsTextoLines.push(`- ${item}`);
  });

  const mobiliarioTexto = itemsTextoLines.length > 0
    ? itemsTextoLines.join('\n')
    : '_No especificado_';

  const idCorto = data.cotizacionId
    ? data.cotizacionId.substring(0, 4).toUpperCase()
    : '----';

  return `🪑 *NUEVA COTIZACIÓN — EJ*

👤 *Cliente:* ${data.nombre}

📅 *Fecha del evento:* ${fechaFormateada}
🎉 *Tipo:* ${data.tipoEvento}
👥 *Invitados:* ${data.cantidadInvitados} personas
📍 *Ubicación:* ${data.ubicacion || '_No especificada_'}

🛒 *Mobiliario:*
${mobiliarioTexto}

💬 *Mensaje:*
${data.mensaje ? `"${data.mensaje}"` : '_Sin mensaje adicional_'}

—
_Enviado desde ejserviciosmobiliarios.com_
_Cotización #${idCorto}_`;
}

export function generarUrlWhatsapp(data: CotizacionData): string {
  // Siempre enviar al número fijo de la dueña de EJ
  const numeroDestino = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5493425068365';
  const mensaje = generarMensajeWhatsapp(data);
  return `https://api.whatsapp.com/send?phone=${numeroDestino}&text=${encodeURIComponent(mensaje)}`;
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
