'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fechaLarga, hoyArgentina, sumarDias } from '@/lib/gestion/calculos';
import { type FilaDisponibilidad, type Item, mensajeError } from '@/lib/gestion/tipos';
import { type Aviso, BTN_PRIMARIO, CAMPO, ETIQUETA, TARJETA } from '../estilos';
import { Encabezado, Mensaje } from '../ui';

interface Ocupante {
  item_id: string;
  cantidad_propia: number;
  cantidad_total: number;
  eventos: { id: string; estado: string; fecha_entrega: string; fecha_devolucion: string; clientes: { nombre_apellido: string } | null } | null;
}

export default function DisponibilidadAdmin({ onAbrirEvento }: { onAbrirEvento: (id: string) => void }) {
  const hoy = hoyArgentina();
  const [items, setItems] = useState<Item[]>([]);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(sumarDias(hoy, 6));
  const [necesito, setNecesito] = useState('');
  const [filas, setFilas] = useState<FilaDisponibilidad[] | null>(null);
  const [ocupantes, setOcupantes] = useState<Ocupante[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [consultando, setConsultando] = useState(false);

  useEffect(() => {
    supabase
      .from('items')
      .select('*')
      .eq('activo', true)
      .order('orden_contrato', { nullsFirst: false })
      .then(({ data }) => {
        const lista = (data as Item[]) ?? [];
        setItems(lista);
        const sillas = lista.find((i) => i.nombre.toLowerCase().startsWith('silla'));
        if (sillas) setElegidos([sillas.id]);
      });
  }, []);

  const consultar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elegidos.length) return setAviso({ tipo: 'error', texto: 'Elegí al menos un artículo.' });
    if (desde > hasta) return setAviso({ tipo: 'error', texto: 'La fecha "desde" tiene que ser anterior a "hasta".' });
    setAviso(null);
    setConsultando(true);
    const [d, o] = await Promise.all([
      supabase.rpc('disponibilidad', { p_items: elegidos, p_desde: desde, p_hasta: hasta }),
      supabase
        .from('evento_lineas')
        .select('item_id, cantidad_propia, cantidad_total, eventos!inner(id, estado, fecha_entrega, fecha_devolucion, clientes(nombre_apellido))')
        .in('item_id', elegidos)
        .lte('eventos.fecha_entrega', hasta)
        .gte('eventos.fecha_devolucion', desde)
        .in('eventos.estado', ['presupuesto', 'confirmado', 'entregado']),
    ]);
    setConsultando(false);
    if (d.error) return setAviso({ tipo: 'error', texto: mensajeError(d.error, 'No se pudo consultar.') });
    setFilas((d.data as FilaDisponibilidad[]) ?? []);
    setOcupantes((o.data as unknown as Ocupante[]) ?? []);
  };

  const cantidadNecesaria = Number(necesito) || 0;
  const porItem = useMemo(() => {
    const m: Record<string, FilaDisponibilidad[]> = {};
    for (const f of filas ?? []) (m[f.item_id] ??= []).push(f);
    return m;
  }, [filas]);

  return (
    <div>
      <Encabezado titulo="Disponibilidad" descripcion="¿Tengo 150 sillas para el 21? Elegí artículos y fechas y te muestra lo libre día por día." />
      <form onSubmit={consultar} className={`${TARJETA} mb-5 space-y-4`}>
        <div>
          <p className={ETIQUETA}>Artículos</p>
          <div className="flex flex-wrap gap-2">
            {items.map((i) => {
              const activo = elegidos.includes(i.id);
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setElegidos(activo ? elegidos.filter((x) => x !== i.id) : [...elegidos, i.id])}
                  className={`min-h-[44px] rounded-full px-4 font-manrope text-sm font-semibold ${activo ? 'bg-stone-900 text-white' : 'border border-stone-300 bg-white text-stone-700'}`}
                  aria-pressed={activo}
                >
                  {i.nombre}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={ETIQUETA} htmlFor="di-desde">Desde</label>
            <input id="di-desde" type="date" className={CAMPO} value={desde} onChange={(e) => { setDesde(e.target.value); if (hasta < e.target.value) setHasta(e.target.value); }} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="di-hasta">Hasta</label>
            <input id="di-hasta" type="date" className={CAMPO} value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="di-necesito">Necesito (opcional)</label>
            <input id="di-necesito" className={CAMPO} inputMode="numeric" placeholder="ej. 150" value={necesito} onChange={(e) => setNecesito(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
        <button type="submit" disabled={consultando} className={`${BTN_PRIMARIO} min-h-[52px]`}>{consultando ? 'Consultando…' : 'Consultar'}</button>
        <Mensaje aviso={aviso} />
      </form>

      {filas && elegidos.map((itemId) => {
        const dias = porItem[itemId] ?? [];
        const item = items.find((i) => i.id === itemId);
        if (!item || dias.length === 0) return null;
        const minimo = Math.min(...dias.map((d) => d.disponible));
        return (
          <section key={itemId} className={`${TARJETA} mb-4 font-manrope`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-playfair text-xl font-bold">{item.nombre}</h2>
              <p className="text-sm">
                Libres en todo el rango: <strong className="text-lg">{Math.max(0, minimo)}</strong> de {item.stock_total}
                {cantidadNecesaria > 0 && (
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${cantidadNecesaria <= minimo ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                    {cantidadNecesaria <= minimo ? 'Alcanza' : `Faltan ${cantidadNecesaria - Math.max(0, minimo)}: hay que subalquilar`}
                  </span>
                )}
              </p>
            </div>
            <ul className="divide-y divide-stone-100">
              {dias.map((d) => {
                const del = ocupantes.filter(
                  (o) => o.item_id === itemId && o.eventos && o.eventos.fecha_entrega <= d.dia && d.dia <= o.eventos.fecha_devolucion,
                );
                return (
                  <li key={d.dia} className="flex flex-wrap items-start gap-x-3 py-2 text-sm">
                    <span className="w-28 shrink-0 capitalize text-stone-700">{fechaLarga(d.dia)}</span>
                    <span className={`w-16 shrink-0 text-right font-bold tabular-nums ${d.disponible < 0 ? 'text-red-700' : ''}`}>{d.disponible}</span>
                    <span className="min-w-0 flex-1 text-stone-600">
                      {del.length === 0
                        ? 'libre'
                        : del.map((o) => (
                            <button key={o.eventos!.id} type="button" className="mr-2 underline decoration-stone-300" onClick={() => onAbrirEvento(o.eventos!.id)}>
                              {o.eventos!.clientes?.nombre_apellido} ({o.eventos!.estado === 'presupuesto' ? `presupuesto: ${o.cantidad_total}` : o.cantidad_propia})
                            </button>
                          ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
