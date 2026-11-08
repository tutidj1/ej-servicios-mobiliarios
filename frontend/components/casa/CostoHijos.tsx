'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { diaCorto, digitosACentavos, fechaLocalISO, formatearCentavos, mesDe, nombreMes, rangoMes } from '@/lib/casa/dinero';
import { costoPorHijo, type HijoFila, type OblHijo, type Transferencia } from '@/lib/casa/transferencias';
import { BotonPrincipal, CampoDigitos, CampoTexto, Chips, Hoja } from './ui';

type Persona = { id: string; nombre: string; hogar_id: string };

/** Solo adultos: costo de cada hijo del mes (uso personal + obligaciones a su nombre) y carga de transferencias. */
export default function CostoHijos() {
  const { cliente, persona } = useCasa();
  const [hijos, setHijos] = useState<HijoFila[]>([]);
  const [trans, setTrans] = useState<Transferencia[]>([]);
  const [obls, setObls] = useState<OblHijo[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);
  const mes = useMemo(() => mesDe(new Date()), []);
  const hogarId = personas.find((p) => p.id === persona?.id)?.hogar_id ?? null;
  const nombre = (id: string) => personas.find((p) => p.id === id)?.nombre ?? 'Alguien';

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const { desde, hasta } = rangoMes(mes);
    const [h, t, o, p, c] = await Promise.all([
      cliente.from('hijos').select('id, nombre, persona_id').order('nombre'),
      cliente.from('transferencias_hijos').select('id, hijo_id, pagador_id, monto, fecha, nota').gte('fecha', desde).lt('fecha', hasta).order('fecha', { ascending: false }),
      cliente.from('obligaciones').select('id, concepto, monto_estimado, recurrencia, hijo_id').not('hijo_id', 'is', null),
      cliente.from('personas').select('id, nombre, hogar_id'),
      cliente.from('categorias').select('id').eq('nombre', 'Transferencias a los hijos').maybeSingle(),
    ]);
    if (h.error || t.error || o.error || p.error) { setError('No se pudo cargar el costo de los hijos.'); return; }
    setError(null);
    setHijos((h.data ?? []) as HijoFila[]);
    setTrans((t.data ?? []) as Transferencia[]);
    setObls((o.data ?? []) as OblHijo[]);
    setPersonas((p.data ?? []) as Persona[]);
    setCategoriaId((c.data as { id: string } | null)?.id ?? null);
  }, [cliente, mes]);

  useEffect(() => { void cargar(); }, [cargar]);

  const registrar = async (hijo: HijoFila, centavos: number, nota: string) => {
    if (!cliente || !persona || !hogarId) return;
    const fecha = fechaLocalISO(new Date());
    const t = await cliente.from('transferencias_hijos')
      .insert({ hogar_id: hogarId, hijo_id: hijo.id, pagador_id: persona.id, monto: centavos, fecha, nota })
      .select('id').single();
    if (t.error || !t.data) { setError('No se pudo registrar la transferencia.'); return; }
    // También es un gasto personal de quien la hizo (sin cargarla dos veces)
    if (categoriaId) {
      const g = await cliente.from('gastos').insert({
        persona_id: persona.id, monto: centavos, categoria_id: categoriaId, tipo: 'variable_necesario', fecha,
        descripcion: `Transferencia a ${hijo.nombre}`, origen: 'web', transferencia_id: t.data.id,
      });
      if (g.error) {
        await cliente.from('transferencias_hijos').delete().eq('id', t.data.id);
        setError('No se pudo registrar la transferencia como gasto tuyo. No se guardó nada.');
        return;
      }
    }
    setAbierto(false);
    await cargar();
  };

  const borrar = async (id: string) => {
    if (!cliente) return;
    const r = await cliente.from('transferencias_hijos').delete().eq('id', id); // el gasto asociado se borra solo
    if (r.error) setError('No se pudo borrar.');
    setBorrando(null);
    await cargar();
  };

  const costos = costoPorHijo(hijos, trans, obls);
  const mias = trans.filter((t) => t.pagador_id === persona?.id);

  return (
    <section aria-label="Costo de los hijos" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-playfair text-lg text-casa-texto">Los hijos este mes</p>
          <p className="text-xs capitalize text-casa-suave">{nombreMes(mes)}</p>
        </div>
        {hijos.length > 0 && (
          <button type="button" onClick={() => setAbierto(true)} className="flex items-center gap-1.5 rounded-xl bg-casa-acento px-3.5 py-2 text-sm font-bold text-casa-fondo"><Plus size={16} /> Transferencia</button>
        )}
      </div>

      {error && <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>}

      {hijos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-6 text-center text-sm text-casa-suave">Todavía no hay hijos cargados en la casa.</p>
      ) : (
        <ul className="space-y-3">
          {costos.map((c) => (
            <li key={c.hijo.id} className="rounded-2xl border border-casa-borde bg-casa-panel p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-sm font-semibold text-casa-texto">{c.hijo.nombre}</p>
                <p className="text-sm text-casa-suave">Total {formatearCentavos(c.total)}</p>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between text-casa-texto"><span>Uso personal (transferencias)</span><span className="font-semibold">{formatearCentavos(c.usoPersonal)}</span></div>
                  {c.porAdulto.length > 0 && (
                    <p className="mt-0.5 text-xs text-casa-suave">{c.porAdulto.map((a) => `${nombre(a.id)} ${formatearCentavos(a.monto)}`).join(' · ')}</p>
                  )}
                </div>
                <div>
                  <div className="flex justify-between text-casa-texto"><span>Obligaciones a su nombre</span><span className="font-semibold">{formatearCentavos(c.totalObligaciones)}</span></div>
                  {c.obligaciones.length > 0 && (
                    <p className="mt-0.5 text-xs text-casa-suave">{c.obligaciones.map((o) => `${o.concepto} ${formatearCentavos(o.mensual)}`).join(' · ')}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mias.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-casa-suave">Tus transferencias del mes</p>
          <ul className="divide-y divide-casa-borde overflow-hidden rounded-2xl border border-casa-borde bg-casa-panel">
            {mias.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="w-12 shrink-0 text-xs text-casa-suave">{diaCorto(t.fecha)}</span>
                <span className="min-w-0 flex-1 truncate text-casa-texto">{hijos.find((h) => h.id === t.hijo_id)?.nombre}{t.nota ? ` · ${t.nota}` : ''}</span>
                <span className="font-semibold text-casa-texto">{formatearCentavos(t.monto)}</span>
                <button type="button" aria-label="Borrar transferencia" onClick={() => (borrando === t.id ? void borrar(t.id) : setBorrando(t.id))} className={`rounded-lg p-2 ${borrando === t.id ? 'text-casa-error' : 'text-casa-suave'}`}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs leading-relaxed text-casa-suave">
        Las transferencias las ven los dos adultos, con quién las hizo. Cada hijo ve solo las suyas. Lo demás de tus gastos sigue siendo privado.
      </p>

      {abierto && <FormularioTransferencia hijos={hijos} alCerrar={() => setAbierto(false)} alGuardar={registrar} />}
    </section>
  );
}

function FormularioTransferencia({ hijos, alCerrar, alGuardar }: { hijos: HijoFila[]; alCerrar: () => void; alGuardar: (h: HijoFila, c: number, nota: string) => Promise<void> }) {
  const [hijoId, setHijoId] = useState(hijos[0]?.id ?? '');
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const centavos = digitosACentavos(monto);
  const hijo = hijos.find((h) => h.id === hijoId);
  return (
    <Hoja titulo="Transferencia a un hijo" alCerrar={alCerrar}>
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">A quién</p>
          <Chips<string> opciones={hijos.map((h) => ({ valor: h.id, etiqueta: h.nombre }))} valor={hijoId} onChange={setHijoId} />
        </div>
        <CampoDigitos etiqueta="Monto que le transferiste vos" valor={monto} onChange={setMonto} ayuda="Es lo que pusiste vos. Lo que pone el otro adulto lo carga él." />
        <CampoTexto etiqueta="Nota (opcional)" valor={nota} onChange={setNota} placeholder="Salida, ropa…" />
        <BotonPrincipal deshabilitado={centavos === null || !hijo} onClick={() => centavos !== null && hijo && void alGuardar(hijo, centavos, nota.trim())}>Registrar</BotonPrincipal>
      </div>
    </Hoja>
  );
}
