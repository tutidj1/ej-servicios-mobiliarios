'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, CreditCard, Home, Lock, Settings, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';

type Seccion = { href: string; titulo: string; corto: string; icono: LucideIcon };

export const SECCIONES: Seccion[] = [
  { href: '/casa', titulo: 'Piso de la casa', corto: 'Inicio', icono: Home },
  { href: '/casa/obligaciones', titulo: 'Obligaciones', corto: 'Obligaciones', icono: CalendarCheck },
  { href: '/casa/gastos', titulo: 'Mis gastos', corto: 'Gastos', icono: Wallet },
  { href: '/casa/deudas', titulo: 'Deudas y cuotas', corto: 'Deudas', icono: CreditCard },
  { href: '/casa/inversiones', titulo: 'Inversiones', corto: 'Inversiones', icono: TrendingUp },
];

const AJUSTES: Seccion = { href: '/casa/ajustes', titulo: 'Ajustes', corto: 'Ajustes', icono: Settings };
const IPC: Seccion = { href: '/casa/ipc', titulo: 'Índice de precios', corto: 'IPC', icono: TrendingUp };
const OBJETIVOS: Seccion = { href: '/casa/objetivos', titulo: 'Mis objetivos', corto: 'Objetivos', icono: Home };

function activa(ruta: string, href: string) {
  return href === '/casa' ? ruta === '/casa' : ruta === href || ruta.startsWith(href + '/');
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  const { bloquear, persona } = useCasa();
  // Obligaciones y lo compartido son de los adultos: los hijos y la administración técnica no tienen esa sección
  const secciones = persona?.rol === 'adulto' ? SECCIONES : SECCIONES.filter((s) => s.href !== '/casa/obligaciones');
  const actual = [...SECCIONES, AJUSTES, OBJETIVOS, IPC].find((s) => activa(ruta, s.href)) ?? SECCIONES[0];

  return (
    <div className="min-h-[100dvh] md:pl-60">
      {/* Menú lateral en pantallas grandes */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-casa-borde bg-casa-panel px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-casa-acento">EJ Casa</p>
          <p className="mt-1 text-sm text-casa-suave">{persona?.nombre}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Secciones">
          {[...secciones, AJUSTES].map((s) => {
            const Icono = s.icono;
            const on = activa(ruta, s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${on ? 'bg-casa-acento/15 text-casa-acento' : 'text-casa-suave hover:bg-casa-panel-2'}`}
              >
                <Icono size={18} /> {s.corto}
              </Link>
            );
          })}
        </nav>
        <button type="button" onClick={bloquear} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-casa-suave hover:bg-casa-panel-2">
          <Lock size={18} /> Bloquear
        </button>
      </aside>

      <header className="sticky top-0 z-20 border-b border-casa-borde bg-casa-fondo/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <div className="flex items-baseline gap-3">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-casa-acento md:hidden">EJ Casa</span>
            <h1 className="font-playfair text-xl text-casa-texto">{actual.titulo}</h1>
          </div>
          <div className="flex items-center gap-1 md:hidden">
            <Link href="/casa/ajustes" aria-label="Ajustes" className="rounded-xl p-2.5 text-casa-suave active:bg-casa-panel">
              <Settings size={20} />
            </Link>
            <button type="button" onClick={bloquear} aria-label="Bloquear ahora" className="rounded-xl p-2.5 text-casa-suave active:bg-casa-panel">
              <Lock size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-28 pt-6 md:pb-10">{children}</main>

      {/* Barra inferior en el celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-casa-borde bg-casa-panel md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Secciones"
      >
        <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${secciones.length}, minmax(0, 1fr))` }}>
          {secciones.map((s) => {
            const Icono = s.icono;
            const on = activa(ruta, s.href);
            return (
              <li key={s.href}>
                <Link
                  href={s.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold ${on ? 'text-casa-acento' : 'text-casa-suave'}`}
                >
                  <Icono size={21} />
                  {s.corto}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
