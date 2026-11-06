'use client';

import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Boxes,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  House,
  Image as IconoImagen,
  LogOut,
  Menu,
  Mic,
  Package,
  PartyPopper,
  Percent,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBloqueoScroll } from '@/lib/useMovil';
import CotizacionesAdmin from './CotizacionesAdmin';
import ProductosAdmin from './ProductosAdmin';
import PromoAdmin from './PromoAdmin';
import BannersAdmin from './BannersAdmin';
import EventosAdmin from './gestion/EventosAdmin';
import CalendarioAdmin from './gestion/CalendarioAdmin';
import ClientesAdmin from './gestion/ClientesAdmin';
import InventarioAdmin from './gestion/InventarioAdmin';
import InicioAdmin from './gestion/InicioAdmin';
import PreciosAdmin from './gestion/PreciosAdmin';
import AsistenteVoz from './gestion/AsistenteVoz';
import { BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA } from './estilos';

type Seccion =
  | 'inicio'
  | 'eventos'
  | 'calendario'
  | 'clientes'
  | 'inventario'
  | 'precios'
  | 'cotizaciones'
  | 'productos'
  | 'banners'
  | 'promo';

type Rol = 'admin' | 'operadora' | 'ninguno';

// "soloAdmin": lo que se publica en la web pública. La operadora no lo ve.
const SECCIONES: { id: Seccion; nombre: string; icono: React.ReactNode; soloAdmin?: boolean; grupo: 'gestion' | 'web' }[] = [
  { id: 'inicio', nombre: 'Inicio', icono: <House size={20} />, grupo: 'gestion' },
  { id: 'eventos', nombre: 'Eventos', icono: <PartyPopper size={20} />, grupo: 'gestion' },
  { id: 'calendario', nombre: 'Calendario', icono: <CalendarDays size={20} />, grupo: 'gestion' },
  { id: 'clientes', nombre: 'Clientes', icono: <Users size={20} />, grupo: 'gestion' },
  { id: 'inventario', nombre: 'Stock', icono: <Boxes size={20} />, grupo: 'gestion' },
  { id: 'precios', nombre: 'Precios', icono: <TrendingUp size={20} />, grupo: 'gestion' },
  { id: 'cotizaciones', nombre: 'Cotizaciones web', icono: <ClipboardList size={20} />, grupo: 'web' },
  { id: 'productos', nombre: 'Productos', icono: <Package size={20} />, soloAdmin: true, grupo: 'web' },
  { id: 'banners', nombre: 'Banners', icono: <IconoImagen size={20} />, soloAdmin: true, grupo: 'web' },
  { id: 'promo', nombre: 'Promo', icono: <Percent size={20} />, soloAdmin: true, grupo: 'web' },
];

/**
 * Rol de la cuenta. Si todavía no se aplicó la migración 0007 (no existe mi_rol),
 * se usa la verificación anterior (es_admin) y el panel sigue funcionando como antes.
 */
async function consultarRol(): Promise<{ rol: Rol; gestionDisponible: boolean } | { error: true }> {
  const r = await supabase.rpc('mi_rol');
  if (!r.error) {
    const rol = r.data === 'admin' || r.data === 'operadora' ? r.data : 'ninguno';
    return { rol, gestionDisponible: true };
  }
  const a = await supabase.rpc('es_admin');
  if (a.error) return { error: true };
  return { rol: a.data === true ? 'admin' : 'ninguno', gestionDisponible: false };
}

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
  const [rol, setRol] = useState<Rol | null>(null);
  const [gestionDisponible, setGestionDisponible] = useState(false);
  const [errorAdmin, setErrorAdmin] = useState('');
  const [seccion, setSeccion] = useState<Seccion>('inicio');
  const [eventoAbierto, setEventoAbierto] = useState<string | null>(null);
  const [vozAbierta, setVozAbierta] = useState(false);
  // Cambia cada vez que se toca "Nuevo evento", para abrir el formulario de alta
  const [altaClave, setAltaClave] = useState(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
  useBloqueoScroll(menuAbierto);

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

  // Verifica en la base de datos qué rol tiene la cuenta (admin u operadora)
  const usuarioId = sesion?.user.id;
  useEffect(() => {
    if (!usuarioId) {
      setRol(null);
      return;
    }
    consultarRol().then((r) => {
      if ('error' in r) {
        setErrorAdmin('No se pudo verificar la cuenta. Intentá de nuevo en un momento.');
        setRol('ninguno');
        return;
      }
      setRol(r.rol);
      setGestionDisponible(r.gestionDisponible);
      // Sin la migración de gestión aplicada, se abre en Cotizaciones como antes
      if (!r.gestionDisponible) setSeccion('cotizaciones');
    });
  }, [usuarioId]);

  const abrirEvento = (id: string | null) => {
    setEventoAbierto(id);
    if (id) setSeccion('eventos');
    window.scrollTo({ top: 0 });
  };

  const irA = (s: Seccion) => {
    setSeccion(s);
    if (s === 'eventos') setEventoAbierto(null);
    setMenuAbierto(false);
    window.scrollTo({ top: 0 });
  };

  const nuevoEvento = () => {
    setEventoAbierto(null);
    setSeccion('eventos');
    setAltaClave((k) => k + 1);
    setMenuAbierto(false);
  };

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
    setRol(null);
    setEventoAbierto(null);
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
        <p className="font-manrope text-sm text-stone-600 mb-6">Acceso solo para el equipo de EJ.</p>

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

  if (rol === null) {
    return pantallaCentrada(<p className="font-manrope text-sm text-stone-300">Verificando cuenta…</p>);
  }

  // Sesión válida pero la cuenta no tiene rol asignado
  if (rol === 'ninguno') {
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

  const esAdmin = rol === 'admin';
  const visibles = SECCIONES.filter((s) => (esAdmin || !s.soloAdmin) && (gestionDisponible || s.grupo === 'web'));
  const actual = visibles.find((s) => s.id === seccion) ?? visibles[0];

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

        {gestionDisponible && (
          <div className="px-3 pt-4">
            <button
              type="button"
              onClick={() => { setVozAbierta(true); setMenuAbierto(false); }}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-600 font-manrope text-sm font-bold text-white hover:bg-emerald-700"
            >
              <Mic size={20} /> Hablar
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Secciones">
          {visibles.map((s, i) => {
            const activa = s.id === actual.id;
            const titulo = i === 0 || visibles[i - 1].grupo !== s.grupo;
            return (
              <React.Fragment key={s.id}>
              {titulo && gestionDisponible && (
                <p className={`px-4 pb-1 font-manrope text-[11px] font-bold uppercase tracking-wider text-stone-500 ${i > 0 ? 'pt-4' : ''}`}>
                  {s.grupo === 'gestion' ? 'Alquileres' : 'Página web'}
                </p>
              )}
              <button
                type="button"
                onClick={() => irA(s.id)}
                aria-current={activa ? 'page' : undefined}
                className={`flex w-full items-center gap-3 min-h-[48px] rounded-xl px-4 font-manrope text-sm font-semibold transition-colors ${
                  activa ? 'bg-acento-amarillo text-stone-900' : 'text-stone-300 hover:bg-white/10'
                }`}
              >
                {s.icono}
                {s.nombre}
              </button>
              </React.Fragment>
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
          <span className="flex items-center gap-2 font-manrope text-sm font-semibold">
            {actual.icono} {actual.nombre}
          </span>
        </header>

        <main className={`mx-auto max-w-5xl px-4 py-6 sm:px-8 md:py-10 ${gestionDisponible ? 'pb-28 md:pb-10' : ''}`}>
          {actual.id === 'inicio' && (
            <InicioAdmin
              onNuevoEvento={nuevoEvento}
              onHablar={() => setVozAbierta(true)}
              onIrA={irA}
              onAbrirEvento={abrirEvento}
            />
          )}
          {actual.id === 'eventos' && <EventosAdmin key={altaClave} altaInicial={altaClave > 0} abierto={eventoAbierto} onAbrir={abrirEvento} esAdmin={esAdmin} />}
          {actual.id === 'calendario' && <CalendarioAdmin onAbrirEvento={abrirEvento} />}
          {actual.id === 'clientes' && <ClientesAdmin />}
          {actual.id === 'inventario' && <InventarioAdmin />}
          {actual.id === 'precios' && <PreciosAdmin />}
          {actual.id === 'cotizaciones' && (
            <CotizacionesAdmin puedeConvertir={gestionDisponible} puedeEliminar={esAdmin} onEventoCreado={abrirEvento} />
          )}
          {esAdmin && actual.id === 'productos' && <ProductosAdmin />}
          {esAdmin && actual.id === 'banners' && <BannersAdmin />}
          {esAdmin && actual.id === 'promo' && <PromoAdmin />}
        </main>
      </div>

      {gestionDisponible && (
        <>
          {/* Barra de abajo (celular): lo más usado, con el micrófono en el centro */}
          <nav className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 items-end border-t border-stone-300 bg-white md:hidden" aria-label="Atajos">
            {([
              ['inicio', 'Inicio', <House key="i" size={22} />],
              ['eventos', 'Eventos', <PartyPopper key="e" size={22} />],
            ] as const).map(([id, texto, icono]) => (
              <button key={id} type="button" onClick={() => irA(id)} aria-current={actual.id === id ? 'page' : undefined} className={`flex h-16 flex-col items-center justify-center gap-0.5 font-manrope text-[11px] font-semibold ${actual.id === id ? 'text-emerald-700' : 'text-stone-500'}`}>
                {icono}
                {texto}
              </button>
            ))}
            <div className="flex justify-center">
              <button type="button" onClick={() => setVozAbierta(true)} className="-mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg ring-4 ring-white active:scale-95" aria-label="Hablar">
                <Mic size={28} />
              </button>
            </div>
            <button type="button" onClick={() => irA('calendario')} aria-current={actual.id === 'calendario' ? 'page' : undefined} className={`flex h-16 flex-col items-center justify-center gap-0.5 font-manrope text-[11px] font-semibold ${actual.id === 'calendario' ? 'text-emerald-700' : 'text-stone-500'}`}>
              <CalendarDays size={22} />
              Calendario
            </button>
            <button type="button" onClick={() => setMenuAbierto(true)} className="flex h-16 flex-col items-center justify-center gap-0.5 font-manrope text-[11px] font-semibold text-stone-500">
              <Menu size={22} />
              Más
            </button>
          </nav>

          <AsistenteVoz
            abierto={vozAbierta}
            onCerrar={() => setVozAbierta(false)}
            eventoActual={actual.id === 'eventos' ? eventoAbierto : null}
            onAbrirEvento={abrirEvento}
          />
        </>
      )}
    </div>
  );
}
