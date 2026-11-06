'use client';

import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { diasDelRango, fechaLarga, hoyArgentina, nombreMes, sumarDias } from '@/lib/gestion/calculos';
import { useBloqueoScroll } from '@/lib/useMovil';
import { CAMPO } from '../estilos';

export type VistaCal = 'semana' | 'mes' | 'anio';
export interface MarcaDia {
  confirmados: number;
  presupuestos: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const LETRAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const TEXTO_VISTA: Record<VistaCal, string> = { semana: 'Semana', mes: 'Mes', anio: 'Año' };

export function lunesDe(dia: string): string {
  const d = new Date(`${dia}T00:00:00Z`);
  return sumarDias(dia, -((d.getUTCDay() + 6) % 7));
}

/** Primer y último día que muestra cada vista (para pedir esos datos a la base). */
export function rangoVisible(vista: VistaCal, ancla: string): { desde: string; hasta: string } {
  if (vista === 'semana') {
    const l = lunesDe(ancla);
    return { desde: l, hasta: sumarDias(l, 6) };
  }
  const [y, m] = ancla.split('-').map(Number);
  if (vista === 'anio') return { desde: `${y}-01-01`, hasta: `${y}-12-31` };
  return { desde: `${y}-${pad(m)}-01`, hasta: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
}

function mover(vista: VistaCal, ancla: string, n: number): string {
  if (vista === 'semana') return sumarDias(ancla, 7 * n);
  const [y, m] = ancla.split('-').map(Number);
  if (vista === 'anio') return `${y + n}-01-01`;
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}

function titulo(vista: VistaCal, ancla: string): string {
  const [y, m] = ancla.split('-').map(Number);
  if (vista === 'anio') return String(y);
  if (vista === 'mes') return `${nombreMes(m - 1)[0].toUpperCase()}${nombreMes(m - 1).slice(1)} ${y}`;
  const { desde, hasta } = rangoVisible('semana', ancla);
  const [, m1, d1] = desde.split('-').map(Number);
  const [, m2, d2] = hasta.split('-').map(Number);
  return m1 === m2 ? `${d1} – ${d2} ${MES_CORTO[m1 - 1]}` : `${d1} ${MES_CORTO[m1 - 1]} – ${d2} ${MES_CORTO[m2 - 1]}`;
}

export function Marcas({ marca }: { marca?: MarcaDia }) {
  if (!marca) return null;
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {marca.confirmados > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
      {marca.presupuestos > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
    </span>
  );
}

export interface PropsCalendario {
  vista: VistaCal;
  ancla: string;
  onCambio: (cambio: { vista: VistaCal; ancla: string }) => void;
  valor?: string | null;
  onElegir: (dia: string) => void;
  marcas?: Record<string, MarcaDia>;
  /** Cantidad de eventos por mes ('2026-11' → 4), para la vista de año. */
  marcasMes?: Record<string, number>;
  vistas?: VistaCal[];
  min?: string;
  max?: string;
  /** Rango marcado (varios días seguidos). hasta null = todavía se está eligiendo. */
  rango?: { desde: string; hasta: string | null };
}

/** Calendario chico: un toque elige el día. Vistas de semana, mes y año. */
export function MiniCalendario({ vista, ancla, onCambio, valor, onElegir, marcas, marcasMes, vistas = ['semana', 'mes', 'anio'], min, max, rango }: PropsCalendario) {
  const hoy = hoyArgentina();
  const [y, m] = ancla.split('-').map(Number);
  const deshabilitado = (d: string) => (!!min && d < min) || (!!max && d > max);

  const celda = (d: string, alto: string) => {
    const elegido = d === valor || (!!rango && (d === rango.desde || d === (rango.hasta ?? rango.desde)));
    const intermedio = !!rango && !!rango.hasta && d > rango.desde && d < rango.hasta;
    return (
      <button
        key={d}
        type="button"
        disabled={deshabilitado(d)}
        onClick={() => onElegir(d)}
        aria-label={fechaLarga(d)}
        aria-pressed={elegido}
        className={`flex ${alto} flex-col items-center justify-center gap-0.5 rounded-lg font-manrope text-sm font-semibold transition-colors disabled:opacity-30 ${
          elegido ? 'bg-stone-900 text-white' : intermedio ? 'bg-emerald-100 text-emerald-900' : d === hoy ? 'bg-amber-100 text-stone-900 ring-1 ring-amber-400' : 'text-stone-800 hover:bg-stone-100'
        }`}
      >
        {Number(d.slice(8))}
        <Marcas marca={marcas?.[d]} />
      </button>
    );
  };

  let cuerpo: React.ReactNode;
  if (vista === 'anio') {
    cuerpo = (
      <div className="grid grid-cols-3 gap-2">
        {MES_CORTO.map((nombre, i) => {
          const clave = `${y}-${pad(i + 1)}`;
          const cantidad = marcasMes?.[clave] ?? 0;
          const esteMes = hoy.startsWith(clave);
          return (
            <button
              key={clave}
              type="button"
              onClick={() => onCambio({ vista: vistas.includes('mes') ? 'mes' : vista, ancla: `${clave}-01` })}
              className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl border font-manrope text-sm font-semibold capitalize ${
                esteMes ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-white hover:bg-stone-50'
              }`}
            >
              {nombre}
              {cantidad > 0 && <span className="text-xs font-bold text-emerald-700">{cantidad} {cantidad === 1 ? 'evento' : 'eventos'}</span>}
            </button>
          );
        })}
      </div>
    );
  } else if (vista === 'semana') {
    const lunes = lunesDe(ancla);
    cuerpo = (
      <div className="grid grid-cols-7 gap-1">
        {LETRAS.map((l, i) => <div key={i} className="text-center font-manrope text-[11px] font-semibold text-stone-500">{l}</div>)}
        {Array.from({ length: 7 }, (_, i) => celda(sumarDias(lunes, i), 'h-16'))}
      </div>
    );
  } else {
    const primero = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    const cantidadDias = new Date(Date.UTC(y, m, 0)).getUTCDate();
    cuerpo = (
      <div className="grid grid-cols-7 gap-1">
        {LETRAS.map((l, i) => <div key={i} className="text-center font-manrope text-[11px] font-semibold text-stone-500">{l}</div>)}
        {Array.from({ length: primero }, (_, i) => <div key={`v${i}`} />)}
        {Array.from({ length: cantidadDias }, (_, i) => celda(`${y}-${pad(m)}-${pad(i + 1)}`, 'h-10'))}
      </div>
    );
  }

  return (
    <div className="font-manrope">
      {vistas.length > 1 && (
        <div role="tablist" className="mb-3 grid gap-1 rounded-xl bg-stone-100 p-1" style={{ gridTemplateColumns: `repeat(${vistas.length}, 1fr)` }}>
          {vistas.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={vista === v}
              onClick={() => onCambio({ vista: v, ancla: valor && v !== 'anio' ? valor : ancla })}
              className={`min-h-[40px] rounded-lg text-sm font-semibold ${vista === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'}`}
            >
              {TEXTO_VISTA[v]}
            </button>
          ))}
        </div>
      )}
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-stone-100" onClick={() => onCambio({ vista, ancla: mover(vista, ancla, -1) })} aria-label="Anterior">
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-1 font-playfair text-lg font-bold text-stone-900 hover:bg-stone-100"
          onClick={() => vistas.includes('anio') && vista === 'mes' && onCambio({ vista: 'anio', ancla })}
          aria-label={vista === 'mes' ? 'Ver el año' : undefined}
        >
          {titulo(vista, ancla)}
        </button>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-stone-100" onClick={() => onCambio({ vista, ancla: mover(vista, ancla, 1) })} aria-label="Siguiente">
          <ChevronRight size={20} />
        </button>
      </div>
      {cuerpo}
    </div>
  );
}

/** Campo de fecha para formularios: se ve como un botón; al tocarlo se abre el calendario chico. */
export function CampoFecha({
  id,
  valor,
  onChange,
  min,
  max,
  deshabilitado,
  etiquetaAccesible,
}: {
  id?: string;
  valor: string;
  onChange: (dia: string) => void;
  min?: string;
  max?: string;
  deshabilitado?: boolean;
  etiquetaAccesible?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<VistaCal>('mes');
  const [ancla, setAncla] = useState(valor || hoyArgentina());
  useBloqueoScroll(abierto);

  const abrir = () => {
    setAncla(valor || min || hoyArgentina());
    setVista('mes');
    setAbierto(true);
  };
  const año = valor.slice(0, 4);
  const texto = valor ? `${fechaLarga(valor)}${año !== hoyArgentina().slice(0, 4) ? ` ${año}` : ''}` : 'Elegir fecha';

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={deshabilitado}
        onClick={abrir}
        aria-label={etiquetaAccesible}
        className={`${CAMPO} flex items-center justify-between gap-2 text-left ${valor ? '' : 'text-stone-400'} disabled:opacity-60`}
      >
        <span className="truncate">{texto}</span>
        <CalendarDays size={18} className="shrink-0 text-stone-500" />
      </button>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setAbierto(false)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-4 pb-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Elegir fecha">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                className="min-h-[40px] rounded-lg px-3 font-manrope text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                onClick={() => { onChange(hoyArgentina()); setAbierto(false); }}
                disabled={(!!min && hoyArgentina() < min) || (!!max && hoyArgentina() > max)}
              >
                Hoy
              </button>
              <button type="button" className="flex h-10 w-10 items-center justify-center" onClick={() => setAbierto(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <MiniCalendario
              vista={vista}
              ancla={ancla}
              vistas={['mes', 'anio']}
              onCambio={(c) => { setVista(c.vista); setAncla(c.ancla); }}
              valor={valor}
              onElegir={(d) => { onChange(d); setAbierto(false); }}
              min={min}
              max={max}
            />
          </div>
        </div>
      )}
    </>
  );
}

const corta = (dia: string) => {
  const [d, n, , mes] = fechaLarga(dia).split(' ');
  return `${d} ${n} ${(mes ?? '').slice(0, 3)}`;
};

/**
 * Fechas del alquiler en un solo campo: se toca primero el día del evento y después el día que lo devuelven
 * (si es el mismo día, se toca dos veces). Sirve también para reservas de dos o más días seguidos.
 */
export function CampoRango({
  id,
  desde,
  hasta,
  onChange,
  deshabilitado,
}: {
  id?: string;
  desde: string;
  hasta: string;
  onChange: (desde: string, hasta: string) => void;
  deshabilitado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<VistaCal>('mes');
  const [ancla, setAncla] = useState(desde || hoyArgentina());
  const [inicio, setInicio] = useState<string | null>(null);
  useBloqueoScroll(abierto);

  const abrir = () => {
    setAncla(desde || hoyArgentina());
    setVista('mes');
    setInicio(null);
    setAbierto(true);
  };
  const tocar = (d: string) => {
    if (inicio === null) {
      setInicio(d);
      return;
    }
    const a = d < inicio ? d : inicio;
    const b = d < inicio ? inicio : d;
    onChange(a, b);
    setAbierto(false);
  };

  const fin = hasta || desde;
  const dias = desde ? diasDelRango(desde, fin < desde ? desde : fin).length : 0;
  const texto = !desde
    ? 'Elegir fechas'
    : desde === fin
      ? `${fechaLarga(desde)} · 1 día`
      : `${corta(desde)} → ${corta(fin)} · ${dias} días`;

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={deshabilitado}
        onClick={abrir}
        className={`${CAMPO} flex items-center justify-between gap-2 text-left ${desde ? '' : 'text-stone-400'} disabled:opacity-60`}
      >
        <span className="truncate">{texto}</span>
        <CalendarDays size={18} className="shrink-0 text-stone-500" />
      </button>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setAbierto(false)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-4 pb-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Elegir fechas del alquiler">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="font-manrope text-sm font-semibold text-stone-800">
                {inicio === null ? '1. Tocá el día del evento' : `2. Ahora tocá el día que te lo devuelven (evento: ${corta(inicio)})`}
              </p>
              <button type="button" className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center" onClick={() => setAbierto(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            {inicio !== null && (
              <button type="button" className="mb-2 min-h-[40px] rounded-lg px-3 font-manrope text-sm font-semibold text-emerald-800 hover:bg-emerald-50" onClick={() => { onChange(inicio, inicio); setAbierto(false); }}>
                Es de un solo día
              </button>
            )}
            <MiniCalendario
              vista={vista}
              ancla={ancla}
              vistas={['mes', 'anio']}
              onCambio={(c) => { setVista(c.vista); setAncla(c.ancla); }}
              onElegir={tocar}
              rango={inicio !== null ? { desde: inicio, hasta: null } : desde ? { desde, hasta: fin } : undefined}
              min={inicio ?? undefined}
            />
            <p className="mt-3 font-manrope text-xs text-stone-500">Para dos o más días seguidos, el segundo toque es el último día.</p>
          </div>
        </div>
      )}
    </>
  );
}
