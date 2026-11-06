'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Mic, Square, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fechaCorta, fechaLarga, hoyArgentina, pesos } from '@/lib/gestion/calculos';
import { type FilaDisponibilidad, type MedioPago, type TipoCosto, type TipoPago, leerMonto, mensajeError, mostrarMonto } from '@/lib/gestion/tipos';
import { type Intencion, eventoPorNombre, interpretar } from '@/lib/gestion/voz';
import { useBloqueoScroll } from '@/lib/useMovil';
import { AYUDA, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA } from '../estilos';
import { CampoFecha } from './Calendarios';

interface ItemOpcion { id: string; nombre: string; alias: string[]; stock_total: number | null }
interface EventoOpcion { id: string; cliente: string; fecha: string; estado: string }
interface LineaEvento { id: string; item_id: string; cantidad_total: number }

interface Form {
  intencion: Intencion;
  eventoId: string;
  monto: string;
  tipoPago: '' | TipoPago;
  medio: '' | MedioPago;
  tipoCosto: '' | TipoCosto;
  descripcion: string;
  itemId: string;
  cantidad: string;
  costoUnit: string;
  fecha: string;
}

interface Reconocedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

const EJEMPLOS = ['“Me dejó 50 mil de seña”', '“Pagué 30 mil de flete”', '“Subalquilé 50 sillas a mil”', '“¿Tengo 150 sillas para el 21?”'];
const NOMBRE_INTENCION: Record<Exclude<Intencion, 'desconocido'>, string> = { pago: 'Me pagaron', costo: 'Gasto', subalquiler: 'Subalquilé', disponibilidad: '¿Hay stock?' };

function Opciones<T extends string>({ valor, opciones, onChange }: { valor: T | ''; opciones: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={valor === o}
          onClick={() => onChange(o)}
          className={`min-h-[48px] rounded-xl px-5 font-manrope text-sm font-semibold capitalize ${valor === o ? 'bg-stone-900 text-white' : 'border border-stone-300 bg-white text-stone-800'}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Falta({ mostrar }: { mostrar: boolean }) {
  return mostrar ? <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">Falta completar</span> : null;
}

export default function AsistenteVoz({
  abierto,
  onCerrar,
  eventoActual,
  onAbrirEvento,
}: {
  abierto: boolean;
  onCerrar: () => void;
  eventoActual: string | null;
  onAbrirEvento: (id: string) => void;
}) {
  useBloqueoScroll(abierto);
  const [paso, setPaso] = useState<'hablar' | 'confirmar' | 'listo'>('hablar');
  const [texto, setTexto] = useState('');
  const [escuchando, setEscuchando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [items, setItems] = useState<ItemOpcion[]>([]);
  const [eventos, setEventos] = useState<EventoOpcion[]>([]);
  const [lineas, setLineas] = useState<LineaEvento[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [ambiguo, setAmbiguo] = useState(false);
  const [eventoSugerido, setEventoSugerido] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<{ texto: string; ok: boolean; eventoId?: string } | null>(null);
  const reconocedor = useRef<Reconocedor | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detener = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    reconocedor.current?.stop();
    setEscuchando(false);
  }, []);

  // Al abrir: empieza de cero y trae artículos y eventos
  useEffect(() => {
    if (!abierto) {
      detener();
      return;
    }
    setPaso('hablar');
    setTexto('');
    setAviso('');
    setResultado(null);
    setForm(null);
    supabase.from('items').select('id, nombre, alias, stock_total').eq('activo', true).then(({ data }) => setItems((data as ItemOpcion[]) ?? []));
    const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    supabase
      .from('eventos')
      .select('id, fecha_evento, estado, clientes(nombre_apellido)')
      .neq('estado', 'cancelado')
      .is('cerrado_en', null)
      .gte('fecha_devolucion', hace30)
      .order('fecha_evento')
      .limit(80)
      .then(({ data }) =>
        setEventos(
          ((data as unknown as { id: string; fecha_evento: string; estado: string; clientes: { nombre_apellido: string } | null }[]) ?? []).map((e) => ({
            id: e.id,
            cliente: e.clientes?.nombre_apellido ?? 'Sin cliente',
            fecha: e.fecha_evento,
            estado: e.estado,
          })),
        ),
      );
    return detener;
  }, [abierto, detener]);

  // Líneas del evento elegido (para saber si el artículo está cargado)
  useEffect(() => {
    if (!form?.eventoId) {
      setLineas([]);
      return;
    }
    supabase.from('evento_lineas').select('id, item_id, cantidad_total').eq('evento_id', form.eventoId).then(({ data }) => setLineas((data as LineaEvento[]) ?? []));
  }, [form?.eventoId]);

  const escuchar = () => {
    setAviso('');
    const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
    const Clase = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Clase) {
      setAviso('Este navegador no puede escuchar. Escribí la frase abajo, o usá el micrófono del teclado del celular.');
      return;
    }
    const r = new Clase();
    r.lang = 'es-AR';
    r.continuous = true;
    r.interimResults = true;
    let finales = texto ? `${texto} ` : '';
    r.onresult = (e) => {
      let parcial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finales += `${e.results[i][0].transcript} `;
        else parcial += e.results[i][0].transcript;
      }
      setTexto(`${finales}${parcial}`.trim());
    };
    r.onerror = (e) => {
      setEscuchando(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setAviso('El navegador no tiene permiso para usar el micrófono. Tocá el candadito de arriba y permitilo.');
      else if (e.error === 'no-speech') setAviso('No te escuché. Probá de nuevo, más cerca.');
      else if (e.error === 'network') setAviso('Sin conexión. Revisá internet.');
      else if (e.error !== 'aborted') setAviso('No se pudo escuchar. Podés escribir la frase.');
    };
    r.onend = () => setEscuchando(false);
    try {
      r.start();
    } catch {
      return;
    }
    reconocedor.current = r;
    setEscuchando(true);
    temporizador.current = setTimeout(detener, 60000);
  };

  const entender = () => {
    detener();
    const frase = texto.trim();
    if (!frase) return setAviso('Primero decí o escribí algo.');
    const hoy = hoyArgentina();
    const r = interpretar(frase, items, hoy);
    const sugerido = eventoPorNombre(frase, eventos.map((e) => ({ id: e.id, nombre: e.cliente })));
    setAmbiguo(r.itemIds.length > 1);
    setEventoSugerido(!eventoActual && !!sugerido);
    setForm({
      intencion: r.intencion,
      eventoId: eventoActual ?? sugerido ?? '',
      monto: mostrarMonto(r.monto),
      tipoPago: r.tipoPago ?? '',
      medio: r.medio ?? '',
      tipoCosto: r.tipoCosto ?? '',
      descripcion: '',
      itemId: r.itemIds.length === 1 ? r.itemIds[0] : '',
      cantidad: r.cantidad !== null ? String(r.cantidad) : '',
      costoUnit: mostrarMonto(r.costoUnitario),
      fecha: r.fecha ?? '',
    });
    setAviso('');
    setPaso('confirmar');
  };

  const cambiar = (c: Partial<Form>) => setForm((f) => (f ? { ...f, ...c } : f));

  // Qué falta para poder guardar
  const falta = (f: Form): Record<string, boolean> => ({
    evento: f.intencion !== 'disponibilidad' && !f.eventoId,
    monto: (f.intencion === 'pago' || f.intencion === 'costo') && !(leerMonto(f.monto) && leerMonto(f.monto)! > 0),
    tipoPago: f.intencion === 'pago' && !f.tipoPago,
    medio: f.intencion === 'pago' && !f.medio,
    tipoCosto: f.intencion === 'costo' && !f.tipoCosto,
    item: (f.intencion === 'subalquiler' || f.intencion === 'disponibilidad') && !f.itemId,
    cantidad: (f.intencion === 'subalquiler' || f.intencion === 'disponibilidad') && !(Number(f.cantidad) > 0),
    fecha: f.intencion === 'disponibilidad' && !f.fecha,
  });

  const guardar = async () => {
    if (!form) return;
    const faltan = falta(form);
    if (Object.values(faltan).some(Boolean)) return setAviso('Completá lo que está marcado en rojo.');
    setAviso('');
    setGuardando(true);
    const hoy = hoyArgentina();
    try {
      if (form.intencion === 'pago') {
        const monto = leerMonto(form.monto)!;
        const { error } = await supabase.from('pagos').insert({ evento_id: form.eventoId, tipo: form.tipoPago, monto, medio: form.medio, fecha: hoy });
        if (error) throw error;
        setResultado({ ok: true, eventoId: form.eventoId, texto: `Guardé el pago de ${pesos(Math.round(monto * 100))} (${form.tipoPago}).` });
      } else if (form.intencion === 'costo') {
        const monto = leerMonto(form.monto)!;
        const { error } = await supabase.from('evento_costos').insert({ evento_id: form.eventoId, tipo: form.tipoCosto, monto, descripcion: form.descripcion.trim() || null, fecha: hoy });
        if (error) throw error;
        setResultado({ ok: true, eventoId: form.eventoId, texto: `Guardé el gasto de ${pesos(Math.round(monto * 100))} (${form.tipoCosto}).` });
      } else if (form.intencion === 'subalquiler') {
        const linea = lineas.find((l) => l.item_id === form.itemId);
        const nombre = items.find((i) => i.id === form.itemId)?.nombre ?? 'ese artículo';
        const n = Number(form.cantidad);
        if (!linea) throw { message: `Ese evento no tiene “${nombre}”. Agregalo primero en el evento.`, propio: true };
        if (n > linea.cantidad_total) throw { message: `El evento tiene ${linea.cantidad_total} de “${nombre}”: no se pueden subalquilar ${n}.`, propio: true };
        const costo = leerMonto(form.costoUnit);
        const { error } = await supabase
          .from('evento_lineas')
          .update({ cantidad_subalquilada: n, cantidad_propia: linea.cantidad_total - n, costo_subalquiler_unitario: costo })
          .eq('id', linea.id);
        if (error) throw error;
        setResultado({ ok: true, eventoId: form.eventoId, texto: `Anoté ${n} de “${nombre}” subalquiladas${costo !== null ? ` a ${pesos(Math.round(costo * 100))} c/u` : ' (sin costo todavía)'}.` });
      } else if (form.intencion === 'disponibilidad') {
        const { data, error } = await supabase.rpc('disponibilidad', { p_items: [form.itemId], p_desde: form.fecha, p_hasta: form.fecha });
        if (error) throw error;
        const fila = ((data as FilaDisponibilidad[]) ?? [])[0];
        const item = items.find((i) => i.id === form.itemId);
        const n = Number(form.cantidad);
        let texto: string;
        if (!fila || fila.disponible === null) texto = `${item?.nombre}: sin límite de stock. Se puede; lo que no tengas lo subalquilás.`;
        else if (n <= fila.disponible) texto = `Sí. El ${fechaLarga(form.fecha).toLowerCase()} tenés ${fila.disponible} libres de ${item?.nombre?.toLowerCase()} y necesitás ${n}.`;
        else texto = `Tenés ${Math.max(0, fila.disponible)} libres de ${item?.nombre?.toLowerCase()} el ${fechaLarga(form.fecha).toLowerCase()}. Para ${n} habría que subalquilar ${n - Math.max(0, fila.disponible)}.`;
        setResultado({ ok: true, texto });
      }
      setPaso('listo');
    } catch (e) {
      const err = e as { message?: string; propio?: boolean };
      setAviso(err.propio ? err.message! : mensajeError(err, 'No se pudo guardar. Probá de nuevo.'));
    }
    setGuardando(false);
  };

  if (!abierto) return null;
  const faltantes = form ? falta(form) : {};
  const itemsOrdenados = form && form.itemId === '' ? items : items;
  const lineaFaltante = form?.intencion === 'subalquiler' && form.eventoId && form.itemId && lineas.length > 0 && !lineas.some((l) => l.item_id === form.itemId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-modal="true" aria-label="Asistente de voz">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-[#F4F1EA] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="font-playfair text-2xl font-bold text-stone-900">{paso === 'hablar' ? 'Hablame' : paso === 'confirmar' ? 'Esto entendí' : 'Listo'}</h2>
          <button type="button" onClick={onCerrar} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-stone-200" aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 pt-2 font-manrope">
          {paso === 'hablar' && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">Tocá el micrófono y decilo como si le hablaras a alguien. Después revisás y confirmás: nada se guarda solo.</p>
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={escuchando ? detener : escuchar}
                  className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 ${escuchando ? 'animate-pulse bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  aria-label={escuchando ? 'Dejar de escuchar' : 'Empezar a hablar'}
                >
                  {escuchando ? <Square size={32} fill="currentColor" /> : <Mic size={38} />}
                </button>
                <p className="text-sm font-semibold text-stone-700">{escuchando ? 'Te escucho… tocá para terminar' : 'Tocá para hablar'}</p>
              </div>
              <div>
                <label className={ETIQUETA} htmlFor="voz-texto">Lo que dijiste (podés corregirlo)</label>
                <textarea id="voz-texto" rows={3} className={CAMPO} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribí o hablá…" />
              </div>
              {aviso && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{aviso}</p>}
              <button type="button" onClick={entender} disabled={!texto.trim()} className={`${BTN_PRIMARIO} min-h-[56px] w-full text-base`}>
                Listo, entender
              </button>
              <div>
                <p className={AYUDA}>Ejemplos:</p>
                <ul className="mt-1 space-y-0.5 text-sm text-stone-600">{EJEMPLOS.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            </div>
          )}

          {paso === 'confirmar' && form && (
            <div className="space-y-4">
              <p className="rounded-xl bg-white p-3 text-sm italic text-stone-700">“{texto}”</p>

              <div>
                <p className={ETIQUETA}>¿Qué es?{form.intencion === 'desconocido' && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">No lo entendí: elegí</span>}</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(NOMBRE_INTENCION) as (keyof typeof NOMBRE_INTENCION)[]).map((k) => (
                    <button key={k} type="button" aria-pressed={form.intencion === k} onClick={() => cambiar({ intencion: k })} className={`min-h-[48px] rounded-xl px-4 text-sm font-semibold ${form.intencion === k ? 'bg-emerald-600 text-white' : 'border border-stone-300 bg-white text-stone-800'}`}>
                      {NOMBRE_INTENCION[k]}
                    </button>
                  ))}
                </div>
              </div>

              {form.intencion !== 'desconocido' && form.intencion !== 'disponibilidad' && (
                <div>
                  <label className={ETIQUETA} htmlFor="voz-evento">¿De qué evento?<Falta mostrar={faltantes.evento} /></label>
                  <select id="voz-evento" className={`${CAMPO} ${faltantes.evento ? 'border-red-400' : ''}`} value={form.eventoId} onChange={(e) => { cambiar({ eventoId: e.target.value }); setEventoSugerido(false); }}>
                    <option value="">Elegí un evento…</option>
                    {eventos.map((e) => <option key={e.id} value={e.id}>{e.cliente} · {fechaCorta(e.fecha)} · {e.estado}</option>)}
                  </select>
                  {eventoSugerido && form.eventoId && <p className={AYUDA}>Lo elegí porque nombraste al cliente. Cambialo si no es.</p>}
                </div>
              )}

              {form.intencion === 'pago' && (
                <>
                  <div>
                    <label className={ETIQUETA} htmlFor="voz-monto">Monto<Falta mostrar={faltantes.monto} /></label>
                    <input id="voz-monto" className={`${CAMPO} ${faltantes.monto ? 'border-red-400' : ''}`} inputMode="decimal" placeholder="$" value={form.monto} onChange={(e) => cambiar({ monto: e.target.value })} />
                  </div>
                  <div><p className={ETIQUETA}>Tipo<Falta mostrar={faltantes.tipoPago} /></p><Opciones valor={form.tipoPago} opciones={['seña', 'saldo', 'otro'] as const} onChange={(v) => cambiar({ tipoPago: v })} /></div>
                  <div><p className={ETIQUETA}>¿Cómo pagó?<Falta mostrar={faltantes.medio} /></p><Opciones valor={form.medio} opciones={['efectivo', 'transferencia', 'otro'] as const} onChange={(v) => cambiar({ medio: v })} /></div>
                </>
              )}

              {form.intencion === 'costo' && (
                <>
                  <div>
                    <label className={ETIQUETA} htmlFor="voz-monto">Monto<Falta mostrar={faltantes.monto} /></label>
                    <input id="voz-monto" className={`${CAMPO} ${faltantes.monto ? 'border-red-400' : ''}`} inputMode="decimal" placeholder="$" value={form.monto} onChange={(e) => cambiar({ monto: e.target.value })} />
                  </div>
                  <div><p className={ETIQUETA}>¿En qué?<Falta mostrar={faltantes.tipoCosto} /></p><Opciones valor={form.tipoCosto} opciones={['flete', 'lavado', 'rotura', 'ayudante', 'otro'] as const} onChange={(v) => cambiar({ tipoCosto: v })} /></div>
                  <div>
                    <label className={ETIQUETA} htmlFor="voz-desc">Detalle (opcional)</label>
                    <input id="voz-desc" className={CAMPO} value={form.descripcion} onChange={(e) => cambiar({ descripcion: e.target.value })} />
                  </div>
                </>
              )}

              {(form.intencion === 'subalquiler' || form.intencion === 'disponibilidad') && (
                <>
                  <div>
                    <label className={ETIQUETA} htmlFor="voz-item">Artículo<Falta mostrar={faltantes.item} /></label>
                    <select id="voz-item" className={`${CAMPO} ${faltantes.item ? 'border-red-400' : ''}`} value={form.itemId} onChange={(e) => { cambiar({ itemId: e.target.value }); setAmbiguo(false); }}>
                      <option value="">Elegí un artículo…</option>
                      {itemsOrdenados.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                    </select>
                    {ambiguo && <p className={AYUDA}>Puede ser más de uno: elegí el correcto.</p>}
                  </div>
                  <div>
                    <label className={ETIQUETA} htmlFor="voz-cant">Cantidad<Falta mostrar={faltantes.cantidad} /></label>
                    <input id="voz-cant" className={`${CAMPO} ${faltantes.cantidad ? 'border-red-400' : ''}`} inputMode="numeric" value={form.cantidad} onChange={(e) => cambiar({ cantidad: e.target.value.replace(/\D/g, '') })} />
                  </div>
                </>
              )}

              {form.intencion === 'subalquiler' && (
                <div>
                  <label className={ETIQUETA} htmlFor="voz-costo">Costo por unidad (opcional)</label>
                  <input id="voz-costo" className={CAMPO} inputMode="decimal" placeholder="$" value={form.costoUnit} onChange={(e) => cambiar({ costoUnit: e.target.value })} />
                  {lineaFaltante && <p className="mt-1 text-sm font-semibold text-red-700">Ese evento todavía no tiene ese artículo. Agregalo primero en el evento.</p>}
                </div>
              )}

              {form.intencion === 'disponibilidad' && (
                <div>
                  <p className={ETIQUETA}>¿Para qué día?<Falta mostrar={faltantes.fecha} /></p>
                  <CampoFecha valor={form.fecha} onChange={(d) => cambiar({ fecha: d })} />
                </div>
              )}

              {aviso && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{aviso}</p>}
              {form.intencion !== 'desconocido' && (
                <button type="button" onClick={guardar} disabled={guardando} className={`${BTN_PRIMARIO} min-h-[56px] w-full text-base`}>
                  {guardando ? 'Un momento…' : form.intencion === 'disponibilidad' ? 'Consultar' : 'Confirmar y guardar'}
                </button>
              )}
              <button type="button" onClick={() => { setPaso('hablar'); setAviso(''); }} className={`${BTN_SECUNDARIO} min-h-[48px] w-full`}>
                Volver a decirlo
              </button>
            </div>
          )}

          {paso === 'listo' && resultado && (
            <div className="space-y-4 py-2 text-center">
              <CheckCircle2 size={56} className="mx-auto text-emerald-600" />
              <p className="text-lg font-semibold text-stone-900">{resultado.texto}</p>
              <div className="flex flex-col gap-2">
                {resultado.eventoId && (
                  <button type="button" className={`${BTN_PRIMARIO} min-h-[52px]`} onClick={() => { onAbrirEvento(resultado.eventoId!); onCerrar(); }}>
                    Ver el evento
                  </button>
                )}
                <button type="button" className={`${BTN_SECUNDARIO} min-h-[52px]`} onClick={() => { setPaso('hablar'); setTexto(''); setForm(null); setResultado(null); }}>
                  Decir otra cosa
                </button>
                <button type="button" className={`${BTN_SECUNDARIO} min-h-[48px]`} onClick={onCerrar}>Cerrar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
