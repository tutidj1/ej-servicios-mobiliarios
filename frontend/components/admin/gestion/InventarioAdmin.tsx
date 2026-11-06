'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CATEGORIAS, type Categoria, type Item, leerMonto, mensajeError, mostrarMonto, mostrarStock } from '@/lib/gestion/tipos';
import type { Sugerencia } from '@/lib/gestion/calculos';
import { AYUDA, type Aviso, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA, TARJETA } from '../estilos';
import { Encabezado, Interruptor, Mensaje } from '../ui';

interface Borrador {
  id?: string;
  nombre: string;
  categoria: Categoria;
  stock_total: string;
  orden_contrato: string;
  costo_compra_unitario: string;
  activo: boolean;
  alias: string;
  sugerencia: Sugerencia;
}

const NUEVO: Borrador = {
  nombre: '',
  categoria: 'vajilla',
  stock_total: '',
  orden_contrato: '',
  costo_compra_unitario: '',
  activo: true,
  alias: '',
  sugerencia: 'ninguna',
};

const TEXTO_SUGERENCIA: Record<Sugerencia, string> = {
  personas: '1 por invitado',
  mesas: '1 por mesa',
  ninguna: 'No sugerir',
};

export default function InventarioAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [edicion, setEdicion] = useState<Borrador | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('items').select('*').order('orden_contrato', { nullsFirst: false }).order('nombre');
    if (error) setAviso({ tipo: 'error', texto: mensajeError(error, 'No se pudo cargar el inventario.') });
    else setItems((data as Item[]) ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const editar = (i: Item) =>
    setEdicion({
      id: i.id,
      nombre: i.nombre,
      categoria: i.categoria,
      stock_total: i.stock_total === null ? '' : String(i.stock_total),
      orden_contrato: i.orden_contrato === null ? '' : String(i.orden_contrato),
      costo_compra_unitario: mostrarMonto(i.costo_compra_unitario),
      activo: i.activo,
      alias: i.alias.join(', '),
      sugerencia: i.sugerencia,
    });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edicion) return;
    // Vacío = sin límite (no se controla)
    const stock = edicion.stock_total.trim() === '' ? null : Number(edicion.stock_total);
    if (!edicion.nombre.trim() || (stock !== null && (!Number.isInteger(stock) || stock < 0))) {
      setAviso({ tipo: 'error', texto: 'Completá el nombre. El stock va vacío (sin límite) o un número entero.' });
      return;
    }
    setGuardando(true);
    const fila = {
      nombre: edicion.nombre.trim(),
      categoria: edicion.categoria,
      stock_total: stock,
      orden_contrato: edicion.orden_contrato.trim() ? Number(edicion.orden_contrato) : null,
      costo_compra_unitario: leerMonto(edicion.costo_compra_unitario),
      activo: edicion.activo,
      alias: edicion.alias.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean),
      sugerencia: edicion.sugerencia,
    };
    const { error } = edicion.id
      ? await supabase.from('items').update(fila).eq('id', edicion.id)
      : await supabase.from('items').insert(fila);
    setGuardando(false);
    if (error) {
      setAviso({ tipo: 'error', texto: mensajeError(error, 'No se pudo guardar.') });
      return;
    }
    setAviso({ tipo: 'ok', texto: 'Guardado.' });
    setEdicion(null);
    cargar();
  };

  return (
    <div>
      <Encabezado
        titulo="Inventario"
        descripcion="Lo que tenés propio. Nunca limita los alquileres: si falta, se marca como subalquilado. Lo que dice “sin límite” no se controla."
        accion={
          <button type="button" className={BTN_PRIMARIO} onClick={() => setEdicion({ ...NUEVO })}>
            <Plus size={18} /> Agregar artículo
          </button>
        }
      />
      <div className="mb-4">
        <Mensaje aviso={aviso} />
      </div>

      {edicion && (
        <form onSubmit={guardar} className={`${TARJETA} mb-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="font-playfair text-xl font-bold">{edicion.id ? 'Editar artículo' : 'Nuevo artículo'}</h2>
            <button type="button" onClick={() => setEdicion(null)} className="h-11 w-11 flex items-center justify-center" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ETIQUETA} htmlFor="inv-nombre">Nombre</label>
              <input id="inv-nombre" className={CAMPO} value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} required />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="inv-cat">Categoría</label>
              <select id="inv-cat" className={CAMPO} value={edicion.categoria} onChange={(e) => setEdicion({ ...edicion, categoria: e.target.value as Categoria })}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="inv-stock">Stock propio</label>
              <input id="inv-stock" className={CAMPO} inputMode="numeric" placeholder="Sin límite" value={edicion.stock_total} onChange={(e) => setEdicion({ ...edicion, stock_total: e.target.value.replace(/\D/g, '') })} />
              <p className={AYUDA}>Dejalo vacío si no querés controlarlo. Con un número, el sistema te dice cuántas hay que subalquilar.</p>
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="inv-sug">Sugerir cantidad</label>
              <select id="inv-sug" className={CAMPO} value={edicion.sugerencia} onChange={(e) => setEdicion({ ...edicion, sugerencia: e.target.value as Sugerencia })}>
                {(Object.keys(TEXTO_SUGERENCIA) as Sugerencia[]).map((s) => <option key={s} value={s}>{TEXTO_SUGERENCIA[s]}</option>)}
              </select>
              <p className={AYUDA}>Solo es una ayuda al cargar un evento; siempre se confirma a mano.</p>
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="inv-costo">Costo de compra por unidad (opcional)</label>
              <input id="inv-costo" className={CAMPO} inputMode="decimal" placeholder="$" value={edicion.costo_compra_unitario} onChange={(e) => setEdicion({ ...edicion, costo_compra_unitario: e.target.value })} />
              <p className={AYUDA}>Sirve para el informe “¿conviene comprar?”.</p>
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="inv-orden">Posición en el contrato</label>
              <input id="inv-orden" className={CAMPO} inputMode="numeric" value={edicion.orden_contrato} onChange={(e) => setEdicion({ ...edicion, orden_contrato: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div className="sm:col-span-2">
              <label className={ETIQUETA} htmlFor="inv-alias">Otros nombres (separados por coma)</label>
              <input id="inv-alias" className={CAMPO} placeholder="caballete, tablón" value={edicion.alias} onChange={(e) => setEdicion({ ...edicion, alias: e.target.value })} />
            </div>
          </div>
          <Interruptor activo={edicion.activo} onChange={(v) => setEdicion({ ...edicion, activo: v })} etiqueta="Activo" descripcion="Si lo apagás, no aparece para agregar en eventos nuevos." />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className={BTN_PRIMARIO}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            <button type="button" onClick={() => setEdicion(null)} className={BTN_SECUNDARIO}>Cancelar</button>
          </div>
        </form>
      )}

      {cargando && <p className="font-manrope text-sm text-stone-600">Cargando…</p>}
      {CATEGORIAS.map((cat) => {
        const deCat = items.filter((i) => i.categoria === cat);
        if (deCat.length === 0) return null;
        return (
          <section key={cat} className="mb-6">
            <h2 className="mb-2 font-manrope text-xs font-bold uppercase tracking-wide text-stone-500">{cat}</h2>
            <div className={`${TARJETA} divide-y divide-stone-100 p-0`}>
              {deCat.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => editar(i)}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left min-h-[56px] hover:bg-stone-50 ${i.activo ? '' : 'opacity-50'}`}
                >
                  <span className="flex-1 font-manrope text-base text-stone-900">{i.nombre}</span>
                  <span className={`font-manrope tabular-nums ${i.stock_total === null ? 'text-sm text-stone-500' : 'text-lg font-bold text-stone-900'}`}>{mostrarStock(i.stock_total)}</span>
                  <Pencil size={16} className="text-stone-400" />
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
