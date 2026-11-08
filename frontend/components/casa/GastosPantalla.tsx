'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Delete, Trash2, X } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import IngresosMes from './IngresosMes';
import VozGasto from './VozGasto';
import {
  diaCorto, digitosACentavos, fechaLocalISO, formatearCentavos, formatearDigitos, haceDias, mesDe,
  moverMes, nombreMes, rangoMes, sumarCentavos, type Mes,
} from '@/lib/casa/dinero';

type TipoGasto = 'fijo_obligatorio' | 'variable_necesario' | 'discrecional';
type Categoria = { id: string; nombre: string; tipo_defecto: TipoGasto };
type Gasto = { id: string; monto: number; categoria_id: string; tipo: TipoGasto; fecha: string; descripcion: string };

const TIPOS: { valor: TipoGasto; etiqueta: string }[] = [
  { valor: 'fijo_obligatorio', etiqueta: 'Fijo obligatorio' },
  { valor: 'variable_necesario', etiqueta: 'Variable necesario' },
  { valor: 'discrecional', etiqueta: 'Discrecional' },
];

const REDONDOS = ['5000', '10000', '20000', '50000', '100000'];

/**
 * Carga de gastos sin formulario: monto (botones redondos o teclado) y un toque en la categoría.
 * Todo se lee y escribe con la sesión del usuario: RLS garantiza que solo ve y toca lo suyo.
 */
export default function GastosPantalla() {
  const { cliente, persona } = useCasa();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [mes, setMes] = useState<Mes>(() => mesDe(new Date()));
  const [digitos, setDigitos] = useState('');
  const [ayer, setAyer] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; deshacerId?: string } | null>(null);
  const [editando, setEditando] = useState<Gasto | null>(null);
  const temporizador = useRef<number | null>(null);

  const porId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);

  const cargarGastos = useCallback(async () => {
    if (!cliente) return;
    const { desde, hasta } = rangoMes(mes);
    const { data, error: e } = await cliente
      .from('gastos')
      .select('id, monto, categoria_id, tipo, fecha, descripcion')
      .gte('fecha', desde)
      .lt('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })
      .limit(1000);
    if (e) { setError('No se pudieron cargar tus gastos.'); return; }
    setError(null);
    setGastos((data ?? []) as Gasto[]);
  }, [cliente, mes]);

  useEffect(() => {
    if (!cliente) return;
    cliente.from('categorias').select('id, nombre, tipo_defecto').order('orden').then(({ data }) => setCategorias((data ?? []) as Categoria[]));
  }, [cliente]);

  useEffect(() => {
    setCargando(true);
    cargarGastos().finally(() => setCargando(false));
  }, [cargarGastos]);

  useEffect(() => () => { if (temporizador.current) window.clearTimeout(temporizador.current); }, []);

  const avisar = (texto: string, deshacerId?: string) => {
    setAviso({ texto, deshacerId });
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setAviso(null), 7000);
  };

  const centavos = digitosACentavos(digitos);

  const guardar = async (cat: Categoria) => {
    if (!cliente || !persona || centavos === null) return;
    const fecha = fechaLocalISO(ayer ? haceDias(new Date(), 1) : new Date());
    const { data, error: e } = await cliente
      .from('gastos')
      .insert({ persona_id: persona.id, monto: centavos, categoria_id: cat.id, tipo: cat.tipo_defecto, fecha, descripcion: '', origen: 'web' })
      .select('id')
      .single();
    if (e || !data) { setError('No se pudo guardar el gasto. Probá de nuevo.'); return; }
    setError(null);
    avisar(`Guardado ${formatearCentavos(centavos)} en ${cat.nombre}`, data.id);
    setDigitos('');
    setAyer(false);
    await cargarGastos();
  };

  const deshacer = async (id: string) => {
    if (!cliente) return;
    await cliente.from('gastos').delete().eq('id', id);
    setAviso(null);
    await cargarGastos();
  };

  const total = sumarCentavos(gastos.map((g) => g.monto));
  const hoyMes = mesDe(new Date());
  const esMesActual = mes.anio === hoyMes.anio && mes.mes === hoyMes.mes;

  const tecla = (d: string) => setDigitos((x) => (x + d).replace(/^0+/, '').slice(0, 9));

  return (
    <div className="space-y-6">
      {/* Por voz o texto libre */}
      <VozGasto categorias={categorias} alGuardar={cargarGastos} />

      {/* Carga */}
      <section aria-label="Cargar un gasto" className="rounded-3xl border border-casa-borde bg-casa-panel p-4">
        <div className="mb-1 flex items-end justify-between">
          <p className="text-xs uppercase tracking-wider text-casa-suave">Monto</p>
          <div className="flex gap-1">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setAyer(v)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${ayer === v ? 'bg-casa-acento text-casa-fondo' : 'bg-casa-panel-2 text-casa-suave'}`}
              >
                {v ? 'Ayer' : 'Hoy'}
              </button>
            ))}
          </div>
        </div>
        <p className="mb-3 font-playfair text-4xl text-casa-texto" aria-live="polite">$ {formatearDigitos(digitos)}</p>

        <div className="mb-3 flex flex-wrap gap-2">
          {REDONDOS.map((r) => (
            <button key={r} type="button" onClick={() => setDigitos(r)} className="rounded-full border border-casa-borde px-3.5 py-2 text-sm font-semibold text-casa-texto active:bg-casa-panel-2">
              {formatearDigitos(r)}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {['1', '2', '3'].map((d) => <button key={d} type="button" onClick={() => tecla(d)} className="h-12 rounded-xl bg-casa-panel-2 text-lg font-semibold active:opacity-70">{d}</button>)}
          <button type="button" onClick={() => setDigitos((x) => x.slice(0, -1))} aria-label="Borrar un dígito" className="flex h-12 items-center justify-center rounded-xl text-casa-suave active:bg-casa-panel-2"><Delete size={20} /></button>
          {['4', '5', '6'].map((d) => <button key={d} type="button" onClick={() => tecla(d)} className="h-12 rounded-xl bg-casa-panel-2 text-lg font-semibold active:opacity-70">{d}</button>)}
          <button type="button" onClick={() => setDigitos('')} className="h-12 rounded-xl text-xs font-semibold text-casa-suave active:bg-casa-panel-2">Limpiar</button>
          {['7', '8', '9'].map((d) => <button key={d} type="button" onClick={() => tecla(d)} className="h-12 rounded-xl bg-casa-panel-2 text-lg font-semibold active:opacity-70">{d}</button>)}
          <span />
          <button type="button" onClick={() => tecla('0')} className="h-12 rounded-xl bg-casa-panel-2 text-lg font-semibold active:opacity-70">0</button>
          <button type="button" onClick={() => tecla('000')} className="h-12 rounded-xl bg-casa-panel-2 text-lg font-semibold active:opacity-70">000</button>
          <span />
        </div>

        <p className="mb-2 text-xs uppercase tracking-wider text-casa-suave">{centavos === null ? 'Poné un monto y tocá la categoría' : 'Tocá la categoría para guardar'}</p>
        <div className="grid grid-cols-2 gap-2">
          {categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={centavos === null}
              onClick={() => void guardar(c)}
              className="rounded-xl border border-casa-borde px-3 py-3 text-left text-sm font-semibold text-casa-texto active:bg-casa-acento/20 disabled:opacity-40"
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>}

      {/* Mes */}
      <section aria-label="Gastos del mes">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => setMes((m) => moverMes(m, -1))} aria-label="Mes anterior" className="rounded-xl p-2 text-casa-suave active:bg-casa-panel"><ChevronLeft size={22} /></button>
          <div className="text-center">
            <p className="font-playfair text-lg capitalize text-casa-texto">{nombreMes(mes)}</p>
            <p className="text-sm text-casa-suave">{cargando ? 'Cargando…' : `${gastos.length} ${gastos.length === 1 ? 'gasto' : 'gastos'} · ${formatearCentavos(total)}`}</p>
          </div>
          <button type="button" disabled={esMesActual} onClick={() => setMes((m) => moverMes(m, 1))} aria-label="Mes siguiente" className="rounded-xl p-2 text-casa-suave active:bg-casa-panel disabled:opacity-30"><ChevronRight size={22} /></button>
        </div>

        {!cargando && gastos.length === 0 && (
          <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">Sin gastos en {nombreMes(mes)}.</p>
        )}

        <ul className="divide-y divide-casa-borde overflow-hidden rounded-2xl border border-casa-borde bg-casa-panel">
          {gastos.map((g) => (
            <li key={g.id}>
              <button type="button" onClick={() => setEditando(g)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-casa-panel-2">
                <span className="w-12 shrink-0 text-xs text-casa-suave">{diaCorto(g.fecha)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-casa-texto">{porId.get(g.categoria_id)?.nombre ?? 'Sin categoría'}</span>
                  <span className="block text-xs text-casa-suave">{TIPOS.find((t) => t.valor === g.tipo)?.etiqueta}</span>
                </span>
                <span className="text-sm font-semibold text-casa-texto">{formatearCentavos(g.monto)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <IngresosMes mes={mes} />

      {/* Aviso con deshacer */}
      {aviso && (
        <div className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-casa-acento px-4 py-3 text-sm font-semibold text-casa-fondo shadow-lg md:bottom-8" role="status">
          <span>{aviso.texto}</span>
          {aviso.deshacerId && <button type="button" onClick={() => void deshacer(aviso.deshacerId!)} className="underline">Deshacer</button>}
        </div>
      )}

      {editando && (
        <EditarGasto
          gasto={editando}
          categorias={categorias}
          alCerrar={() => setEditando(null)}
          alCambiar={async (cambios) => {
            if (!cliente) return;
            const { error: e } = await cliente.from('gastos').update(cambios).eq('id', editando.id);
            if (e) { setError('No se pudo actualizar el gasto.'); } else { setError(null); }
            setEditando(null);
            await cargarGastos();
          }}
          alBorrar={async () => {
            if (!cliente) return;
            const { error: e } = await cliente.from('gastos').delete().eq('id', editando.id);
            if (e) setError('No se pudo borrar el gasto.');
            setEditando(null);
            await cargarGastos();
          }}
        />
      )}
    </div>
  );
}

function EditarGasto({
  gasto, categorias, alCerrar, alCambiar, alBorrar,
}: {
  gasto: Gasto;
  categorias: Categoria[];
  alCerrar: () => void;
  alCambiar: (c: Partial<Pick<Gasto, 'categoria_id' | 'tipo'>>) => Promise<void>;
  alBorrar: () => Promise<void>;
}) {
  const [confirmar, setConfirmar] = useState(false);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 md:items-center" onClick={alCerrar} role="dialog" aria-modal="true" aria-label="Editar gasto">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-casa-panel p-5 pb-8 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-playfair text-2xl text-casa-texto">{formatearCentavos(gasto.monto)}</p>
            <p className="text-xs text-casa-suave">{diaCorto(gasto.fecha)}</p>
          </div>
          <button type="button" onClick={alCerrar} aria-label="Cerrar" className="rounded-xl p-2 text-casa-suave"><X size={22} /></button>
        </div>

        <p className="mb-2 text-xs uppercase tracking-wider text-casa-suave">Tipo</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <button key={t.valor} type="button" onClick={() => void alCambiar({ tipo: t.valor })} className={`rounded-full px-3.5 py-2 text-sm font-semibold ${gasto.tipo === t.valor ? 'bg-casa-acento text-casa-fondo' : 'bg-casa-panel-2 text-casa-texto'}`}>
              {t.etiqueta}
            </button>
          ))}
        </div>

        <p className="mb-2 text-xs uppercase tracking-wider text-casa-suave">Categoría</p>
        <div className="mb-6 grid grid-cols-2 gap-2">
          {categorias.map((c) => (
            <button key={c.id} type="button" onClick={() => void alCambiar({ categoria_id: c.id })} className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold ${gasto.categoria_id === c.id ? 'border-casa-acento bg-casa-acento/15 text-casa-acento' : 'border-casa-borde text-casa-texto'}`}>
              {c.nombre}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => (confirmar ? void alBorrar() : setConfirmar(true))}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-casa-error/50 py-3 text-sm font-semibold text-casa-error"
        >
          <Trash2 size={18} /> {confirmar ? 'Tocá de nuevo para borrarlo' : 'Borrar este gasto'}
        </button>
      </div>
    </div>
  );
}
