// Estilos compartidos del panel: tarjetas blancas sobre fondo arena para que cada bloque se distinga,
// botones grandes (44px+) y texto de 16px para usarlo cómodo desde el celular.
export const CAMPO =
  'w-full min-h-[48px] bg-white text-stone-900 border border-stone-300 rounded-lg px-4 py-3 outline-none text-base font-manrope placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20';
export const ETIQUETA = 'block text-sm font-semibold text-stone-800 mb-1.5 font-manrope';
export const AYUDA = 'mt-1.5 text-xs text-stone-500 font-manrope leading-relaxed';

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg font-manrope text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none';
export const BTN_PRIMARIO = `${BTN_BASE} bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm`;
export const BTN_SECUNDARIO = `${BTN_BASE} bg-white text-stone-800 border border-stone-300 hover:bg-stone-50`;
export const BTN_OSCURO = `${BTN_BASE} bg-stone-900 text-white hover:bg-stone-800`;
export const BTN_PELIGRO = `${BTN_BASE} bg-red-600 text-white hover:bg-red-700 shadow-sm`;
export const BTN_PELIGRO_SUAVE = `${BTN_BASE} bg-red-50 text-red-700 border border-red-200 hover:bg-red-100`;

export const TARJETA = 'bg-white rounded-2xl border border-stone-200 shadow-sm p-5';

export interface Aviso {
  tipo: 'ok' | 'error';
  texto: string;
}
