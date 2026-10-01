'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, MessageCircle, Phone, RefreshCw, Trash2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { telefonoParaWhatsapp } from '@/lib/phone';
import { formatearFecha } from '@/lib/services/whatsappService';
import { Aviso, BTN_PELIGRO_SUAVE, BTN_PRIMARIO, BTN_SECUNDARIO, TARJETA } from './estilos';
import { Encabezado, Mensaje } from './ui';

interface FilaCotizacion {
  id: string;
  codigo: string | null;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  fecha_evento: string;
  tipo_evento: string;
  cantidad_invitados: number;
  ubicacion: string | null;
  mobiliario_solicitado: string[] | null;
  items: Record<string, string[]> | null;
  mensaje: string | null;
  estado: string;
  created_at: string;
}

const ESTADOS = ['pendiente', 'contactado', 'confirmado', 'cancelado'];

const COLOR_ESTADO: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  contactado: 'bg-sky-100 text-sky-800',
  confirmado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-stone-200 text-stone-600',
};

export default function CotizacionesAdmin() {
  const [filas, setFilas] = useState<FilaCotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('cotizaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) setAviso({ tipo: 'error', texto: 'No se pudieron cargar las cotizaciones.' });
    else setFilas((data as FilaCotizacion[]) ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstado = async (id: string, estado: string) => {
    const { error } = await supabase.from('cotizaciones').update({ estado }).eq('id', id);
    if (error) {
      setAviso({ tipo: 'error', texto: 'No se pudo cambiar el estado.' });
      return;
    }
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, estado } : f)));
  };

  const eliminar = async (id: string) => {
    if (!window.confirm('¿Eliminar esta cotización? No se puede deshacer.')) return;
    const { error } = await supabase.from('cotizaciones').delete().eq('id', id);
    if (error) setAviso({ tipo: 'error', texto: 'No se pudo eliminar.' });
    else setFilas((prev) => prev.filter((f) => f.id !== id));
  };

  const visibles = filtro === 'todas' ? filas : filas.filter((f) => f.estado === filtro);

  return (
    <div>
      <Encabezado
        titulo="Cotizaciones"
        descripcion="Las consultas que llegan desde la web. Cambiá el estado a medida que atendés a cada cliente."
        accion={
          <button type="button" onClick={cargar} className={BTN_SECUNDARIO}>
            <RefreshCw size={16} /> Actualizar
          </button>
        }
      />

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {['todas', ...ESTADOS].map((e) => {
          const cantidad = e === 'todas' ? filas.length : filas.filter((f) => f.estado === e).length;
          const activo = filtro === e;
          return (
            <button
              key={e}
              type="button"
              onClick={() => setFiltro(e)}
              className={`shrink-0 min-h-[44px] rounded-full px-4 font-manrope text-sm font-semibold capitalize transition-colors ${
                activo ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
              }`}
            >
              {e} <span className={activo ? 'text-white/70' : 'text-stone-400'}>{cantidad}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <Mensaje aviso={aviso} />
      </div>
      {cargando && <p className="font-manrope text-sm text-stone-600">Cargando…</p>}
      {!cargando && visibles.length === 0 && (
        <div className={`${TARJETA} text-center font-manrope text-sm text-stone-600`}>No hay cotizaciones para mostrar.</div>
      )}

      <div className="space-y-4">
        {visibles.map((f) => {
          const tel = f.telefono || f.whatsapp || '';
          const grupos = f.items ?? (f.mobiliario_solicitado?.length ? { Artículos: f.mobiliario_solicitado } : {});
          return (
            <article key={f.id} className={TARJETA}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-playfair text-xl font-bold text-stone-900 break-words">{f.nombre}</h3>
                  <p className="font-manrope text-xs text-stone-500 mt-0.5">
                    #{f.codigo || f.id.slice(0, 6).toUpperCase()} · recibida {new Date(f.created_at).toLocaleString('es-AR')}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold capitalize ${COLOR_ESTADO[f.estado] ?? 'bg-stone-200 text-stone-700'}`}>
                  {f.estado}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-stone-50 p-3 font-manrope text-sm text-stone-800 sm:grid-cols-2">
                <p><strong>{f.tipo_evento}</strong> · {formatearFecha(f.fecha_evento)}</p>
                <p className="flex items-center gap-1.5"><Users size={15} className="text-stone-500" /> {f.cantidad_invitados} invitados</p>
                <p className="flex items-center gap-1.5 sm:col-span-2"><MapPin size={15} className="text-stone-500 shrink-0" /> {f.ubicacion || '—'}</p>
                <p className="flex items-center gap-1.5 sm:col-span-2"><Phone size={15} className="text-stone-500" /> {tel || '—'}</p>
              </div>

              {Object.keys(grupos).length > 0 && (
                <div className="mt-4 space-y-1 font-manrope text-sm">
                  {Object.entries(grupos).map(([cat, lista]) => (
                    <p key={cat} className="text-stone-800">
                      <strong className="text-stone-900">{cat}:</strong> {lista.join(', ')}
                    </p>
                  ))}
                </div>
              )}
              {f.mensaje && <p className="mt-3 rounded-lg border-l-4 border-amber-300 bg-amber-50 p-3 font-manrope text-sm italic text-stone-700">“{f.mensaje}”</p>}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  aria-label="Estado de la cotización"
                  value={f.estado}
                  onChange={(e) => cambiarEstado(f.id, e.target.value)}
                  className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-3 font-manrope text-sm font-semibold capitalize text-stone-800 sm:w-44"
                >
                  {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                {tel && (
                  <>
                    <a href={`https://wa.me/${telefonoParaWhatsapp(tel)}`} target="_blank" rel="noopener noreferrer" className={BTN_PRIMARIO}>
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                    <a href={`tel:+${telefonoParaWhatsapp(tel)}`} className={BTN_SECUNDARIO}>
                      <Phone size={16} /> Llamar
                    </a>
                  </>
                )}
                <button type="button" onClick={() => eliminar(f.id)} className={`${BTN_PELIGRO_SUAVE} sm:ml-auto`}>
                  <Trash2 size={16} /> Eliminar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
