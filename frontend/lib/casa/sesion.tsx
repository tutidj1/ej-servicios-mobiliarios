'use client';

/**
 * Sesión de EJ Casa: PIN + biometría sobre un refresh token guardado cifrado en el dispositivo,
 * y bloqueo automático a los 5 minutos de inactividad.
 *
 * Fases:  cargando → sin_boveda | bloqueada
 *         sin_boveda --(invitación)--> configurar_pin --> abierta
 *         bloqueada  --(PIN / biometría)--> abierta --(5 min / botón)--> bloqueada
 *
 * Al bloquear se descarta el cliente de Supabase (con su sesión en memoria) y la clave de la bóveda:
 * no queda nada legible en la página. El refresh token NO se revoca (sigue cifrado en el disco).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearClienteCasa, descartarCliente } from './cliente';
import {
  activarBiometria, borrarBoveda, borrarSiTokenIgual, cambiarPin as cambiarPinBoveda, crearBoveda, desbloquearConBiometria,
  desbloquearConPin, ErrorBoveda, guardarToken, leerBoveda, quitarBiometria,
} from './boveda';
import { biometriaDisponible } from './biometria';
import { clasificarErrorRefresh } from './refresh';

export const MINUTOS_INACTIVIDAD = 5;
const INACTIVIDAD_MS = MINUTOS_INACTIVIDAD * 60 * 1000;

export type PersonaCasa = { id: string; nombre: string; rol: 'adulto' | 'admin_tecnico' | 'hijo' };

type Fase = 'cargando' | 'sin_boveda' | 'configurar_pin' | 'bloqueada' | 'abierta';

type Contexto = {
  fase: Fase;
  /** Nombre guardado en el dispositivo (se muestra en la pantalla de PIN) */
  nombre: string | null;
  persona: PersonaCasa | null;
  cliente: SupabaseClient | null;
  tieneBiometria: boolean;
  biometriaPosible: boolean;
  aviso: string | null;
  canjearInvitacion(tokenHash: string): Promise<void>;
  crearPin(pin: string): Promise<void>;
  desbloquearPin(pin: string): Promise<{ ok: boolean; restantes?: number; sinRed?: boolean }>;
  desbloquearBiometria(): Promise<boolean>;
  bloquear(): void;
  salirDeEsteDispositivo(): Promise<void>;
  activarHuella(): Promise<boolean>;
  quitarHuella(): Promise<void>;
  cambiarPin(pin: string): Promise<void>;
};

const Ctx = createContext<Contexto | null>(null);

export function useCasa(): Contexto {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCasa debe usarse dentro de <ProveedorCasa>');
  return c;
}

export function ProveedorCasa({ children }: { children: ReactNode }) {
  const [fase, setFase] = useState<Fase>('cargando');
  const [nombre, setNombre] = useState<string | null>(null);
  const [persona, setPersona] = useState<PersonaCasa | null>(null);
  const [cliente, setCliente] = useState<SupabaseClient | null>(null);
  const [tieneBiometria, setTieneBiometria] = useState(false);
  const [biometriaPosible, setBiometriaPosible] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const clienteRef = useRef<SupabaseClient | null>(null);
  const claveRef = useRef<CryptoKey | null>(null);
  const pendienteRef = useRef<{ cliente: SupabaseClient; refreshToken: string; personaId: string; nombre: string } | null>(null);
  const ultimaActividad = useRef(Date.now());
  const suscripcion = useRef<{ unsubscribe(): void } | null>(null);

  // ---- arranque ----
  useEffect(() => {
    let vivo = true;
    (async () => {
      setBiometriaPosible(await biometriaDisponible());
      try {
        const reg = await leerBoveda();
        if (!vivo) return;
        if (reg) {
          setNombre(reg.nombre);
          setTieneBiometria(!!reg.bio);
          setFase('bloqueada');
        } else {
          setFase('sin_boveda');
        }
      } catch {
        if (vivo) {
          setAviso('Este navegador no deja guardar datos seguros (¿ventana privada?). Abrí EJ Casa en una ventana normal.');
          setFase('sin_boveda');
        }
      }
    })();
    return () => { vivo = false; };
  }, []);

  // ---- helpers ----
  const soltarSesion = useCallback(() => {
    suscripcion.current?.unsubscribe();
    suscripcion.current = null;
    descartarCliente(clienteRef.current);
    clienteRef.current = null;
    claveRef.current = null;
    setCliente(null);
    setPersona(null);
  }, []);

  const cargarPersona = useCallback(async (c: SupabaseClient, id: string): Promise<PersonaCasa> => {
    const { data, error } = await c.from('personas').select('id, nombre, rol').eq('id', id).single();
    if (error || !data) throw new Error('No se pudo cargar tu perfil.');
    return data as PersonaCasa;
  }, []);

  /** Deja la sesión activa: cliente listo, token rotado re-cifrado, fase abierta. */
  const abrirSesion = useCallback(async (c: SupabaseClient, clave: CryptoKey, personaId: string) => {
    const p = await cargarPersona(c, personaId);
    clienteRef.current = c;
    claveRef.current = clave;
    const { data } = c.auth.onAuthStateChange((evento, sesion) => {
      // El refresh token rota en cada renovación: hay que guardar el nuevo, o el viejo deja de servir.
      if ((evento === 'TOKEN_REFRESHED' || evento === 'SIGNED_IN') && sesion?.refresh_token && claveRef.current) {
        void guardarToken(claveRef.current, sesion.refresh_token);
      }
    });
    suscripcion.current = data.subscription;
    ultimaActividad.current = Date.now();
    setCliente(c);
    setPersona(p);
    setNombre(p.nombre);
    setAviso(null);
    setFase('abierta');
  }, [cargarPersona]);

  // ---- invitación → crear PIN ----
  const canjearInvitacion = useCallback(async (tokenHash: string) => {
    const c = crearClienteCasa();
    let res = await c.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
    if (res.error) res = await c.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    const sesion = res.data.session;
    if (res.error || !sesion || !res.data.user) {
      descartarCliente(c);
      throw new Error('La invitación venció o ya se usó. Pedí una nueva.');
    }
    const p = await cargarPersona(c, res.data.user.id);
    soltarSesion();
    pendienteRef.current = { cliente: c, refreshToken: sesion.refresh_token, personaId: p.id, nombre: p.nombre };
    setNombre(p.nombre);
    setFase('configurar_pin');
  }, [cargarPersona, soltarSesion]);

  const crearPin = useCallback(async (pin: string) => {
    const pend = pendienteRef.current;
    if (!pend) throw new Error('Falta la invitación.');
    // Si había una bóveda de otra cuenta en este dispositivo, se reemplaza.
    await borrarBoveda().catch(() => {});
    // El cliente pudo renovar el token mientras se elegía el PIN: se guarda el más reciente.
    const ultimo = (await pend.cliente.auth.getSession()).data.session?.refresh_token ?? pend.refreshToken;
    const { claveDatos } = await crearBoveda({ personaId: pend.personaId, nombre: pend.nombre, refreshToken: ultimo, pin });
    pendienteRef.current = null;
    setTieneBiometria(false);
    await abrirSesion(pend.cliente, claveDatos, pend.personaId);
  }, [abrirSesion]);

  // ---- desbloqueo ----
  const entrarConToken = useCallback(async (refreshToken: string, clave: CryptoKey, personaId: string, ctUsado: string) => {
    const c = crearClienteCasa();
    const { data, error } = await c.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      descartarCliente(c);
      // La bóveda se borra SOLO si el servidor respondió explícitamente que el token es inválido o venció.
      // Sin red, timeouts, 5xx, 429 o cualquier otra cosa: queda intacta y se reintenta.
      if (clasificarErrorRefresh(error) !== 'invalido') throw new Error('SIN_RED');
      const borrada = await borrarSiTokenIgual(ctUsado).catch(() => false);
      if (!borrada) throw new Error('SIN_RED'); // otra pestaña ya la renovó: no se toca
      setNombre(null);
      setTieneBiometria(false);
      setAviso('Tu acceso en este dispositivo venció. Pedí una invitación nueva para volver a entrar.');
      setFase('sin_boveda');
      return false;
    }
    await guardarToken(clave, data.session.refresh_token);
    await abrirSesion(c, clave, personaId);
    return true;
  }, [abrirSesion]);

  const desbloquearPin = useCallback(async (pin: string) => {
    try {
      const b = await desbloquearConPin(pin);
      const ok = await entrarConToken(b.refreshToken, b.claveDatos, b.registro.personaId, b.registro.token.ct);
      return { ok };
    } catch (e) {
      if (e instanceof Error && e.message === 'SIN_RED') return { ok: false, sinRed: true };
      if (e instanceof ErrorBoveda && e.codigo === 'PIN_INCORRECTO') return { ok: false, restantes: e.restantes };
      if (e instanceof ErrorBoveda && e.codigo === 'BOVEDA_BORRADA') {
        setNombre(null);
        setTieneBiometria(false);
        setAviso('Demasiados intentos fallidos: por seguridad se borró el acceso de este dispositivo. Pedí una invitación nueva.');
        setFase('sin_boveda');
        return { ok: false, restantes: 0 };
      }
      return { ok: false };
    }
  }, [entrarConToken]);

  const desbloquearBiometria = useCallback(async () => {
    try {
      const b = await desbloquearConBiometria();
      return await entrarConToken(b.refreshToken, b.claveDatos, b.registro.personaId, b.registro.token.ct);
    } catch {
      return false; // cancelada o fallida: sigue disponible el PIN
    }
  }, [entrarConToken]);

  // ---- bloqueo y salida ----
  const bloquear = useCallback(() => {
    soltarSesion();
    setFase((f) => (f === 'abierta' ? 'bloqueada' : f));
  }, [soltarSesion]);

  const salirDeEsteDispositivo = useCallback(async () => {
    try { await clienteRef.current?.auth.signOut(); } catch { /* sin red: igual se borra lo local */ }
    soltarSesion();
    await borrarBoveda().catch(() => {});
    setNombre(null);
    setTieneBiometria(false);
    setFase('sin_boveda');
  }, [soltarSesion]);

  const activarHuella = useCallback(async () => {
    if (!claveRef.current) return false;
    try {
      await activarBiometria(claveRef.current);
      setTieneBiometria(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const quitarHuella = useCallback(async () => {
    await quitarBiometria();
    setTieneBiometria(false);
  }, []);

  const cambiarPin = useCallback(async (pin: string) => {
    if (!claveRef.current) throw new Error('Sesión bloqueada.');
    await cambiarPinBoveda(claveRef.current, pin);
  }, []);

  // ---- inactividad: 5 minutos ----
  useEffect(() => {
    if (fase !== 'abierta') return;
    const marcar = () => { ultimaActividad.current = Date.now(); };
    const revisar = () => {
      if (Date.now() - ultimaActividad.current >= INACTIVIDAD_MS) bloquear();
    };
    const eventos = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
    eventos.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    const reloj = window.setInterval(revisar, 5_000);
    // Los navegadores frenan los temporizadores con la app en segundo plano: al volver se revisa de inmediato.
    const alVolver = () => { if (document.visibilityState === 'visible') revisar(); };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('pageshow', revisar);
    window.addEventListener('focus', revisar);
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, marcar));
      window.clearInterval(reloj);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('pageshow', revisar);
      window.removeEventListener('focus', revisar);
    };
  }, [fase, bloquear]);

  const valor = useMemo<Contexto>(() => ({
    fase, nombre, persona, cliente, tieneBiometria, biometriaPosible, aviso,
    canjearInvitacion, crearPin, desbloquearPin, desbloquearBiometria, bloquear, salirDeEsteDispositivo,
    activarHuella, quitarHuella, cambiarPin,
  }), [fase, nombre, persona, cliente, tieneBiometria, biometriaPosible, aviso, canjearInvitacion, crearPin,
    desbloquearPin, desbloquearBiometria, bloquear, salirDeEsteDispositivo, activarHuella, quitarHuella, cambiarPin]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
