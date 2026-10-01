'use client';

import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import CotizacionesAdmin from './CotizacionesAdmin';
import ProductosAdmin from './ProductosAdmin';
import PromoAdmin from './PromoAdmin';
import BannersAdmin from './BannersAdmin';
import { BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA } from './estilos';

type Pestana = 'cotizaciones' | 'productos' | 'banners' | 'promo';

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: 'cotizaciones', nombre: 'Cotizaciones' },
  { id: 'productos', nombre: 'Productos' },
  { id: 'banners', nombre: 'Banners' },
  { id: 'promo', nombre: 'Promo' },
];

export default function AdminApp() {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [errorAdmin, setErrorAdmin] = useState('');
  const [pestana, setPestana] = useState<Pestana>('cotizaciones');

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
        setErrorAdmin('No se pudo verificar la cuenta. ¿Ya ejecutaste la migración 0003 en Supabase?');
        setEsAdmin(false);
      } else {
        setEsAdmin(data === true);
      }
    });
  }, [sesion]);

  const iniciarConClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setErrorLogin('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
    if (error) setErrorLogin('Email o contraseña incorrectos.');
    setEntrando(false);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setEsAdmin(null);
  };

  if (cargando) {
    return <main className="min-h-dvh flex items-center justify-center font-manrope text-sm text-gris-suave">Cargando…</main>;
  }

  // Sin sesión: pantalla de ingreso
  if (!sesion) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-5 py-10 bg-crema-base">
        <div className="w-full max-w-sm bg-blanco-puro border border-gris-borde p-6">
          <h1 className="font-playfair text-2xl font-bold text-negro-carbon mb-1">Panel EJ</h1>
          <p className="font-manrope text-sm text-gris-suave mb-6">Acceso solo para administradores.</p>

          <form onSubmit={iniciarConClave}>
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
            {errorLogin && <p role="alert" className="text-sm text-red-700 mb-4">{errorLogin}</p>}
            <button type="submit" disabled={entrando} className={`${BTN_PRIMARIO} w-full`}>
              {entrando ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (esAdmin === null) {
    return <main className="min-h-dvh flex items-center justify-center font-manrope text-sm text-gris-suave">Verificando cuenta…</main>;
  }

  // Sesión válida pero no es la cuenta administradora
  if (!esAdmin) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-5 bg-crema-base">
        <div className="w-full max-w-sm bg-blanco-puro border border-gris-borde p-6 text-center">
          <h1 className="font-playfair text-xl font-bold text-negro-carbon mb-2">Sin acceso</h1>
          <p className="font-manrope text-sm text-gris-suave mb-6">
            {errorAdmin || 'Esta cuenta no tiene permisos de administrador.'}
          </p>
          <button type="button" onClick={cerrarSesion} className={`${BTN_SECUNDARIO} w-full`}>
            Cerrar sesión
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-crema-base">
      <header className="sticky top-0 z-20 bg-negro-carbon text-crema-base">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <span className="font-playfair font-bold text-lg">Panel EJ</span>
          <button type="button" onClick={cerrarSesion} className="min-h-[44px] px-2 font-manrope text-xs uppercase tracking-wider underline">
            Cerrar sesión
          </button>
        </div>
        <nav className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto" aria-label="Secciones">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPestana(p.id)}
              aria-current={pestana === p.id ? 'page' : undefined}
              className={`flex-1 min-h-[48px] font-manrope text-xs font-bold uppercase tracking-wider border-b-2 ${
                pestana === p.id ? 'border-acento-amarillo text-acento-amarillo' : 'border-transparent text-crema-base/70'
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {pestana === 'cotizaciones' && <CotizacionesAdmin />}
        {pestana === 'productos' && <ProductosAdmin />}
        {pestana === 'banners' && <BannersAdmin />}
        {pestana === 'promo' && <PromoAdmin />}
      </main>
    </div>
  );
}
