'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hoyArgentina, pesos, repartirCantidad, resultadoEvento } from '@/lib/gestion/calculos';
import { CANALES, type Canal, type Cliente, type FilaDisponibilidad, leerMonto, mensajeError, mostrarMonto } from '@/lib/gestion/tipos';
import { interpretarEvento } from '@/lib/gestion/vozEvento';
import { AYUDA, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA } from '../estilos';
import { CampoFecha } from './Calendarios';

export interface ItemEvento {
  id: string;
  nombre: string;
  alias: string[];
  stock_total: number | null;
}

interface LineaForm {
  key: string;
  itemId: string;
  nombreDicho: string;
  cantidad: string;
  precio: string;
  costoSub: string;
}

const NUEVO = '__nuevo__';
const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Evento armado a partir de un mensaje: ella lo cuenta como se lo contaría a una persona
 * y acá se ve todo calculado (total, seña, saldo, subalquiler y ganancia). Nada se guarda sin confirmar.
 */
export default function EventoPorMensaje({
  texto,
  items,
  onCreado,
}: {
  texto: string;
  items: ItemEvento[];
  onCreado: (eventoId: string, resumen: string) => void;
}) {
  const [borrador] = useState(() => interpretarEvento(texto, items, hoyArgentina()));
  const [cliente, setCliente] = useState(borrador.cliente);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [parecidos, setParecidos] = useState<Cliente[]>([]);
  const [fecha, setFecha] = useState(borrador.fecha ?? '');
  const [lugar, setLugar] = useState(borrador.lugar);
  const [canal, setCanal] = useState<Canal | ''>(borrador.canal ?? '');
  const [personas, setPersonas] = useState(borrador.personas ? String(borrador.personas) : '');
  const [lineas, setLineas] = useState<LineaForm[]>(() =>
    borrador.lineas.map((l, i) => ({
      key: `l${i}`,
      itemId: l.itemId ?? NUEVO,
      nombreDicho: l.nombreDicho,
      cantidad: l.cantidad !== null ? String(l.cantidad) : '',
      precio: mostrarMonto(l.precio),
      costoSub: '',
    })),
  );
  const [fleteCobrado, setFleteCobrado] = useState(mostrarMonto(borrador.fleteCobrado));
  const [fletePagado, setFletePagado] = useState(mostrarMonto(borrador.fletePagado));
  const [senaPct, setSenaPct] = useState(borrador.senaPorcentaje !== null ? String(borrador.senaPorcentaje) : '');
  const [senaMonto, setSenaMonto] = useState(mostrarMonto(borrador.senaMonto));
  const [disp, setDisp] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fleteDecidido, setFleteDecidido] = useState(false);

  // ¿Ya existe este cliente? Se ofrecen los parecidos para no duplicarlo.
  useEffect(() => {
    if (clienteId) return;
    const palabras = cliente.split(' ').filter((w) => w.length >= 4).map((w) => w.replace(/[%,()]/g, ''));
    if (!palabras.length) return setParecidos([]);
    const t = setTimeout(async () => {
      const { data } = await supabase.from('clientes').select('*').or(palabras.map((w) => `nombre_apellido.ilike.%${w}%`).join(',')).limit(5);
      setParecidos((data as Cliente[]) ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [cliente, clienteId]);

  // Stock propio libre ese día (si todavía no hay fecha se usa el stock total)
  const idsReales = lineas.map((l) => l.itemId).filter((id) => id && id !== NUEVO);
  useEffect(() => {
    if (!fecha || !idsReales.length) return setDisp({});
    supabase.rpc('disponibilidad', { p_items: idsReales, p_desde: fecha, p_hasta: fecha }).then(({ data }) => {
      const m: Record<string, number> = {};
      for (const f of (data as FilaDisponibilidad[]) ?? []) m[f.item_id] = f.disponible ?? Infinity;
      setDisp(m);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, idsReales.join(',')]);

  const libreDe = (itemId: string): number => {
    if (itemId === NUEVO || !itemId) return Infinity;
    if (itemId in disp) return disp[itemId];
    const s = items.find((i) => i.id === itemId)?.stock_total;
    return s === null || s === undefined ? Infinity : s;
  };

  const calculo = useMemo(() => {
    const filas = lineas.map((l) => {
      const cantidad = Number(l.cantidad) || 0;
      const rep = repartirCantidad(cantidad, libreDe(l.itemId));
      return { l, cantidad, rep, precio: leerMonto(l.precio), costoSub: leerMonto(l.costoSub) };
    });
    const fletePag = leerMonto(fletePagado) ?? 0;
    const r = resultadoEvento({
      lineas: filas.map((f) => ({ cantidad_total: f.cantidad, cantidad_subalquilada: f.rep.subalquilada, precio_unitario: f.precio, costo_subalquiler_unitario: f.costoSub })),
      fleteCobrado: leerMonto(fleteCobrado),
      costos: fletePag > 0 ? [{ tipo: 'flete', monto: fletePag }] : [],
      pagos: [],
    });
    const pct = Number(senaPct) || 0;
    const sena = pct > 0 ? Math.round((r.ingresos * pct) / 100) : Math.round((leerMonto(senaMonto) ?? 0) * 100);
    return { filas, r, sena, saldo: r.ingresos - sena };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineas, fleteCobrado, fletePagado, senaPct, senaMonto, disp]);

  const cambiarLinea = (key: string, c: Partial<LineaForm>) => setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...c } : l)));
  const fleteAPagar = leerMonto(fletePagado) ?? 0;
  const preguntarFlete = fleteAPagar > 0 && !leerMonto(fleteCobrado) && !borrador.fleteIncluido && !fleteDecidido;
  const sinPrecio = calculo.filas.filter((f) => f.cantidad > 0 && f.precio === null);
  const aSubalquilar = calculo.filas.filter((f) => f.rep.subalquilada > 0);

  const crear = async () => {
    setError('');
    if (!cliente.trim()) return setError('Falta el nombre del cliente.');
    if (!fecha) return setError('Falta la fecha del evento.');
    const validas = calculo.filas.filter((f) => f.cantidad > 0);
    if (!validas.length) return setError('Falta al menos un artículo con cantidad.');
    if (validas.some((f) => !f.l.itemId)) return setError('Elegí qué artículo es cada línea.');
    setGuardando(true);
    try {
      // 1) artículos nuevos (los que no estaban en el inventario)
      const creados: Record<string, string> = {};
      for (const f of validas.filter((x) => x.l.itemId === NUEVO)) {
        const nombre = capitalizar(f.l.nombreDicho.trim() || 'Artículo nuevo');
        if (creados[nombre]) continue;
        const { data, error: e } = await supabase
          .from('items')
          .insert({ nombre, categoria: /vajilla/i.test(nombre) ? 'vajilla' : 'otros', stock_total: null, sugerencia: 'ninguna', alias: [] })
          .select('id')
          .single();
        if (e || !data) throw e ?? { message: 'No se pudo crear el artículo.' };
        creados[nombre] = data.id;
      }
      // 2) cliente
      let cId = clienteId;
      if (!cId) {
        const { data, error: e } = await supabase.from('clientes').insert({ nombre_apellido: cliente.trim(), canal_origen: canal || 'otro' }).select('id').single();
        if (e || !data) throw e ?? { message: 'No se pudo crear el cliente.' };
        cId = data.id;
      }
      // 3) evento (queda como presupuesto: al confirmarlo se reserva el stock)
      const nota = calculo.sena > 0 ? `Seña acordada: ${Number(senaPct) > 0 ? `${senaPct}% = ` : ''}${pesos(calculo.sena)}.` : null;
      const { data: ev, error: e3 } = await supabase
        .from('eventos')
        .insert({
          cliente_id: cId,
          fecha_evento: fecha,
          fecha_entrega: fecha,
          fecha_devolucion: fecha,
          lugar: lugar.trim() || null,
          cantidad_personas: Number(personas) > 0 ? Number(personas) : null,
          flete_cobrado: leerMonto(fleteCobrado) ?? 0,
          notas: nota,
        })
        .select('id')
        .single();
      if (e3 || !ev) throw e3 ?? { message: 'No se pudo crear el evento.' };
      // 4) artículos y flete
      const { error: e4 } = await supabase.from('evento_lineas').insert(
        validas.map((f) => ({
          evento_id: ev.id,
          item_id: f.l.itemId === NUEVO ? creados[capitalizar(f.l.nombreDicho.trim() || 'Artículo nuevo')] : f.l.itemId,
          cantidad_total: f.cantidad,
          cantidad_propia: f.rep.propia,
          cantidad_subalquilada: f.rep.subalquilada,
          precio_unitario: f.precio,
          costo_subalquiler_unitario: f.rep.subalquilada > 0 ? f.costoSub : null,
        })),
      );
      if (e4) throw e4;
      const fletePag = leerMonto(fletePagado) ?? 0;
      if (fletePag > 0) {
        const { error: e5 } = await supabase.from('evento_costos').insert({ evento_id: ev.id, tipo: 'flete', monto: fletePag, descripcion: 'Flete' });
        if (e5) throw e5;
      }
      onCreado(
        ev.id,
        `Armé el evento de ${cliente.trim()}. Total ${pesos(calculo.r.ingresos)}, seña ${pesos(calculo.sena)}, saldo ${pesos(calculo.saldo)}. Ganancia ${pesos(calculo.r.ganancia)}.`,
      );
    } catch (e) {
      setError(mensajeError(e as { message?: string }, 'No se pudo crear el evento. Probá de nuevo.'));
    }
    setGuardando(false);
  };

  const Resumen = ({ titulo, valor, destaque = false }: { titulo: string; valor: string; destaque?: boolean }) => (
    <div className={`rounded-xl p-3 ${destaque ? 'bg-emerald-600 text-white' : 'bg-white'}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${destaque ? 'text-white/80' : 'text-stone-500'}`}>{titulo}</p>
      <p className="text-lg font-bold tabular-nums">{valor}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-white p-3 text-sm italic text-stone-700">“{texto}”</p>

      {/* Lo más importante, calculado al instante */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Resumen titulo="Total" valor={pesos(calculo.r.ingresos)} destaque />
        <Resumen titulo={`Seña${Number(senaPct) > 0 ? ` ${senaPct}%` : ''}`} valor={pesos(calculo.sena)} />
        <Resumen titulo="Saldo" valor={pesos(calculo.saldo)} />
        <Resumen titulo="Ganancia" valor={pesos(calculo.r.ganancia)} />
      </div>
      <p className="text-xs text-stone-600">
        Ingresos {pesos(calculo.r.ingresos)} − subalquiler {pesos(calculo.r.costoSubalquiler)} − flete {pesos(calculo.r.fletePagado)}
        {calculo.r.margen !== null ? ` · margen ${Math.round(calculo.r.margen * 100)}%` : ''}
        {borrador.fleteIncluido ? ' · flete incluido en el precio' : ''}
      </p>

      {aSubalquilar.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          <p className="flex items-center gap-2"><AlertTriangle size={16} /> Hay que subalquilar:</p>
          <ul className="mt-1 list-disc pl-6 font-medium">
            {aSubalquilar.map((f) => (
              <li key={f.l.key}>{f.rep.subalquilada} de {items.find((i) => i.id === f.l.itemId)?.nombre ?? f.l.nombreDicho} {fecha ? '' : '(se calculó con el stock total; falta la fecha)'}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Cliente */}
      <div>
        <label className={ETIQUETA} htmlFor="em-cliente">Cliente</label>
        <input id="em-cliente" className={CAMPO} value={cliente} onChange={(e) => { setCliente(e.target.value); setClienteId(null); }} />
        {clienteId && <p className={AYUDA}>Cliente que ya estaba cargado.</p>}
        {!clienteId && parecidos.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className={AYUDA}>¿Es alguno de estos clientes que ya tenés?</p>
            {parecidos.map((c) => (
              <button key={c.id} type="button" onClick={() => { setClienteId(c.id); setCliente(c.nombre_apellido); }} className={`${BTN_SECUNDARIO} w-full justify-start`}>
                {c.nombre_apellido} {c.telefono ? `· ${c.telefono}` : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <p className={ETIQUETA}>Fecha del evento{!fecha && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">Falta</span>}</p>
          <CampoFecha valor={fecha} onChange={setFecha} />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="em-lugar">Dirección / lugar (opcional)</label>
          <input id="em-lugar" className={CAMPO} value={lugar} onChange={(e) => setLugar(e.target.value)} />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="em-personas">Personas (opcional)</label>
          <input id="em-personas" className={CAMPO} inputMode="numeric" value={personas} onChange={(e) => setPersonas(e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>

      {!clienteId && (
        <div>
          <p className={ETIQUETA}>¿Cómo te contactó? {!canal && <span className="ml-1 text-xs font-normal text-stone-500">(opcional)</span>}</p>
          <div className="flex flex-wrap gap-2">
            {CANALES.map((c) => (
              <button key={c} type="button" aria-pressed={canal === c} onClick={() => setCanal(canal === c ? '' : c)} className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold capitalize ${canal === c ? 'bg-stone-900 text-white' : 'border border-stone-300 bg-white text-stone-800'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Artículos */}
      <div className="space-y-3">
        <p className={ETIQUETA}>Artículos</p>
        {calculo.filas.map(({ l, cantidad, rep, precio }) => (
          <div key={l.key} className="rounded-xl border border-stone-200 bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <select className={`${CAMPO} min-h-[44px] flex-1`} value={l.itemId} onChange={(e) => cambiarLinea(l.key, { itemId: e.target.value })} aria-label="Artículo">
                {l.nombreDicho && <option value={NUEVO}>Crear “{capitalizar(l.nombreDicho)}” (no está en el inventario)</option>}
                {!l.nombreDicho && l.itemId === '' && <option value="">Elegí…</option>}
                {items.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
              <button type="button" onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))} className="flex h-11 w-11 items-center justify-center text-stone-400 hover:text-red-600" aria-label="Quitar">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-stone-600">
                Cantidad
                <input className={CAMPO} inputMode="numeric" value={l.cantidad} onChange={(e) => cambiarLinea(l.key, { cantidad: e.target.value.replace(/\D/g, '') })} />
              </label>
              <label className="text-xs text-stone-600">
                Precio c/u{cantidad > 0 && precio === null && <span className="ml-1 font-bold text-red-700">falta</span>}
                <input className={`${CAMPO} ${cantidad > 0 && precio === null ? 'border-red-400' : ''}`} inputMode="decimal" placeholder="$" value={l.precio} onChange={(e) => cambiarLinea(l.key, { precio: e.target.value })} />
              </label>
            </div>
            <p className="mt-2 text-sm text-stone-700">
              Subtotal <strong>{pesos(Math.round(cantidad * (precio ?? 0) * 100))}</strong>
              {rep.subalquilada > 0 ? <> · propias {rep.propia} · <strong className="text-amber-800">subalquilás {rep.subalquilada}</strong></> : ''}
            </p>
            {rep.subalquilada > 0 && (
              <label className="mt-2 block text-xs text-stone-600">
                Costo de subalquiler c/u (opcional)
                <input className={CAMPO} inputMode="decimal" placeholder="$" value={l.costoSub} onChange={(e) => cambiarLinea(l.key, { costoSub: e.target.value })} />
              </label>
            )}
          </div>
        ))}
        <select
          className={CAMPO}
          value=""
          onChange={(e) => e.target.value && setLineas((ls) => [...ls, { key: `n${Date.now()}`, itemId: e.target.value, nombreDicho: '', cantidad: '', precio: '', costoSub: '' }])}
          aria-label="Agregar artículo"
        >
          <option value="">+ Agregar otro artículo…</option>
          {items.filter((i) => !lineas.some((l) => l.itemId === i.id)).map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
        </select>
      </div>

      {preguntarFlete && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-sm font-semibold text-amber-900">El flete te cuesta {pesos(Math.round(fleteAPagar * 100))}. ¿Se lo cobrás al cliente?</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BTN_PRIMARIO} onClick={() => { setFleteCobrado(mostrarMonto(fleteAPagar)); setFleteDecidido(true); }}>Sí, el mismo monto</button>
            <button type="button" className={BTN_SECUNDARIO} onClick={() => setFleteDecidido(true)}>No, está incluido en el precio</button>
          </div>
        </div>
      )}

      {/* Flete y seña */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ETIQUETA} htmlFor="em-flete-cobrado">Flete que le cobrás al cliente</label>
          <input id="em-flete-cobrado" className={CAMPO} inputMode="decimal" placeholder={borrador.fleteIncluido ? 'Incluido en el precio' : '$ 0'} value={fleteCobrado} onChange={(e) => setFleteCobrado(e.target.value)} />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="em-flete-pagado">Flete que te cuesta (ida y vuelta)</label>
          <input id="em-flete-pagado" className={CAMPO} inputMode="decimal" placeholder="$" value={fletePagado} onChange={(e) => setFletePagado(e.target.value)} />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="em-sena-pct">Seña en %</label>
          <input id="em-sena-pct" className={CAMPO} inputMode="numeric" placeholder="ej. 50" value={senaPct} onChange={(e) => { setSenaPct(e.target.value.replace(/\D/g, '')); }} />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="em-sena-monto">…o seña en pesos</label>
          <input id="em-sena-monto" className={CAMPO} inputMode="decimal" placeholder="$" value={senaMonto} onChange={(e) => setSenaMonto(e.target.value)} disabled={Number(senaPct) > 0} />
        </div>
      </div>
      <p className={AYUDA}>La seña es lo que acordaron: queda anotada en el evento, pero no se registra como pago hasta que te la dejen.</p>

      {sinPrecio.length > 0 && <p className="text-sm font-semibold text-red-700">Falta el precio de: {sinPrecio.map((f) => items.find((i) => i.id === f.l.itemId)?.nombre ?? f.l.nombreDicho).join(', ')}.</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>}

      <button type="button" onClick={crear} disabled={guardando} className={`${BTN_PRIMARIO} min-h-[56px] w-full text-base`}>
        <Plus size={18} /> {guardando ? 'Creando…' : 'Crear el evento'}
      </button>
      <p className={AYUDA}>Queda como presupuesto. Cuando lo confirmes, se reserva el stock.</p>
    </div>
  );
}
