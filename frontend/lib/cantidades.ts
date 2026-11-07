// Cuántas unidades de cada producto hacen falta según los invitados.
// Regla de EJ: 1 tablón por cada 10 personas, 2 caballetes por tablón y 1 mantel por tablón
// (los manteles se calculan igual aunque no se pidan tablones). Lo demás es 1 por invitado.

export const PERSONAS_POR_TABLON = 10;
export const CABALLETES_POR_TABLON = 2;

const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function tablonesPara(invitados: number): number {
  return Math.max(1, Math.ceil(invitados / PERSONAS_POR_TABLON));
}

/** Cantidad sugerida de un producto, o null si el producto no lleva cantidad automática. */
export function cantidadSugerida(nombre: string, invitados: number, segunInvitados: boolean): number | null {
  if (!Number.isFinite(invitados) || invitados <= 0) return null;
  const n = sinTildes(nombre);
  if (n.includes('tablon')) return tablonesPara(invitados);
  if (n.includes('caballete')) return tablonesPara(invitados) * CABALLETES_POR_TABLON;
  if (n.includes('mantel')) return tablonesPara(invitados);
  return segunInvitados ? invitados : null;
}
