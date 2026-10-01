'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  PROMO_POR_DEFECTO,
  PromoConfig,
  calcularMesesPromo,
  capitalizar,
  listaEnEspanol,
} from '@/lib/promo';
import { AYUDA, Aviso, BTN_PRIMARIO, CAMPO, ETIQUETA, TARJETA } from './estilos';
import { Encabezado, Interruptor, Mensaje } from './ui';

export default function PromoAdmin() {
  const [promo, setPromo] = useState<PromoConfig>(PROMO_POR_DEFECTO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    supabase
      .from('promo_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setAviso({ tipo: 'error', texto: 'No se pudo cargar la promo.' });
        else if (data) {
          setPromo({
            activo: Boolean(data.activo),
            motivo: data.motivo,
            descuento_texto: data.descuento_texto,
            beneficio_texto: data.beneficio_texto,
            meses_vigencia: data.meses_vigencia,
          });
        }
        setCargando(false);
      });
  }, []);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAviso(null);
    const { error } = await supabase.from('promo_config').upsert({ id: 1, ...promo });
    setGuardando(false);
    setAviso(
      error
        ? { tipo: 'error', texto: 'No se pudo guardar. Intentá de nuevo.' }
        : { tipo: 'ok', texto: 'Promo guardada. En la web se actualiza en menos de 1 minuto.' }
    );
  };

  const cambiar = <K extends keyof PromoConfig>(campo: K, valor: PromoConfig[K]) =>
    setPromo((p) => ({ ...p, [campo]: valor }));

  const meses = calcularMesesPromo(promo.meses_vigencia);

  if (cargando) return <p className="font-manrope text-sm text-stone-600">Cargando…</p>;

  return (
    <div>
      <Encabezado
        titulo="Promo"
        descripcion="El mes se actualiza solo todos los meses. Vos solo cambiás el motivo y el descuento cuando quieras."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={guardar} className={`${TARJETA} space-y-5`}>
          <Interruptor
            activo={promo.activo}
            onChange={(v) => cambiar('activo', v)}
            etiqueta="Mostrar el banner de promoción"
            descripcion="Apagalo cuando no haya ninguna promo vigente."
          />

          <div>
            <label htmlFor="promo-motivo" className={ETIQUETA}>Motivo de la promo</label>
            <input
              id="promo-motivo"
              className={CAMPO}
              maxLength={80}
              value={promo.motivo}
              onChange={(e) => cambiar('motivo', e.target.value)}
              placeholder="Ej: Día de la Madre, Fin de año…"
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="promo-desc" className={ETIQUETA}>Descuento</label>
              <input id="promo-desc" className={CAMPO} maxLength={40} value={promo.descuento_texto} onChange={(e) => cambiar('descuento_texto', e.target.value)} placeholder="Ej: 20% OFF" required />
            </div>
            <div>
              <label htmlFor="promo-meses" className={ETIQUETA}>Meses que incluye</label>
              <select id="promo-meses" className={CAMPO} value={promo.meses_vigencia} onChange={(e) => cambiar('meses_vigencia', Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} {n === 1 ? 'mes' : 'meses'}</option>
                ))}
              </select>
            </div>
          </div>
          <p className={`${AYUDA} !mt-0`}>“Meses que incluye” cuenta el mes actual: son los meses de eventos que entran en la promo.</p>

          <div>
            <label htmlFor="promo-beneficio" className={ETIQUETA}>Texto debajo del descuento</label>
            <input id="promo-beneficio" className={CAMPO} maxLength={120} value={promo.beneficio_texto} onChange={(e) => cambiar('beneficio_texto', e.target.value)} required />
          </div>

          <Mensaje aviso={aviso} />

          <button type="submit" disabled={guardando} className={`${BTN_PRIMARIO} w-full sm:w-auto`}>
            {guardando ? 'Guardando…' : 'Guardar promo'}
          </button>
        </form>

        {/* Vista previa del texto que va a mostrar la web */}
        <div className="self-start rounded-2xl border border-stone-300 bg-acento-amarillo p-5 shadow-sm">
          <p className="font-manrope text-xs font-bold uppercase tracking-wider text-stone-900/70 mb-3">Así se ve en la web</p>
          <p className="inline-block bg-stone-900 px-3 py-1 font-manrope text-xs font-bold uppercase tracking-wider text-acento-amarillo">
            🏆 Promo {capitalizar(meses.mesActual)} — {promo.motivo || '…'}
          </p>
          <p className="mt-3 font-playfair text-3xl font-bold text-stone-900">Si señás en {meses.mesActual}...</p>
          <p className="mt-2 font-manrope text-sm font-semibold text-stone-900/80">
            ...para eventos en {listaEnEspanol(meses.mesesVigentes)}, obtenés un descuento exclusivo.
          </p>
          <div className="mt-4 rounded-xl bg-white p-4">
            <p className="font-playfair text-4xl font-bold text-stone-900">{promo.descuento_texto}</p>
            <p className="font-manrope text-xs font-bold uppercase tracking-wide text-stone-700">{promo.beneficio_texto}</p>
          </div>
          {!promo.activo && <p className="mt-3 font-manrope text-xs font-bold text-red-800">El banner está apagado: no se muestra en la web.</p>}
        </div>
      </div>
    </div>
  );
}
