'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hoyArgentina, pesos, sumarDias } from '@/lib/gestion/calculos';
import { type EstadisticaItem, type LineaHistorial, estadisticasPorItem, resumenGeneral } from '@/lib/gestion/estadisticas';
import { mensajeError } from '@/lib/gestion/tipos';
import { type Aviso, TARJETA } from '../estilos';
import { Encabezado, Interruptor, Mensaje } from '../ui';

type Periodo = 'todo' | 'anio' | 'seis';
const PERIODOS: { id: Periodo; texto: string }[] = [
  { id: 'todo', texto: 'Todo' },
  { id: 'anio', texto: 'Este año' },
  { id: 'seis', texto: 'Últimos 6 meses' },
];

const plata = (n: number) => pesos(Math.round(n * 100)).replace(/,00$/, '');

function Barra({ valor, maximo, destacada }: { valor: number; maximo: number; destacada: boolean }) {
  const ancho = maximo > 0 ? Math.max(4, Math.round((valor / maximo) * 100)) : 0;
  return (
    <div className="h-2.5 w-full rounded-full bg-stone-100" aria-hidden="true">
      <div className={`h-full rounded-full ${destacada ? 'bg-emerald-600' : 'bg-stone-400'}`} style={{ width: `${ancho}%` }} />
    </div>
  );
}

function TarjetaItem({ it }: { it: EstadisticaItem }) {
  const [abierto, setAbierto] = useState(false);
  const maxEventos = Math.max(...it.precios.map((p) => p.eventos));
  const unPrecio = it.precios.length === 1;
  const dif = it.ganadorVsPromedioPct;
  return (
    <article className={TARJETA}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-playfair text-xl font-bold text-stone-900 break-words">{it.nombre}</h3>
          <p className="font-manrope text-xs text-stone-500">
            {it.eventos} {it.eventos === 1 ? 'evento' : 'eventos'} · {it.unidades} unidades · {plata(it.ingresos)} facturados
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 font-manrope">
        <div className="rounded-xl bg-stone-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Promedio por unidad</p>
          <p className="text-xl font-bold tabular-nums text-stone-900">{plata(it.precioPromedio)}</p>
          <p className="text-[11px] text-stone-500">de {plata(it.minimo)} a {plata(it.maximo)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            <Trophy size={12} /> Precio ganador
          </p>
          <p className="text-xl font-bold tabular-nums text-emerald-900">{plata(it.ganador.precio)}</p>
          <p className="text-[11px] text-emerald-800">
            {it.ganador.eventos} {it.ganador.eventos === 1 ? 'evento' : 'eventos'}
          </p>
        </div>
      </div>

      <p className="mt-3 font-manrope text-sm text-stone-700">
        {unPrecio
          ? 'Todavía siempre lo alquilaste al mismo precio.'
          : `A ${plata(it.ganador.precio)} conseguís más eventos. Es ${Math.abs(dif).toLocaleString('es-AR', { maximumFractionDigits: 1 })}% ${dif >= 0 ? 'más caro' : 'más barato'} que tu promedio.`}
      </p>

      {!unPrecio && (
        <>
          <button type="button" onClick={() => setAbierto(!abierto)} className="mt-2 min-h-[44px] font-manrope text-sm font-semibold text-emerald-800 underline">
            {abierto ? 'Ocultar el detalle' : 'Ver cada precio'}
          </button>
          {abierto && (
            <ul className="mt-1 space-y-3">
              {it.precios.map((p, i) => (
                <li key={p.precio} className="font-manrope">
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-bold tabular-nums text-stone-900">
                      {plata(p.precio)} {i === 0 && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">ganador</span>}
                    </span>
                    <span className="text-xs text-stone-500">
                      {p.eventos} {p.eventos === 1 ? 'evento' : 'eventos'} · {p.unidades} un. · {plata(p.ingresos)}
                    </span>
                  </div>
                  <Barra valor={p.eventos} maximo={maxEventos} destacada={i === 0} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}

export default function PreciosAdmin() {
  const [periodo, setPeriodo] = useState<Periodo>('todo');
  const [conPresupuestos, setConPresupuestos] = useState(false);
  const [lineas, setLineas] = useState<LineaHistorial[] | null>(null);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const cargar = useCallback(async () => {
    setLineas(null);
    const hoy = hoyArgentina();
    const desde = periodo === 'anio' ? `${hoy.slice(0, 4)}-01-01` : periodo === 'seis' ? sumarDias(hoy, -183) : null;
    let q = supabase
      .from('evento_lineas')
      .select('item_id, evento_id, cantidad_total, precio_unitario, eventos!inner(estado, fecha_evento)')
      .not('precio_unitario', 'is', null)
      .gt('precio_unitario', 0)
      .gt('cantidad_total', 0)
      .in('eventos.estado', conPresupuestos ? ['presupuesto', 'confirmado', 'entregado', 'devuelto'] : ['confirmado', 'entregado', 'devuelto'])
      .limit(5000);
    if (desde) q = q.gte('eventos.fecha_evento', desde);
    const [res, items] = await Promise.all([q, supabase.from('items').select('id, nombre')]);
    if (res.error) {
      setAviso({ tipo: 'error', texto: mensajeError(res.error, 'No se pudieron cargar los precios.') });
      setLineas([]);
      return;
    }
    setAviso(null);
    const porNombre: Record<string, string> = Object.fromEntries(((items.data as { id: string; nombre: string }[]) ?? []).map((i) => [i.id, i.nombre]));
    setNombres(porNombre);
    setLineas(
      ((res.data as unknown as { item_id: string; evento_id: string; cantidad_total: number; precio_unitario: number }[]) ?? [])
        .filter((l) => !/^(Total acordado|Alquiler \(contrato anterior\))/.test(porNombre[l.item_id] ?? ''))
        .map((l) => ({
        item_id: l.item_id,
        evento_id: l.evento_id,
        cantidad_total: Number(l.cantidad_total),
        precio_unitario: Number(l.precio_unitario),
      })),
    );
  }, [periodo, conPresupuestos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const items = useMemo(() => (lineas ? estadisticasPorItem(lineas, nombres) : []), [lineas, nombres]);
  const general = useMemo(() => resumenGeneral(items), [items]);

  return (
    <div>
      <Encabezado titulo="Precios" descripcion="A cuánto alquilás cada cosa, el promedio por unidad y qué precio te consigue más eventos. Cada artículo por separado." />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriodo(p.id)}
            className={`shrink-0 min-h-[44px] rounded-full px-4 font-manrope text-sm font-semibold ${periodo === p.id ? 'bg-stone-900 text-white' : 'border border-stone-300 bg-white text-stone-700'}`}
          >
            {p.texto}
          </button>
        ))}
      </div>
      <div className="mb-4 max-w-md">
        <Interruptor activo={conPresupuestos} onChange={setConPresupuestos} etiqueta="Incluir presupuestos sin confirmar" descripcion="Por defecto solo cuentan los eventos confirmados, entregados o devueltos." />
      </div>

      <div className="mb-4"><Mensaje aviso={aviso} /></div>
      {lineas === null && <p className="font-manrope text-sm text-stone-600">Cargando…</p>}
      {lineas !== null && items.length === 0 && (
        <div className={`${TARJETA} text-center font-manrope text-sm text-stone-600`}>
          Todavía no hay eventos con precios para estudiar. Cuando cargues y confirmes alquileres, acá vas a ver el promedio y el precio ganador de cada artículo.
        </div>
      )}

      {general.masPedido && general.masFactura && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className={`${TARJETA} font-manrope`}>
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500"><TrendingUp size={12} /> El que más se alquila</p>
            <p className="font-playfair text-xl font-bold">{general.masPedido.nombre}</p>
            <p className="text-sm text-stone-600">{general.masPedido.eventos} eventos · {general.masPedido.unidades} unidades</p>
          </div>
          <div className={`${TARJETA} font-manrope`}>
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500"><Trophy size={12} /> El que más plata deja</p>
            <p className="font-playfair text-xl font-bold">{general.masFactura.nombre}</p>
            <p className="text-sm text-stone-600">{plata(general.masFactura.ingresos)} facturados</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {items.map((it) => <TarjetaItem key={it.itemId} it={it} />)}
      </div>
    </div>
  );
}
