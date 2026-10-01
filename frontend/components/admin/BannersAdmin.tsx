'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BANNERS_POR_DEFECTO, Banner } from '@/lib/banners';
import { Aviso, BTN_PRIMARIO, CAMPO, ETIQUETA, TARJETA } from './estilos';

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
      setAviso({ tipo: 'error', texto: 'No se pudo subir la imagen. ¿Ejecutaste las migraciones 0003 y 0004?' });
    } else {
      const { data } = supabase.storage.from('productos').getPublicUrl(ruta);
      setBanner((b) => ({ ...b, imagen_url: data.publicUrl }));
      setAviso({ tipo: 'ok', texto: 'Imagen subida. Tocá "Guardar" para publicarla.' });
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
        ? { tipo: 'error', texto: 'No se pudo guardar. Revisá que hayas ingresado con la cuenta administradora.' }
        : { tipo: 'ok', texto: 'Guardado. En la web se actualiza en menos de 1 minuto.' }
    );
  };

  return (
    <section className={`${TARJETA} space-y-4`}>
      <h2 className="font-playfair text-xl font-bold text-negro-carbon">{banner.etiqueta}</h2>

      {banner.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner.imagen_url} alt="" className="w-full max-h-64 object-cover border border-gris-borde" />
      )}

      <div>
        <label htmlFor={`img-${banner.clave}`} className={ETIQUETA}>Cambiar imagen</label>
        <input
          id={`img-${banner.clave}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={subiendo}
          onChange={(e) => e.target.files?.[0] && subirImagen(e.target.files[0])}
          className="block w-full font-manrope text-sm"
        />
        {subiendo && <p className="font-manrope text-xs text-gris-suave mt-1">Subiendo…</p>}
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
        <label htmlFor={`alt-${banner.clave}`} className={ETIQUETA}>Descripción de la imagen (para Google y lectores)</label>
        <input id={`alt-${banner.clave}`} maxLength={200} className={CAMPO} value={banner.alt} onChange={(e) => setBanner({ ...banner, alt: e.target.value })} />
      </div>

      {aviso && (
        <p role="status" className={`p-3 border text-sm font-medium ${aviso.tipo === 'ok' ? 'border-negro-carbon text-negro-carbon' : 'border-red-600 text-red-700'}`}>
          {aviso.texto}
        </p>
      )}

      <button type="button" onClick={guardar} disabled={guardando || subiendo} className={`${BTN_PRIMARIO} w-full sm:w-auto`}>
        {guardando ? 'Guardando…' : 'Guardar'}
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

  if (!banners) return <p className="font-manrope text-sm text-gris-suave">Cargando…</p>;

  return (
    <div className="space-y-5">
      <p className="font-manrope text-sm text-gris-suave leading-relaxed">
        Cambiá las imágenes y textos grandes de la web. El banner de promoción se edita en la pestaña <strong>Promo</strong>.
      </p>
      {banners.map((b) => (
        <TarjetaBanner key={b.clave} inicial={b} tieneTextos={b.clave === 'hero'} />
      ))}
    </div>
  );
}
