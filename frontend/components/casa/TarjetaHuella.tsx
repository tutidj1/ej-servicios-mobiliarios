'use client';

import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';

/** Ofrece activar la huella / Face ID cuando el dispositivo puede y todavía no está activa. */
export default function TarjetaHuella() {
  const { biometriaPosible, tieneBiometria, activarHuella } = useCasa();
  const [oculta, setOculta] = useState(false);
  const [error, setError] = useState(false);
  if (!biometriaPosible || tieneBiometria || oculta) return null;
  return (
    <div className="mb-5 flex items-start gap-4 rounded-2xl border border-casa-acento/30 bg-casa-acento/10 p-4">
      <Fingerprint size={24} className="mt-0.5 shrink-0 text-casa-acento" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-casa-texto">Entrá con un toque</p>
        <p className="mt-0.5 text-xs text-casa-suave">Activá la huella o Face ID en este teléfono. El PIN sigue funcionando.</p>
        {error && <p className="mt-2 text-xs text-casa-error" role="alert">No se pudo activar. Podés probar de nuevo desde Ajustes.</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={async () => { if (!(await activarHuella())) setError(true); }}
            className="rounded-lg bg-casa-acento px-4 py-2 text-xs font-bold text-casa-fondo active:bg-casa-acento-fuerte"
          >
            Activar
          </button>
          <button type="button" onClick={() => setOculta(true)} className="rounded-lg px-3 py-2 text-xs font-semibold text-casa-suave">
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
