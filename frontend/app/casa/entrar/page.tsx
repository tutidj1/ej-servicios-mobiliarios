'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CanjeandoInvitacion } from '@/components/casa/Pantallas';
import { useCasa } from '@/lib/casa/sesion';

/**
 * Destino del enlace de invitación: /casa/entrar#t=<token de un solo uso>.
 * El token va en el fragmento (#), que el navegador nunca envía al servidor, y se borra de la
 * barra de direcciones apenas se lee.
 */
export default function Entrar() {
  const { canjearInvitacion, fase } = useCasa();
  const router = useRouter();
  const hecho = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('t');
    window.history.replaceState(null, '', '/casa/entrar');
    if (!token) {
      setError('El enlace está incompleto. Pedí una invitación nueva.');
      return;
    }
    canjearInvitacion(token).catch((e: Error) => setError(e.message || 'No se pudo abrir la invitación.'));
  }, [canjearInvitacion]);

  useEffect(() => {
    if (fase === 'abierta') router.replace('/casa');
  }, [fase, router]);

  return <CanjeandoInvitacion error={error} />;
}
