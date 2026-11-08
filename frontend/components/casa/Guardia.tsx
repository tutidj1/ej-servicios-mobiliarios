'use client';

import { usePathname } from 'next/navigation';
import { useCasa } from '@/lib/casa/sesion';
import { Cargando, CrearPin, PantallaPin, SinAcceso } from './Pantallas';
import Shell from './Shell';

/** Decide qué se ve: acceso, PIN o la app. Nada de la app se dibuja mientras está bloqueada. */
export default function Guardia({ children }: { children: React.ReactNode }) {
  const { fase } = useCasa();
  const ruta = usePathname();
  const esEntrar = ruta === '/casa/entrar';

  if (fase === 'cargando') return <Cargando />;
  if (fase === 'configurar_pin') return <CrearPin />;
  if (esEntrar) return <>{children}</>;
  if (fase === 'sin_boveda') return <SinAcceso />;
  if (fase === 'bloqueada') return <PantallaPin />;
  return <Shell>{children}</Shell>;
}
