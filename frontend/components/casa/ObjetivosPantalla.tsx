'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { digitosACentavos, fechaLocalISO, formatearCentavos, nombreMes } from '@/lib/casa/dinero';
import {
  acumulado, dolaresDesdePesos, equivalenteEnPesos, porcentajeAvance, proyeccionObjetivo, ritmoNetoMensual,
  type MovObjetivo, type Objetivo,
} from '@/lib/casa/objetivos';
import type { MonedaCasa } from '@/lib/casa/inversiones';
import { Barra, BotonPrincipal, CampoDigitos, CampoTexto, Chips, Hoja } from './ui';

const dinero = (c: number, m: MonedaCasa) => (m === 'USD' ? formatearCentavos(c).replace('$', 'US$') : formatearCentavos(c));

export default function ObjetivosPantalla() {
  const { cliente, persona } = useCasa();
  const [objs, setObjs] = useState<Objetivo[]>([]);
  const [movs, setMovs] = useState<MovObjetivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [abierto, setAbierto] = useState<Objetivo | null>(null);
  const hoy = useMemo(() => new Date(), []);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const [o, m] = await Promise.all([
      cliente.from('objetivos_personales').select('id, nombre, meta, moneda, fecha_objetivo').order('nombre'),
      cliente.from('objetivo_personal_movimientos').select('objetivo_id, monto, moneda, tc_del_dia, tipo, fecha'),
    ]);
    if (o.error || m.error) { setError('No se pudieron cargar tus objetivos.'); return; }
    setError(null);
    setObjs((o.data ?? []) as Objetivo[]);
    setMovs((m.data ?? []) as MovObjetivo[]);
  }, [cliente]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  const crear = async (n: { nombre: string; meta: number; moneda: MonedaCasa; fecha_objetivo: string | null }) => {
    if (!cliente || !persona) return;
    const r = await cliente.from('objetivos_personales').insert({ persona_id: persona.id, ...n });
    if (r.error) { setError('No se pudo guardar el objetivo.'); return; }
    setAgregando(false);
    await cargar();
  };

  const mover = async (o: Objetivo, tipo: 'aporte' | 'retiro', montoEnMoneda: number, tc: number | null, motivo: string) => {
    if (!cliente) return;
    const r = await cliente.from('objetivo_personal_movimientos').insert({
      objetivo_id: o.id, monto: montoEnMoneda, moneda: o.moneda, tc_del_dia: tc, tipo, motivo, fecha: fechaLocalISO(new Date()),
    });
    if (r.error) { setError('No se pudo registrar el movimiento.'); return; }
    setAbierto(null);
    await cargar();
  };

  const borrar = async (o: Objetivo) => {
    if (!cliente) return;
    const r = await cliente.from('objetivos_personales').delete().eq('id', o.id);
    if (r.error) setError('No se pudo borrar.');
    setAbierto(null);
    await cargar();
  };

  return (
    <div className="space-y-5">
      {error && <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>}
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-casa-suave">{cargando ? 'Cargando…' : `${objs.length} ${objs.length === 1 ? 'objetivo' : 'objetivos'}`}</p>
        <button type="button" onClick={() => setAgregando(true)} className="flex items-center gap-1.5 rounded-xl bg-casa-acento px-3.5 py-2 text-sm font-bold text-casa-fondo"><Plus size={16} /> Agregar</button>
      </div>

      {!cargando && objs.length === 0 && (
        <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">
          Todavía no tenés objetivos. Son tuyos: no los ve nadie más.
        </p>
      )}

      <ul className="space-y-3">
        {objs.map((o) => {
          const m = movs.filter((x) => x.objetivo_id === o.id);
          const acum = acumulado(m);
          const pct = porcentajeAvance(o.meta, acum);
          const proy = proyeccionObjetivo(o.meta, acum, ritmoNetoMensual(m, hoy), hoy);
          return (
            <li key={o.id}>
              <button type="button" onClick={() => setAbierto(o)} className="w-full rounded-2xl border border-casa-borde bg-casa-panel p-4 text-left active:bg-casa-panel-2">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-casa-texto">{o.nombre}</p>
                  <p className="shrink-0 text-sm text-casa-suave">Meta {dinero(o.meta, o.moneda)}</p>
                </div>
                <Barra porcentaje={pct} />
                <p className="mt-2 text-xs text-casa-suave">
                  {pct}% · llevás {dinero(Math.max(acum, 0), o.moneda)}
                  {o.moneda === 'USD' && m.some((x) => x.tc_del_dia) ? ` (unos ${formatearCentavos(Math.max(equivalenteEnPesos(m), 0))} con la cotización de cada aporte)` : ''}
                </p>
                <p className="mt-1 text-xs text-casa-suave">
                  {proy.estado === 'alcanzado' && 'Meta alcanzada.'}
                  {proy.estado === 'sin_ritmo' && 'Todavía no hay aportes netos en los últimos 3 meses para estimar cuándo llegás.'}
                  {proy.estado === 'llega' && <>A este ritmo (aporte neto de los últimos 3 meses) llegás en <span className="capitalize">{nombreMes(proy.mes)}</span>.</>}
                  {o.fecha_objetivo ? ` Fecha que te pusiste: ${new Date(o.fecha_objetivo + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}.` : ''}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {agregando && <FormularioObjetivo alCerrar={() => setAgregando(false)} alGuardar={crear} />}
      {abierto && <DetalleObjetivo obj={abierto} alCerrar={() => setAbierto(null)} alMover={mover} alBorrar={borrar} />}
    </div>
  );
}

function FormularioObjetivo({ alCerrar, alGuardar }: { alCerrar: () => void; alGuardar: (n: { nombre: string; meta: number; moneda: MonedaCasa; fecha_objetivo: string | null }) => Promise<void> }) {
  const [nombre, setNombre] = useState('');
  const [meta, setMeta] = useState('');
  const [moneda, setMoneda] = useState<MonedaCasa>('USD');
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Hoja titulo="Nuevo objetivo" alCerrar={alCerrar}>
      <div className="space-y-4">
        <CampoTexto etiqueta="Nombre" valor={nombre} onChange={setNombre} placeholder="Viaje, auto, colchón…" />
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">Meta en</p>
          <Chips<MonedaCasa> opciones={[{ valor: 'USD', etiqueta: 'Dólares' }, { valor: 'ARS', etiqueta: 'Pesos' }]} valor={moneda} onChange={setMoneda} />
          <p className="mt-1.5 text-xs text-casa-suave">Un objetivo en pesos a un año pierde cerca de un tercio de su poder de compra en el camino. En dólares se mide mejor.</p>
        </div>
        <CampoDigitos etiqueta="Monto meta" valor={meta} onChange={setMeta} prefijo={moneda === 'USD' ? 'US$' : '$'} />
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-casa-suave">Fecha (opcional)</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-xl border border-casa-borde bg-casa-fondo px-4 py-3 text-base text-casa-texto" />
        </label>
        {error && <p className="text-sm text-casa-error" role="alert">{error}</p>}
        <BotonPrincipal onClick={() => {
          const c = digitosACentavos(meta);
          if (!nombre.trim() || c === null) return setError('Poné un nombre y el monto de la meta.');
          void alGuardar({ nombre: nombre.trim(), meta: c, moneda, fecha_objetivo: fecha || null });
        }}>Guardar</BotonPrincipal>
      </div>
    </Hoja>
  );
}

function DetalleObjetivo({ obj, alCerrar, alMover, alBorrar }: {
  obj: Objetivo; alCerrar: () => void;
  alMover: (o: Objetivo, tipo: 'aporte' | 'retiro', monto: number, tc: number | null, motivo: string) => Promise<void>;
  alBorrar: (o: Objetivo) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<'aporte' | 'retiro'>('aporte');
  const [enPesos, setEnPesos] = useState(obj.moneda === 'USD');
  const [monto, setMonto] = useState('');
  const [tc, setTc] = useState('');
  const [motivo, setMotivo] = useState('');
  const [seguro, setSeguro] = useState(false);

  const conversion = obj.moneda === 'USD' && enPesos;
  const centavos = digitosACentavos(monto);
  const tcCentavos = tc ? digitosACentavos(tc) : null;
  const usd = conversion && centavos !== null && tcCentavos !== null ? dolaresDesdePesos(centavos, tcCentavos) : null;
  const listo = conversion ? usd !== null && usd > 0 : centavos !== null;

  return (
    <Hoja titulo={obj.nombre} alCerrar={alCerrar}>
      <div className="space-y-4">
        <Chips<'aporte' | 'retiro'> opciones={[{ valor: 'aporte', etiqueta: 'Aporte' }, { valor: 'retiro', etiqueta: 'Retiro' }]} valor={tipo} onChange={setTipo} />
        {obj.moneda === 'USD' && (
          <Chips<'pesos' | 'dolares'> opciones={[{ valor: 'pesos', etiqueta: 'Pongo pesos' }, { valor: 'dolares', etiqueta: 'Pongo dólares' }]} valor={enPesos ? 'pesos' : 'dolares'} onChange={(v) => setEnPesos(v === 'pesos')} />
        )}
        <CampoDigitos etiqueta="Monto" valor={monto} onChange={setMonto} prefijo={conversion || obj.moneda === 'ARS' ? '$' : 'US$'} />
        {obj.moneda === 'USD' && (
          <CampoDigitos
            etiqueta={conversion ? 'Cotización del dólar de hoy' : 'Cotización del día (opcional)'}
            valor={tc}
            onChange={setTc}
            ayuda={usd !== null ? `Son US$ ${formatearCentavos(usd).replace('$ ', '')}. Esta cotización queda guardada con el movimiento.` : 'Pesos por dólar. Queda guardada con el movimiento.'}
          />
        )}
        {tipo === 'retiro' && <CampoTexto etiqueta="Motivo" valor={motivo} onChange={setMotivo} placeholder="Para qué fue" />}
        <BotonPrincipal
          deshabilitado={!listo}
          onClick={() => {
            const final = conversion ? usd : centavos;
            if (final === null || final <= 0) return;
            void alMover(obj, tipo, final, obj.moneda === 'USD' ? tcCentavos : null, motivo.trim());
          }}
        >
          {tipo === 'aporte' ? 'Registrar aporte' : 'Registrar retiro'}
        </BotonPrincipal>
        <button type="button" onClick={() => (seguro ? void alBorrar(obj) : setSeguro(true))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-casa-error/50 py-3 text-sm font-semibold text-casa-error">
          <Trash2 size={18} /> {seguro ? 'Tocá de nuevo para borrarlo' : 'Borrar este objetivo'}
        </button>
      </div>
    </Hoja>
  );
}
