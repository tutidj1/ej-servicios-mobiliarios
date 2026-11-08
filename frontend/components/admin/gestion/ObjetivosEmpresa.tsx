'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { pesos } from '@/lib/gestion/calculos';
import { leerMonto } from '@/lib/gestion/tipos';
import { fechaLocalISO, nombreMes as nombreMesCasa } from '@/lib/casa/dinero';
import {
  acumulado, dolaresDesdePesos, equivalenteEnPesos, porcentajeAvance, proyeccionObjetivo, ritmoNetoMensual,
  type Objetivo, type MovObjetivo,
} from '@/lib/casa/objetivos';
import type { MonedaCasa } from '@/lib/casa/inversiones';
import { BTN_PELIGRO_SUAVE, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA, TARJETA } from '../estilos';

type Mov = MovObjetivo & { id: string; destino: 'inversion_ej' | 'personal' | null; motivo: string };

const dinero = (c: number, m: MonedaCasa) => (m === 'USD' ? pesos(c).replace('$', 'US$') : pesos(c));
const faltaTabla = (e: { code?: string; message?: string } | null) => !!e && (e.code === 'PGRST205' || e.code === '42P01' || /does not exist|schema cache/i.test(e.message ?? ''));
const aCentavos = (texto: string) => { const n = leerMonto(texto); return n === null ? null : Math.round(n * 100); };

/**
 * Objetivos de la familia con la plata del negocio (comprar mobiliario nuevo, invertir…). Va en la home del admin.
 * Meta en dólares recomendada, aportes en pesos al tipo de cambio del DÍA (queda guardado: no se recalcula con la cotización de hoy).
 * Los retiros preguntan si fueron inversión para EJ o gasto personal: así se ve cuánto del ahorro financió el negocio.
 * Si la migración 0014 todavía no está aplicada, la sección no se muestra.
 */
export default function ObjetivosEmpresa() {
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [objs, setObjs] = useState<Objetivo[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const hoy = useMemo(() => new Date(), []);

  const cargar = useCallback(async () => {
    const [o, m] = await Promise.all([
      supabase.from('empresa_objetivos').select('id, nombre, meta, moneda, fecha_objetivo').order('created_at'),
      supabase.from('empresa_objetivo_movimientos').select('id, objetivo_id, monto, moneda, tc_del_dia, tipo, destino, motivo, fecha'),
    ]);
    if (faltaTabla(o.error) || faltaTabla(m.error)) { setDisponible(false); return; }
    setDisponible(true);
    if (o.error || m.error) { setError('No se pudieron cargar los objetivos.'); return; }
    setError(null);
    setObjs((o.data ?? []) as Objetivo[]);
    setMovs((m.data ?? []) as Mov[]);
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  if (disponible !== true) return null;

  const crear = async (v: { nombre: string; meta: number; moneda: MonedaCasa }) => {
    const r = await supabase.from('empresa_objetivos').insert(v);
    if (r.error) { setError('No se pudo guardar el objetivo.'); return; }
    setNuevo(false);
    await cargar();
  };

  const mover = async (o: Objetivo, v: { tipo: 'aporte' | 'retiro'; monto: number; tc: number | null; destino: 'inversion_ej' | 'personal' | null; motivo: string }) => {
    const r = await supabase.from('empresa_objetivo_movimientos').insert({
      objetivo_id: o.id, monto: v.monto, moneda: o.moneda, tc_del_dia: o.moneda === 'USD' ? v.tc : null,
      tipo: v.tipo, destino: v.tipo === 'retiro' ? v.destino : null, motivo: v.motivo, fecha: fechaLocalISO(new Date()),
    });
    if (r.error) { setError('No se pudo registrar el movimiento.'); return; }
    setAbierto(null);
    await cargar();
  };

  const borrar = async (o: Objetivo) => {
    const r = await supabase.from('empresa_objetivos').delete().eq('id', o.id);
    if (r.error) setError('No se pudo borrar el objetivo.');
    await cargar();
  };

  return (
    <section aria-label="Objetivos de la empresa" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-playfair text-xl font-bold text-stone-900">Objetivos</h2>
        <button type="button" onClick={() => setNuevo((v) => !v)} className={BTN_SECUNDARIO}><Plus size={16} /> Nuevo objetivo</button>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 font-manrope text-sm text-red-800" role="alert">{error}</p>}
      {nuevo && <FormularioObjetivo alCancelar={() => setNuevo(false)} alGuardar={crear} />}

      {objs.length === 0 && !nuevo && (
        <p className="rounded-2xl bg-white p-4 font-manrope text-sm text-stone-600 ring-1 ring-stone-200">
          Todavía no hay objetivos. Por ejemplo: comprar mobiliario nuevo. Conviene ponerlos en dólares para que la inflación no los achique.
        </p>
      )}

      {objs.map((o) => {
        const m = movs.filter((x) => x.objetivo_id === o.id);
        const acum = acumulado(m);
        const pct = porcentajeAvance(o.meta, acum);
        const proy = proyeccionObjetivo(o.meta, acum, ritmoNetoMensual(m, hoy), hoy);
        const paraEj = m.filter((x) => x.tipo === 'retiro' && x.destino === 'inversion_ej').reduce((t, x) => t + x.monto, 0);
        return (
          <div key={o.id} className={TARJETA}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-manrope text-base font-bold text-stone-900"><Target size={18} className="text-emerald-700" /> {o.nombre}</p>
                <p className="font-manrope text-xs text-stone-500">Meta {dinero(o.meta, o.moneda)}</p>
              </div>
              <p className="font-manrope text-2xl font-bold text-stone-900">{pct}%</p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 font-manrope text-sm text-stone-700">
              Llevan {dinero(Math.max(acum, 0), o.moneda)}
              {o.moneda === 'USD' && m.some((x) => x.tc_del_dia) ? ` (unos ${pesos(Math.max(equivalenteEnPesos(m), 0))} con la cotización de cada aporte)` : ''}.
            </p>
            <p className="mt-1 font-manrope text-sm text-stone-600">
              {proy.estado === 'alcanzado' && 'Meta alcanzada.'}
              {proy.estado === 'sin_ritmo' && 'Todavía no hay aportes netos en los últimos 3 meses para calcular cuándo llegan.'}
              {proy.estado === 'llega' && <>A este ritmo (aporte neto de los últimos 3 meses) llegan en <span className="capitalize">{nombreMesCasa(proy.mes)}</span>.</>}
            </p>
            {paraEj > 0 && (
              <p className="mt-1 font-manrope text-sm text-stone-600">Del ahorro, {dinero(paraEj, o.moneda)} se usó para invertir en EJ.</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setAbierto(abierto === o.id ? null : o.id)} className={BTN_PRIMARIO}>Aportar o retirar</button>
              <button type="button" onClick={() => { if (window.confirm(`¿Borrar el objetivo "${o.nombre}" y todos sus movimientos?`)) void borrar(o); }} className={BTN_PELIGRO_SUAVE} aria-label={`Borrar ${o.nombre}`}><Trash2 size={16} /></button>
            </div>
            {abierto === o.id && <FormularioMovimiento obj={o} alGuardar={(v) => mover(o, v)} />}
          </div>
        );
      })}
    </section>
  );
}

function FormularioObjetivo({ alGuardar, alCancelar }: { alGuardar: (v: { nombre: string; meta: number; moneda: MonedaCasa }) => Promise<void>; alCancelar: () => void }) {
  const [nombre, setNombre] = useState('');
  const [meta, setMeta] = useState('');
  const [moneda, setMoneda] = useState<MonedaCasa>('USD');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={`${TARJETA} space-y-3`}>
      <div>
        <label className={ETIQUETA} htmlFor="obj-nombre">Nombre</label>
        <input id="obj-nombre" className={CAMPO} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Mobiliario nuevo" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={ETIQUETA} htmlFor="obj-moneda">Meta en</label>
          <select id="obj-moneda" className={CAMPO} value={moneda} onChange={(e) => setMoneda(e.target.value as MonedaCasa)}>
            <option value="USD">Dólares (recomendado)</option>
            <option value="ARS">Pesos</option>
          </select>
        </div>
        <div>
          <label className={ETIQUETA} htmlFor="obj-meta">Monto meta</label>
          <input id="obj-meta" className={CAMPO} inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="3.000" />
        </div>
      </div>
      <p className="font-manrope text-xs text-stone-500">Un objetivo en pesos a un año pierde cerca de un tercio de su poder de compra en el camino.</p>
      {error && <p className="font-manrope text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={BTN_PRIMARIO} onClick={() => {
          const c = aCentavos(meta);
          if (!nombre.trim() || !c || c <= 0) return setError('Poné un nombre y el monto de la meta.');
          void alGuardar({ nombre: nombre.trim(), meta: c, moneda });
        }}>Guardar</button>
        <button type="button" className={BTN_SECUNDARIO} onClick={alCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function FormularioMovimiento({ obj, alGuardar }: { obj: Objetivo; alGuardar: (v: { tipo: 'aporte' | 'retiro'; monto: number; tc: number | null; destino: 'inversion_ej' | 'personal' | null; motivo: string }) => Promise<void> }) {
  const [tipo, setTipo] = useState<'aporte' | 'retiro'>('aporte');
  const [enPesos, setEnPesos] = useState(obj.moneda === 'USD');
  const [monto, setMonto] = useState('');
  const [tc, setTc] = useState('');
  const [destino, setDestino] = useState<'inversion_ej' | 'personal' | ''>('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const conversion = obj.moneda === 'USD' && enPesos;
  const centavos = aCentavos(monto);
  const tcCentavos = tc ? aCentavos(tc) : null;
  const usd = conversion && centavos && tcCentavos ? dolaresDesdePesos(centavos, tcCentavos) : null;

  const guardar = () => {
    const final = conversion ? usd : centavos;
    if (!final || final <= 0) return setError(conversion ? 'Poné los pesos y la cotización del dólar de hoy.' : 'Poné el monto.');
    if (tipo === 'retiro' && !destino) return setError('Contanos para qué fue el retiro: inversión para EJ o gasto personal.');
    void alGuardar({ tipo, monto: final, tc: obj.moneda === 'USD' ? tcCentavos : null, destino: tipo === 'retiro' ? (destino as 'inversion_ej' | 'personal') : null, motivo: motivo.trim() });
  };

  return (
    <div className="mt-4 space-y-3 border-t border-stone-200 pt-4">
      <div className="flex gap-2">
        {(['aporte', 'retiro'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTipo(t)} className={tipo === t ? BTN_PRIMARIO : BTN_SECUNDARIO}>{t === 'aporte' ? 'Aporte' : 'Retiro'}</button>
        ))}
      </div>
      {obj.moneda === 'USD' && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setEnPesos(true)} className={enPesos ? BTN_PRIMARIO : BTN_SECUNDARIO}>Pongo pesos</button>
          <button type="button" onClick={() => setEnPesos(false)} className={!enPesos ? BTN_PRIMARIO : BTN_SECUNDARIO}>Pongo dólares</button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={ETIQUETA} htmlFor={`mov-monto-${obj.id}`}>Monto {conversion || obj.moneda === 'ARS' ? '($)' : '(US$)'}</label>
          <input id={`mov-monto-${obj.id}`} className={CAMPO} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        {obj.moneda === 'USD' && (
          <div>
            <label className={ETIQUETA} htmlFor={`mov-tc-${obj.id}`}>Dólar de hoy {conversion ? '' : '(opcional)'}</label>
            <input id={`mov-tc-${obj.id}`} className={CAMPO} inputMode="decimal" value={tc} onChange={(e) => setTc(e.target.value)} placeholder="1.400" />
          </div>
        )}
      </div>
      {usd !== null && <p className="font-manrope text-sm text-stone-700">Son {dinero(usd, 'USD')}. Esa cotización queda guardada con el movimiento.</p>}
      {tipo === 'retiro' && (
        <div>
          <p className={ETIQUETA}>¿Para qué fue?</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDestino('inversion_ej')} className={destino === 'inversion_ej' ? BTN_PRIMARIO : BTN_SECUNDARIO}>Inversión para EJ</button>
            <button type="button" onClick={() => setDestino('personal')} className={destino === 'personal' ? BTN_PRIMARIO : BTN_SECUNDARIO}>Gasto personal</button>
          </div>
          <input className={`${CAMPO} mt-3`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (mobiliario, publicidad…)" />
        </div>
      )}
      {error && <p className="font-manrope text-sm text-red-700" role="alert">{error}</p>}
      <button type="button" className={BTN_PRIMARIO} onClick={guardar}>{tipo === 'aporte' ? 'Registrar aporte' : 'Registrar retiro'}</button>
    </div>
  );
}
