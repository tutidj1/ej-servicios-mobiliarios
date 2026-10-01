// Clases compartidas del panel: mismas fuentes y colores que la web, pero con
// controles grandes (48px) y texto de 16px para usarlo cómodo desde el celular.
export const CAMPO =
  'w-full min-h-[48px] bg-crema-base text-negro-carbon border border-gris-borde focus:border-negro-carbon px-4 py-3 outline-none text-base font-manrope';
export const ETIQUETA = 'block text-xs font-semibold uppercase tracking-wider text-negro-carbon mb-2 font-manrope';
export const BTN_PRIMARIO =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-5 bg-negro-carbon text-crema-base border border-negro-carbon font-manrope text-sm font-semibold uppercase tracking-cta disabled:opacity-50 active:scale-[0.98]';
export const BTN_SECUNDARIO =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-5 bg-blanco-puro text-negro-carbon border border-gris-borde hover:border-negro-carbon font-manrope text-sm font-semibold uppercase tracking-cta disabled:opacity-50 active:scale-[0.98]';
export const BTN_PELIGRO =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-5 bg-blanco-puro text-red-700 border border-red-600 font-manrope text-sm font-semibold uppercase tracking-cta disabled:opacity-50';
export const TARJETA = 'bg-blanco-puro border border-gris-borde p-4';

export interface Aviso {
  tipo: 'ok' | 'error';
  texto: string;
}
