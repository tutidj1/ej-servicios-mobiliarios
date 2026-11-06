'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { diasDelRango, fechaLarga, hoyArgentina, nombreMes, sumarDias } from '@/lib/gestion/calculos';
import { COLOR_ESTADO_EVENTO, type EventoConCliente, type FilaDisponibilidad, type Item, mensajeError } from '@/lib/gestion/tipos';
import { type Aviso, BTN_SECUNDARIO, TARJETA } from '../estilos';
import { Encabezado, Mensaje } from '../ui';

const SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export default function CalendarioAdmin({ onAbrirEvento }: { onAbrirEvento: (id: string) => void }) {
  const hoy = hoyArgentina();
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [eventos, setEventos] = useState<EventoConCliente[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [dia, setDia] = useState<string | null>(hoy);
  const [ocupacion, setOcupacion] = useState<FilaDisponibilidad[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const [y, m] = mes.split('-').map(Number);
  const inicio = `${mes}-01`;
  const fin = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

  const cargar = useCallback(async () => {
    const [ev, it] = await Promise.all([
      supabase
        .from('eventos')
        .select('*, clientes(id, nombre_apellido, telefono, canal_origen)')
        .lte('fecha_entrega', fin)
        .gte('fecha_devolucion', inicio)
        .neq('estado', 'cancelado')
        .order('fecha_evento'),
      supabase.from('items').select('*').order('orden_contrato', { nullsFirst: false }),
    ]);
    if (ev.error) setAviso({ tipo: 'error', texto: mensajeError(ev.error, 'No se pudo cargar el calendario.') });
    else setEventos((ev.data as EventoConCliente[]) ?? []);
    setItems((it.data as Item[]) ?? []);
  }, [inicio, fin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!dia) return;
    supabase.rpc('disponibilidad', { p_items: null, p_desde: dia, p_hasta: dia }).then(({ data }) => {
      setOcupacion(((data as FilaDisponibilidad[]) ?? []).filter((f) => f.reservado > 0 || f.tentativo > 0));
    });
  }, [dia, eventos]);

  // Grilla de lunes a domingo
  const celdas = useMemo(() => {
    const primerDia = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    const dias = diasDelRango(inicio, fin);
    return [...Array(primerDia).fill(null), ...dias] as (string | null)[];
  }, [y, m, inicio, fin]);

  const eventosDelDia = (d: string) => eventos.filter((e) => e.fecha_entrega <= d && d <= e.fecha_devolucion);
  const moverMes = (n: number) => {
    const t = new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
    setMes(t);
    setDia(null);
  };
  const nombreItem = (id: string) => items.find((i) => i.id === id)?.nombre ?? '';

  return (
    <div>
      <Encabezado titulo="Calendario" descripcion="Qué está alquilado cada día (de la entrega a la devolución). Tocá un día para ver el detalle." />
      <Mensaje aviso={aviso} />

      <div className="mb-3 flex items-center justify-between">
        <button type="button" className={BTN_SECUNDARIO} onClick={() => moverMes(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
        <h2 className="font-playfair text-xl font-bold capitalize">{nombreMes(m - 1)} {y}</h2>
        <button type="button" className={BTN_SECUNDARIO} onClick={() => moverMes(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
      </div>

      <div className={`${TARJETA} p-2 sm:p-3`}>
        <div className="grid grid-cols-7 gap-1 text-center font-manrope text-xs font-semibold text-stone-500">
          {SEMANA.map((s) => <div key={s} className="py-1">{s}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {celdas.map((d, i) => {
            if (!d) return <div key={`v${i}`} />;
            const del = eventosDelDia(d);
            const confirmados = del.filter((e) => e.estado !== 'presupuesto').length;
            const presupuestos = del.length - confirmados;
            const elegido = d === dia;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDia(d)}
                className={`flex min-h-[56px] flex-col items-center justify-start rounded-lg p-1 font-manrope sm:min-h-[72px] ${
                  elegido ? 'bg-stone-900 text-white' : d === hoy ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-stone-50'
                }`}
                aria-label={`${fechaLarga(d)}: ${del.length} eventos`}
              >
                <span className="text-sm font-semibold">{Number(d.slice(8))}</span>
                <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                  {confirmados > 0 && <span className="rounded bg-emerald-600 px-1 text-[10px] font-bold text-white">{confirmados}</span>}
                  {presupuestos > 0 && <span className="rounded bg-amber-400 px-1 text-[10px] font-bold text-stone-900">{presupuestos}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 font-manrope text-xs text-stone-500">
          <span className="mr-1 inline-block h-2 w-2 rounded bg-emerald-600" /> confirmados / entregados
          <span className="ml-3 mr-1 inline-block h-2 w-2 rounded bg-amber-400" /> presupuestos (no reservan)
        </p>
      </div>

      {dia && (
        <section className="mt-5 grid gap-5 md:grid-cols-2">
          <div className={TARJETA}>
            <h3 className="mb-2 font-playfair text-lg font-bold capitalize">{fechaLarga(dia)}</h3>
            {eventosDelDia(dia).length === 0 && <p className="font-manrope text-sm text-stone-600">Ningún evento ocupa este día.</p>}
            <ul className="space-y-2">
              {eventosDelDia(dia).map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => onAbrirEvento(e.id)} className="w-full rounded-lg border border-stone-200 p-3 text-left font-manrope hover:bg-stone-50">
                    <span className="font-semibold">{e.clientes?.nombre_apellido}</span>{' '}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${COLOR_ESTADO_EVENTO[e.estado]}`}>{e.estado}</span>
                    <span className="block text-xs text-stone-500">
                      {e.fecha_entrega === dia && 'Se entrega hoy · '}
                      {e.fecha_devolucion === dia && 'Se devuelve hoy · '}
                      evento {fechaLarga(e.fecha_evento)}{e.lugar ? ` · ${e.lugar}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button type="button" className={BTN_SECUNDARIO} onClick={() => setDia(sumarDias(dia, -1))}>Día anterior</button>
              <button type="button" className={BTN_SECUNDARIO} onClick={() => setDia(sumarDias(dia, 1))}>Día siguiente</button>
            </div>
          </div>
          <div className={TARJETA}>
            <h3 className="mb-2 font-playfair text-lg font-bold">Stock ese día</h3>
            {ocupacion.length === 0 && <p className="font-manrope text-sm text-stone-600">Todo el stock propio está libre.</p>}
            <table className="w-full font-manrope text-sm">
              {ocupacion.length > 0 && (
                <thead>
                  <tr className="text-left text-xs text-stone-500">
                    <th className="py-1 font-semibold">Artículo</th>
                    <th className="py-1 text-right font-semibold">Ocupado</th>
                    <th className="py-1 text-right font-semibold">Libre</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {ocupacion.map((f) => (
                  <tr key={f.item_id} className="border-t border-stone-100">
                    <td className="py-2">{nombreItem(f.item_id)}{f.tentativo > 0 && <span className="block text-xs text-amber-700">+{f.tentativo} en presupuestos</span>}</td>
                    <td className="py-2 text-right tabular-nums">{f.reservado} / {f.stock_total}</td>
                    <td className={`py-2 text-right font-bold tabular-nums ${f.disponible < 0 ? 'text-red-700' : ''}`}>{f.disponible}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
