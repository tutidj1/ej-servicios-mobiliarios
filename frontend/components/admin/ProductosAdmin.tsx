'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { productosEstaticos } from '@/lib/productos';
import { Aviso, BTN_PELIGRO, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA, TARJETA } from './estilos';

interface FilaProducto {
  id?: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  imagen_url: string | null;
  stock_disponible: number;
  activo: boolean;
  orden: number;
  etiqueta_whatsapp: string | null;
  cantidad_segun_invitados: boolean;
}

const VACIO: FilaProducto = {
  nombre: '',
  categoria: '',
  descripcion: '',
  imagen_url: '',
  stock_disponible: 0,
  activo: true,
  orden: 0,
  etiqueta_whatsapp: '',
  cantidad_segun_invitados: false,
};

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;

function slug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export default function ProductosAdmin() {
  const [filas, setFilas] = useState<FilaProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [edicion, setEdicion] = useState<FilaProducto | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase.from('productos').select('*').order('orden', { ascending: true });
    if (error) setAviso({ tipo: 'error', texto: 'No se pudieron cargar los productos.' });
    else setFilas((data as FilaProducto[]) ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const categorias = useMemo(() => Array.from(new Set(filas.map((f) => f.categoria))), [filas]);

  const nuevo = () => {
    setAviso(null);
    const siguiente = filas.reduce((max, f) => Math.max(max, f.orden), 0) + 1;
    setEdicion({ ...VACIO, orden: siguiente });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edicion) return;
    setGuardando(true);
    setAviso(null);

    const { id, ...resto } = edicion;
    const datos = {
      ...resto,
      nombre: resto.nombre.trim(),
      categoria: resto.categoria.trim(),
      descripcion: resto.descripcion?.trim() || null,
      imagen_url: resto.imagen_url?.trim() || null,
      etiqueta_whatsapp: resto.etiqueta_whatsapp?.trim() || null,
    };

    const { error } = id
      ? await supabase.from('productos').update(datos).eq('id', id)
      : await supabase.from('productos').insert(datos);

    setGuardando(false);
    if (error) {
      setAviso({ tipo: 'error', texto: 'No se pudo guardar. Revisá los datos y que hayas ingresado con la cuenta administradora.' });
      return;
    }
    setEdicion(null);
    setAviso({ tipo: 'ok', texto: 'Producto guardado. En la web aparece en menos de 1 minuto.' });
    cargar();
  };

  const alternarActivo = async (fila: FilaProducto) => {
    const { error } = await supabase.from('productos').update({ activo: !fila.activo }).eq('id', fila.id!);
    if (error) setAviso({ tipo: 'error', texto: 'No se pudo cambiar la visibilidad.' });
    else setFilas((prev) => prev.map((f) => (f.id === fila.id ? { ...f, activo: !f.activo } : f)));
  };

  const eliminar = async (fila: FilaProducto) => {
    if (!window.confirm(`¿Eliminar "${fila.nombre}"? Si solo querés ocultarlo, usá el interruptor "Visible".`)) return;
    const { error } = await supabase.from('productos').delete().eq('id', fila.id!);
    if (error) setAviso({ tipo: 'error', texto: 'No se pudo eliminar.' });
    else setFilas((prev) => prev.filter((f) => f.id !== fila.id));
  };

  // Intercambia el orden con el producto vecino
  const mover = async (indice: number, direccion: -1 | 1) => {
    const destino = indice + direccion;
    if (destino < 0 || destino >= filas.length) return;
    const lista = [...filas];
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    const renumerada = lista.map((f, i) => ({ ...f, orden: i + 1 }));
    setFilas(renumerada);
    const cambiadas = renumerada.filter((f, i) => f.orden !== filas[i]?.orden || f.id !== filas[i]?.id);
    await Promise.all(cambiadas.map((f) => supabase.from('productos').update({ orden: f.orden }).eq('id', f.id!)));
  };

  const subirImagen = async (archivo: File) => {
    if (!edicion) return;
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      setAviso({ tipo: 'error', texto: 'La imagen debe ser JPG, PNG o WEBP.' });
      return;
    }
    if (archivo.size > MAX_IMAGEN_BYTES) {
      setAviso({ tipo: 'error', texto: 'La imagen no puede pesar más de 5 MB.' });
      return;
    }
    setSubiendo(true);
    setAviso(null);
    const extension = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg';
    const ruta = `${Date.now()}-${slug(edicion.nombre) || 'producto'}.${extension}`;
    const { error } = await supabase.storage
      .from('productos')
      .upload(ruta, archivo, { contentType: archivo.type, cacheControl: '31536000' });
    if (error) {
      setAviso({ tipo: 'error', texto: 'No se pudo subir la imagen. ¿Ejecutaste la migración 0003 (bucket "productos")?' });
    } else {
      const { data } = supabase.storage.from('productos').getPublicUrl(ruta);
      setEdicion({ ...edicion, imagen_url: data.publicUrl });
    }
    setSubiendo(false);
  };

  const cargarCatalogoInicial = async () => {
    const filasIniciales = productosEstaticos.map(({ id, ...p }) => ({
      ...p,
      cantidad_segun_invitados: Boolean(p.cantidad_segun_invitados),
      etiqueta_whatsapp: null,
    }));
    const { error } = await supabase.from('productos').insert(filasIniciales);
    if (error) setAviso({ tipo: 'error', texto: 'No se pudo cargar el catálogo inicial.' });
    else cargar();
  };

  // ---------- Formulario de edición (pantalla completa en celular) ----------
  if (edicion) {
    const set = <K extends keyof FilaProducto>(campo: K, valor: FilaProducto[K]) =>
      setEdicion((prev) => (prev ? { ...prev, [campo]: valor } : prev));

    return (
      <form onSubmit={guardar} className="space-y-5">
        <h2 className="font-playfair text-2xl font-bold text-negro-carbon">
          {edicion.id ? 'Editar producto' : 'Nuevo producto'}
        </h2>

        <div>
          <label htmlFor="p-nombre" className={ETIQUETA}>Nombre *</label>
          <input id="p-nombre" required maxLength={120} className={CAMPO} value={edicion.nombre} onChange={(e) => set('nombre', e.target.value)} />
        </div>

        <div>
          <label htmlFor="p-cat" className={ETIQUETA}>Categoría *</label>
          <input
            id="p-cat"
            required
            maxLength={60}
            list="lista-categorias"
            className={CAMPO}
            value={edicion.categoria}
            onChange={(e) => set('categoria', e.target.value)}
            placeholder="Elegí una o escribí una nueva"
          />
          <datalist id="lista-categorias">
            {categorias.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div>
          <label htmlFor="p-desc" className={ETIQUETA}>Descripción</label>
          <textarea id="p-desc" rows={3} className={`${CAMPO} resize-none`} value={edicion.descripcion ?? ''} onChange={(e) => set('descripcion', e.target.value)} />
        </div>

        <div>
          <span className={ETIQUETA}>Foto</span>
          {edicion.imagen_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={edicion.imagen_url} alt="" className="w-32 h-32 object-cover border border-gris-borde mb-3" />
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={subiendo}
            onChange={(e) => e.target.files?.[0] && subirImagen(e.target.files[0])}
            className="block w-full font-manrope text-sm mb-2"
          />
          {subiendo && <p className="font-manrope text-xs text-gris-suave">Subiendo…</p>}
          <label htmlFor="p-img" className="block font-manrope text-xs text-gris-suave mt-2 mb-1">…o pegá la dirección de una imagen</label>
          <input id="p-img" type="url" className={CAMPO} value={edicion.imagen_url ?? ''} onChange={(e) => set('imagen_url', e.target.value)} />
        </div>

        <div>
          <label htmlFor="p-etq" className={ETIQUETA}>Nombre en el mensaje de WhatsApp (opcional)</label>
          <input id="p-etq" maxLength={120} className={CAMPO} value={edicion.etiqueta_whatsapp ?? ''} onChange={(e) => set('etiqueta_whatsapp', e.target.value)} placeholder="Si lo dejás vacío se usa el nombre" />
        </div>

        <label className="flex items-start gap-3 min-h-[48px] cursor-pointer">
          <input type="checkbox" checked={edicion.cantidad_segun_invitados} onChange={(e) => set('cantidad_segun_invitados', e.target.checked)} className="h-6 w-6 mt-0.5 accent-negro-carbon" />
          <span className="font-manrope text-sm text-negro-carbon">
            Mostrar la cantidad de invitados en el WhatsApp
            <span className="block text-xs text-gris-suave">Ej: “Sillas (80)”. Útil para sillas, platos, copas, etc.</span>
          </span>
        </label>

        <label className="flex items-center gap-3 min-h-[48px] cursor-pointer">
          <input type="checkbox" checked={edicion.activo} onChange={(e) => set('activo', e.target.checked)} className="h-6 w-6 accent-negro-carbon" />
          <span className="font-manrope text-sm font-semibold text-negro-carbon">Visible en la web</span>
        </label>

        {aviso && <p role="alert" className="p-3 border border-red-600 text-sm text-red-700">{aviso.texto}</p>}

        <div className="flex gap-3 sticky bottom-0 bg-crema-base py-3 border-t border-gris-borde">
          <button type="button" onClick={() => setEdicion(null)} className={BTN_SECUNDARIO}>Cancelar</button>
          <button type="submit" disabled={guardando || subiendo} className={`${BTN_PRIMARIO} flex-1`}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    );
  }

  // ---------- Lista ----------
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-manrope text-sm text-gris-suave">{filas.length} productos</p>
        <button type="button" onClick={nuevo} className={BTN_PRIMARIO}>+ Agregar</button>
      </div>

      {aviso && (
        <p role="status" className={`p-3 border text-sm ${aviso.tipo === 'ok' ? 'border-negro-carbon bg-blanco-puro text-negro-carbon' : 'border-red-600 text-red-700'}`}>
          {aviso.texto}
        </p>
      )}
      {cargando && <p className="font-manrope text-sm text-gris-suave">Cargando…</p>}

      {!cargando && filas.length === 0 && (
        <div className={TARJETA}>
          <p className="font-manrope text-sm text-gris-suave mb-3">
            Todavía no hay productos en Supabase (la web está mostrando el catálogo de respaldo).
          </p>
          <button type="button" onClick={cargarCatalogoInicial} className={BTN_SECUNDARIO}>Cargar catálogo inicial</button>
        </div>
      )}

      <ul className="space-y-2">
        {filas.map((f, i) => (
          <li key={f.id} className={`${TARJETA} flex items-center gap-3 ${f.activo ? '' : 'opacity-60'}`}>
            <div className="flex flex-col shrink-0">
              <button type="button" aria-label={`Subir ${f.nombre}`} disabled={i === 0} onClick={() => mover(i, -1)} className="h-9 w-9 text-lg leading-none disabled:opacity-25">▲</button>
              <button type="button" aria-label={`Bajar ${f.nombre}`} disabled={i === filas.length - 1} onClick={() => mover(i, 1)} className="h-9 w-9 text-lg leading-none disabled:opacity-25">▼</button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-manrope text-sm font-semibold text-negro-carbon break-words">{f.nombre}</p>
              <p className="font-manrope text-xs text-gris-suave">{f.categoria}{f.activo ? '' : ' · oculto'}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button type="button" onClick={() => alternarActivo(f)} className="min-h-[44px] px-3 border border-gris-borde font-manrope text-xs font-semibold uppercase">
                {f.activo ? 'Ocultar' : 'Mostrar'}
              </button>
              <button type="button" onClick={() => { setAviso(null); setEdicion(f); }} className="min-h-[44px] px-3 bg-negro-carbon text-crema-base font-manrope text-xs font-semibold uppercase">
                Editar
              </button>
              <button type="button" onClick={() => eliminar(f)} aria-label={`Eliminar ${f.nombre}`} className={`${BTN_PELIGRO} !min-h-[44px] !px-3 text-xs`}>
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
