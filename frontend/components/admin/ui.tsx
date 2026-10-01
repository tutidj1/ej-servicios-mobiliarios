'use client';

import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { Aviso } from './estilos';

export function Encabezado({ titulo, descripcion, accion }: { titulo: string; descripcion?: string; accion?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="font-playfair text-3xl font-bold text-stone-900">{titulo}</h1>
        {descripcion && <p className="font-manrope text-sm text-stone-600 mt-1 max-w-xl leading-relaxed">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}

export function Mensaje({ aviso }: { aviso: Aviso | null }) {
  if (!aviso) return null;
  const ok = aviso.tipo === 'ok';
  return (
    <p
      role={ok ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm font-medium font-manrope ${
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {ok ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
      {aviso.texto}
    </p>
  );
}

// Interruptor verde (encendido) / gris (apagado)
export function Interruptor({
  activo,
  onChange,
  etiqueta,
  descripcion,
}: {
  activo: boolean;
  onChange: (valor: boolean) => void;
  etiqueta: string;
  descripcion?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onChange(!activo)}
      className="flex w-full items-start gap-3 text-left min-h-[48px] rounded-lg border border-stone-200 bg-stone-50 p-3"
    >
      <span className={`mt-0.5 relative h-6 w-11 shrink-0 rounded-full transition-colors ${activo ? 'bg-emerald-600' : 'bg-stone-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${activo ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      <span className="font-manrope">
        <span className="block text-sm font-semibold text-stone-900">{etiqueta}</span>
        {descripcion && <span className="block text-xs text-stone-500 mt-0.5 leading-relaxed">{descripcion}</span>}
      </span>
    </button>
  );
}
