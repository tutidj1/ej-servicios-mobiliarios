'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, ImageIcon, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { productosEstaticos } from '@/lib/productos';
import {
  AYUDA,
  Aviso,
  BTN_OSCURO,
  BTN_PELIGRO,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CAMPO,
  ETIQUETA,
  TARJETA,
} from './estilos';
import { Encabezado, Interruptor, Mensaje } from './ui';

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
  cantidad_segun_invitados: true,
};

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
const NUEVA_CATEGORIA = '__nueva__';

function slug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

// Foto del producto; si no hay o no carga, muestra un ícono
function Miniatura({ src, grande = false }: { src: string | null; grande?: boolean }) {
  const [fallo, setFallo] = useState(false);
  const tam = grande ? 'h-32 w-32' : 'h-16 w-16';
  if (!src || fallo) {
    return (
      <div className={`${tam} shrink-0 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400`}>
        <ImageIcon size={grande ? 32 : 22} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" onError={() => setFallo(true)} className={`${tam} shrink-0 rounded-xl object-cover border border-stone-200`} />;
}

export default function ProductosAdmin() {
  const [filas, setFilas] = useState<FilaProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [edicion, setEdicion] = useState<FilaProducto | null>(null);
  const [categoriaNueva, setCategoriaNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [avisoForm, setAvisoForm] = useState<Aviso | null>(null);

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

  // Categorías en el orden en que aparecen en la web
  const grupos = useMemo(() => {
    const mapa = new Map<string, FilaProducto[]>();
    filas.forEach((f) => mapa.set(f.categoria, [...(mapa.get(f.categoria) ?? []), f]));
    return Array.from(mapa.entries());
  }, [filas]);
  const categorias = grupos.map(([c]) => c);

  const abrirNuevo = (categoria = '') => {
    setAviso(null);
    setAvisoForm(null);
    setCategoriaNueva(false);
    const siguiente = filas.reduce((max, f) => Math.max(max, f.orden), 0) + 1;
    setEdicion({ ...VACIO, categoria, orden: siguiente });
  };

  const abrirEdicion = (fila: FilaProducto) => {
    setAviso(null);
    setAvisoForm(null);
    setCategoriaNueva(false);
    setEdicion(fila);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edicion) return;
    if (!edicion.categoria.trim()) {
      setAvisoForm({ tipo: 'error', texto: 'Elegí una categoría para el producto.' });
      return;
    }
    setGuardando(true);
    setAvisoForm(null);

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
      setAvisoForm({ tipo: 'error', texto: 'No se pudo guardar. Revisá los datos e intentá de nuevo.' });
      return;
    }
    setEdicion(null);
    setAviso({ tipo: 'ok', texto: 'Producto guardado. En la web se ve en menos de 1 minuto.' });
    cargar();
  };

  const alternarActivo = async (fila: FilaProducto) => {
    const { error } = await supabase.from('productos').update({ activo: !fila.activo }).eq('id', fila.id!);
    if (error) setAviso({ tipo: 'error', texto: 'No se pudo cambiar la visibilidad.' });
    else setFilas((prev) => prev.map((f) => (f.id === fila.id ? { ...f, activo: !f.activo } : f)));
  };

  const cambiarCategoria = async (fila: FilaProducto, categoria: string) => {
    if (categoria === fila.categoria) return;
    const { error } = await supabase.from('productos').update({ categoria }).eq('id', fila.id!);
    if (error) setAviso({ tipo: 'error', texto: 'No se pudo cambiar la categoría.' });
    else {
      setFilas((prev) => prev.map((f) => (f.id === fila.id ? { ...f, categoria } : f)));
      setAviso({ tipo: 'ok', texto: `“${fila.nombre}” ahora está en ${categoria}.` });
    }
  };

  const eliminar = async (fila: FilaProducto) => {
    if (!window.confirm(`¿Eliminar "${fila.nombre}" para siempre?\n\nSi solo querés que no se vea en la web, usá "Ocultar".`)) return;
    const { error } = await supabase.from('productos').delete().eq('id', fila.id!);
    if (error) setAviso({ tipo: 'error', texto: 'No se pudo eliminar.' });
    else {
      setFilas((prev) => prev.filter((f) => f.id !== fila.id));
      setAviso({ tipo: 'ok', texto: `“${fila.nombre}” fue eliminado.` });
    }
  };

  // Sube o baja un producto dentro de su categoría
  const mover = async (fila: FilaProducto, direccion: -1 | 1) => {
    const lista = [...filas];
    const enGrupo = lista.filter((f) => f.categoria === fila.categoria);
    const i = enGrupo.findIndex((f) => f.id === fila.id);
    const vecino = enGrupo[i + direccion];
    if (!vecino) return;

    const a = lista.findIndex((f) => f.id === fila.id);
    const b = lista.findIndex((f) => f.id === vecino.id);
    [lista[a], lista[b]] = [lista[b], lista[a]];
    const renumerada = lista.map((f, idx) => ({ ...f, orden: idx + 1 }));
    setFilas(renumerada);
    await Promise.all(
      renumerada
        .filter((f, idx) => f.id !== filas[idx]?.id)
        .map((f) => supabase.from('productos').update({ orden: f.orden }).eq('id', f.id!))
    );
  };

  const subirImagen = async (archivo: File) => {
    if (!edicion) return;
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      setAvisoForm({ tipo: 'error', texto: 'La imagen debe ser JPG, PNG o WEBP.' });
      return;
    }
    if (archivo.size > MAX_IMAGEN_BYTES) {
      setAvisoForm({ tipo: 'error', texto: 'La imagen no puede pesar más de 5 MB.' });
      return;
    }
    setSubiendo(true);
    setAvisoForm(null);
    const extension = archivo.type === 'image/png' ? 'png' : archivo.type === 'image/webp' ? 'webp' : 'jpg';
    const ruta = `${Date.now()}-${slug(edicion.nombre) || 'producto'}.${extension}`;
    const { error } = await supabase.storage
      .from('productos')
      .upload(ruta, archivo, { contentType: archivo.type, cacheControl: '31536000' });
    if (error) {
      setAvisoForm({ tipo: 'error', texto: 'No se pudo subir la imagen. Intentá de nuevo.' });
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

  const set = <K extends keyof FilaProducto>(campo: K, valor: FilaProducto[K]) =>
    setEdicion((prev) => (prev ? { ...prev, [campo]: valor } : prev));

  const categoriaEnLista = edicion ? categorias.includes(edicion.categoria) : false;
  const valorSelectCategoria = categoriaNueva || (edicion && edicion.categoria && !categoriaEnLista) ? NUEVA_CATEGORIA : edicion?.categoria ?? '';

  return (
    <div>
      <Encabezado
        titulo="Productos"
        descripcion="Lo que cargues acá aparece en el catálogo y en el formulario de cotización de la web. Los cambios se ven en menos de 1 minuto."
        accion={
          <button type="button" onClick={() => abrirNuevo()} className={BTN_PRIMARIO}>
            <Plus size={18} /> Agregar producto
          </button>
        }
      />

      <div className="mb-4">
        <Mensaje aviso={aviso} />
      </div>
      {cargando && <p className="font-manrope text-sm text-stone-600">Cargando…</p>}

      {!cargando && filas.length === 0 && (
        <div className={TARJETA}>
          <p className="font-manrope text-sm text-stone-600 mb-3">
            Todavía no hay productos cargados (la web muestra un catálogo de respaldo).
          </p>
          <button type="button" onClick={cargarCatalogoInicial} className={BTN_SECUNDARIO}>
            Cargar catálogo inicial
          </button>
        </div>
      )}

      <div className="space-y-8">
        {grupos.map(([categoria, lista]) => (
          <section key={categoria} aria-label={categoria}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-playfair text-xl font-bold text-stone-900">
                {categoria} <span className="font-manrope text-sm font-semibold text-stone-500">({lista.length})</span>
              </h2>
              <button type="button" onClick={() => abrirNuevo(categoria)} className="min-h-[44px] px-3 rounded-lg font-manrope text-sm font-semibold text-emerald-700 hover:bg-emerald-50 inline-flex items-center gap-1.5">
                <Plus size={16} /> Agregar a {categoria}
              </button>
            </div>

            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {lista.map((f, i) => (
                <li key={f.id} className={`${TARJETA} !p-4 ${f.activo ? '' : 'bg-stone-50'}`}>
                  <div className="flex gap-3">
                    <div className={f.activo ? '' : 'opacity-50'}>
                      <Miniatura src={f.imagen_url} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-manrope text-base font-bold leading-snug break-words ${f.activo ? 'text-stone-900' : 'text-stone-500'}`}>
                          {f.nombre}
                        </p>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${f.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                          {f.activo ? 'Visible' : 'Oculto'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <label htmlFor={`cat-${f.id}`} className="font-manrope text-xs text-stone-500 shrink-0">Categoría</label>
                        <select
                          id={`cat-${f.id}`}
                          value={f.categoria}
                          onChange={(e) => cambiarCategoria(f, e.target.value)}
                          className="min-h-[40px] flex-1 min-w-0 rounded-lg border border-stone-300 bg-white px-2 font-manrope text-sm text-stone-800"
                        >
                          {categorias.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alternarActivo(f)}
                      className={`${f.activo ? BTN_PRIMARIO : BTN_SECUNDARIO} !min-h-[40px] !px-3`}
                      aria-label={f.activo ? `Ocultar ${f.nombre}` : `Mostrar ${f.nombre}`}
                    >
                      {f.activo ? <><EyeOff size={16} /> Ocultar</> : <><Eye size={16} /> Mostrar</>}
                    </button>
                    <button type="button" onClick={() => abrirEdicion(f)} className={`${BTN_OSCURO} !min-h-[40px] !px-3`}>
                      <Pencil size={16} /> Editar
                    </button>
                    <button type="button" onClick={() => eliminar(f)} className={`${BTN_PELIGRO} !min-h-[40px] !px-3`} aria-label={`Eliminar ${f.nombre}`}>
                      <Trash2 size={16} /> Eliminar
                    </button>
                    <span className="ml-auto flex gap-1">
                      <button type="button" aria-label={`Subir ${f.nombre}`} disabled={i === 0} onClick={() => mover(f, -1)} className="h-10 w-10 rounded-lg border border-stone-300 bg-white flex items-center justify-center text-stone-700 disabled:opacity-30">
                        <ChevronUp size={18} />
                      </button>
                      <button type="button" aria-label={`Bajar ${f.nombre}`} disabled={i === lista.length - 1} onClick={() => mover(f, 1)} className="h-10 w-10 rounded-lg border border-stone-300 bg-white flex items-center justify-center text-stone-700 disabled:opacity-30">
                        <ChevronDown size={18} />
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Panel lateral de edición (pantalla completa en celular) */}
      {edicion && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={(e) => e.target === e.currentTarget && setEdicion(null)}>
          <form onSubmit={guardar} className="flex h-dvh w-full flex-col bg-white shadow-2xl sm:max-w-lg" aria-label={edicion.id ? 'Editar producto' : 'Nuevo producto'}>
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <h2 className="font-playfair text-xl font-bold text-stone-900">{edicion.id ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button type="button" onClick={() => setEdicion(null)} className="-mr-2 h-11 w-11 flex items-center justify-center text-stone-600" aria-label="Cerrar">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div>
                <label htmlFor="p-nombre" className={ETIQUETA}>Nombre *</label>
                <input id="p-nombre" required maxLength={120} className={CAMPO} value={edicion.nombre} onChange={(e) => set('nombre', e.target.value)} />
              </div>

              <div>
                <label htmlFor="p-cat" className={ETIQUETA}>Categoría *</label>
                <select
                  id="p-cat"
                  className={CAMPO}
                  value={valorSelectCategoria}
                  onChange={(e) => {
                    if (e.target.value === NUEVA_CATEGORIA) {
                      setCategoriaNueva(true);
                      set('categoria', '');
                    } else {
                      setCategoriaNueva(false);
                      set('categoria', e.target.value);
                    }
                  }}
                >
                  <option value="">Elegí una categoría…</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value={NUEVA_CATEGORIA}>➕ Crear categoría nueva…</option>
                </select>
                {valorSelectCategoria === NUEVA_CATEGORIA && (
                  <input
                    aria-label="Nombre de la categoría nueva"
                    maxLength={60}
                    className={`${CAMPO} mt-2`}
                    placeholder="Nombre de la categoría nueva"
                    value={edicion.categoria}
                    onChange={(e) => set('categoria', e.target.value)}
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label htmlFor="p-desc" className={ETIQUETA}>Descripción</label>
                <textarea id="p-desc" rows={3} className={`${CAMPO} resize-none`} value={edicion.descripcion ?? ''} onChange={(e) => set('descripcion', e.target.value)} />
              </div>

              <div>
                <span className={ETIQUETA}>Foto</span>
                <div className="flex items-center gap-4">
                  <Miniatura src={edicion.imagen_url} grande />
                  <div className="flex-1">
                    <label className={`${BTN_SECUNDARIO} w-full cursor-pointer`}>
                      <ImageIcon size={18} /> {subiendo ? 'Subiendo…' : edicion.imagen_url ? 'Cambiar foto' : 'Subir foto'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={subiendo}
                        onChange={(e) => e.target.files?.[0] && subirImagen(e.target.files[0])}
                        className="sr-only"
                      />
                    </label>
                    <p className={AYUDA}>JPG, PNG o WEBP de hasta 5 MB.</p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="p-etq" className={ETIQUETA}>Nombre en el mensaje de WhatsApp (opcional)</label>
                <input id="p-etq" maxLength={120} className={CAMPO} value={edicion.etiqueta_whatsapp ?? ''} onChange={(e) => set('etiqueta_whatsapp', e.target.value)} placeholder={edicion.nombre || 'Si lo dejás vacío se usa el nombre'} />
                <p className={AYUDA}>Solo si querés que en WhatsApp figure con otro nombre más corto.</p>
              </div>

              <Interruptor
                activo={edicion.cantidad_segun_invitados}
                onChange={(v) => set('cantidad_segun_invitados', v)}
                etiqueta="Agregar la cantidad de invitados al mensaje"
                descripcion="Si lo activás, en el WhatsApp sale con la cantidad de invitados al lado. Ejemplo: “Sillas (80)”. Conviene para cosas que se piden por persona: sillas, platos, copas, cubiertos."
              />

              <Interruptor
                activo={edicion.activo}
                onChange={(v) => set('activo', v)}
                etiqueta="Visible en la web"
                descripcion="Si lo apagás, el producto no aparece en el catálogo ni en el formulario, pero no se borra."
              />

              <Mensaje aviso={avisoForm} />
            </div>

            <div className="flex gap-3 border-t border-stone-200 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setEdicion(null)} className={BTN_SECUNDARIO}>Cancelar</button>
              <button type="submit" disabled={guardando || subiendo} className={`${BTN_PRIMARIO} flex-1`}>
                {guardando ? 'Guardando…' : 'Guardar producto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
