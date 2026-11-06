'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Lock, MessageCircle, Plus, Sparkles, Trash2, Unlock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { linkWhatsappCliente } from '@/lib/phone';
import {
  ESTADOS_EVENTO,
  ESTADOS_QUE_RESERVAN,
  type EstadoEvento,
  faltantesParaDocumento,
  hoyArgentina,
  pesos,
  repartirCantidad,
  resultadoEvento,
  sugerirCantidad,
} from '@/lib/gestion/calculos';
import {
  COLOR_ESTADO_EVENTO,
  type Cliente,
  type Configuracion,
  type Costo,
  type Evento,
  type FilaDisponibilidad,
  type Item,
  type Linea,
  MEDIOS_PAGO,
  type MedioPago,
  type Pago,
  TIPOS_COSTO,
  TIPOS_PAGO,
  type TipoCosto,
  type TipoPago,
  leerMonto,
  mensajeError,
  mostrarMonto,
  mostrarStock,
} from '@/lib/gestion/tipos';
import { AYUDA, type Aviso, BTN_OSCURO, BTN_PELIGRO_SUAVE, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA, TARJETA } from '../estilos';
import { Mensaje } from '../ui';
import { type BorradorCliente, FormCliente, guardarCliente } from './ClientesAdmin';

/** Línea en edición: los montos se guardan como texto mientras la persona escribe. */
interface LineaEdicion extends Linea {
  precioTexto: string;
  costoSubTexto: string;
}

interface Disponible {
  /** Mínimo libre en todo el rango (sin contar este evento). */
  libre: number;
  /** Máximo pedido por otros presupuestos (no confirmados) en algún día del rango. */
  tentativo: number;
}

const CELDA = 'w-full min-h-[44px] rounded-lg border border-stone-300 bg-white px-3 text-base font-manrope tabular-nums outline-none focus:border-emerald-600';

function aLineaEdicion(l: Linea): LineaEdicion {
  return { ...l, precioTexto: mostrarMonto(l.precio_unitario), costoSubTexto: mostrarMonto(l.costo_subalquiler_unitario) };
}

export default function EventoEditor({ id, esAdmin, onVolver }: { id: string; esAdmin: boolean; onVolver: () => void }) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [lineas, setLineas] = useState<LineaEdicion[]>([]);
  const [costos, setCostos] = useState<Costo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [config, setConfig] = useState<Configuracion>({ personas_por_mesa: 10, mostrar_ultimo_precio: false });
  const [ultimoPrecio, setUltimoPrecio] = useState<Record<string, number>>({});
  const [disp, setDisp] = useState<Record<string, Disponible>>({});
  const [fleteTexto, setFleteTexto] = useState('');
  const [cambios, setCambios] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [editandoCliente, setEditandoCliente] = useState<BorradorCliente | null>(null);
  const [asistente, setAsistente] = useState<{ item: Item; cantidad: number; marcado: boolean }[] | null>(null);

  const cerrado = !!evento?.cerrado_en;
  const bloqueado = cerrado && !esAdmin;
  const itemPorId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  const cargar = useCallback(async () => {
    const [ev, ln, co, pa, it, cf] = await Promise.all([
      supabase.from('eventos').select('*, clientes(*)').eq('id', id).single(),
      supabase.from('evento_lineas').select('*').eq('evento_id', id),
      supabase.from('evento_costos').select('*').eq('evento_id', id).order('fecha'),
      supabase.from('pagos').select('*').eq('evento_id', id).order('fecha'),
      supabase.from('items').select('*').order('orden_contrato', { nullsFirst: false }).order('nombre'),
      supabase.from('configuracion').select('personas_por_mesa, mostrar_ultimo_precio').eq('id', 1).maybeSingle(),
    ]);
    const error = ev.error || ln.error || co.error || pa.error || it.error;
    if (error || !ev.data) {
      setAviso({ tipo: 'error', texto: mensajeError(error, 'No se pudo abrir el evento.') });
      setCargando(false);
      return;
    }
    const { clientes, ...resto } = ev.data as Evento & { clientes: Cliente };
    setEvento(resto);
    setCliente(clientes);
    setFleteTexto(mostrarMonto(resto.flete_cobrado));
    setItems((it.data as Item[]) ?? []);
    setLineas(((ln.data as Linea[]) ?? []).map(aLineaEdicion));
    setCostos((co.data as Costo[]) ?? []);
    setPagos((pa.data as Pago[]) ?? []);
    if (cf.data) setConfig(cf.data as Configuracion);
    setCambios(false);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Último precio usado por artículo (solo si está activado en configuración; es una sugerencia en gris)
  useEffect(() => {
    if (!config.mostrar_ultimo_precio) return;
    supabase
      .from('evento_lineas')
      .select('item_id, precio_unitario, updated_at')
      .neq('evento_id', id)
      .not('precio_unitario', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        const mapa: Record<string, number> = {};
        for (const f of (data as { item_id: string; precio_unitario: number }[]) ?? []) {
          if (!(f.item_id in mapa)) mapa[f.item_id] = Number(f.precio_unitario);
        }
        setUltimoPrecio(mapa);
      });
  }, [config.mostrar_ultimo_precio, id]);

  // Stock libre en el rango de fechas (se recalcula si cambian las fechas)
  const desde = evento?.fecha_entrega;
  const hasta = evento?.fecha_devolucion;
  useEffect(() => {
    if (!desde || !hasta || desde > hasta || items.length === 0) return;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('disponibilidad', {
        p_items: items.map((i) => i.id),
        p_desde: desde,
        p_hasta: hasta,
        p_excluir_evento: id,
      });
      if (error) return;
      const res: Record<string, Disponible> = {};
      for (const f of (data as FilaDisponibilidad[]) ?? []) {
        const actual = res[f.item_id];
        const libreDia = f.disponible ?? Infinity; // sin límite
        res[f.item_id] = {
          libre: actual ? Math.min(actual.libre, libreDia) : libreDia,
          tentativo: actual ? Math.max(actual.tentativo, f.tentativo) : f.tentativo,
        };
      }
      setDisp(res);
    }, 300);
    return () => clearTimeout(t);
  }, [desde, hasta, items, id]);

  // Infinity = artículo sin límite de stock (todo cuenta como propio)
  const libreDe = (itemId: string): number => {
    if (disp[itemId]) return disp[itemId].libre;
    const stock = itemPorId[itemId]?.stock_total;
    return stock === null || stock === undefined ? Infinity : stock;
  };

  // ------------------------------------------------------------------ edición
  const cambiarEvento = (cambio: Partial<Evento>) => {
    setEvento((e) => (e ? { ...e, ...cambio } : e));
    setCambios(true);
  };

  const cambiarLinea = (itemId: string, cambio: Partial<LineaEdicion>) => {
    setLineas((prev) => prev.map((l) => (l.item_id === itemId ? { ...l, ...cambio } : l)));
    setCambios(true);
  };

  const cambiarTotal = (itemId: string, texto: string) => {
    const total = Number(texto.replace(/\D/g, '') || 0);
    const r = repartirCantidad(total, libreDe(itemId));
    cambiarLinea(itemId, { cantidad_total: total, cantidad_propia: r.propia, cantidad_subalquilada: r.subalquilada });
  };

  // Subalquilar más de lo necesario se permite (por ejemplo, para no mover stock propio); menos, no.
  const cambiarSubalquiladas = (l: LineaEdicion, texto: string) => {
    const minimo = Math.max(0, l.cantidad_total - Math.max(0, libreDe(l.item_id)));
    const sub = Math.min(l.cantidad_total, Math.max(minimo, Number(texto.replace(/\D/g, '') || 0)));
    cambiarLinea(l.item_id, { cantidad_subalquilada: sub, cantidad_propia: l.cantidad_total - sub });
  };

  const agregarItem = (itemId: string, cantidad = 0) => {
    if (!itemId || lineas.some((l) => l.item_id === itemId)) return;
    const r = repartirCantidad(cantidad, libreDe(itemId));
    setLineas((prev) => [
      ...prev,
      aLineaEdicion({ item_id: itemId, cantidad_total: cantidad, cantidad_propia: r.propia, cantidad_subalquilada: r.subalquilada, precio_unitario: null, costo_subalquiler_unitario: null }),
    ]);
    setCambios(true);
  };

  const quitarLinea = (itemId: string) => {
    setLineas((prev) => prev.filter((l) => l.item_id !== itemId));
    setCambios(true);
  };

  const abrirAsistente = () => {
    const personas = evento?.cantidad_personas ?? 0;
    if (!personas) return setAviso({ tipo: 'error', texto: 'Cargá primero la cantidad de personas.' });
    const propuestas = items
      .filter((i) => i.activo && i.sugerencia !== 'ninguna')
      .map((i) => ({ item: i, cantidad: sugerirCantidad(i.sugerencia, personas, config.personas_por_mesa) ?? 0, marcado: true }))
      .filter((p) => p.cantidad > 0);
    setAsistente(propuestas);
  };

  const aplicarAsistente = () => {
    if (!asistente) return;
    for (const p of asistente.filter((a) => a.marcado)) {
      if (lineas.some((l) => l.item_id === p.item.id)) cambiarTotal(p.item.id, String(p.cantidad));
      else agregarItem(p.item.id, p.cantidad);
    }
    setAsistente(null);
  };

  // ------------------------------------------------------------------ guardar
  /** Valida montos escritos. Devuelve las líneas listas para la base o un error. */
  const prepararLineas = (): { filas?: Linea[]; error?: string } => {
    const filas: Linea[] = [];
    for (const l of lineas) {
      const nombre = itemPorId[l.item_id]?.nombre ?? 'un artículo';
      const precio = leerMonto(l.precioTexto);
      const costoSub = leerMonto(l.costoSubTexto);
      if (l.precioTexto.trim() && precio === null) return { error: `El precio de ${nombre} no es un número válido.` };
      if (l.costoSubTexto.trim() && costoSub === null) return { error: `El costo de subalquiler de ${nombre} no es un número válido.` };
      filas.push({
        evento_id: id,
        item_id: l.item_id,
        cantidad_total: l.cantidad_total,
        cantidad_propia: l.cantidad_propia,
        cantidad_subalquilada: l.cantidad_subalquilada,
        precio_unitario: precio,
        costo_subalquiler_unitario: costoSub,
      });
    }
    return { filas };
  };

  const avisarAjustes = (ajustes: { nombre: string; cantidad_subalquilada: number }[] | null) => {
    if (ajustes && ajustes.length > 0) {
      setAviso({
        tipo: 'error',
        texto: `Se ajustó por falta de stock: ${ajustes.map((a) => `${a.nombre} (se subalquilan ${a.cantidad_subalquilada})`).join(', ')}.`,
      });
      return true;
    }
    return false;
  };

  const guardar = async (): Promise<boolean> => {
    if (!evento) return false;
    setAviso(null);
    const { filas, error: errLineas } = prepararLineas();
    if (errLineas || !filas) {
      setAviso({ tipo: 'error', texto: errLineas! });
      return false;
    }
    const flete = leerMonto(fleteTexto);
    if (fleteTexto.trim() && flete === null) {
      setAviso({ tipo: 'error', texto: 'El flete cobrado no es un número válido.' });
      return false;
    }
    if (ESTADOS_QUE_RESERVAN.includes(evento.estado) || evento.estado === 'devuelto') {
      const sinPrecio = filas.filter((f) => f.cantidad_total > 0 && f.precio_unitario === null);
      if (sinPrecio.length) {
        setAviso({ tipo: 'error', texto: `El evento está ${evento.estado}: falta el precio de ${sinPrecio.map((f) => itemPorId[f.item_id]?.nombre).join(', ')}.` });
        return false;
      }
    }
    setGuardando(true);
    const { error: e1 } = await supabase
      .from('eventos')
      .update({
        lugar: evento.lugar?.trim() || null,
        tipo_evento: evento.tipo_evento?.trim() || null,
        cantidad_personas: evento.cantidad_personas || null,
        fecha_evento: evento.fecha_evento,
        fecha_entrega: evento.fecha_entrega,
        fecha_devolucion: evento.fecha_devolucion,
        flete_cobrado: flete ?? 0,
        notas: evento.notas?.trim() || null,
      })
      .eq('id', id);
    if (e1) {
      setGuardando(false);
      setAviso({ tipo: 'error', texto: mensajeError(e1, 'No se pudo guardar el evento.') });
      return false;
    }
    if (filas.length) {
      const { error: e2 } = await supabase.from('evento_lineas').upsert(filas, { onConflict: 'evento_id,item_id' });
      if (e2) {
        setGuardando(false);
        setAviso({ tipo: 'error', texto: mensajeError(e2, 'No se pudieron guardar los artículos.') });
        return false;
      }
    }
    const quedan = filas.map((f) => f.item_id);
    let borrar = supabase.from('evento_lineas').delete().eq('evento_id', id);
    if (quedan.length) borrar = borrar.not('item_id', 'in', `(${quedan.join(',')})`);
    const { error: e3 } = await borrar;
    if (e3) {
      setGuardando(false);
      setAviso({ tipo: 'error', texto: mensajeError(e3, 'No se pudieron quitar artículos.') });
      return false;
    }
    let huboAjustes = false;
    if (ESTADOS_QUE_RESERVAN.includes(evento.estado)) {
      const { data } = await supabase.rpc('reservar_stock', { p_evento: id });
      huboAjustes = avisarAjustes(data);
    }
    setGuardando(false);
    await cargar();
    if (!huboAjustes) setAviso({ tipo: 'ok', texto: 'Guardado.' });
    return true;
  };

  const cambiarEstado = async (nuevo: EstadoEvento) => {
    if (!evento || nuevo === evento.estado) return;
    if (cambios && !(await guardar())) return;
    setGuardando(true);
    const { data, error } = await supabase.rpc('cambiar_estado_evento', { p_evento: id, p_estado: nuevo });
    setGuardando(false);
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error, 'No se pudo cambiar el estado.') });
    await cargar();
    if (!avisarAjustes(data)) setAviso({ tipo: 'ok', texto: `Estado: ${nuevo}.` });
  };

  const cerrarEvento = async (cerrar: boolean) => {
    if (cerrar && !window.confirm('Al cerrar el evento, sus precios y costos quedan congelados. ¿Cerrar?')) return;
    const { error } = await supabase.from('eventos').update({ cerrado_en: cerrar ? new Date().toISOString() : null }).eq('id', id);
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error, 'No se pudo cambiar.') });
    await cargar();
  };

  const eliminarEvento = async () => {
    if (!window.confirm('¿Eliminar este evento con sus artículos, costos y pagos? No se puede deshacer.')) return;
    const { error } = await supabase.from('eventos').delete().eq('id', id);
    if (error) return setAviso({ tipo: 'error', texto: mensajeError(error, 'No se pudo eliminar.') });
    onVolver();
  };

  const volver = () => {
    if (cambios && !window.confirm('Hay cambios sin guardar. ¿Salir igual?')) return;
    onVolver();
  };

  // ------------------------------------------------------------------ cálculo en vivo
  const resultado = useMemo(
    () =>
      resultadoEvento({
        lineas: lineas.map((l) => ({
          cantidad_total: l.cantidad_total,
          cantidad_subalquilada: l.cantidad_subalquilada,
          precio_unitario: leerMonto(l.precioTexto),
          costo_subalquiler_unitario: leerMonto(l.costoSubTexto),
        })),
        fleteCobrado: leerMonto(fleteTexto),
        costos,
        pagos,
      }),
    [lineas, fleteTexto, costos, pagos],
  );

  if (cargando) return <p className="font-manrope text-sm text-stone-600">Cargando…</p>;
  if (!evento || !cliente) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={onVolver} className={BTN_SECUNDARIO}><ArrowLeft size={18} /> Volver</button>
        <Mensaje aviso={aviso} />
      </div>
    );
  }

  const faltantes = faltantesParaDocumento({
    nombreLocatario: cliente.nombre_apellido,
    fechaEvento: evento.fecha_evento,
    fechaDevolucion: evento.fecha_devolucion,
    lineas: lineas.map((l) => ({
      nombre: itemPorId[l.item_id]?.nombre,
      cantidad_total: l.cantidad_total,
      cantidad_subalquilada: l.cantidad_subalquilada,
      precio_unitario: leerMonto(l.precioTexto),
      costo_subalquiler_unitario: null,
    })),
  });
  const sinAgregar = items.filter((i) => i.activo && !lineas.some((l) => l.item_id === i.id));

  return (
    <div className="space-y-5 pb-28">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={volver} className={BTN_SECUNDARIO}><ArrowLeft size={18} /> Eventos</button>
        <span className={`rounded-full px-3 py-1 text-sm font-bold capitalize ${COLOR_ESTADO_EVENTO[evento.estado]}`}>{evento.estado}</span>
      </div>

      {cerrado && (
        <p className="flex items-center gap-2 rounded-lg border border-stone-300 bg-stone-100 p-3 font-manrope text-sm text-stone-700">
          <Lock size={16} /> Evento cerrado: precios y costos congelados.
          {esAdmin && <button type="button" className="ml-auto font-semibold underline" onClick={() => cerrarEvento(false)}>Reabrir</button>}
        </p>
      )}

      {/* ------------------------------------------------ Cliente */}
      <section className={TARJETA}>
        {editandoCliente ? (
          <div className="space-y-4">
            <FormCliente valor={editandoCliente} onChange={setEditandoCliente} />
            <div className="flex gap-2">
              <button
                type="button"
                className={BTN_PRIMARIO}
                onClick={async () => {
                  const r = await guardarCliente(editandoCliente);
                  if (r.error) return setAviso({ tipo: 'error', texto: r.error });
                  setCliente(r.cliente!);
                  setEditandoCliente(null);
                }}
              >
                Guardar cliente
              </button>
              <button type="button" className={BTN_SECUNDARIO} onClick={() => setEditandoCliente(null)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 font-manrope">
              <h1 className="font-playfair text-2xl font-bold text-stone-900 break-words">{cliente.nombre_apellido}</h1>
              <p className="text-sm text-stone-600">
                {cliente.telefono || 'sin teléfono'}{cliente.dni ? ` · DNI ${cliente.dni}` : ' · sin DNI'} · <span className="capitalize">{cliente.canal_origen}</span>
              </p>
              <button type="button" className="mt-1 text-sm font-semibold text-emerald-800 underline" onClick={() => setEditandoCliente({ ...cliente })}>Editar datos del cliente</button>
            </div>
            {cliente.telefono && (
              <a href={linkWhatsappCliente(cliente.telefono)} target="_blank" rel="noopener noreferrer" className={BTN_PRIMARIO} aria-label="Abrir WhatsApp">
                <MessageCircle size={18} />
              </a>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------ Datos del evento */}
      <section className={`${TARJETA} space-y-4`}>
        <h2 className="font-playfair text-xl font-bold">Evento</h2>
        <fieldset disabled={bloqueado} className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={ETIQUETA} htmlFor="ed-fecha">Fecha del evento</label>
            <input id="ed-fecha" type="date" className={CAMPO} value={evento.fecha_evento} onChange={(e) => cambiarEvento({ fecha_evento: e.target.value })} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="ed-entrega">Entrega</label>
            <input id="ed-entrega" type="date" className={CAMPO} value={evento.fecha_entrega} max={evento.fecha_evento} onChange={(e) => cambiarEvento({ fecha_entrega: e.target.value })} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="ed-devolucion">Devolución</label>
            <input id="ed-devolucion" type="date" className={CAMPO} value={evento.fecha_devolucion} min={evento.fecha_evento} onChange={(e) => cambiarEvento({ fecha_devolucion: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={ETIQUETA} htmlFor="ed-lugar">Lugar</label>
            <input id="ed-lugar" className={CAMPO} value={evento.lugar ?? ''} onChange={(e) => cambiarEvento({ lugar: e.target.value })} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="ed-personas">Personas</label>
            <input id="ed-personas" className={CAMPO} inputMode="numeric" value={evento.cantidad_personas ?? ''} onChange={(e) => cambiarEvento({ cantidad_personas: Number(e.target.value.replace(/\D/g, '')) || null })} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="ed-tipo">Tipo de evento</label>
            <input id="ed-tipo" className={CAMPO} value={evento.tipo_evento ?? ''} onChange={(e) => cambiarEvento({ tipo_evento: e.target.value })} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="ed-flete">Flete cobrado al cliente</label>
            <input id="ed-flete" className={CAMPO} inputMode="decimal" placeholder="$ 0" value={fleteTexto} onChange={(e) => { setFleteTexto(e.target.value); setCambios(true); }} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="ed-estado">Estado</label>
            <select id="ed-estado" className={`${CAMPO} capitalize`} value={evento.estado} disabled={guardando || cerrado} onChange={(e) => cambiarEstado(e.target.value as EstadoEvento)}>
              {ESTADOS_EVENTO.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className={ETIQUETA} htmlFor="ed-notas">Notas</label>
            <textarea id="ed-notas" rows={2} className={CAMPO} value={evento.notas ?? ''} onChange={(e) => cambiarEvento({ notas: e.target.value })} />
          </div>
        </fieldset>
        <p className={AYUDA}>
          {ESTADOS_QUE_RESERVAN.includes(evento.estado)
            ? 'Este evento reserva stock desde la entrega hasta la devolución.'
            : 'En estado presupuesto todavía no reserva stock. Al confirmarlo se reserva.'}{' '}
          Nunca hay límite: si falta stock propio, se marca como subalquilado.
        </p>
      </section>

      {/* ------------------------------------------------ Artículos */}
      <section className={`${TARJETA} space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-playfair text-xl font-bold">Artículos</h2>
          {!bloqueado && (
            <button type="button" className={BTN_SECUNDARIO} onClick={abrirAsistente}><Sparkles size={16} /> Sugerir cantidades</button>
          )}
        </div>

        {asistente && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-manrope">
            <p className="mb-2 text-sm text-stone-800">Sugerencia para {evento.cantidad_personas} personas ({config.personas_por_mesa} por mesa). Revisá, cambiá y confirmá:</p>
            {asistente.length === 0 && <p className="text-sm text-stone-600">Ningún artículo tiene sugerencia activada (se configura en Inventario).</p>}
            <ul className="space-y-2">
              {asistente.map((p, i) => (
                <li key={p.item.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={p.marcado}
                    onChange={(e) => setAsistente(asistente.map((a, j) => (j === i ? { ...a, marcado: e.target.checked } : a)))}
                    aria-label={`Usar ${p.item.nombre}`}
                  />
                  <span className="flex-1">{p.item.nombre}</span>
                  <input
                    className={`${CELDA} w-24`}
                    inputMode="numeric"
                    value={p.cantidad}
                    onChange={(e) => setAsistente(asistente.map((a, j) => (j === i ? { ...a, cantidad: Number(e.target.value.replace(/\D/g, '') || 0) } : a)))}
                    aria-label={`Cantidad de ${p.item.nombre}`}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button type="button" className={BTN_PRIMARIO} onClick={aplicarAsistente}>Usar estas cantidades</button>
              <button type="button" className={BTN_SECUNDARIO} onClick={() => setAsistente(null)}>Descartar</button>
            </div>
          </div>
        )}

        {lineas.length === 0 && <p className="font-manrope text-sm text-stone-600">Todavía no hay artículos.</p>}

        <div className="space-y-3">
          {lineas.map((l) => {
            const item = itemPorId[l.item_id];
            const d = disp[l.item_id];
            const libre = libreDe(l.item_id);
            const sugerido = ultimoPrecio[l.item_id];
            const choqueTentativo = d && d.tentativo > 0 && l.cantidad_total + d.tentativo > Math.max(0, libre);
            const subtotal = l.cantidad_total * (leerMonto(l.precioTexto) ?? 0);
            const faltaPrecio = l.cantidad_total > 0 && !l.precioTexto.trim();
            return (
              <fieldset key={l.item_id} disabled={bloqueado} className="rounded-xl border border-stone-200 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex-1 font-manrope text-base font-semibold text-stone-900">{item?.nombre ?? 'Artículo'}</span>
                  <span className="font-manrope text-xs text-stone-500">libres: {mostrarStock(libre)}</span>
                  {!bloqueado && (
                    <button type="button" onClick={() => quitarLinea(l.item_id)} className="h-10 w-10 flex items-center justify-center text-stone-400 hover:text-red-600" aria-label={`Quitar ${item?.nombre}`}>
                      <X size={18} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label className="font-manrope text-xs text-stone-600">
                    Cantidad
                    <input className={CELDA} inputMode="numeric" value={l.cantidad_total || ''} placeholder="0" onChange={(e) => cambiarTotal(l.item_id, e.target.value)} />
                  </label>
                  <label className="font-manrope text-xs text-stone-600">
                    Precio unitario
                    <input
                      className={`${CELDA} ${faltaPrecio ? 'border-red-400 bg-red-50' : ''}`}
                      inputMode="decimal"
                      placeholder={sugerido !== undefined ? `último: ${mostrarMonto(sugerido)}` : '$'}
                      value={l.precioTexto}
                      onChange={(e) => cambiarLinea(l.item_id, { precioTexto: e.target.value })}
                    />
                    {sugerido !== undefined && !l.precioTexto && !bloqueado && (
                      <button type="button" className="mt-1 text-xs font-semibold text-emerald-800 underline" onClick={() => cambiarLinea(l.item_id, { precioTexto: mostrarMonto(sugerido) })}>
                        Usar {pesos(Math.round(sugerido * 100))}
                      </button>
                    )}
                  </label>
                  <label className="font-manrope text-xs text-stone-600">
                    Subalquiladas
                    <input className={CELDA} inputMode="numeric" value={l.cantidad_subalquilada} onChange={(e) => cambiarSubalquiladas(l, e.target.value)} />
                  </label>
                  <label className="font-manrope text-xs text-stone-600">
                    Costo subalquiler c/u
                    <input className={CELDA} inputMode="decimal" placeholder={l.cantidad_subalquilada ? '$' : '—'} value={l.costoSubTexto} onChange={(e) => cambiarLinea(l.item_id, { costoSubTexto: e.target.value })} />
                  </label>
                </div>
                <p className="mt-2 font-manrope text-sm text-stone-700">
                  Propias <strong>{l.cantidad_propia}</strong> · subalquiladas <strong>{l.cantidad_subalquilada}</strong>
                  {subtotal > 0 && <> · subtotal <strong>{pesos(Math.round(subtotal * 100))}</strong></>}
                </p>
                {l.cantidad_subalquilada > 0 && (
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-2 font-manrope text-sm font-semibold text-amber-900">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    Faltan {l.cantidad_subalquilada} {item?.nombre.toLowerCase()}; se subalquilan.
                  </p>
                )}
                {d && l.cantidad_propia > Math.max(0, libre) && (
                  <p className="mt-2 font-manrope text-xs font-semibold text-red-700">
                    Ya no alcanza el stock propio para estas fechas (libres: {Math.max(0, libre)}). Volvé a escribir la cantidad o, al confirmar/guardar, se ajusta solo.
                  </p>
                )}
                {choqueTentativo && (
                  <p className="mt-2 font-manrope text-xs text-amber-800">
                    Ojo: otros presupuestos sin confirmar piden {d.tentativo} para esas fechas.
                  </p>
                )}
              </fieldset>
            );
          })}
        </div>

        {!bloqueado && sinAgregar.length > 0 && (
          <div>
            <label className={ETIQUETA} htmlFor="ed-agregar">Agregar artículo</label>
            <select id="ed-agregar" className={CAMPO} value="" onChange={(e) => agregarItem(e.target.value)}>
              <option value="">Elegí un artículo…</option>
              {sinAgregar.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ Costos y pagos */}
      <Movimientos
        eventoId={id}
        costos={costos}
        pagos={pagos}
        bloqueado={bloqueado}
        onCambio={cargar}
        onError={(texto) => setAviso({ tipo: 'error', texto })}
      />

      {/* ------------------------------------------------ Resultado */}
      <section className={`${TARJETA} font-manrope`}>
        <h2 className="mb-3 font-playfair text-xl font-bold">Resultado del evento</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-stone-600">Artículos</dt><dd className="text-right tabular-nums">{pesos(resultado.ingresoArticulos)}</dd>
          <dt className="text-stone-600">Flete cobrado</dt><dd className="text-right tabular-nums">{pesos(resultado.fleteCobrado)}</dd>
          <dt className="font-semibold">Ingresos</dt><dd className="text-right font-semibold tabular-nums">{pesos(resultado.ingresos)}</dd>
          <dt className="text-stone-600">Subalquiler</dt><dd className="text-right tabular-nums">− {pesos(resultado.costoSubalquiler)}</dd>
          <dt className="text-stone-600">Flete pagado</dt><dd className="text-right tabular-nums">− {pesos(resultado.fletePagado)}</dd>
          <dt className="text-stone-600">Otros costos</dt><dd className="text-right tabular-nums">− {pesos(resultado.otrosCostos)}</dd>
        </dl>
        <div className="mt-3 flex items-end justify-between border-t border-stone-200 pt-3">
          <span className="font-semibold">Ganancia neta</span>
          <span className={`text-2xl font-bold tabular-nums ${resultado.ganancia < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {pesos(resultado.ganancia)}
            {resultado.margen !== null && <span className="ml-2 text-sm font-semibold text-stone-500">{Math.round(resultado.margen * 100)}%</span>}
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-700">
          Cobrado {pesos(resultado.pagado)} · saldo <strong>{pesos(resultado.saldo)}</strong> · <span className="capitalize">{resultado.estadoCobro}</span>
        </p>
        {faltantes.length > 0 && (
          <div className="mt-3 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
            <p className="font-semibold text-stone-800">Para poder sacar presupuesto o contrato falta:</p>
            <ul className="list-disc pl-5">{faltantes.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        {(evento.estado === 'devuelto' || evento.estado === 'cancelado') && !cerrado && (
          <button type="button" className={BTN_OSCURO} onClick={() => cerrarEvento(true)}><Lock size={16} /> Cerrar evento</button>
        )}
        {cerrado && esAdmin && (
          <button type="button" className={BTN_SECUNDARIO} onClick={() => cerrarEvento(false)}><Unlock size={16} /> Reabrir</button>
        )}
        {(evento.estado === 'presupuesto' || evento.estado === 'cancelado') && !cerrado && (
          <button type="button" className={`${BTN_PELIGRO_SUAVE} ml-auto`} onClick={eliminarEvento}><Trash2 size={16} /> Eliminar evento</button>
        )}
      </div>

      {/* Barra fija para guardar, siempre a mano en el celular */}
      {!bloqueado && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:left-72">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <span className="flex-1 font-manrope text-sm text-stone-600">{cambios ? 'Hay cambios sin guardar' : 'Todo guardado'}</span>
            <button type="button" disabled={guardando || !cambios} onClick={guardar} className={`${BTN_PRIMARIO} min-h-[52px] px-8`}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          {aviso && <div className="mx-auto mt-2 max-w-5xl"><Mensaje aviso={aviso} /></div>}
        </div>
      )}
      {bloqueado && <Mensaje aviso={aviso} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Costos y pagos: se guardan al instante (no dependen del botón Guardar)
// ---------------------------------------------------------------------------
function Movimientos({
  eventoId,
  costos,
  pagos,
  bloqueado,
  onCambio,
  onError,
}: {
  eventoId: string;
  costos: Costo[];
  pagos: Pago[];
  bloqueado: boolean;
  onCambio: () => void;
  onError: (texto: string) => void;
}) {
  const [costo, setCosto] = useState<{ tipo: TipoCosto; monto: string; descripcion: string; fecha: string } | null>(null);
  const [pago, setPago] = useState<{ tipo: TipoPago; monto: string; medio: MedioPago; fecha: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const agregarCosto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!costo) return;
    const monto = leerMonto(costo.monto);
    if (monto === null) return onError('Escribí el monto del costo.');
    setEnviando(true);
    const { error } = await supabase.from('evento_costos').insert({ evento_id: eventoId, tipo: costo.tipo, monto, descripcion: costo.descripcion.trim() || null, fecha: costo.fecha });
    setEnviando(false);
    if (error) return onError(mensajeError(error, 'No se pudo guardar el costo.'));
    setCosto(null);
    onCambio();
  };

  const agregarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pago) return;
    const monto = leerMonto(pago.monto);
    if (!monto) return onError('Escribí el monto del pago.');
    setEnviando(true);
    const { error } = await supabase.from('pagos').insert({ evento_id: eventoId, tipo: pago.tipo, monto, medio: pago.medio, fecha: pago.fecha });
    setEnviando(false);
    if (error) return onError(mensajeError(error, 'No se pudo guardar el pago.'));
    setPago(null);
    onCambio();
  };

  const borrar = async (tabla: 'evento_costos' | 'pagos', fila: { id?: string }) => {
    if (!fila.id || !window.confirm('¿Borrar este movimiento?')) return;
    const { error } = await supabase.from(tabla).delete().eq('id', fila.id);
    if (error) return onError(mensajeError(error, 'No se pudo borrar.'));
    onCambio();
  };

  const fila = (key: string | undefined, texto: React.ReactNode, monto: number, alBorrar: () => void, puedeBorrar: boolean) => (
    <li key={key} className="flex min-h-[44px] items-center gap-2 py-1">
      <span className="flex-1 text-sm">{texto}</span>
      <span className="tabular-nums font-semibold">{pesos(Math.round(Number(monto) * 100))}</span>
      {puedeBorrar && (
        <button type="button" onClick={alBorrar} className="h-10 w-10 flex items-center justify-center text-stone-400 hover:text-red-600" aria-label="Borrar">
          <Trash2 size={16} />
        </button>
      )}
    </li>
  );

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className={`${TARJETA} font-manrope`}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-playfair text-xl font-bold">Costos</h2>
          {!bloqueado && !costo && (
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setCosto({ tipo: 'flete', monto: '', descripcion: '', fecha: hoyArgentina() })}><Plus size={16} /> Costo</button>
          )}
        </div>
        <p className={AYUDA}>El subalquiler se carga en cada artículo. Acá van flete pagado, lavado, roturas, ayudantes.</p>
        {costo && (
          <form onSubmit={agregarCosto} className="my-3 space-y-2 rounded-xl bg-stone-50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <select className={`${CAMPO} capitalize`} value={costo.tipo} onChange={(e) => setCosto({ ...costo, tipo: e.target.value as TipoCosto })} aria-label="Tipo de costo">
                {TIPOS_COSTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className={CAMPO} inputMode="decimal" placeholder="$ monto" value={costo.monto} onChange={(e) => setCosto({ ...costo, monto: e.target.value })} aria-label="Monto" />
            </div>
            <input className={CAMPO} placeholder="Detalle (opcional): ida y vuelta, 2 copas rotas…" value={costo.descripcion} onChange={(e) => setCosto({ ...costo, descripcion: e.target.value })} aria-label="Detalle" />
            <input type="date" className={CAMPO} value={costo.fecha} onChange={(e) => setCosto({ ...costo, fecha: e.target.value })} aria-label="Fecha" />
            <div className="flex gap-2">
              <button type="submit" disabled={enviando} className={BTN_PRIMARIO}>Agregar</button>
              <button type="button" className={BTN_SECUNDARIO} onClick={() => setCosto(null)}>Cancelar</button>
            </div>
          </form>
        )}
        <ul className="divide-y divide-stone-100">
          {costos.length === 0 && <li className="py-2 text-sm text-stone-500">Sin costos cargados.</li>}
          {costos.map((c) =>
            fila(c.id,
              <><span className="capitalize">{c.tipo}</span>{c.descripcion ? <span className="text-stone-500"> · {c.descripcion}</span> : null}</>,
              c.monto,
              () => borrar('evento_costos', c),
              !bloqueado,
            ),
          )}
        </ul>
      </section>

      <section className={`${TARJETA} font-manrope`}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-playfair text-xl font-bold">Pagos del cliente</h2>
          {!pago && (
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setPago({ tipo: pagos.length ? 'saldo' : 'seña', monto: '', medio: 'efectivo', fecha: hoyArgentina() })}><Plus size={16} /> Pago</button>
          )}
        </div>
        {pago && (
          <form onSubmit={agregarPago} className="my-3 space-y-2 rounded-xl bg-stone-50 p-3">
            <div className="grid grid-cols-2 gap-2">
              <select className={`${CAMPO} capitalize`} value={pago.tipo} onChange={(e) => setPago({ ...pago, tipo: e.target.value as TipoPago })} aria-label="Tipo de pago">
                {TIPOS_PAGO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className={CAMPO} inputMode="decimal" placeholder="$ monto" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} aria-label="Monto" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className={`${CAMPO} capitalize`} value={pago.medio} onChange={(e) => setPago({ ...pago, medio: e.target.value as MedioPago })} aria-label="Medio de pago">
                {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="date" className={CAMPO} value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} aria-label="Fecha" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={enviando} className={BTN_PRIMARIO}>Agregar</button>
              <button type="button" className={BTN_SECUNDARIO} onClick={() => setPago(null)}>Cancelar</button>
            </div>
          </form>
        )}
        <ul className="divide-y divide-stone-100">
          {pagos.length === 0 && <li className="py-2 text-sm text-stone-500">Sin pagos todavía.</li>}
          {pagos.map((p) =>
            fila(p.id,
              <><span className="capitalize">{p.tipo}</span> <span className="text-stone-500">· {p.medio}</span></>,
              p.monto,
              () => borrar('pagos', p),
              !bloqueado,
            ),
          )}
        </ul>
      </section>
    </div>
  );
}
