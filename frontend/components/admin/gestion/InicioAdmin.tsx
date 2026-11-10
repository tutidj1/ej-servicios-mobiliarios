'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronRight, ClipboardList, HandCoins, Mic, PartyPopper, Tag, Truck, Undo2, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { aCentavos, hoyArgentina, pesos, sumarDias, type EstadoEvento } from '@/lib/gestion/calculos';
import { avisos, cuando, movimientos, resumenMes, type Aviso, type EventoPanel, type Movimiento } from '@/lib/gestion/panelInicio';

interface FilaEvento {
  id: string;
  lugar: string | null;
  estado: EstadoEvento;
  fecha_evento: string;
  fecha_entrega: string;
  fecha_devolucion: string;
  flete_cobrado: number | string | null;
  clientes: { nombre_apellido: string } | null;
  evento_lineas: { cantidad_total: number | null; precio_unitario: number | string | null }[] | null;
  pagos: { monto: number | string | null }[] | null;
}

/** Pasa una fila de la base al formato del panel (montos en pesos). */
function aPanel(e: FilaEvento): EventoPanel {
  let total = aCentavos(e.flete_cobrado);
  for (const l of e.evento_lineas ?? []) total += (l.cantidad_total ?? 0) * aCentavos(l.precio_unitario);
  const cobrado = (e.pagos ?? []).reduce((t, p) => t + aCentavos(p.monto), 0);
  return {
    id: e.id,
    cliente: e.clientes?.nombre_apellido ?? 'Sin cliente',
    lugar: e.lugar,
    estado: e.estado,
    fecha_evento: e.fecha_evento,
    fecha_entrega: e.fecha_entrega,
    fecha_devolucion: e.fecha_devolucion,
    total: total / 100,
    cobrado: cobrado / 100,
  };
}

/** Pesos → texto ("$ 15.000"). `pesos()` recibe centavos. */
const plata = (p: number) => pesos(Math.round(p * 100));
const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

function Boton({ icono, titulo, detalle, onClick, destacado = false }: { icono: React.ReactNode; titulo: string; detalle?: string; onClick: () => void; destacado?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[80px] flex-1 items-center gap-4 rounded-2xl p-4 text-left font-manrope shadow-sm transition active:scale-[0.99] ${
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

const TEXTO_AVISO: Record<Aviso['tipo'], { icono: React.ReactNode; color: string; titulo: (a: Aviso) => string; detalle: (a: Aviso) => string }> = {
  devolucion_atrasada: {
    icono: <Undo2 size={20} />,
    color: 'bg-red-100 text-red-800',
    titulo: (a) => `Retirar lo de ${a.cliente}`,
    detalle: (a) => `La devolución era hace ${dias(a.dias)}. Si ya volvió, marcalo como devuelto.`,
  },
  por_cobrar: {
    icono: <HandCoins size={20} />,
    color: 'bg-amber-100 text-amber-800',
    titulo: (a) => `Cobrarle ${plata(a.monto ?? 0)} a ${a.cliente}`,
    detalle: (a) => `El evento terminó hace ${dias(a.dias)}.`,
  },
  sin_precio: {
    icono: <Tag size={20} />,
    color: 'bg-stone-200 text-stone-700',
    titulo: (a) => `Ponerle precio al evento de ${a.cliente}`,
    detalle: (a) =>
      a.dias > 0 ? `Está confirmado (es en ${dias(a.dias)}) y no tiene total cargado.` : a.dias === 0 ? 'Es hoy y no tiene total cargado.' : 'Está confirmado y no tiene total cargado.',
  },
};

function Fila({ icono, color, titulo, detalle, onClick }: { icono: React.ReactNode; color: string; titulo: string; detalle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl bg-white p-3 text-left font-manrope ring-1 ring-stone-200 hover:bg-stone-50">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>{icono}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-stone-900">{titulo}</span>
        <span className="block text-xs text-stone-500">{detalle}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-stone-400" />
    </button>
  );
}

function Dato({ icono, titulo, valor, tono }: { icono: React.ReactNode; titulo: string; valor: string; tono?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 font-manrope ring-1 ring-stone-200">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
        {icono}
        {titulo}
      </span>
      <span className={`mt-1 block text-xl font-bold ${tono ?? 'text-stone-900'}`}>{valor}</span>
    </div>
  );
}

function saludo(): string {
  const h = Number(new Intl.DateTimeFormat('es-AR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()));
  if (h < 13) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
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
  const [eventos, setEventos] = useState<EventoPanel[] | null>(null);
  const [error, setError] = useState(false);
  const [nuevas, setNuevas] = useState<number | null>(null);
  const hoy = hoyArgentina();

  useEffect(() => {
    // Alcanza con los eventos que terminaron en los últimos 4 meses (cobros viejos) y los que vienen.
    const desde = sumarDias(hoyArgentina(), -120);
    supabase
      .from('eventos')
      .select('id, lugar, estado, fecha_evento, fecha_entrega, fecha_devolucion, flete_cobrado, clientes(nombre_apellido), evento_lineas(cantidad_total, precio_unitario), pagos(monto)')
      .neq('estado', 'cancelado')
      .gte('fecha_devolucion', desde)
      .then(({ data, error: err }) => {
        if (err) {
          setError(true);
          setEventos([]);
          return;
        }
        setEventos(((data as unknown as FilaEvento[]) ?? []).map(aPanel));
      });
    supabase
      .from('cotizaciones')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .then(({ count }) => setNuevas(count ?? 0));
  }, []);

  const movs = eventos ? movimientos(eventos, hoy, 7) : null;
  const deHoy = movs?.filter((m) => m.dia === hoy) ?? [];
  const proximos = movs?.filter((m) => m.dia !== hoy) ?? [];
  const pendientes = eventos ? avisos(eventos, hoy) : [];
  const mes = eventos && !error ? resumenMes(eventos, hoy) : null;
  const nombreMes = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'UTC' }).format(new Date(`${hoy}T12:00:00Z`));

  const filaMov = (m: Movimiento) => (
    <li key={`${m.eventoId}-${m.tipo}`}>
      <Fila
        icono={m.tipo === 'entrega' ? <Truck size={20} /> : <Undo2 size={20} />}
        color={m.tipo === 'entrega' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}
        titulo={`${m.tipo === 'entrega' ? 'Entregar' : 'Retirar'} · ${m.cliente}`}
        detalle={`${cuando(m.dia, hoy)}${m.lugar ? ` · ${m.lugar}` : ''}`}
        onClick={() => onAbrirEvento(m.eventoId)}
      />
    </li>
  );

  let resumenHoy = 'Mirando cómo viene todo…';
  if (eventos !== null) {
    if (deHoy.length === 0 && pendientes.length === 0) resumenHoy = 'Hoy no hay nada urgente. 🙂';
    else {
      const partes: string[] = [];
      if (deHoy.length) partes.push(`${deHoy.length} ${deHoy.length === 1 ? 'movimiento' : 'movimientos'} hoy`);
      if (pendientes.length) partes.push(`${pendientes.length} ${pendientes.length === 1 ? 'cosa para resolver' : 'cosas para resolver'}`);
      resumenHoy = `Tenés ${partes.join(' y ')}.`;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-playfair text-3xl font-bold text-stone-900">{saludo()} 👋</h1>
        <p className="mt-1 font-manrope text-sm text-stone-600">{resumenHoy}</p>
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

      {error && (
        <p className="rounded-2xl bg-red-50 p-4 font-manrope text-sm text-red-800 ring-1 ring-red-200">No se pudieron cargar los eventos. Revisá la conexión y volvé a entrar.</p>
      )}

      <section>
        <h2 className="mb-2 font-playfair text-xl font-bold text-stone-900">Hoy</h2>
        {movs === null && <p className="font-manrope text-sm text-stone-600">Cargando…</p>}
        {movs !== null && deHoy.length === 0 && (
          <p className="rounded-2xl bg-white p-4 font-manrope text-sm text-stone-600 ring-1 ring-stone-200">Hoy no hay que entregar ni retirar nada.</p>
        )}
        <ul className="space-y-2">{deHoy.map(filaMov)}</ul>
      </section>

      {pendientes.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-playfair text-xl font-bold text-stone-900">
            <AlertTriangle size={20} className="text-amber-600" /> Para resolver
          </h2>
          <ul className="space-y-2">
            {pendientes.slice(0, 8).map((a) => {
              const t = TEXTO_AVISO[a.tipo];
              return (
                <li key={`${a.eventoId}-${a.tipo}`}>
                  <Fila icono={t.icono} color={t.color} titulo={t.titulo(a)} detalle={t.detalle(a)} onClick={() => onAbrirEvento(a.eventoId)} />
                </li>
              );
            })}
          </ul>
          {pendientes.length > 8 && <p className="mt-2 font-manrope text-xs text-stone-500">Y {pendientes.length - 8} más: están en Eventos.</p>}
        </section>
      )}

      <section>
        <h2 className="mb-2 font-playfair text-xl font-bold text-stone-900">Próximos 7 días</h2>
        {movs !== null && proximos.length === 0 && (
          <p className="rounded-2xl bg-white p-4 font-manrope text-sm text-stone-600 ring-1 ring-stone-200">No hay entregas ni devoluciones en los próximos días.</p>
        )}
        <ul className="space-y-2">{proximos.map(filaMov)}</ul>
      </section>

      {mes && (
        <section>
          <h2 className="mb-2 font-playfair text-xl font-bold text-stone-900">Cómo viene {nombreMes}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Dato icono={<PartyPopper size={16} />} titulo="Eventos" valor={String(mes.eventos)} />
            <Dato icono={<Wallet size={16} />} titulo="Total" valor={plata(mes.total)} />
            <Dato icono={<HandCoins size={16} />} titulo="Cobrado" valor={plata(mes.cobrado)} tono="text-emerald-700" />
            <Dato icono={<ClipboardList size={16} />} titulo="Falta cobrar" valor={plata(mes.porCobrar)} tono={mes.porCobrar > 0 ? 'text-amber-700' : undefined} />
          </div>
          {mes.total > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200" aria-hidden>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round((mes.cobrado / mes.total) * 100))}%` }} />
            </div>
          )}
          <p className="mt-2 font-manrope text-xs text-stone-500">Cuenta los eventos de este mes que no son presupuesto. Los presupuestos todavía no suman.</p>
        </section>
      )}
    </div>
  );
}
