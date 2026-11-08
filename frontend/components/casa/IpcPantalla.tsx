'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { nombreMes } from '@/lib/casa/dinero';
import { claveDeMes, conVariacion, mesesFaltantes, parseIndice, type FilaIpc } from '@/lib/casa/ipc';
import { BotonPrincipal, CampoTexto, Hoja } from './ui';

const nombre = (clave: string) => nombreMes({ anio: Number(clave.slice(0, 4)), mes: Number(clave.slice(5, 7)) });
const mostrar = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

/** IPC por mes. Lo ven todos; lo carga solo la administración técnica (lo hace cumplir la base). */
export default function IpcPantalla() {
  const { cliente, persona } = useCasa();
  const [filas, setFilas] = useState<FilaIpc[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<{ mes: string; indice: string } | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const puedeCargar = persona?.rol === 'admin_tecnico';

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const { data, error: e } = await cliente.from('ipc').select('mes, indice');
    if (e) { setError('No se pudo cargar el IPC.'); return; }
    setError(null);
    setFilas(((data ?? []) as { mes: string; indice: number | string }[]).map((f) => ({ mes: f.mes, indice: Number(f.indice) })));
  }, [cliente]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  const lista = useMemo(() => conVariacion(filas), [filas]);
  const faltan = useMemo(() => mesesFaltantes(filas.map((f) => f.mes)), [filas]);

  const guardar = async (mes: string, indice: string) => {
    if (!cliente) return;
    const clave = claveDeMes(mes);
    const valor = parseIndice(indice);
    if (!clave) return setError('Elegí el mes.');
    if (valor === null) return setError('El índice no es válido. Usá coma para los decimales (por ejemplo 7012,5).');
    const r = await cliente.from('ipc').upsert({ mes: clave, indice: valor }, { onConflict: 'mes' });
    if (r.error) { setError('No se pudo guardar. Solo la administración técnica puede cargar el IPC.'); return; }
    setError(null);
    setAbierto(null);
    await cargar();
  };

  const borrar = async (mes: string) => {
    if (!cliente) return;
    const r = await cliente.from('ipc').delete().eq('mes', mes);
    if (r.error) setError('No se pudo borrar.');
    setBorrando(null);
    await cargar();
  };

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-casa-suave">
        Sirve para comparar meses en pesos de hoy y para el rendimiento real de las inversiones. Es un número por mes; el del mes anterior se publica a mitad de mes.
      </p>

      {error && <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-casa-suave">{cargando ? 'Cargando…' : `${filas.length} ${filas.length === 1 ? 'mes cargado' : 'meses cargados'}`}</p>
        {puedeCargar && (
          <button type="button" onClick={() => setAbierto({ mes: '', indice: '' })} className="flex items-center gap-1.5 rounded-xl bg-casa-acento px-3.5 py-2 text-sm font-bold text-casa-fondo"><Plus size={16} /> Cargar mes</button>
        )}
      </div>

      {!puedeCargar && !cargando && (
        <p className="rounded-xl border border-casa-borde bg-casa-panel p-3 text-xs text-casa-suave">Lo carga la administración técnica. Acá solo se consulta.</p>
      )}

      {faltan.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-casa-alerta/40 bg-casa-alerta/10 p-3 text-sm text-casa-alerta">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Faltan meses entre los cargados: <span className="capitalize">{faltan.map(nombre).join(', ')}</span>.</span>
        </p>
      )}

      {!cargando && lista.length === 0 && (
        <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">Todavía no hay índices cargados.</p>
      )}

      {lista.length > 0 && (
        <ul className="divide-y divide-casa-borde overflow-hidden rounded-2xl border border-casa-borde bg-casa-panel">
          {lista.map((f) => (
            <li key={f.mes} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                disabled={!puedeCargar}
                onClick={() => setAbierto({ mes: f.mes.slice(0, 7), indice: String(f.indice).replace('.', ',') })}
                className="flex flex-1 items-center justify-between text-left disabled:cursor-default"
              >
                <span className="text-sm capitalize text-casa-texto">{nombre(f.mes)}</span>
                <span className="text-right">
                  <span className="block text-sm font-semibold text-casa-texto">{mostrar(f.indice)}</span>
                  <span className="block text-xs text-casa-suave">{f.variacionPct === null ? '—' : `${f.variacionPct > 0 ? '+' : ''}${String(f.variacionPct).replace('.', ',')}% mensual`}</span>
                </span>
              </button>
              {puedeCargar && (
                <button type="button" aria-label="Borrar mes" onClick={() => (borrando === f.mes ? void borrar(f.mes) : setBorrando(f.mes))} className={`rounded-lg p-2 ${borrando === f.mes ? 'text-casa-error' : 'text-casa-suave'}`}><Trash2 size={16} /></button>
              )}
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <FormularioIpc inicial={abierto} alCerrar={() => { setAbierto(null); setError(null); }} alGuardar={guardar} />
      )}
    </div>
  );
}

function FormularioIpc({ inicial, alCerrar, alGuardar }: { inicial: { mes: string; indice: string }; alCerrar: () => void; alGuardar: (mes: string, indice: string) => Promise<void> }) {
  const [mes, setMes] = useState(inicial.mes);
  const [indice, setIndice] = useState(inicial.indice);
  return (
    <Hoja titulo={inicial.mes ? 'Corregir índice' : 'Cargar índice'} alCerrar={alCerrar}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-casa-suave">Mes</span>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-full rounded-xl border border-casa-borde bg-casa-fondo px-4 py-3 text-base text-casa-texto" />
        </label>
        <CampoTexto etiqueta="Índice (nivel general)" valor={indice} onChange={setIndice} placeholder="7012,5" />
        <p className="text-xs text-casa-suave">Usá coma para los decimales. Es el número del índice, no la variación.</p>
        <BotonPrincipal deshabilitado={!mes || !indice} onClick={() => void alGuardar(mes, indice)}>Guardar</BotonPrincipal>
      </div>
    </Hoja>
  );
}
