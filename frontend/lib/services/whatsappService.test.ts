import { describe, expect, it } from 'vitest';
import { generarUrlWhatsapp } from './whatsappService';

describe('mensaje de WhatsApp', () => {
  it('los emojis salen bien codificados y las cantidades siguen la regla de tablones', () => {
    const url = generarUrlWhatsapp({
      nombre: 'Ana', telefono: '3425068365', fechaEvento: '2027-03-20', tipoEvento: 'Cumpleaños', cantidadInvitados: 80,
      items: [
        { nombre: 'Tablones de madera', categoria: 'Mobiliario', cantidadSegunInvitados: true },
        { nombre: 'Mantelería blanca', categoria: 'Mantelería', cantidadSegunInvitados: true },
      ],
    });
    expect(url).not.toContain('%EF%BF%BD');
    const texto = decodeURIComponent(url.split('text=')[1]);
    expect(texto).toContain('🎉 Cumpleaños');
    expect(texto).toContain('• Tablones de madera (8)');
    expect(texto).toContain('• Mantelería blanca (8)');
  });
});
