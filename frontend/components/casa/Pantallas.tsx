'use client';

import { useEffect, useState } from 'react';
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react';
import { pinDebil, pinValido } from '@/lib/casa/cifrado';
import { useCasa } from '@/lib/casa/sesion';
import Teclado from './Teclado';

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">{children}</div>
    </main>
  );
}

function Marca() {
  return (
    <div className="mb-8 flex flex-col items-center gap-2">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-casa-acento/15 text-casa-acento">
        <Lock size={22} />
      </span>
      <span className="text-xs font-bold uppercase tracking-[0.25em] text-casa-acento">EJ Casa</span>
    </div>
  );
}

export function Cargando() {
  return (
    <Marco>
      <Marca />
      <p className="text-sm text-casa-suave">Un momento…</p>
    </Marco>
  );
}

/** Pide el PIN (o la huella) para volver a entrar */
export function PantallaPin() {
  const { nombre, tieneBiometria, desbloquearPin, desbloquearBiometria, aviso } = useCasa();
  const [pin, setPin] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  const probar = async (valor: string) => {
    setTrabajando(true);
    const r = await desbloquearPin(valor);
    setTrabajando(false);
    if (r.ok) return;
    setError(true);
    setPin('');
    window.setTimeout(() => setError(false), 400);
    if (r.restantes !== undefined) {
      setMensaje(r.restantes === 1 ? 'PIN incorrecto. Te queda 1 intento antes de que se borre el acceso.' : `PIN incorrecto. Te quedan ${r.restantes} intentos.`);
    } else {
      setMensaje('No se pudo entrar. Revisá tu conexión e intentá de nuevo.');
    }
  };

  const alCambiar = (v: string) => {
    setPin(v);
    setMensaje(null);
    if (v.length === 6) void probar(v);
  };

  return (
    <Marco>
      <Marca />
      <h1 className="mb-1 font-playfair text-2xl text-casa-texto">{nombre ? `Hola, ${nombre}` : 'Bienvenido'}</h1>
      <p className="mb-8 text-sm text-casa-suave">{trabajando ? 'Abriendo…' : 'Ingresá tu PIN de 6 dígitos'}</p>
      <Teclado valor={pin} onChange={alCambiar} deshabilitado={trabajando} error={error} />
      <p className="mt-6 min-h-[2.5rem] text-sm text-casa-error" role="alert">{mensaje ?? aviso}</p>
      {tieneBiometria && (
        <button
          type="button"
          onClick={() => void desbloquearBiometria()}
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-casa-borde px-5 py-3 text-sm font-semibold text-casa-acento active:bg-casa-panel"
        >
          <Fingerprint size={20} /> Entrar con huella o Face ID
        </button>
      )}
    </Marco>
  );
}

/** Primera vez en este dispositivo: se elige el PIN (con confirmación) */
export function CrearPin() {
  const { nombre, crearPin } = useCasa();
  const [paso, setPaso] = useState<'elegir' | 'confirmar'>('elegir');
  const [primero, setPrimero] = useState('');
  const [pin, setPin] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const alCambiar = async (v: string) => {
    setPin(v);
    setMensaje(null);
    if (v.length < 6) return;
    if (paso === 'elegir') {
      if (!pinValido(v) || pinDebil(v)) {
        setMensaje('Ese PIN es muy fácil de adivinar. Elegí otro (sin repetidos ni secuencias).');
        setPin('');
        return;
      }
      setPrimero(v);
      setPin('');
      setPaso('confirmar');
      return;
    }
    if (v !== primero) {
      setMensaje('No coinciden. Empezá de nuevo.');
      setPin('');
      setPrimero('');
      setPaso('elegir');
      return;
    }
    setTrabajando(true);
    try {
      await crearPin(v);
    } catch {
      setMensaje('No se pudo guardar el acceso en este dispositivo. Probá de nuevo.');
      setTrabajando(false);
      setPin('');
      setPaso('elegir');
    }
  };

  return (
    <Marco>
      <Marca />
      <h1 className="mb-1 font-playfair text-2xl text-casa-texto">{nombre ? `Hola, ${nombre}` : 'Bienvenido'}</h1>
      <p className="mb-8 text-sm text-casa-suave">
        {trabajando ? 'Guardando…' : paso === 'elegir' ? 'Elegí un PIN de 6 dígitos para este dispositivo' : 'Repetí el PIN para confirmarlo'}
      </p>
      <Teclado valor={pin} onChange={(v) => void alCambiar(v)} deshabilitado={trabajando} />
      <p className="mt-6 min-h-[2.5rem] text-sm text-casa-error" role="alert">{mensaje}</p>
      <p className="mt-2 flex items-start justify-center gap-2 text-xs text-casa-suave">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        <span>El PIN no se guarda en ningún servidor: solo abre el acceso cifrado de este teléfono.</span>
      </p>
    </Marco>
  );
}

/** No hay acceso en este dispositivo: se entra únicamente con una invitación */
export function SinAcceso() {
  const { aviso } = useCasa();
  return (
    <Marco>
      <Marca />
      <h1 className="mb-3 font-playfair text-2xl text-casa-texto">Entrá con tu invitación</h1>
      <p className="text-sm leading-relaxed text-casa-suave">
        EJ Casa es privada. Para usarla en este dispositivo necesitás un enlace de invitación personal, que te da Tomás. Abrilo desde este mismo teléfono.
      </p>
      {aviso && <p className="mt-6 rounded-xl border border-casa-alerta/40 bg-casa-alerta/10 p-3 text-sm text-casa-alerta" role="alert">{aviso}</p>}
    </Marco>
  );
}

/** Se muestra al abrir un enlace de invitación */
export function CanjeandoInvitacion({ error }: { error: string | null }) {
  const [puntos, setPuntos] = useState('');
  useEffect(() => {
    const t = window.setInterval(() => setPuntos((p) => (p.length >= 3 ? '' : p + '.')), 400);
    return () => window.clearInterval(t);
  }, []);
  return (
    <Marco>
      <Marca />
      {error ? (
        <>
          <h1 className="mb-3 font-playfair text-2xl text-casa-texto">No pudimos abrir la invitación</h1>
          <p className="text-sm leading-relaxed text-casa-error" role="alert">{error}</p>
        </>
      ) : (
        <p className="text-sm text-casa-suave">Verificando tu invitación{puntos}</p>
      )}
    </Marco>
  );
}
