'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Plus, Search, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { linkWhatsappCliente } from '@/lib/phone';
import { CANALES, type Canal, type Cliente, mensajeError } from '@/lib/gestion/tipos';
import { type Aviso, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA, TARJETA } from '../estilos';
import { Encabezado, Mensaje } from '../ui';

export type BorradorCliente = Omit<Cliente, 'id' | 'created_at'> & { id?: string };

export const CLIENTE_VACIO: BorradorCliente = {
  nombre_apellido: '',
  dni: '',
  telefono: '',
  email: '',
  canal_origen: 'whatsapp',
  lead_id: null,
  notas: '',
};

/** Guarda (alta o edición) y devuelve el cliente, o un error ya traducido. */
export async function guardarCliente(b: BorradorCliente): Promise<{ cliente?: Cliente; error?: string }> {
  if (!b.nombre_apellido.trim()) return { error: 'Falta el nombre y apellido.' };
  const fila = {
    nombre_apellido: b.nombre_apellido.trim(),
    dni: b.dni?.trim() || null,
    telefono: b.telefono?.trim() || null,
    email: b.email?.trim() || null,
    canal_origen: b.canal_origen,
    lead_id: b.lead_id,
    notas: b.notas?.trim() || null,
  };
  const q = b.id
    ? supabase.from('clientes').update(fila).eq('id', b.id).select().single()
    : supabase.from('clientes').insert(fila).select().single();
  const { data, error } = await q;
  if (error) return { error: mensajeError(error, 'No se pudo guardar el cliente.') };
  return { cliente: data as Cliente };
}

export function FormCliente({
  valor,
  onChange,
}: {
  valor: BorradorCliente;
  onChange: (v: BorradorCliente) => void;
}) {
  const campo = (k: keyof BorradorCliente) => ({
    value: (valor[k] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...valor, [k]: e.target.value }),
  });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={ETIQUETA} htmlFor="cli-nombre">Nombre y apellido</label>
        <input id="cli-nombre" className={CAMPO} autoComplete="off" {...campo('nombre_apellido')} required />
      </div>
      <div>
        <label className={ETIQUETA} htmlFor="cli-tel">Teléfono</label>
        <input id="cli-tel" className={CAMPO} type="tel" inputMode="tel" autoComplete="off" {...campo('telefono')} />
      </div>
      <div>
        <label className={ETIQUETA} htmlFor="cli-dni">DNI</label>
        <input id="cli-dni" className={CAMPO} inputMode="numeric" autoComplete="off" {...campo('dni')} />
      </div>
      <div>
        <label className={ETIQUETA} htmlFor="cli-canal">¿Cómo llegó?</label>
        <select
          id="cli-canal"
          className={`${CAMPO} capitalize`}
          value={valor.canal_origen}
          onChange={(e) => onChange({ ...valor, canal_origen: e.target.value as Canal })}
        >
          {CANALES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={ETIQUETA} htmlFor="cli-email">Email (opcional)</label>
        <input id="cli-email" className={CAMPO} type="email" autoComplete="off" {...campo('email')} />
      </div>
      <div className="sm:col-span-2">
        <label className={ETIQUETA} htmlFor="cli-notas">Notas</label>
        <textarea id="cli-notas" rows={2} className={CAMPO} {...campo('notas')} />
      </div>
    </div>
  );
}

export default function ClientesAdmin() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [edicion, setEdicion] = useState<BorradorCliente | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (busqueda: string) => {
    let q = supabase.from('clientes').select('*').order('created_at', { ascending: false }).limit(100);
    const t = busqueda.trim().replace(/[%,()]/g, ' ');
    if (t) q = q.or(`nombre_apellido.ilike.%${t}%,telefono.ilike.%${t}%,dni.ilike.%${t}%`);
    const { data, error } = await q;
    if (error) setAviso({ tipo: 'error', texto: mensajeError(error, 'No se pudieron cargar los clientes.') });
    else setClientes((data as Cliente[]) ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => cargar(texto), 250);
    return () => clearTimeout(t);
  }, [texto, cargar]);

  const borrar = async (c: Cliente) => {
    if (!window.confirm(`¿Borrar a ${c.nombre_apellido}? No se puede deshacer.`)) return;
    const { error } = await supabase.from('clientes').delete().eq('id', c.id);
    if (error) {
      setAviso({
        tipo: 'error',
        texto: /foreign key/i.test(error.message ?? '') ? `${c.nombre_apellido} tiene eventos cargados. Borrá primero sus eventos y después al cliente.` : mensajeError(error, 'No se pudo borrar el cliente.'),
      });
      return;
    }
    setClientes((prev) => prev.filter((x) => x.id !== c.id));
    setAviso({ tipo: 'ok', texto: 'Cliente borrado.' });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edicion) return;
    setGuardando(true);
    const r = await guardarCliente(edicion);
    setGuardando(false);
    if (r.error) return setAviso({ tipo: 'error', texto: r.error });
    setAviso({ tipo: 'ok', texto: 'Cliente guardado.' });
    setEdicion(null);
    cargar(texto);
  };

  return (
    <div>
      <Encabezado
        titulo="Clientes"
        descripcion="Todos los clientes, vengan de la web, Instagram, Facebook, WhatsApp o recomendación."
        accion={
          <button type="button" className={BTN_PRIMARIO} onClick={() => setEdicion({ ...CLIENTE_VACIO })}>
            <Plus size={18} /> Nuevo cliente
          </button>
        }
      />
      <div className="mb-4"><Mensaje aviso={aviso} /></div>

      {edicion && (
        <form onSubmit={guardar} className={`${TARJETA} mb-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="font-playfair text-xl font-bold">{edicion.id ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <button type="button" onClick={() => setEdicion(null)} className="h-11 w-11 flex items-center justify-center" aria-label="Cerrar"><X size={20} /></button>
          </div>
          <FormCliente valor={edicion} onChange={setEdicion} />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className={BTN_PRIMARIO}>{guardando ? 'Guardando…' : 'Guardar'}</button>
            <button type="button" onClick={() => setEdicion(null)} className={BTN_SECUNDARIO}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input className={`${CAMPO} pl-11`} placeholder="Buscar por nombre, teléfono o DNI" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar cliente" />
      </div>

      {cargando && <p className="font-manrope text-sm text-stone-600">Cargando…</p>}
      {!cargando && clientes.length === 0 && <div className={`${TARJETA} text-center font-manrope text-sm text-stone-600`}>No hay clientes para mostrar.</div>}
      <div className="space-y-3">
        {clientes.map((c) => (
          <article key={c.id} className={`${TARJETA} flex items-center gap-3`}>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEdicion({ ...c })}>
              <p className="font-manrope text-base font-semibold text-stone-900 break-words">{c.nombre_apellido}</p>
              <p className="font-manrope text-sm text-stone-500">
                {c.telefono || 'sin teléfono'} · <span className="capitalize">{c.canal_origen}</span>
                {c.dni ? ` · DNI ${c.dni}` : ''}
              </p>
            </button>
            <button type="button" onClick={() => borrar(c)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600" aria-label={`Borrar a ${c.nombre_apellido}`}>
              <Trash2 size={18} />
            </button>
            {c.telefono && (
              <a href={linkWhatsappCliente(c.telefono)} target="_blank" rel="noopener noreferrer" className={`${BTN_SECUNDARIO} shrink-0`} aria-label={`WhatsApp a ${c.nombre_apellido}`}>
                <MessageCircle size={18} />
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
