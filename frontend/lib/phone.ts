/**
 * Número en formato internacional para armar un link de WhatsApp (wa.me).
 * Acepta como lo escriba la gente: "342 506 8365", "0342 506-8365", "342 15 506 8365", "+54 9 342 506 8365".
 */
export function telefonoParaWhatsapp(crudo: string): string {
  let n = crudo.replace(/\D/g, '');

  // Ya viene con código de país
  if (n.startsWith('549') && n.length >= 12) return n;
  if (n.startsWith('54') && n.length >= 11) return `549${n.slice(2)}`;

  n = n.replace(/^0+/, '');

  // Quitar el "15" que se usaba para celulares (característica + 15 + número = 12 dígitos)
  if (n.length === 12) {
    for (const largoArea of [3, 4, 2]) {
      if (n.slice(largoArea, largoArea + 2) === '15') {
        n = n.slice(0, largoArea) + n.slice(largoArea + 2);
        break;
      }
    }
  }

  return `549${n}`;
}

/** Abre directamente el chat con el cliente, sin mensaje escrito. */
export function linkWhatsappCliente(telefono: string): string {
  return `https://wa.me/${telefonoParaWhatsapp(telefono)}`;
}
