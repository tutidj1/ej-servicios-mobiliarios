'use client';

import { useEffect, useState } from 'react';
import { Download, Fingerprint, KeyRound, Lock, LogOut } from 'lucide-react';
import { MINUTOS_INACTIVIDAD, useCasa } from '@/lib/casa/sesion';
import { pinDebil, pinValido } from '@/lib/casa/cifrado';
import Teclado from './Teclado';

type PromptInstalacion = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

const ROLES: Record<string, string> = { adulto: 'Integrante', admin_tecnico: 'Administración técnica', hijo: 'Hijo' };

function Fila({ icono: Icono, titulo, texto, onClick, peligro }: { icono: typeof Lock; titulo: string; texto?: string; onClick: () => void; peligro?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-casa-borde bg-casa-panel px-4 py-4 text-left active:bg-casa-panel-2"
    >
      <Icono size={20} className={peligro ? 'text-casa-error' : 'text-casa-acento'} />
      <span className="flex-1">
        <span className={`block text-sm font-semibold ${peligro ? 'text-casa-error' : 'text-casa-texto'}`}>{titulo}</span>
        {texto && <span className="mt-0.5 block text-xs text-casa-suave">{texto}</span>}
      </span>
    </button>
  );
}

export default function AjustesCasa() {
  const { persona, tieneBiometria, biometriaPosible, bloquear, salirDeEsteDispositivo, activarHuella, quitarHuella, cambiarPin } = useCasa();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [instalar, setInstalar] = useState<PromptInstalacion | null>(null);
  const [esIos, setEsIos] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [cambiando, setCambiando] = useState<null | 'nuevo' | 'confirmar'>(null);
  const [pinNuevo, setPinNuevo] = useState('');
  const [pin, setPin] = useState('');

  useEffect(() => {
    setEsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setInstalada(window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const f = (e: Event) => { e.preventDefault(); setInstalar(e as PromptInstalacion); };
    window.addEventListener('beforeinstallprompt', f);
    return () => window.removeEventListener('beforeinstallprompt', f);
  }, []);

  const alPin = async (v: string) => {
    setPin(v);
    if (v.length < 6) return;
    if (cambiando === 'nuevo') {
      if (!pinValido(v) || pinDebil(v)) { setMensaje('Ese PIN es muy fácil de adivinar. Elegí otro.'); setPin(''); return; }
      setPinNuevo(v); setPin(''); setCambiando('confirmar'); setMensaje(null);
    } else if (cambiando === 'confirmar') {
      if (v !== pinNuevo) { setMensaje('No coinciden. Empezá de nuevo.'); setPin(''); setPinNuevo(''); setCambiando('nuevo'); return; }
      await cambiarPin(v);
      setCambiando(null); setPin(''); setPinNuevo(''); setMensaje('Listo: el PIN de este dispositivo cambió.');
    }
  };

  if (cambiando) {
    return (
      <div className="text-center">
        <p className="mb-8 text-sm text-casa-suave">{cambiando === 'nuevo' ? 'Elegí tu PIN nuevo' : 'Repetí el PIN nuevo'}</p>
        <Teclado valor={pin} onChange={(v) => void alPin(v)} />
        <p className="mt-6 min-h-[1.5rem] text-sm text-casa-error" role="alert">{mensaje}</p>
        <button type="button" onClick={() => { setCambiando(null); setPin(''); setPinNuevo(''); setMensaje(null); }} className="mt-2 text-sm text-casa-suave underline">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-5 rounded-2xl bg-casa-panel px-4 py-4">
        <p className="text-xs uppercase tracking-wider text-casa-suave">Sesión</p>
        <p className="mt-1 font-semibold text-casa-texto">{persona?.nombre}</p>
        <p className="text-xs text-casa-suave">{persona ? ROLES[persona.rol] : ''}</p>
      </div>

      <Fila icono={Lock} titulo="Bloquear ahora" texto={`Se bloquea sola a los ${MINUTOS_INACTIVIDAD} minutos sin tocar la pantalla.`} onClick={bloquear} />

      {biometriaPosible && !tieneBiometria && (
        <Fila
          icono={Fingerprint}
          titulo="Activar huella o Face ID"
          texto="Entrás con un toque; el PIN sigue funcionando."
          onClick={async () => setMensaje((await activarHuella()) ? 'Listo: ya podés entrar con huella o Face ID.' : 'No se pudo activar la biometría en este dispositivo.')}
        />
      )}
      {tieneBiometria && (
        <Fila icono={Fingerprint} titulo="Desactivar huella o Face ID" texto="Vas a entrar solo con el PIN." onClick={async () => { await quitarHuella(); setMensaje('Huella desactivada.'); }} />
      )}

      <Fila icono={KeyRound} titulo="Cambiar el PIN de este dispositivo" onClick={() => { setMensaje(null); setCambiando('nuevo'); }} />

      {!instalada && instalar && (
        <Fila
          icono={Download}
          titulo="Instalar EJ Casa en el teléfono"
          texto="Queda como una app más, a pantalla completa."
          onClick={async () => { await instalar.prompt(); setInstalar(null); }}
        />
      )}
      {!instalada && esIos && (
        <div className="rounded-2xl border border-casa-borde bg-casa-panel px-4 py-4 text-xs leading-relaxed text-casa-suave">
          <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-casa-texto"><Download size={18} className="text-casa-acento" /> Instalar en iPhone</span>
          Abrí esta página en Safari, tocá <strong>Compartir</strong> y elegí <strong>Agregar a inicio</strong>.
        </div>
      )}

      <Fila icono={LogOut} titulo="Salir de este dispositivo" texto="Borra el acceso guardado acá. Para volver a entrar necesitás una invitación nueva." peligro onClick={() => void salirDeEsteDispositivo()} />

      <p className="min-h-[1.5rem] pt-2 text-center text-sm text-casa-acento" role="status">{mensaje}</p>
    </div>
  );
}
