'use client';

import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, ClipboardList, Mic, PartyPopper, Truck, Undo2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fechaLarga, hoyArgentina, sumarDias } from '@/lib/gestion/calculos';

interface Movimiento {
  id: string;
  dia: string;
  tipo: 'entrega' | 'devolucion';
  cliente: string;
  lugar: string | null;
  estado: string;
}

function Boton({ icono, titulo, detalle, onClick, destacado = false }: { icono: React.ReactNode; titulo: string; detalle?: string; onClick: () => void; destacado?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[88px] flex-1 items-center gap-4 rounded-2xl p-4 text-left font-manrope shadow-sm transition active:scale-[0.99] ${
        destacado ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white text-stone-900 ring-1 ring-stone-200 hover:bg-stone-50'
      }`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${destacado ? 'bg-white/20' : 'bg-stone-100'}`}>{icono}</span>
      <span>
        <span className="block text-lg font-bold">{titulo}</span>
        {detalle && <span className={`block text-sm ${destacado ? 'text-white/80' : 'text-stone-500'}`}>{detalle}</span>}
      </span>
    </button>
  );
}

export default function InicioAdmin({
  onNuevoEvento,
  onHablar,
  onIrA,
  onAbrirEvento,
}: {
  onNuevoEvento: () => void;
  onHablar: () => void;
  onIrA: (seccion: 'calendario' | 'cotizaciones') => void;
  onAbrirEvento: (id: string) => void;
}) {
  const [movs, setMovs] = useState<Movimiento[] | null>(null);
  const [nuevas, setNuevas] = useState<number | null>(null);

  useEffect(() => {
    const hoy = hoyArgentina();
    const hasta = sumarDias(hoy, 7);
    supabase
      .from('eventos')
      .select('id, fecha_entrega, fecha_devolucion, lugar, estado, clientes(nombre_apellido)')
      .in('estado', ['confirmado', 'entregado'])
      .lte('fecha_entrega', hasta)
      .gte('fecha_devolucion', hoy)
      .then(({ data }) => {
        const lista: Movimiento[] = [];
        for (const e of (data as unknown as { id: string; fecha_entrega: string; fecha_devolucion: string; lugar: string | null; estado: string; clientes: { nombre_apellido: string } | null }[]) ?? []) {
          const cliente = e.clientes?.nombre_apellido ?? 'Sin cliente';
          if (e.estado === 'confirmado' && e.fecha_entrega >= hoy && e.fecha_entrega <= hasta) lista.push({ id: e.id, dia: e.fecha_entrega, tipo: 'entrega', cliente, lugar: e.lugar, estado: e.estado });
          if (e.fecha_devolucion >= hoy && e.fecha_devolucion <= hasta) lista.push({ id: e.id, dia: e.fecha_devolucion, tipo: 'devolucion', cliente, lugar: e.lugar, estado: e.estado });
        }
        lista.sort((a, b) => a.dia.localeCompare(b.dia));
        setMovs(lista);
      });
    supabase
      .from('cotizaciones')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .then(({ count }) => setNuevas(count ?? 0));
  }, []);

  const hoy = hoyArgentina();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-playfair text-3xl font-bold text-stone-900">Hola 👋</h1>
        <p className="mt-1 font-manrope text-sm text-stone-600">¿Qué querés hacer?</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Boton destacado icono={<PartyPopper size={26} />} titulo="Nuevo evento" detalle="Cargar un alquiler" onClick={onNuevoEvento} />
        <Boton icono={<Mic size={26} className="text-emerald-700" />} titulo="Hablar" detalle="Decir un pago, un costo o consultar" onClick={onHablar} />
        <Boton icono={<CalendarDays size={26} className="text-stone-700" />} titulo="Calendario" detalle="Ver qué hay cada día" onClick={() => onIrA('calendario')} />
      </div>

      {nuevas !== null && nuevas > 0 && (
        <button
          type="button"
          onClick={() => onIrA('cotizaciones')}
          className="flex w-full min-h-[64px] items-center gap-3 rounded-2xl bg-amber-50 p-4 text-left font-manrope ring-1 ring-amber-300"
        >
          <ClipboardList size={22} className="text-amber-700" />
          <span className="flex-1 text-sm font-semibold text-amber-900">
            {nuevas} {nuevas === 1 ? 'consulta' : 'consultas'} de la web sin contestar
          </span>
          <ChevronRight size={18} className="text-amber-700" />
        </button>
      )}

      <section>
        <h2 className="mb-2 font-playfair text-xl font-bold text-stone-900">Esta semana</h2>
        {movs === null && <p className="font-manrope text-sm text-stone-600">Cargando…</p>}
        {movs?.length === 0 && (
          <p className="rounded-2xl bg-white p-4 font-manrope text-sm text-stone-600 ring-1 ring-stone-200">No hay entregas ni devoluciones en los próximos 7 días.</p>
        )}
        <ul className="space-y-2">
          {movs?.map((m) => (
            <li key={`${m.id}-${m.tipo}`}>
              <button type="button" onClick={() => onAbrirEvento(m.id)} className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl bg-white p-3 text-left font-manrope ring-1 ring-stone-200 hover:bg-stone-50">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.tipo === 'entrega' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                  {m.tipo === 'entrega' ? <Truck size={20} /> : <Undo2 size={20} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-stone-900">
                    {m.tipo === 'entrega' ? 'Entregar' : 'Retirar'} · {m.cliente}
                  </span>
                  <span className="block truncate text-xs text-stone-500">
                    {m.dia === hoy ? 'Hoy' : fechaLarga(m.dia)}{m.lugar ? ` · ${m.lugar}` : ''}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-stone-400" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
