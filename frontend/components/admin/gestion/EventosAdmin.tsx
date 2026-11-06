'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, MapPin, Plus, Search, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ESTADOS_EVENTO, type EstadoEvento, fechaCorta, hoyArgentina, nombreMes } from '@/lib/gestion/calculos';
import { CANALES, COLOR_ESTADO_EVENTO, type Cliente, type EventoConCliente, mensajeError } from '@/lib/gestion/tipos';
import { AYUDA, type Aviso, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA, TARJETA } from '../estilos';
import { Encabezado, Mensaje } from '../ui';
import { CLIENTE_VACIO, type BorradorCliente, FormCliente, guardarCliente } from './ClientesAdmin';
import EventoEditor from './EventoEditor';

const PROXIMOS = 'proximos';

function opcionesDeMes(): { valor: string; texto: string }[] {
  const hoy = hoyArgentina();
  let y = Number(hoy.slice(0, 4));
  let m = Number(hoy.slice(5, 7)) - 1 - 6;
  const res = [];
  for (let i = 0; i < 19; i++) {
    const fy = y + Math.floor(m / 12);
    const fm = ((m % 12) + 12) % 12;
    res.push({ valor: `${fy}-${String(fm + 1).padStart(2, '0')}`, texto: `${nombreMes(fm)} ${fy}` });
    m++;
  }
  return res;
}

function ultimoDiaDelMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Alta rápida: cliente (buscar o crear), fechas, lugar y personas. */
function AltaRapida({ onCreado, onCancelar }: { onCreado: (id: string) => void; onCancelar: () => void }) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState<BorradorCliente | null>(null);
  const [fechaEvento, setFechaEvento] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [fechaDevolucion, setFechaDevolucion] = useState('');
  const [lugar, setLugar] = useState('');
  const [tipo, setTipo] = useState('');
  const [personas, setPersonas] = useState('');
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const t = busqueda.trim().replace(/[%,()]/g, ' ');
    if (t.length < 2 || cliente) {
      setResultados([]);
      return;
    }
    const id = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .or(`nombre_apellido.ilike.%${t}%,telefono.ilike.%${t}%`)
        .limit(6);
      setResultados((data as Cliente[]) ?? []);
    }, 250);
    return () => clearTimeout(id);
  }, [busqueda, cliente]);

  // Al elegir la fecha del evento, entrega y devolución arrancan ese mismo día (se pueden cambiar)
  const cambiarFechaEvento = (v: string) => {
    setFechaEvento(v);
    if (!fechaEntrega || fechaEntrega > v) setFechaEntrega(v);
    if (!fechaDevolucion || fechaDevolucion < v) setFechaDevolucion(v);
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);
    if (!cliente && !nuevoCliente) return setAviso({ tipo: 'error', texto: 'Elegí un cliente o creá uno nuevo.' });
    if (!fechaEvento || !fechaEntrega || !fechaDevolucion) return setAviso({ tipo: 'error', texto: 'Completá las tres fechas.' });
    setGuardando(true);
    let clienteId = cliente?.id;
    if (!clienteId && nuevoCliente) {
      const r = await guardarCliente(nuevoCliente);
      if (r.error || !r.cliente) {
        setGuardando(false);
        return setAviso({ tipo: 'error', texto: r.error ?? 'No se pudo crear el cliente.' });
      }
      clienteId = r.cliente.id;
      setCliente(r.cliente);
      setNuevoCliente(null);
    }
    const { data, error } = await supabase
      .from('eventos')
      .insert({
        cliente_id: clienteId,
        fecha_evento: fechaEvento,
        fecha_entrega: fechaEntrega,
        fecha_devolucion: fechaDevolucion,
        lugar: lugar.trim() || null,
        tipo_evento: tipo.trim() || null,
        cantidad_personas: personas ? Number(personas) : null,
      })
      .select('id')
      .single();
    setGuardando(false);
    if (error || !data) return setAviso({ tipo: 'error', texto: mensajeError(error, 'No se pudo crear el evento.') });
    onCreado(data.id);
  };

  return (
    <form onSubmit={crear} className={`${TARJETA} mb-6 space-y-4`}>
      <div className="flex items-center justify-between">
        <h2 className="font-playfair text-xl font-bold">Nuevo evento</h2>
        <button type="button" onClick={onCancelar} className="h-11 w-11 flex items-center justify-center" aria-label="Cerrar"><X size={20} /></button>
      </div>

      <div>
        <p className={ETIQUETA}>Cliente</p>
        {cliente ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 p-3 font-manrope">
            <span><strong>{cliente.nombre_apellido}</strong> {cliente.telefono && <span className="text-stone-600">· {cliente.telefono}</span>}</span>
            <button type="button" className="text-sm font-semibold text-emerald-800 underline" onClick={() => { setCliente(null); setBusqueda(''); }}>Cambiar</button>
          </div>
        ) : nuevoCliente ? (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <FormCliente valor={nuevoCliente} onChange={setNuevoCliente} />
            <button type="button" className="mt-3 text-sm font-semibold text-stone-700 underline" onClick={() => setNuevoCliente(null)}>Buscar uno existente</button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input className={`${CAMPO} pl-11`} placeholder="Buscar por nombre o teléfono" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar cliente" />
            </div>
            {resultados.length > 0 && (
              <ul className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
                {resultados.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setCliente(c)} className="w-full min-h-[48px] px-4 py-2 text-left font-manrope hover:bg-stone-50">
                      {c.nombre_apellido} <span className="text-sm text-stone-500">{c.telefono}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className={`${BTN_SECUNDARIO} mt-2`}
              onClick={() => setNuevoCliente({ ...CLIENTE_VACIO, nombre_apellido: busqueda.trim() })}
            >
              <Plus size={16} /> Cliente nuevo
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={ETIQUETA} htmlFor="ev-fecha">Fecha del evento</label>
          <input id="ev-fecha" type="date" className={CAMPO} value={fechaEvento} onChange={(e) => cambiarFechaEvento(e.target.value)} required />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="ev-entrega">Entrega</label>
          <input id="ev-entrega" type="date" className={CAMPO} value={fechaEntrega} max={fechaEvento || undefined} onChange={(e) => setFechaEntrega(e.target.value)} required />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="ev-devolucion">Devolución</label>
          <input id="ev-devolucion" type="date" className={CAMPO} value={fechaDevolucion} min={fechaEvento || undefined} onChange={(e) => setFechaDevolucion(e.target.value)} required />
        </div>
      </div>
      <p className={AYUDA}>El stock queda ocupado desde la entrega hasta la devolución, ambos días incluidos.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={ETIQUETA} htmlFor="ev-lugar">Lugar</label>
          <input id="ev-lugar" className={CAMPO} value={lugar} onChange={(e) => setLugar(e.target.value)} />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="ev-personas">Personas</label>
          <input id="ev-personas" className={CAMPO} inputMode="numeric" value={personas} onChange={(e) => setPersonas(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="sm:col-span-3">
          <label className={ETIQUETA} htmlFor="ev-tipo">Tipo de evento (opcional)</label>
          <input id="ev-tipo" className={CAMPO} placeholder="Cumpleaños, casamiento, 15 años…" value={tipo} onChange={(e) => setTipo(e.target.value)} />
        </div>
      </div>
      <Mensaje aviso={aviso} />
      <div className="flex gap-2">
        <button type="submit" disabled={guardando} className={`${BTN_PRIMARIO} min-h-[52px] flex-1 sm:flex-none`}>{guardando ? 'Creando…' : 'Crear y cargar artículos'}</button>
        <button type="button" onClick={onCancelar} className={BTN_SECUNDARIO}>Cancelar</button>
      </div>
    </form>
  );
}

export default function EventosAdmin({
  abierto,
  onAbrir,
  esAdmin,
}: {
  abierto: string | null;
  onAbrir: (id: string | null) => void;
  esAdmin: boolean;
}) {
  const [eventos, setEventos] = useState<EventoConCliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [alta, setAlta] = useState(false);
  const [mes, setMes] = useState(PROXIMOS);
  const [estado, setEstado] = useState<'todos' | EstadoEvento>('todos');
  const [canal, setCanal] = useState('todos');
  const [texto, setTexto] = useState('');
  const meses = useMemo(opcionesDeMes, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    let q = supabase
      .from('eventos')
      .select('*, clientes(id, nombre_apellido, telefono, canal_origen)')
      .order('fecha_evento', { ascending: true })
      .limit(300);
    if (mes === PROXIMOS) q = q.gte('fecha_devolucion', hoyArgentina());
    else q = q.gte('fecha_evento', `${mes}-01`).lte('fecha_evento', ultimoDiaDelMes(mes));
    const { data, error } = await q;
    if (error) setAviso({ tipo: 'error', texto: mensajeError(error, 'No se pudieron cargar los eventos.') });
    else {
      setEventos((data as EventoConCliente[]) ?? []);
      setAviso(null);
    }
    setCargando(false);
  }, [mes]);

  useEffect(() => {
    if (!abierto) cargar();
  }, [cargar, abierto]);

  if (abierto) {
    return <EventoEditor id={abierto} esAdmin={esAdmin} onVolver={() => onAbrir(null)} />;
  }

  const t = texto.trim().toLowerCase();
  const visibles = eventos.filter(
    (e) =>
      (estado === 'todos' || e.estado === estado) &&
      (canal === 'todos' || e.clientes?.canal_origen === canal) &&
      (!t || `${e.clientes?.nombre_apellido ?? ''} ${e.lugar ?? ''} ${e.tipo_evento ?? ''}`.toLowerCase().includes(t)),
  );

  return (
    <div>
      <Encabezado
        titulo="Eventos"
        descripcion="Cada alquiler, de cualquier canal: cliente, fechas, artículos, costos y pagos."
        accion={
          !alta && (
            <button type="button" className={`${BTN_PRIMARIO} min-h-[52px]`} onClick={() => setAlta(true)}>
              <Plus size={18} /> Nuevo evento
            </button>
          )
        }
      />
      {alta && <AltaRapida onCancelar={() => setAlta(false)} onCreado={(id) => { setAlta(false); onAbrir(id); }} />}

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <select className={CAMPO} value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mes">
          <option value={PROXIMOS}>Próximos y en curso</option>
          {meses.map((m) => <option key={m.valor} value={m.valor}>{m.texto}</option>)}
        </select>
        <select className={`${CAMPO} capitalize`} value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} aria-label="Estado">
          <option value="todos">Todos los estados</option>
          {ESTADOS_EVENTO.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={`${CAMPO} capitalize`} value={canal} onChange={(e) => setCanal(e.target.value)} aria-label="Canal">
          <option value="todos">Todos los canales</option>
          {CANALES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className={CAMPO} placeholder="Buscar" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar evento" />
      </div>

      <div className="mb-4"><Mensaje aviso={aviso} /></div>
      {cargando && <p className="font-manrope text-sm text-stone-600">Cargando…</p>}
      {!cargando && visibles.length === 0 && <div className={`${TARJETA} text-center font-manrope text-sm text-stone-600`}>No hay eventos para mostrar.</div>}

      <div className="space-y-3">
        {visibles.map((e) => (
          <button key={e.id} type="button" onClick={() => onAbrir(e.id)} className={`${TARJETA} flex w-full items-center gap-3 text-left hover:border-stone-300`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-manrope text-base font-semibold text-stone-900">{e.clientes?.nombre_apellido ?? 'Sin cliente'}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${COLOR_ESTADO_EVENTO[e.estado]}`}>{e.estado}</span>
              </div>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-manrope text-sm text-stone-600">
                <span className="flex items-center gap-1"><CalendarDays size={14} /> {fechaCorta(e.fecha_evento)}{e.tipo_evento ? ` · ${e.tipo_evento}` : ''}</span>
                {e.cantidad_personas && <span className="flex items-center gap-1"><Users size={14} /> {e.cantidad_personas}</span>}
                {e.lugar && <span className="flex items-center gap-1"><MapPin size={14} /> {e.lugar}</span>}
              </p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-stone-400" />
          </button>
        ))}
      </div>
    </div>
  );
}
