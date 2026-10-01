/** Número en formato internacional para armar un link wa.me ("342 506 8365" → "5493425068365"). */
export function telefonoParaWhatsapp(crudo: string): string {
  let digitos = crudo.replace(/\D/g, '').replace(/^0+/, '');
  if (digitos.startsWith('54')) return digitos;
  if (!digitos.startsWith('9')) digitos = `9${digitos}`;
  return `54${digitos}`;
}
