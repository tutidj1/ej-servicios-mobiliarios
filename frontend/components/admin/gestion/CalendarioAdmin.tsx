'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { type ResultadoEvento, diasDelRango, fechaLarga, hoyArgentina, pesos, resultadoEvento, sumarDias } from '@/lib/gestion/calculos';
import { COLOR_ESTADO_EVENTO, type Costo, type EventoConCliente, type Linea, type FilaDisponibilidad, type Item, mensajeError, mostrarStock } from '@/lib/gestion/tipos';
import { type Aviso, TARJETA } from '../estilos';
import { Encabezado, Mensaje } from '../ui';
import { type MarcaDia, MiniCalendario, type VistaCal, rangoVisible } from './Calendarios';
import DisponibilidadAdmin from './DisponibilidadAdmin';

export default function CalendarioAdmin({ onAbrirEvento }: { onAbrirEvento: (id: string) => void }) {
  const hoy = hoyArgentina();
  const [pestana, setPestana] = useState<'calendario' | 'stock'>('calendario');
  const [vista, setVista] = useState<VistaCal>('mes');
  const [ancla, setAncla] = useState(`${hoy.slice(0, 7)}-01`);
  const [dia, setDia] = useState<string>(hoy);
  const [eventos, setEventos] = useState<EventoConCliente[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [ocupacion, setOcupacion] = useState<FilaDisponibilidad[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const { desde, hasta } = useMemo(() => rangoVisible(vista, ancla), [vista, ancla]);

  const cargar = useCallback(async () => {
    const [ev, it] = await Promise.all([
      supabase
        .from('eventos')
        .select('*, clientes(id, nombre_apellido, telefono, canal_origen)')
        .lte('fecha_entrega', hasta)
        .gte('fecha_devolucion', desde)
        .neq('estado', 'cancelado')
        .order('fecha_evento'),
      supabase.from('items').select('*').order('orden_contrato', { nullsFirst: false }),
    ]);
    if (ev.error) setAviso({ tipo: 'error', texto: mensajeError(ev.error, 'No se pudo cargar el calendario.') });
    else {
      setEventos((ev.data as EventoConCliente[]) ?? []);
      setAviso(null);
    }
    setItems((it.data as Item[]) ?? []);
  }, [desde, hasta]);

  useEffect(() => {
    if (pestana === 'calendario') cargar();
  }, [cargar, pestana]);

  useEffect(() => {
    if (pestana !== 'calendario') return;
    supabase.rpc('disponibilidad', { p_items: null, p_desde: dia, p_hasta: dia }).then(({ data }) => {
      setOcupacion(((data as FilaDisponibilidad[]) ?? []).filter((f) => f.reservado > 0 || f.tentativo > 0));
    });
  }, [dia, eventos, pestana]);

  // Puntitos por día y cantidad de eventos por mes (vista de año)
  const { marcas, marcasMes } = useMemo(() => {
    const m: Record<string, MarcaDia> = {};
    const porMes: Record<string, number> = {};
    for (const e of eventos) {
      const ini = e.fecha_entrega < desde ? desde : e.fecha_entrega;
      const fin = e.fecha_devolucion > hasta ? hasta : e.fecha_devolucion;
      const meses = new Set<string>();
      for (const d of diasDelRango(ini, fin)) {
        const marca = (m[d] ??= { confirmados: 0, presupuestos: 0 });
        if (e.estado === 'presupuesto') marca.presupuestos++;
        else marca.confirmados++;
        meses.add(d.slice(0, 7));
      }
      meses.forEach((k) => (porMes[k] = (porMes[k] ?? 0) + 1));
    }
    return { marcas: m, marcasMes: porMes };
  }, [eventos, desde, hasta]);

  // Ganancia de cada evento (artículos + flete cobrado − subalquiler − costos)
  const [finanzas, setFinanzas] = useState<Record<string, ResultadoEvento>>({});
  useEffect(() => {
    if (pestana !== 'calendario') return;
    const ids = eventos.map((e) => e.id);
    if (!ids.length) {
      setFinanzas({});
      return;
    }
    let vigente = true;
    Promise.all([
      supabase.from('evento_lineas').select('evento_id, cantidad_total, cantidad_subalquilada, precio_unitario, costo_subalquiler_unitario').in('evento_id', ids),
      supabase.from('evento_costos').select('evento_id, tipo, monto').in('evento_id', ids),
    ]).then(([ln, co]) => {
      if (!vigente) return;
      const lineas = (ln.data as (Linea & { evento_id: string })[]) ?? [];
      const costos = (co.data as (Costo & { evento_id: string })[]) ?? [];
      const res: Record<string, ResultadoEvento> = {};
      for (const e of eventos) {
        res[e.id] = resultadoEvento({
          lineas: lineas.filter((l) => l.evento_id === e.id),
          fleteCobrado: e.flete_cobrado,
          costos: costos.filter((c) => c.evento_id === e.id),
          pagos: [],
        });
      }
      setFinanzas(res);
    });
    return () => {
      vigente = false;
    };
  }, [eventos, pestana]);

  // Un evento "cae" en el día de su fecha de evento. Los presupuestos se muestran aparte, como estimado.
  const suma = (lista: EventoConCliente[]) =>
    lista.reduce(
      (t, e) => {
        const f = finanzas[e.id];
        if (!f) return t;
        return { ingresos: t.ingresos + f.ingresos, costos: t.costos + f.costos, ganancia: t.ganancia + f.ganancia, n: t.n + 1 };
      },
      { ingresos: 0, costos: 0, ganancia: 0, n: 0 },
    );
  const enRango = eventos.filter((e) => e.fecha_evento >= desde && e.fecha_evento <= hasta);
  const delPeriodo = suma(enRango.filter((e) => e.estado !== 'presupuesto'));
  const estimadoPeriodo = suma(enRango.filter((e) => e.estado === 'presupuesto'));
  const eventosDeEseDia = eventos.filter((e) => e.fecha_evento === dia);
  const gananciaDia = suma(eventosDeEseDia.filter((e) => e.estado !== 'presupuesto'));
  const estimadoDia = suma(eventosDeEseDia.filter((e) => e.estado === 'presupuesto'));
  const textoPeriodo = vista === 'semana' ? 'de la semana' : vista === 'anio' ? 'del año' : 'del mes';
  const color = (n: number) => (n < 0 ? 'text-red-700' : 'text-emerald-700');

  const delDia = eventos.filter((e) => e.fecha_entrega <= dia && dia <= e.fecha_devolucion);
  const nombreItem = (id: string) => items.find((i) => i.id === id)?.nombre ?? '';

  return (
    <div>
      <Encabezado titulo="Calendario" />
      <div role="tablist" className="mb-4 grid max-w-sm grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-stone-200">
        {([['calendario', 'Calendario'], ['stock', '¿Hay stock?']] as const).map(([id, texto]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            onClick={() => setPestana(id)}
            className={`min-h-[44px] rounded-lg font-manrope text-sm font-semibold ${pestana === id ? 'bg-stone-900 text-white' : 'text-stone-700'}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {pestana === 'stock' && <DisponibilidadAdmin onAbrirEvento={onAbrirEvento} sinEncabezado />}

      {pestana === 'calendario' && (
        <div className="grid gap-5 md:grid-cols-[22rem_1fr] md:items-start">
          <div className={`${TARJETA} p-3`}>
            <MiniCalendario
              vista={vista}
              ancla={ancla}
              onCambio={(c) => { setVista(c.vista); setAncla(c.ancla); }}
              valor={dia}
              onElegir={(d) => { setDia(d); setAncla(vista === 'semana' ? d : `${d.slice(0, 7)}-01`); }}
              marcas={marcas}
              marcasMes={marcasMes}
            />
            <p className="mt-3 font-manrope text-xs text-stone-500">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-600" /> confirmado
              <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" /> presupuesto
            </p>
            <div className="mt-3 rounded-xl bg-stone-50 p-3 font-manrope">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Ganancia {textoPeriodo}</p>
              <p className={`text-2xl font-bold tabular-nums ${color(delPeriodo.ganancia)}`}>{pesos(delPeriodo.ganancia)}</p>
              <p className="text-xs text-stone-600">
                {delPeriodo.n} {delPeriodo.n === 1 ? 'evento' : 'eventos'} · ingresos {pesos(delPeriodo.ingresos)} · costos {pesos(delPeriodo.costos)}
              </p>
              {estimadoPeriodo.n > 0 && (
                <p className="mt-1 text-xs text-amber-800">
                  + {pesos(estimadoPeriodo.ganancia)} estimados en {estimadoPeriodo.n} {estimadoPeriodo.n === 1 ? 'presupuesto' : 'presupuestos'} sin confirmar
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Mensaje aviso={aviso} />
            <section className={TARJETA}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-playfair text-xl font-bold">{fechaLarga(dia)}</h2>
                <div className="flex gap-1">
                  <button type="button" className="min-h-[40px] rounded-lg border border-stone-300 px-3 font-manrope text-sm" onClick={() => setDia(sumarDias(dia, -1))} aria-label="Día anterior">‹</button>
                  <button type="button" className="min-h-[40px] rounded-lg border border-stone-300 px-3 font-manrope text-sm" onClick={() => setDia(sumarDias(dia, 1))} aria-label="Día siguiente">›</button>
                </div>
              </div>
              <div className="mb-3 rounded-xl bg-stone-50 p-3 font-manrope">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Ganancia de este día</p>
                <p className={`text-2xl font-bold tabular-nums ${color(gananciaDia.ganancia)}`}>{pesos(gananciaDia.ganancia)}</p>
                {gananciaDia.n > 0 && (
                  <p className="text-xs text-stone-600">
                    ingresos {pesos(gananciaDia.ingresos)} · costos {pesos(gananciaDia.costos)}
                  </p>
                )}
                {estimadoDia.n > 0 && <p className="mt-1 text-xs text-amber-800">+ {pesos(estimadoDia.ganancia)} estimados (presupuesto sin confirmar)</p>}
                {gananciaDia.n === 0 && estimadoDia.n === 0 && <p className="text-xs text-stone-500">No hay eventos con fecha este día.</p>}
              </div>
              {delDia.length === 0 && <p className="font-manrope text-sm text-stone-600">No hay nada este día.</p>}
              <ul className="space-y-2">
                {delDia.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => onAbrirEvento(e.id)} className="w-full rounded-xl border border-stone-200 p-3 text-left font-manrope hover:bg-stone-50">
                      <span className="font-semibold">{e.clientes?.nombre_apellido}</span>{' '}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${COLOR_ESTADO_EVENTO[e.estado]}`}>{e.estado}</span>
                      <span className="block text-xs text-stone-500">
                        {e.fecha_entrega === dia && 'Se entrega hoy · '}
                        {e.fecha_devolucion === dia && 'Se devuelve hoy · '}
                        evento {fechaLarga(e.fecha_evento)}{e.lugar ? ` · ${e.lugar}` : ''}
                      </span>
                      {finanzas[e.id] && (
                        <span className={`block text-xs font-semibold ${color(finanzas[e.id].ganancia)}`}>
                          {e.estado === 'presupuesto' ? 'Estimado' : 'Ganancia'}: {pesos(finanzas[e.id].ganancia)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {ocupacion.length > 0 && (
              <section className={TARJETA}>
                <h3 className="mb-2 font-playfair text-lg font-bold">Lo que está ocupado ese día</h3>
                <table className="w-full font-manrope text-sm">
                  <thead>
                    <tr className="text-left text-xs text-stone-500">
                      <th className="py-1 font-semibold">Artículo</th>
                      <th className="py-1 text-right font-semibold">Ocupado</th>
                      <th className="py-1 text-right font-semibold">Libre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocupacion.map((f) => (
                      <tr key={f.item_id} className="border-t border-stone-100">
                        <td className="py-2">{nombreItem(f.item_id)}{f.tentativo > 0 && <span className="block text-xs text-amber-700">+{f.tentativo} en presupuestos</span>}</td>
                        <td className="py-2 text-right tabular-nums">{f.stock_total === null ? f.reservado : `${f.reservado} / ${f.stock_total}`}</td>
                        <td className={`py-2 text-right font-bold tabular-nums ${(f.disponible ?? 0) < 0 ? 'text-amber-700' : ''}`}>
                          {(f.disponible ?? 0) < 0 ? `subalquilar ${-(f.disponible ?? 0)}` : mostrarStock(f.disponible)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
