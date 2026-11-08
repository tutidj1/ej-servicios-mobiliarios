'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { digitosACentavos, formatearCentavos, mesDe, nombreMes } from '@/lib/casa/dinero';
import { alPagar, calendarioAnual, estadoItem, resumenFondo, type ItemFondo } from '@/lib/casa/fondo';
import { Barra, BotonPrincipal, CampoDigitos, CampoTexto, Chips, Hoja } from './ui';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const COLS = 'id, concepto, monto, mes, apartado, pagado_anio';

/** Fondo de gastos anuales: cargás cada gasto una vez, con su monto y su mes. Privado de cada persona. */
export default function FondoPantalla() {
  const { cliente, persona } = useCasa();
  const [items, setItems] = useState<ItemFondo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ editar?: ItemFondo } | null>(null);
  const [abierto, setAbierto] = useState<ItemFondo | null>(null);
  const hoy = useMemo(() => mesDe(new Date()), []);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const { data, error: e } = await cliente.from('fondo_anual').select(COLS);
    if (e) { setError('No se pudo cargar el fondo.'); return; }
    setError(null);
    setItems((data ?? []) as ItemFondo[]);
  }, [cliente]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  const ordenados = useMemo(
    () => [...items].sort((a, b) => {
      const va = estadoItem(a, hoy).vence, vb = estadoItem(b, hoy).vence;
      return va.anio * 12 + va.mes - (vb.anio * 12 + vb.mes) || a.concepto.localeCompare(b.concepto);
    }),
    [items, hoy],
  );
  const resumen = resumenFondo(items, hoy);
  const calendario = calendarioAnual(items, hoy).filter((m) => m.total > 0);

  const guardar = async (v: { concepto: string; monto: number; mes: number; apartado: number }, id?: string) => {
    if (!cliente || !persona) return;
    const r = id
      ? await cliente.from('fondo_anual').update(v).eq('id', id)
      : await cliente.from('fondo_anual').insert({ persona_id: persona.id, ...v });
    if (r.error) { setError('No se pudo guardar.'); return; }
    setForm(null);
    await cargar();
  };

  const apartar = async (f: ItemFondo, centavos: number) => {
    if (!cliente) return;
    const r = await cliente.from('fondo_anual').update({ apartado: f.apartado + centavos }).eq('id', f.id);
    if (r.error) { setError('No se pudo guardar lo apartado.'); return; }
    setAbierto(null);
    await cargar();
  };

  const pagar = async (f: ItemFondo) => {
    if (!cliente) return;
    const r = await cliente.from('fondo_anual').update(alPagar(f, hoy)).eq('id', f.id);
    if (r.error) { setError('No se pudo marcar como pagado.'); return; }
    setAbierto(null);
    await cargar();
  };

  const borrar = async (f: ItemFondo) => {
    if (!cliente) return;
    const r = await cliente.from('fondo_anual').delete().eq('id', f.id);
    if (r.error) setError('No se pudo borrar.');
    setAbierto(null);
    await cargar();
  };

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-casa-suave">
        Los gastos que no son mensuales (patente, seguro, matrícula, útiles) rompen el presupuesto cuando caen juntos. Apartando un poco por mes, ese mes pasa a ser normal.
      </p>

      {error && <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>}

      {items.length > 0 && (
        <section aria-label="Resumen del fondo" className="rounded-2xl border border-casa-borde bg-casa-panel p-4">
          <p className="text-xs uppercase tracking-wider text-casa-suave">Un doceavo por mes</p>
          <p className="mt-1 font-playfair text-3xl text-casa-texto">{formatearCentavos(resumen.porMes)}</p>
          <p className="mt-1 text-xs text-casa-suave">De {formatearCentavos(resumen.totalAnual)} que se pagan en el año. Es lo que entra en la cuenta de tu excedente.</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-casa-borde pt-3 text-sm">
            <div><dt className="text-xs text-casa-suave">Apartado</dt><dd className="font-semibold text-casa-texto">{formatearCentavos(resumen.apartado)}</dd></div>
            <div><dt className="text-xs text-casa-suave">Falta</dt><dd className="font-semibold text-casa-texto">{formatearCentavos(resumen.falta)}</dd></div>
          </dl>
          {resumen.falta > 0 && (
            <p className="mt-3 text-xs text-casa-suave">Para llegar a cada vencimiento con todo el monto, desde hoy habría que apartar {formatearCentavos(resumen.apartarPorMesHoy)} por mes.</p>
          )}
        </section>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-casa-suave">{cargando ? 'Cargando…' : `${items.length} ${items.length === 1 ? 'gasto anual' : 'gastos anuales'}`}</p>
        <button type="button" onClick={() => setForm({})} className="flex items-center gap-1.5 rounded-xl bg-casa-acento px-3.5 py-2 text-sm font-bold text-casa-fondo"><Plus size={16} /> Agregar</button>
      </div>

      {!cargando && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">
          Todavía no cargaste gastos anuales. Cargá cada uno una vez, con su monto y el mes en que vence. Es privado: lo ves solo vos.
        </p>
      )}

      <ul className="space-y-3">
        {ordenados.map((f) => {
          const e = estadoItem(f, hoy);
          return (
            <li key={f.id}>
              <button type="button" onClick={() => setAbierto(f)} className="w-full rounded-2xl border border-casa-borde bg-casa-panel p-4 text-left active:bg-casa-panel-2">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-casa-texto">{f.concepto}</p>
                    <p className="text-xs capitalize text-casa-suave">Vence {nombreMes(e.vence)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-casa-texto">{formatearCentavos(f.monto)}</p>
                </div>
                <Barra porcentaje={e.porcentaje} />
                <p className="mt-2 text-xs text-casa-suave">
                  Apartado {formatearCentavos(Math.min(f.apartado, f.monto))} ({e.porcentaje}%)
                  {e.falta > 0
                    ? ` · falta ${formatearCentavos(e.falta)}: apartá ${formatearCentavos(e.apartarPorMes)} por mes (${e.meses} ${e.meses === 1 ? 'mes' : 'meses'})`
                    : ' · ya está cubierto'}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {calendario.length > 0 && (
        <section aria-label="Cuándo vence cada cosa">
          <p className="mb-2 font-playfair text-lg text-casa-texto">Mes por mes</p>
          <ul className="divide-y divide-casa-borde overflow-hidden rounded-2xl border border-casa-borde bg-casa-panel">
            {calendario.map((m) => (
              <li key={`${m.mes.anio}-${m.mes.mes}`} className="px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="capitalize text-casa-texto">{nombreMes(m.mes)}</span>
                  <span className="font-semibold text-casa-texto">{formatearCentavos(m.total)}</span>
                </div>
                <p className="mt-0.5 text-xs text-casa-suave">{m.items.map((i) => `${i.concepto} ${formatearCentavos(i.monto)}`).join(' · ')}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-casa-suave">Para que la plata alcance, conviene que exista de verdad: un fondo que vive solo en una pantalla se gasta.</p>
        </section>
      )}

      {form && <FormularioFondo inicial={form.editar} alCerrar={() => setForm(null)} alGuardar={(v) => guardar(v, form.editar?.id)} />}
      {abierto && (
        <DetalleFondo
          f={abierto}
          hoy={hoy}
          alCerrar={() => setAbierto(null)}
          alApartar={apartar}
          alPagar={pagar}
          alEditar={() => { const f = abierto; setAbierto(null); setForm({ editar: f }); }}
          alBorrar={borrar}
        />
      )}
    </div>
  );
}

function FormularioFondo({ inicial, alCerrar, alGuardar }: { inicial?: ItemFondo; alCerrar: () => void; alGuardar: (v: { concepto: string; monto: number; mes: number; apartado: number }) => Promise<void> }) {
  const [concepto, setConcepto] = useState(inicial?.concepto ?? '');
  const [monto, setMonto] = useState(inicial ? String(Math.round(inicial.monto / 100)) : '');
  const [mes, setMes] = useState<string>(String(inicial?.mes ?? ''));
  const [apartado, setApartado] = useState(inicial ? String(Math.round(inicial.apartado / 100)) : '');
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    const m = digitosACentavos(monto);
    const a = apartado ? digitosACentavos(apartado) : 0;
    if (!concepto.trim()) return setError('Poné qué es (patente, seguro, matrícula…).');
    if (m === null) return setError('Poné el monto.');
    if (!mes) return setError('Elegí el mes en que vence.');
    if (a === null) return setError('Lo apartado no es válido.');
    void alGuardar({ concepto: concepto.trim(), monto: m, mes: Number(mes), apartado: a });
  };

  return (
    <Hoja titulo={inicial ? 'Editar gasto anual' : 'Nuevo gasto anual'} alCerrar={alCerrar}>
      <div className="space-y-4">
        <CampoTexto etiqueta="Qué es" valor={concepto} onChange={setConcepto} placeholder="Patente" />
        <CampoDigitos etiqueta="Monto del año" valor={monto} onChange={setMonto} />
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">Mes en que vence</p>
          <Chips<string> opciones={MESES.map((n, i) => ({ valor: String(i + 1), etiqueta: n }))} valor={mes} onChange={setMes} />
        </div>
        <CampoDigitos etiqueta="Ya apartado (opcional)" valor={apartado} onChange={setApartado} />
        {error && <p className="text-sm text-casa-error" role="alert">{error}</p>}
        <BotonPrincipal onClick={guardar}>Guardar</BotonPrincipal>
      </div>
    </Hoja>
  );
}

function DetalleFondo({ f, hoy, alCerrar, alApartar, alPagar, alEditar, alBorrar }: {
  f: ItemFondo; hoy: ReturnType<typeof mesDe>; alCerrar: () => void;
  alApartar: (f: ItemFondo, c: number) => Promise<void>;
  alPagar: (f: ItemFondo) => Promise<void>;
  alEditar: () => void;
  alBorrar: (f: ItemFondo) => Promise<void>;
}) {
  const e = estadoItem(f, hoy);
  const [monto, setMonto] = useState(e.falta > 0 ? String(Math.round(Math.min(e.apartarPorMes, e.falta) / 100)) : '');
  const [seguro, setSeguro] = useState(false);
  const centavos = digitosACentavos(monto);
  return (
    <Hoja titulo={f.concepto} alCerrar={alCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-casa-suave">
          <span className="capitalize">{nombreMes(e.vence)}</span> · {formatearCentavos(f.monto)}. Apartado {formatearCentavos(f.apartado)}.
        </p>
        <CampoDigitos etiqueta="Aparté este mes" valor={monto} onChange={setMonto} ayuda={e.falta > 0 ? `Para llegar a tiempo: ${formatearCentavos(e.apartarPorMes)} por mes.` : 'Ya está cubierto.'} />
        <BotonPrincipal deshabilitado={centavos === null} onClick={() => centavos !== null && void alApartar(f, centavos)}>Sumar a lo apartado</BotonPrincipal>
        <button type="button" onClick={() => void alPagar(f)} className="w-full rounded-xl border border-casa-borde py-3 text-sm font-semibold text-casa-texto">
          Ya lo pagué (empieza el ciclo del año siguiente)
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={alEditar} className="rounded-xl border border-casa-borde py-3 text-sm font-semibold text-casa-texto">Editar</button>
          <button type="button" onClick={() => (seguro ? void alBorrar(f) : setSeguro(true))} className="flex items-center justify-center gap-2 rounded-xl border border-casa-error/50 py-3 text-sm font-semibold text-casa-error">
            <Trash2 size={16} /> {seguro ? 'Tocá de nuevo' : 'Borrar'}
          </button>
        </div>
      </div>
    </Hoja>
  );
}
