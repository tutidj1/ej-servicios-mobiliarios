'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { telefonoParaWhatsapp } from '@/lib/phone';
import { formatearFecha } from '@/lib/services/whatsappService';
import { Aviso, BTN_PELIGRO, BTN_SECUNDARIO, CAMPO, TARJETA } from './estilos';

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
  pendiente: 'bg-acento-amarillo text-negro-carbon',
  contactado: 'bg-blanco-puro text-negro-carbon border border-negro-carbon',
  confirmado: 'bg-negro-carbon text-crema-base',
  cancelado: 'bg-gris-borde text-gris-suave',
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
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {['todas', ...ESTADOS].map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setFiltro(e)}
            className={`shrink-0 min-h-[44px] px-4 border font-manrope text-xs font-semibold uppercase tracking-wider ${
              filtro === e ? 'bg-negro-carbon text-crema-base border-negro-carbon' : 'bg-blanco-puro border-gris-borde text-negro-carbon'
            }`}
          >
            {e}
            {e === 'todas' ? ` (${filas.length})` : ` (${filas.filter((f) => f.estado === e).length})`}
          </button>
        ))}
        <button type="button" onClick={cargar} className="shrink-0 min-h-[44px] px-4 font-manrope text-xs font-semibold uppercase tracking-wider underline">
          Actualizar
        </button>
      </div>

      {aviso && <p role="alert" className="p-3 border border-red-600 text-sm text-red-700">{aviso.texto}</p>}
      {cargando && <p className="font-manrope text-sm text-gris-suave">Cargando…</p>}
      {!cargando && visibles.length === 0 && (
        <p className="font-manrope text-sm text-gris-suave">No hay cotizaciones para mostrar.</p>
      )}

      {visibles.map((f) => {
        const tel = f.telefono || f.whatsapp || '';
        const grupos = f.items ?? (f.mobiliario_solicitado?.length ? { Artículos: f.mobiliario_solicitado } : {});
        return (
          <article key={f.id} className={TARJETA}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-playfair text-lg font-bold text-negro-carbon">{f.nombre}</h3>
                <p className="font-manrope text-xs text-gris-suave">
                  #{f.codigo || f.id.slice(0, 6).toUpperCase()} · recibida {new Date(f.created_at).toLocaleString('es-AR')}
                </p>
              </div>
              <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${COLOR_ESTADO[f.estado] ?? ''}`}>
                {f.estado}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 font-manrope text-sm text-negro-carbon">
              <div><dt className="inline font-semibold">Evento: </dt><dd className="inline">{f.tipo_evento}</dd></div>
              <div><dt className="inline font-semibold">Fecha: </dt><dd className="inline">{formatearFecha(f.fecha_evento)}</dd></div>
              <div><dt className="inline font-semibold">Invitados: </dt><dd className="inline">{f.cantidad_invitados}</dd></div>
              <div><dt className="inline font-semibold">Lugar: </dt><dd className="inline">{f.ubicacion || '—'}</dd></div>
              <div><dt className="inline font-semibold">Teléfono: </dt><dd className="inline">{tel || '—'}</dd></div>
            </dl>

            {Object.keys(grupos).length > 0 && (
              <div className="mt-3 font-manrope text-sm">
                {Object.entries(grupos).map(([cat, lista]) => (
                  <p key={cat} className="text-negro-carbon">
                    <strong>{cat}:</strong> {lista.join(', ')}
                  </p>
                ))}
              </div>
            )}
            {f.mensaje && <p className="mt-3 font-manrope text-sm italic text-gris-suave">“{f.mensaje}”</p>}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <select
                aria-label="Estado de la cotización"
                value={f.estado}
                onChange={(e) => cambiarEstado(f.id, e.target.value)}
                className={`${CAMPO} sm:w-44`}
              >
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              {tel && (
                <>
                  <a
                    href={`https://wa.me/${telefonoParaWhatsapp(tel)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={BTN_SECUNDARIO}
                  >
                    WhatsApp
                  </a>
                  <a href={`tel:+${telefonoParaWhatsapp(tel)}`} className={BTN_SECUNDARIO}>Llamar</a>
                </>
              )}
              <button type="button" onClick={() => eliminar(f.id)} className={`${BTN_PELIGRO} sm:ml-auto`}>
                Eliminar
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
