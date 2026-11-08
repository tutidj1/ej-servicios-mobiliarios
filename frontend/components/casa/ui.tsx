'use client';

import { X } from 'lucide-react';
import { formatearDigitos } from '@/lib/casa/dinero';

/** Hoja que sube desde abajo (en pantallas grandes, un cuadro al centro). */
export function Hoja({ titulo, alCerrar, children }: { titulo: string; alCerrar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 md:items-center" onClick={alCerrar} role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-casa-panel p-5 pb-8 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-playfair text-xl text-casa-texto">{titulo}</h2>
          <button type="button" onClick={alCerrar} aria-label="Cerrar" className="rounded-xl p-2 text-casa-suave"><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const CAMPO = 'w-full rounded-xl border border-casa-borde bg-casa-fondo px-4 py-3 text-base text-casa-texto placeholder:text-casa-suave/60 focus:border-casa-acento focus:outline-none';

/** Campo de monto en pesos enteros: solo dígitos, se muestra con puntos. `valor` guarda los dígitos. */
export function CampoDigitos({ etiqueta, valor, onChange, prefijo = '$', ayuda, maximo = 9 }: {
  etiqueta: string; valor: string; onChange: (d: string) => void; prefijo?: string; ayuda?: string; maximo?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-casa-suave">{etiqueta}</span>
      <div className="relative">
        {prefijo && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-casa-suave">{prefijo}</span>}
        <input
          inputMode="numeric"
          className={`${CAMPO} ${prefijo ? 'pl-10' : ''}`}
          value={valor ? formatearDigitos(valor) : ''}
          placeholder="0"
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, maximo))}
        />
      </div>
      {ayuda && <span className="mt-1 block text-xs text-casa-suave">{ayuda}</span>}
    </label>
  );
}

export function CampoTexto({ etiqueta, valor, onChange, placeholder }: { etiqueta: string; valor: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-casa-suave">{etiqueta}</span>
      <input className={CAMPO} value={valor} placeholder={placeholder} maxLength={80} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Chips<T extends string>({ opciones, valor, onChange }: { opciones: { valor: T; etiqueta: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => onChange(o.valor)}
          className={`rounded-full px-3.5 py-2 text-sm font-semibold ${valor === o.valor ? 'bg-casa-acento text-casa-fondo' : 'bg-casa-panel-2 text-casa-texto'}`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function BotonPrincipal({ children, onClick, deshabilitado }: { children: React.ReactNode; onClick: () => void; deshabilitado?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={deshabilitado} className="w-full rounded-xl bg-casa-acento py-3.5 text-sm font-bold text-casa-fondo active:bg-casa-acento-fuerte disabled:opacity-40">
      {children}
    </button>
  );
}

export function Barra({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-casa-panel-2" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-casa-acento" style={{ width: `${Math.min(Math.max(porcentaje, 0), 100)}%` }} />
    </div>
  );
}
