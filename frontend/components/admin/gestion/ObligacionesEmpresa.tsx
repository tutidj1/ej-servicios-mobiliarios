'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { pesos } from '@/lib/gestion/calculos';
import { leerMonto } from '@/lib/gestion/tipos';
import { fechaLocalISO, mesDe, nombreMes } from '@/lib/casa/dinero';
import { diaReal, estadoVencimiento, periodosPendientes, RECURRENCIAS, totalesDelMes, type Recurrencia } from '@/lib/casa/obligaciones';
import { BTN_PELIGRO_SUAVE, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA, TARJETA } from '../estilos';

type Obl = { id: string; concepto: string; monto_estimado: number; dia_vencimiento: number; recurrencia: Recurrencia };
type Pago = { id: string; obligacion_id: string; periodo: string; monto_real: number | null; fecha_pago: string | null; estado: 'pendiente' | 'pagado' };

const faltaTabla = (e: { code?: string; message?: string } | null) => !!e && (e.code === 'PGRST205' || e.code === '42P01' || /does not exist|schema cache/i.test(e.message ?? ''));
const aCentavos = (texto: string) => { const n = leerMonto(texto); return n === null ? null : Math.round(n * 100); };
const clave = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, '0')}-01`;

/**
 * Gastos fijos de la empresa que se repiten (por ejemplo, la campaña de anuncios): se cargan una vez y cada mes aparece
 * el pago a hacer, con lo estimado y lo real. Va en la home del admin. Si la migración 0014 todavía no está aplicada, no se muestra.
 */
export default function ObligacionesEmpresa() {
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [obls, setObls] = useState<Obl[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [pagando, setPagando] = useState<string | null>(null);
  const hoy = useMemo(() => new Date(), []);
  const mes = mesDe(hoy);
  const periodo = clave(mes.anio, mes.mes);

  const cargar = useCallback(async () => {
    const o = await supabase.from('empresa_obligaciones').select('id, concepto, monto_estimado, dia_vencimiento, recurrencia').eq('activa', true).order('dia_vencimiento');
    if (faltaTabla(o.error)) { setDisponible(false); return; }
    setDisponible(true);
    if (o.error) { setError('No se pudieron cargar los gastos fijos.'); return; }
    const lista = (o.data ?? []) as Obl[];

    // Crea el pago de este mes de lo que falte (la clave única evita duplicados si lo abren dos personas)
    if (lista.length) {
      const ult = await supabase.from('empresa_obligacion_pagos').select('obligacion_id, periodo').order('periodo', { ascending: false }).limit(2000);
      const ultimo = new Map<string, string>();
      for (const r of (ult.data ?? []) as { obligacion_id: string; periodo: string }[]) if (!ultimo.has(r.obligacion_id)) ultimo.set(r.obligacion_id, r.periodo);
      const nuevas = lista.flatMap((x) => periodosPendientes(ultimo.get(x.id) ?? null, x.recurrencia, periodo, periodo).map((p) => ({ obligacion_id: x.id, periodo: p, estado: 'pendiente' })));
      if (nuevas.length) await supabase.from('empresa_obligacion_pagos').upsert(nuevas, { onConflict: 'obligacion_id,periodo', ignoreDuplicates: true });
    }
    const p = await supabase.from('empresa_obligacion_pagos').select('id, obligacion_id, periodo, monto_real, fecha_pago, estado').eq('periodo', periodo);
    if (p.error) { setError('No se pudieron cargar los gastos fijos.'); return; }
    setError(null);
    setObls(lista);
    setPagos((p.data ?? []) as Pago[]);
  }, [periodo]);

  useEffect(() => { void cargar(); }, [cargar]);

  if (disponible !== true) return null;

  const filas = pagos
    .map((p) => ({ p, o: obls.find((x) => x.id === p.obligacion_id) }))
    .filter((f): f is { p: Pago; o: Obl } => !!f.o)
    .sort((a, b) => a.o.dia_vencimiento - b.o.dia_vencimiento);
  const tot = totalesDelMes(filas.map(({ p, o }) => ({ estado: p.estado, monto_real: p.monto_real, monto_estimado: o.monto_estimado })));

  const crear = async (v: { concepto: string; monto_estimado: number; dia_vencimiento: number; recurrencia: Recurrencia }) => {
    const r = await supabase.from('empresa_obligaciones').insert(v);
    if (r.error) { setError('No se pudo guardar el gasto fijo.'); return; }
    setNueva(false);
    await cargar();
  };

  const pagar = async (p: Pago, centavos: number) => {
    const r = await supabase.from('empresa_obligacion_pagos').update({ estado: 'pagado', monto_real: centavos, fecha_pago: fechaLocalISO(new Date()) }).eq('id', p.id);
    if (r.error) { setError('No se pudo marcar como pagado.'); return; }
    setPagando(null);
    await cargar();
  };

  const deshacer = async (p: Pago) => {
    const r = await supabase.from('empresa_obligacion_pagos').update({ estado: 'pendiente', monto_real: null, fecha_pago: null }).eq('id', p.id);
    if (r.error) setError('No se pudo deshacer el pago.');
    await cargar();
  };

  const quitar = async (o: Obl) => {
    const r = await supabase.from('empresa_obligaciones').update({ activa: false }).eq('id', o.id);
    if (r.error) setError('No se pudo quitar el gasto fijo.');
    await cargar();
  };

  return (
    <section aria-label="Gastos fijos de la empresa" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-playfair text-xl font-bold text-stone-900">Gastos fijos de la empresa</h2>
          <p className="font-manrope text-xs capitalize text-stone-500">
            {nombreMes(mes)}{filas.length ? ` · pagado ${pesos(tot.pagado)} de ${pesos(tot.total)} · ${tot.pendientes} ${tot.pendientes === 1 ? 'pendiente' : 'pendientes'}` : ''}
          </p>
        </div>
        <button type="button" onClick={() => setNueva((v) => !v)} className={BTN_SECUNDARIO}><Plus size={16} /> Agregar</button>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 font-manrope text-sm text-red-800" role="alert">{error}</p>}
      {nueva && <FormularioObligacion alCancelar={() => setNueva(false)} alGuardar={crear} />}

      {filas.length === 0 && !nueva && (
        <p className="rounded-2xl bg-white p-4 font-manrope text-sm text-stone-600 ring-1 ring-stone-200">
          Todavía no hay gastos fijos. Por ejemplo: la campaña de anuncios de todos los meses. Se carga una vez y cada mes aparece solo.
        </p>
      )}

      <ul className="space-y-2">
        {filas.map(({ p, o }) => {
          const pagado = p.estado === 'pagado';
          const venc = estadoVencimiento(p.periodo, o.dia_vencimiento, hoy, pagado);
          return (
            <li key={p.id} className={`${TARJETA} !p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-manrope text-sm font-bold text-stone-900"><CalendarClock size={16} className="shrink-0 text-stone-500" /> <span className="truncate">{o.concepto}</span></p>
                  <p className={`font-manrope text-xs ${pagado ? 'text-emerald-700' : venc.clase === 'vencida' ? 'font-semibold text-red-700' : venc.clase === 'pronto' ? 'font-semibold text-amber-700' : 'text-stone-500'}`}>
                    {pagado ? `Pagado${p.fecha_pago ? ` el ${p.fecha_pago.split('-').reverse().join('/')}` : ''}`
                      : venc.clase === 'vencida' ? `Vencido hace ${-venc.dias} ${venc.dias === -1 ? 'día' : 'días'}`
                      : venc.dias === 0 ? 'Vence hoy'
                      : venc.clase === 'pronto' ? `Vence en ${venc.dias} ${venc.dias === 1 ? 'día' : 'días'}`
                      : `Vence el ${diaReal(p.periodo, o.dia_vencimiento)}`}
                  </p>
                </div>
                <p className="shrink-0 font-manrope text-sm font-bold text-stone-900">{pesos(pagado ? p.monto_real ?? o.monto_estimado : o.monto_estimado)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {pagado ? (
                  <button type="button" className={BTN_SECUNDARIO} onClick={() => void deshacer(p)}>Deshacer</button>
                ) : pagando === p.id ? (
                  <PagoRapido estimado={o.monto_estimado} alPagar={(c) => pagar(p, c)} alCancelar={() => setPagando(null)} />
                ) : (
                  <button type="button" className={BTN_PRIMARIO} onClick={() => setPagando(p.id)}>Marcar pagado</button>
                )}
                {!pagado && pagando !== p.id && (
                  <button type="button" className={BTN_PELIGRO_SUAVE} onClick={() => { if (window.confirm(`¿Dejar de usar "${o.concepto}"? No se borra lo ya pagado.`)) void quitar(o); }}>Quitar</button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PagoRapido({ estimado, alPagar, alCancelar }: { estimado: number; alPagar: (c: number) => Promise<void>; alCancelar: () => void }) {
  const [monto, setMonto] = useState(String(estimado / 100).replace('.', ','));
  return (
    <div className="flex w-full flex-wrap items-end gap-2">
      <div className="min-w-[10rem] flex-1">
        <label className={ETIQUETA} htmlFor="pago-real">Monto real pagado ($)</label>
        <input id="pago-real" className={CAMPO} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
      </div>
      <button type="button" className={BTN_PRIMARIO} onClick={() => { const c = aCentavos(monto); if (c !== null) void alPagar(c); }}>Guardar</button>
      <button type="button" className={BTN_SECUNDARIO} onClick={alCancelar}>Cancelar</button>
    </div>
  );
}

function FormularioObligacion({ alGuardar, alCancelar }: { alGuardar: (v: { concepto: string; monto_estimado: number; dia_vencimiento: number; recurrencia: Recurrencia }) => Promise<void>; alCancelar: () => void }) {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [dia, setDia] = useState('');
  const [rec, setRec] = useState<Recurrencia>('mensual');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={`${TARJETA} space-y-3`}>
      <div>
        <label className={ETIQUETA} htmlFor="ob-concepto">Qué es</label>
        <input id="ob-concepto" className={CAMPO} value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Campaña de anuncios" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={ETIQUETA} htmlFor="ob-monto">Monto estimado ($)</label>
          <input id="ob-monto" className={CAMPO} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="ob-dia">Día de vencimiento</label>
          <input id="ob-dia" className={CAMPO} inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        </div>
      </div>
      <div>
        <label className={ETIQUETA} htmlFor="ob-rec">Cada cuánto</label>
        <select id="ob-rec" className={CAMPO} value={rec} onChange={(e) => setRec(e.target.value as Recurrencia)}>
          {RECURRENCIAS.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
        </select>
      </div>
      {error && <p className="font-manrope text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={BTN_PRIMARIO} onClick={() => {
          const c = aCentavos(monto);
          const d = Number(dia);
          if (!concepto.trim()) return setError('Poné qué es.');
          if (c === null) return setError('Poné el monto estimado.');
          if (!(d >= 1 && d <= 31)) return setError('El día de vencimiento va de 1 a 31.');
          void alGuardar({ concepto: concepto.trim(), monto_estimado: c, dia_vencimiento: d, recurrencia: rec });
        }}>Guardar</button>
        <button type="button" className={BTN_SECUNDARIO} onClick={alCancelar}>Cancelar</button>
      </div>
    </div>
  );
}
