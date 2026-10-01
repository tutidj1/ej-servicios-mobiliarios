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
import { Aviso, BTN_PRIMARIO, CAMPO, ETIQUETA, TARJETA } from './estilos';

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
        if (error) setAviso({ tipo: 'error', texto: 'No se pudo cargar la promo. ¿Ejecutaste la migración 0003?' });
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
        ? { tipo: 'error', texto: 'No se pudo guardar. Revisá que hayas iniciado sesión con la cuenta administradora.' }
        : { tipo: 'ok', texto: 'Promo guardada. En la web se actualiza en menos de 1 minuto.' }
    );
  };

  const cambiar = <K extends keyof PromoConfig>(campo: K, valor: PromoConfig[K]) =>
    setPromo((p) => ({ ...p, [campo]: valor }));

  const meses = calcularMesesPromo(promo.meses_vigencia);

  if (cargando) return <p className="font-manrope text-sm text-gris-suave">Cargando…</p>;

  return (
    <form onSubmit={guardar} className="space-y-5">
      <div className={TARJETA}>
        <p className="font-manrope text-sm text-gris-suave leading-relaxed">
          El <strong>mes</strong> se actualiza solo todos los meses. Vos solo cambiás el motivo y el
          descuento cuando quieras.
        </p>
      </div>

      <label className="flex items-center gap-3 min-h-[48px] cursor-pointer">
        <input
          type="checkbox"
          checked={promo.activo}
          onChange={(e) => cambiar('activo', e.target.checked)}
          className="h-6 w-6 accent-negro-carbon"
        />
        <span className="font-manrope text-sm font-semibold text-negro-carbon">Mostrar el banner de promoción</span>
      </label>

      <div>
        <label htmlFor="promo-motivo" className={ETIQUETA}>Motivo de la promo</label>
        <input
          id="promo-motivo"
          className={CAMPO}
          maxLength={80}
          value={promo.motivo}
          onChange={(e) => cambiar('motivo', e.target.value)}
          placeholder="Ej: Día de la Madre, Mes del Mundial, Fin de año…"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="promo-desc" className={ETIQUETA}>Descuento</label>
          <input
            id="promo-desc"
            className={CAMPO}
            maxLength={40}
            value={promo.descuento_texto}
            onChange={(e) => cambiar('descuento_texto', e.target.value)}
            placeholder="Ej: 20% OFF"
            required
          />
        </div>
        <div>
          <label htmlFor="promo-meses" className={ETIQUETA}>Meses de eventos que incluye</label>
          <select
            id="promo-meses"
            className={CAMPO}
            value={promo.meses_vigencia}
            onChange={(e) => cambiar('meses_vigencia', Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'mes' : 'meses'} (contando el actual)</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="promo-beneficio" className={ETIQUETA}>Texto debajo del descuento</label>
        <input
          id="promo-beneficio"
          className={CAMPO}
          maxLength={120}
          value={promo.beneficio_texto}
          onChange={(e) => cambiar('beneficio_texto', e.target.value)}
          required
        />
      </div>

      {/* Vista previa del texto que va a mostrar la web */}
      <div className="bg-acento-amarillo border border-negro-carbon p-4">
        <p className="font-manrope text-[10px] font-bold uppercase tracking-wider text-negro-carbon mb-2">Vista previa</p>
        <p className="font-manrope text-xs font-bold text-negro-carbon">
          🏆 Promo {capitalizar(meses.mesActual)} — {promo.motivo || '…'}
        </p>
        <p className="font-playfair text-2xl font-bold text-negro-carbon mt-1">Si señás en {meses.mesActual}...</p>
        <p className="font-manrope text-sm text-negro-carbon/80 mt-1">
          ...para eventos en {listaEnEspanol(meses.mesesVigentes)}: <strong>{promo.descuento_texto}</strong> — {promo.beneficio_texto}
        </p>
      </div>

      {aviso && (
        <p role="status" className={`p-3 border text-sm font-medium ${aviso.tipo === 'ok' ? 'border-negro-carbon text-negro-carbon bg-blanco-puro' : 'border-red-600 text-red-700'}`}>
          {aviso.texto}
        </p>
      )}

      <button type="submit" disabled={guardando} className={`${BTN_PRIMARIO} w-full sm:w-auto`}>
        {guardando ? 'Guardando…' : 'Guardar promo'}
      </button>
    </form>
  );
}
