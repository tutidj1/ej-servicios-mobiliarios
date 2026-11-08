'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCasa } from '@/lib/casa/sesion';
import { diaCorto, formatearCentavos, mesDe, nombreMes, rangoMes, sumarCentavos } from '@/lib/casa/dinero';
import { recibidoYQueda, type Transferencia } from '@/lib/casa/transferencias';

/** Para hijos y administración técnica: lo que me transfirieron y mis propios gastos. Nada más. */
export default function RecibidoInicio() {
  const { cliente } = useCasa();
  const [trans, setTrans] = useState<Transferencia[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [gastado, setGastado] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mes = useMemo(() => mesDe(new Date()), []);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const { desde, hasta } = rangoMes(mes);
    const [t, g, p] = await Promise.all([
      cliente.from('transferencias_hijos').select('id, hijo_id, pagador_id, monto, fecha, nota').gte('fecha', desde).lt('fecha', hasta).order('fecha', { ascending: false }),
      cliente.from('gastos').select('monto').gte('fecha', desde).lt('fecha', hasta).limit(5000),
      cliente.from('personas').select('id, nombre'),
    ]);
    if (t.error || g.error) { setError('No se pudieron cargar tus números.'); return; }
    setError(null);
    setTrans((t.data ?? []) as Transferencia[]);
    setGastado(sumarCentavos(((g.data ?? []) as { monto: number }[]).map((x) => x.monto)));
    setNombres(Object.fromEntries(((p.data ?? []) as { id: string; nombre: string }[]).map((x) => [x.id, x.nombre])));
  }, [cliente, mes]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  if (cargando) return <p className="text-sm text-casa-suave">Calculando…</p>;
  if (error) return <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>;

  const recibido = sumarCentavos(trans.map((t) => t.monto));
  const r = recibidoYQueda(recibido, gastado);

  return (
    <div className="space-y-6">
      <section aria-label="Lo que me transfirieron">
        <p className="text-sm capitalize text-casa-suave">{nombreMes(mes)}</p>
        {recibido === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">Este mes todavía no te transfirieron nada.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-casa-suave">Te transfirieron</p>
            <p className="mt-1 font-playfair text-5xl text-casa-texto">{formatearCentavos(recibido)}</p>
            <p className="mt-4 text-base text-casa-texto">
              {r.queda >= 0
                ? <>Te quedan <strong>{formatearCentavos(r.queda)}</strong> de lo que te transfirieron este mes.</>
                : <>Gastaste <strong>{formatearCentavos(-r.queda)}</strong> más de lo que te transfirieron este mes.</>}
            </p>
            <p className="mt-1 text-xs text-casa-suave">Gastaste {formatearCentavos(r.gastado)} en el mes (lo que cargaste en Gastos).</p>

            <ul className="mt-5 divide-y divide-casa-borde overflow-hidden rounded-2xl border border-casa-borde bg-casa-panel">
              {trans.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="w-12 shrink-0 text-xs text-casa-suave">{diaCorto(t.fecha)}</span>
                  <span className="min-w-0 flex-1 truncate text-casa-texto">De {nombres[t.pagador_id] ?? 'un adulto'}{t.nota ? ` · ${t.nota}` : ''}</span>
                  <span className="font-semibold text-casa-texto">{formatearCentavos(t.monto)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <p className="text-xs leading-relaxed text-casa-suave">
        Acá ves lo que te transfirieron y tus propios gastos. Lo demás de la casa es de los adultos.
      </p>
    </div>
  );
}
