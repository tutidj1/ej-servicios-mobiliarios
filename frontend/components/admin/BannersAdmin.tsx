'use client';

import React, { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BANNERS_POR_DEFECTO, Banner } from '@/lib/banners';
import { AYUDA, Aviso, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA, TARJETA } from './estilos';
import { Encabezado, Mensaje } from './ui';

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;

function TarjetaBanner({ inicial, tieneTextos }: { inicial: Banner; tieneTextos: boolean }) {
  const [banner, setBanner] = useState<Banner>(inicial);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const subirImagen = async (archivo: File) => {
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
    const ruta = `banners/${banner.clave}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from('productos')
      .upload(ruta, archivo, { contentType: archivo.type, cacheControl: '31536000' });
    if (error) {
      setAviso({ tipo: 'error', texto: 'No se pudo subir la imagen. Intentá de nuevo.' });
    } else {
      const { data } = supabase.storage.from('productos').getPublicUrl(ruta);
      setBanner((b) => ({ ...b, imagen_url: data.publicUrl }));
      setAviso({ tipo: 'ok', texto: 'Imagen subida. Tocá "Guardar cambios" para publicarla.' });
    }
    setSubiendo(false);
  };

  const guardar = async () => {
    setGuardando(true);
    setAviso(null);
    const { error } = await supabase.from('banners').upsert({
      clave: banner.clave,
      etiqueta: banner.etiqueta,
      titulo: banner.titulo?.trim() || null,
      subtitulo: banner.subtitulo?.trim() || null,
      imagen_url: banner.imagen_url.trim(),
      alt: banner.alt.trim(),
    });
    setGuardando(false);
    setAviso(
      error
        ? { tipo: 'error', texto: 'No se pudo guardar. Intentá de nuevo.' }
        : { tipo: 'ok', texto: 'Guardado. En la web se actualiza en menos de 1 minuto.' }
    );
  };

  return (
    <section className={`${TARJETA} space-y-5`}>
      <h2 className="font-playfair text-xl font-bold text-stone-900">{banner.etiqueta}</h2>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
        {banner.imagen_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner.imagen_url} alt="" className="h-56 w-full object-cover" />
        ) : (
          <div className="flex h-56 items-center justify-center text-stone-400"><ImageIcon size={40} /></div>
        )}
      </div>

      <div>
        <label className={`${BTN_SECUNDARIO} w-full cursor-pointer sm:w-auto`}>
          <ImageIcon size={18} /> {subiendo ? 'Subiendo…' : 'Cambiar imagen'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={subiendo}
            onChange={(e) => e.target.files?.[0] && subirImagen(e.target.files[0])}
            className="sr-only"
          />
        </label>
        <p className={AYUDA}>JPG, PNG o WEBP de hasta 5 MB. Mejor si es horizontal y de buena calidad.</p>
      </div>

      {tieneTextos && (
        <>
          <div>
            <label htmlFor={`tit-${banner.clave}`} className={ETIQUETA}>Título</label>
            <input id={`tit-${banner.clave}`} maxLength={120} className={CAMPO} value={banner.titulo ?? ''} onChange={(e) => setBanner({ ...banner, titulo: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`sub-${banner.clave}`} className={ETIQUETA}>Subtítulo</label>
            <textarea id={`sub-${banner.clave}`} rows={2} maxLength={300} className={`${CAMPO} resize-none`} value={banner.subtitulo ?? ''} onChange={(e) => setBanner({ ...banner, subtitulo: e.target.value })} />
          </div>
        </>
      )}

      <div>
        <label htmlFor={`alt-${banner.clave}`} className={ETIQUETA}>Descripción de la imagen</label>
        <input id={`alt-${banner.clave}`} maxLength={200} className={CAMPO} value={banner.alt} onChange={(e) => setBanner({ ...banner, alt: e.target.value })} />
        <p className={AYUDA}>Ayuda a Google y a personas con lectores de pantalla. Ej: “Mesa armada con vajilla blanca”.</p>
      </div>

      <Mensaje aviso={aviso} />

      <button type="button" onClick={guardar} disabled={guardando || subiendo} className={`${BTN_PRIMARIO} w-full sm:w-auto`}>
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </section>
  );
}

export default function BannersAdmin() {
  const [banners, setBanners] = useState<Banner[] | null>(null);

  useEffect(() => {
    supabase
      .from('banners')
      .select('*')
      .then(({ data }) => {
        // Lo que no esté en la base arranca con los valores actuales de la web
        const porClave = new Map((data ?? []).map((b: any) => [b.clave, b]));
        setBanners(
          Object.values(BANNERS_POR_DEFECTO).map((base) => {
            const b: any = porClave.get(base.clave);
            return b
              ? { ...base, ...b, titulo: b.titulo ?? base.titulo, subtitulo: b.subtitulo ?? base.subtitulo, imagen_url: b.imagen_url || base.imagen_url, alt: b.alt || base.alt }
              : base;
          })
        );
      });
  }, []);

  return (
    <div>
      <Encabezado
        titulo="Banners"
        descripcion="Las imágenes y textos grandes de la web. El banner amarillo de promoción se edita en la sección Promo."
      />
      {!banners ? (
        <p className="font-manrope text-sm text-stone-600">Cargando…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {banners.map((b) => (
            <TarjetaBanner key={b.clave} inicial={b} tieneTextos={b.clave === 'hero'} />
          ))}
        </div>
      )}
    </div>
  );
}
