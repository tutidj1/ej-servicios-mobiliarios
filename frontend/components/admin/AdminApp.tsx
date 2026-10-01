'use client';

import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ClipboardList, ExternalLink, Image as IconoImagen, LogOut, Menu, Package, Percent, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CotizacionesAdmin from './CotizacionesAdmin';
import ProductosAdmin from './ProductosAdmin';
import PromoAdmin from './PromoAdmin';
import BannersAdmin from './BannersAdmin';
import { BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA } from './estilos';

type Seccion = 'cotizaciones' | 'productos' | 'banners' | 'promo';

const SECCIONES: { id: Seccion; nombre: string; icono: React.ReactNode }[] = [
  { id: 'cotizaciones', nombre: 'Cotizaciones', icono: <ClipboardList size={20} /> },
  { id: 'productos', nombre: 'Productos', icono: <Package size={20} /> },
  { id: 'banners', nombre: 'Banners', icono: <IconoImagen size={20} /> },
  { id: 'promo', nombre: 'Promo', icono: <Percent size={20} /> },
];

function Marca({ oscuro = false }: { oscuro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-11 w-11 shrink-0 rounded-xl bg-acento-amarillo text-stone-900 flex items-center justify-center font-playfair font-bold text-lg">
        EJ
      </div>
      <div className="leading-tight">
        <p className={`font-playfair font-bold text-base ${oscuro ? 'text-white' : 'text-stone-900'}`}>Panel Administrador</p>
        <p className={`font-manrope text-xs ${oscuro ? 'text-stone-400' : 'text-stone-500'}`}>EJ Servicios Mobiliarios</p>
      </div>
    </div>
  );
}

export default function AdminApp() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [errorAdmin, setErrorAdmin] = useState('');
  const [seccion, setSeccion] = useState<Seccion>('cotizaciones');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setCargando(false);
    });
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);
    });
    return () => suscripcion.subscription.unsubscribe();
  }, []);

  // Verifica en la base de datos si la cuenta es la del administrador
  useEffect(() => {
    if (!sesion) {
      setEsAdmin(null);
      return;
    }
    supabase.rpc('es_admin').then(({ data, error }) => {
      if (error) {
        setErrorAdmin('No se pudo verificar la cuenta. Intentá de nuevo en un momento.');
        setEsAdmin(false);
      } else {
        setEsAdmin(data === true);
      }
    });
  }, [sesion]);

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setErrorLogin('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
    if (error) setErrorLogin('Email o contraseña incorrectos.');
    setClave('');
    setEntrando(false);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setEsAdmin(null);
    setMenuAbierto(false);
  };

  const pantallaCentrada = (contenido: React.ReactNode) => (
    <main className="min-h-dvh flex items-center justify-center px-5 py-10 bg-stone-900">{contenido}</main>
  );

  if (cargando) {
    return pantallaCentrada(<p className="font-manrope text-sm text-stone-300">Cargando…</p>);
  }

  // Sin sesión: pantalla de ingreso (el formulario está vacío; las credenciales no están en el código)
  if (!sesion) {
    return pantallaCentrada(
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-6">
          <Marca />
        </div>
        <h1 className="font-playfair text-2xl font-bold text-stone-900 mb-1">Ingresar</h1>
        <p className="font-manrope text-sm text-stone-600 mb-6">Acceso solo para administradores.</p>

        <form onSubmit={iniciarSesion} autoComplete="on">
          <label htmlFor="admin-email" className={ETIQUETA}>Email</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${CAMPO} mb-4`}
          />
          <label htmlFor="admin-clave" className={ETIQUETA}>Contraseña</label>
          <input
            id="admin-clave"
            type="password"
            autoComplete="current-password"
            required
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className={`${CAMPO} mb-4`}
          />
          {errorLogin && <p role="alert" className="text-sm font-medium text-red-700 mb-4">{errorLogin}</p>}
          <button type="submit" disabled={entrando} className={`${BTN_PRIMARIO} w-full min-h-[48px]`}>
            {entrando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    );
  }

  if (esAdmin === null) {
    return pantallaCentrada(<p className="font-manrope text-sm text-stone-300">Verificando cuenta…</p>);
  }

  // Sesión válida pero no es la cuenta administradora
  if (!esAdmin) {
    return pantallaCentrada(
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl">
        <h1 className="font-playfair text-xl font-bold text-stone-900 mb-2">Sin acceso</h1>
        <p className="font-manrope text-sm text-stone-600 mb-6">
          {errorAdmin || 'Esta cuenta no tiene permisos de administrador.'}
        </p>
        <button type="button" onClick={cerrarSesion} className={`${BTN_SECUNDARIO} w-full`}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  const actual = SECCIONES.find((s) => s.id === seccion)!;

  return (
    <div className="min-h-dvh bg-[#E9E5DC] md:flex">
      {/* Fondo oscuro detrás del menú en celular */}
      {menuAbierto && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMenuAbierto(false)} aria-hidden="true" />
      )}

      {/* Menú lateral */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-stone-900 text-stone-100 transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-dvh md:shrink-0 md:self-start md:translate-x-0 ${
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú del panel"
      >
        <div className="flex items-start justify-between px-5 pt-6 pb-5 border-b border-white/10">
          <Marca oscuro />
          <button
            type="button"
            onClick={() => setMenuAbierto(false)}
            className="md:hidden -mr-2 -mt-1 h-11 w-11 flex items-center justify-center text-stone-300"
            aria-label="Cerrar menú"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Secciones">
          {SECCIONES.map((s) => {
            const activa = s.id === seccion;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSeccion(s.id);
                  setMenuAbierto(false);
                }}
                aria-current={activa ? 'page' : undefined}
                className={`flex w-full items-center gap-3 min-h-[48px] rounded-xl px-4 font-manrope text-sm font-semibold transition-colors ${
                  activa ? 'bg-acento-amarillo text-stone-900' : 'text-stone-300 hover:bg-white/10'
                }`}
              >
                {s.icono}
                {s.nombre}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-3 min-h-[44px] rounded-xl px-4 font-manrope text-sm text-stone-300 hover:bg-white/10"
          >
            <ExternalLink size={18} /> Ver la web
          </a>
          <button
            type="button"
            onClick={cerrarSesion}
            className="flex w-full items-center gap-3 min-h-[44px] rounded-xl px-4 font-manrope text-sm font-semibold text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} /> Cerrar sesión de trabajo
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Barra superior (solo celular) */}
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-stone-900 px-4 py-2 text-white md:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            className="-ml-2 h-11 w-11 flex items-center justify-center"
            aria-label="Abrir menú"
          >
            <Menu size={24} />
          </button>
          <span className="flex items-center gap-2 font-manrope text-sm font-semibold">
            {actual.icono} {actual.nombre}
          </span>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 md:py-10">
          {seccion === 'cotizaciones' && <CotizacionesAdmin />}
          {seccion === 'productos' && <ProductosAdmin />}
          {seccion === 'banners' && <BannersAdmin />}
          {seccion === 'promo' && <PromoAdmin />}
        </main>
      </div>
    </div>
  );
}
