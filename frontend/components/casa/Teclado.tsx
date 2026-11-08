'use client';

import { useEffect } from 'react';
import { Delete } from 'lucide-react';

const LARGO = 6;

/** Puntos + teclado numérico propio: el PIN no pasa por el teclado del sistema ni queda en un <input>. */
export default function Teclado({
  valor,
  onChange,
  deshabilitado = false,
  error = false,
}: {
  valor: string;
  onChange: (v: string) => void;
  deshabilitado?: boolean;
  error?: boolean;
}) {
  const agregar = (d: string) => {
    if (deshabilitado || valor.length >= LARGO) return;
    onChange(valor + d);
  };
  const borrar = () => {
    if (deshabilitado) return;
    onChange(valor.slice(0, -1));
  };

  // También anda con el teclado físico (computadora)
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') agregar(e.key);
      else if (e.key === 'Backspace') borrar();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  });

  return (
    <div className="select-none">
      <div className={`mb-8 flex justify-center gap-3 ${error ? 'animate-[sacudir_0.35s]' : ''}`} aria-label={`${valor.length} de ${LARGO} dígitos`} role="status">
        {Array.from({ length: LARGO }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border transition-colors ${
              i < valor.length ? 'border-casa-acento bg-casa-acento' : error ? 'border-casa-error' : 'border-casa-suave'
            }`}
          />
        ))}
      </div>
      <div className="mx-auto grid max-w-[18rem] grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => agregar(d)}
            disabled={deshabilitado}
            className="h-16 rounded-2xl bg-casa-panel text-2xl font-semibold text-casa-texto active:bg-casa-panel-2 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={() => agregar('0')}
          disabled={deshabilitado}
          className="h-16 rounded-2xl bg-casa-panel text-2xl font-semibold text-casa-texto active:bg-casa-panel-2 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={borrar}
          disabled={deshabilitado || valor.length === 0}
          aria-label="Borrar un dígito"
          className="flex h-16 items-center justify-center rounded-2xl text-casa-suave active:bg-casa-panel disabled:opacity-30"
        >
          <Delete size={24} />
        </button>
      </div>
    </div>
  );
}
