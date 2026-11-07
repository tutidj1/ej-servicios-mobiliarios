'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { type ResultadoEvento, fechaCorta, hoyArgentina, nombreMes, pesos, resultadoEvento } from '@/lib/gestion/calculos';
import { type EventoParaGanancia, gananciaPorMes, gananciaPorSemana, totalGanancia } from '@/lib/gestion/ganancias';
import { type Costo, type Linea, mensajeError } from '@/lib/gestion/tipos';
import { type Aviso, TARJETA } from '../estilos';
import { Interruptor, Mensaje } from '../ui';

interface EventoFila extends EventoParaGanancia {
  estado: string;
  flete_cobrado: number | null;
}

const color = (n: number) => (n < 0 ? 'text-red-700' : 'text-emerald-700');

/** Ganancia neta por año, mes y semana, sin tener que tocar día por día. */
export default function GananciasAdmin() {
  const hoy = hoyArgentina();
  const [anio, setAnio] = useState(Number(hoy.slice(0, 4)));
  const [mesElegido, setMesElegido] = useState(hoy.slice(0, 7));
  const [conPresupuestos, setConPresupuestos] = useState(false);
  const [eventos, setEventos] = useState<EventoFila[] | null>(null);
  const [res, setRes] = useState<Record<string, ResultadoEvento>>({});
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      setEventos(null);
      const estados = conPresupuestos ? ['presupuesto', 'confirmado', 'entregado', 'devuelto'] : ['confirmado', 'entregado', 'devuelto'];
      const ev = await supabase
        .from('eventos')
        .select('id, fecha_evento, estado, flete_cobrado')
        .gte('fecha_evento', `${anio}-01-01`)
        .lte('fecha_evento', `${anio}-12-31`)
        .in('estado', estados)
        .limit(2000);
      if (!vigente) return;
      if (ev.error) {
        setAviso({ tipo: 'error', texto: mensajeError(ev.error, 'No se pudieron cargar las ganancias.') });
        setEventos([]);
        return;
      }
      const lista = (ev.data as EventoFila[]) ?? [];
      const lineas: (Linea & { evento_id: string })[] = [];
      const costos: (Costo & { evento_id: string })[] = [];
      for (let i = 0; i < lista.length; i += 100) {
        const ids = lista.slice(i, i + 100).map((e) => e.id);
        const [ln, co] = await Promise.all([
          supabase.from('evento_lineas').select('evento_id, cantidad_total, cantidad_subalquilada, precio_unitario, costo_subalquiler_unitario').in('evento_id', ids),
          supabase.from('evento_costos').select('evento_id, tipo, monto').in('evento_id', ids),
        ]);
        if (ln.error || co.error) {
          if (vigente) setAviso({ tipo: 'error', texto: mensajeError(ln.error || co.error, 'No se pudieron cargar las ganancias.') });
          return;
        }
        lineas.push(...((ln.data as (Linea & { evento_id: string })[]) ?? []));
        costos.push(...((co.data as (Costo & { evento_id: string })[]) ?? []));
      }
      if (!vigente) return;
      const r: Record<string, ResultadoEvento> = {};
      for (const e of lista) {
        r[e.id] = resultadoEvento({
          lineas: lineas.filter((l) => l.evento_id === e.id),
          fleteCobrado: e.flete_cobrado,
          costos: costos.filter((c) => c.evento_id === e.id),
          pagos: [],
        });
      }
      setAviso(null);
      setRes(r);
      setEventos(lista);
    })();
    return () => {
      vigente = false;
    };
  }, [anio, conPresupuestos]);

  const meses = useMemo(() => gananciaPorMes(eventos ?? [], res, anio), [eventos, res, anio]);
  const total = useMemo(() => totalGanancia(meses), [meses]);
  const maximo = Math.max(1, ...meses.map((m) => Math.abs(m.ganancia)));
  const mejor = meses.reduce((b, m, i) => (m.ganancia > (meses[b]?.ganancia ?? -Infinity) ? i : b), 0);
  const mesActivo = mesElegido.startsWith(String(anio)) ? mesElegido : `${anio}-01`;
  const semanas = useMemo(() => gananciaPorSemana(eventos ?? [], res, mesActivo), [eventos, res, mesActivo]);
  const totalMesElegido = meses[Number(mesActivo.slice(5, 7)) - 1];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="h-11 w-11 rounded-lg border border-stone-300 flex items-center justify-center" onClick={() => setAnio(anio - 1)} aria-label="Año anterior"><ChevronLeft size={20} /></button>
        <h2 className="font-playfair text-2xl font-bold">{anio}</h2>
        <button type="button" className="h-11 w-11 rounded-lg border border-stone-300 flex items-center justify-center" onClick={() => setAnio(anio + 1)} aria-label="Año siguiente"><ChevronRight size={20} /></button>
      </div>

      <div className="max-w-md">
        <Interruptor activo={conPresupuestos} onChange={setConPresupuestos} etiqueta="Sumar también los presupuestos sin confirmar" descripcion="Por defecto cuentan solo los eventos confirmados, entregados o devueltos." />
      </div>
      <Mensaje aviso={aviso} />
      {eventos === null && <p className="font-manrope text-sm text-stone-600">Cargando…</p>}

      {eventos !== null && (
        <>
          <div className={`${TARJETA} font-manrope`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Ganancia neta de {anio}</p>
            <p className={`text-3xl font-bold tabular-nums ${color(total.ganancia)}`}>{pesos(total.ganancia)}</p>
            <p className="text-xs text-stone-600">
              {total.eventos} {total.eventos === 1 ? 'evento' : 'eventos'} · ingresos {pesos(total.ingresos)} · costos {pesos(total.costos)}
            </p>
            {total.eventos > 0 && <p className="mt-1 text-xs text-stone-600">Mejor mes: <strong className="capitalize">{nombreMes(mejor)}</strong> ({pesos(meses[mejor].ganancia)}). Promedio por mes con eventos: {pesos(Math.round(total.ganancia / Math.max(1, meses.filter((m) => m.eventos > 0).length)))}.</p>}
          </div>

          <section className={TARJETA}>
            <h3 className="mb-3 font-manrope text-xs font-bold uppercase tracking-wide text-stone-500">Mes por mes (tocá uno para ver sus semanas)</h3>
            <ul className="divide-y divide-stone-100">
              {meses.map((m, i) => {
                const clave = `${anio}-${String(i + 1).padStart(2, '0')}`;
                const activo = clave === mesActivo;
                return (
                  <li key={clave}>
                    <button type="button" onClick={() => setMesElegido(clave)} className={`flex w-full items-center gap-3 py-3 text-left font-manrope ${activo ? 'bg-stone-50' : ''}`} aria-pressed={activo}>
                      <span className="w-24 shrink-0 text-sm font-semibold capitalize text-stone-900">{nombreMes(i)}</span>
                      <span className="flex-1">
                        <span className="block h-2.5 rounded-full bg-stone-100" aria-hidden="true">
                          <span className={`block h-full rounded-full ${m.ganancia < 0 ? 'bg-red-500' : 'bg-emerald-600'}`} style={{ width: `${m.eventos ? Math.max(3, Math.round((Math.abs(m.ganancia) / maximo) * 100)) : 0}%` }} />
                        </span>
                      </span>
                      <span className="w-32 shrink-0 text-right">
                        <span className={`block text-sm font-bold tabular-nums ${m.eventos ? color(m.ganancia) : 'text-stone-400'}`}>{m.eventos ? pesos(m.ganancia) : '—'}</span>
                        <span className="block text-[11px] text-stone-500">{m.eventos} {m.eventos === 1 ? 'evento' : 'eventos'}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={TARJETA}>
            <h3 className="mb-1 font-manrope text-xs font-bold uppercase tracking-wide text-stone-500">
              Semana por semana · <span className="capitalize">{nombreMes(Number(mesActivo.slice(5, 7)) - 1)}</span>
            </h3>
            <p className={`mb-3 font-manrope text-2xl font-bold tabular-nums ${color(totalMesElegido?.ganancia ?? 0)}`}>{pesos(totalMesElegido?.ganancia ?? 0)}</p>
            <ul className="divide-y divide-stone-100">
              {semanas.map((s) => (
                <li key={s.desde} className="flex items-center justify-between gap-3 py-3 font-manrope">
                  <span className="text-sm text-stone-800">Del {fechaCorta(s.desde).slice(0, 5)} al {fechaCorta(s.hasta).slice(0, 5)}</span>
                  <span className="text-right">
                    <span className={`block text-sm font-bold tabular-nums ${s.eventos ? color(s.ganancia) : 'text-stone-400'}`}>{s.eventos ? pesos(s.ganancia) : '—'}</span>
                    <span className="block text-[11px] text-stone-500">{s.eventos} {s.eventos === 1 ? 'evento' : 'eventos'}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 font-manrope text-xs text-stone-500">Cada evento cuenta en la semana y el mes de su fecha de evento.</p>
          </section>
        </>
      )}
    </div>
  );
}
