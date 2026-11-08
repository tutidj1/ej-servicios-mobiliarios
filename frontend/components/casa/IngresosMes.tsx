'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { digitosACentavos, diaCorto, fechaLocalISO, formatearCentavos, nombreMes, rangoMes, sumarCentavos, type Mes } from '@/lib/casa/dinero';
import { BotonPrincipal, CampoDigitos, Chips, Hoja } from './ui';

type Ingreso = { id: string; monto: number; fecha: string; esperado_o_real: 'esperado' | 'real'; transferencia_id: string | null };

/** Lo que entró en el mes. Privado: lo ve solo su dueño. */
export default function IngresosMes({ mes }: { mes: Mes }) {
  const { cliente, persona } = useCasa();
  const [filas, setFilas] = useState<Ingreso[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState('');
  const [estado, setEstado] = useState<'real' | 'esperado'>('real');
  const [borrando, setBorrando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const { desde, hasta } = rangoMes(mes);
    const { data, error: e } = await cliente.from('ingresos').select('id, monto, fecha, esperado_o_real, transferencia_id').gte('fecha', desde).lt('fecha', hasta).order('fecha', { ascending: false });
    if (e) { setError('No se pudieron cargar tus ingresos.'); return; }
    setError(null);
    setFilas((data ?? []) as Ingreso[]);
  }, [cliente, mes]);

  useEffect(() => { void cargar(); }, [cargar]);

  const guardar = async () => {
    const c = digitosACentavos(monto);
    if (!cliente || !persona || c === null) return;
    const r = await cliente.from('ingresos').insert({ persona_id: persona.id, monto: c, fecha: fechaLocalISO(new Date()), esperado_o_real: estado });
    if (r.error) { setError('No se pudo guardar el ingreso.'); return; }
    setMonto(''); setAbierto(false);
    await cargar();
  };

  const borrar = async (id: string) => {
    if (!cliente) return;
    const r = await cliente.from('ingresos').delete().eq('id', id);
    if (r.error) setError('No se pudo borrar.');
    setBorrando(null);
    await cargar();
  };

  const reales = sumarCentavos(filas.filter((f) => f.esperado_o_real === 'real').map((f) => f.monto));
  const esperados = sumarCentavos(filas.filter((f) => f.esperado_o_real === 'esperado').map((f) => f.monto));

  return (
    <section aria-label="Ingresos del mes" className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-playfair text-lg text-casa-texto">Ingresos de <span className="capitalize">{nombreMes(mes)}</span></p>
          <p className="text-sm text-casa-suave">
            Cobrado {formatearCentavos(reales)}{esperados > 0 ? ` · esperado ${formatearCentavos(esperados)}` : ''}
          </p>
        </div>
        <button type="button" onClick={() => setAbierto(true)} className="flex items-center gap-1.5 rounded-xl bg-casa-panel-2 px-3.5 py-2 text-sm font-bold text-casa-acento"><Plus size={16} /> Ingreso</button>
      </div>
      {error && <p className="mb-2 text-sm text-casa-error" role="alert">{error}</p>}
      {filas.length > 0 && (
        <ul className="divide-y divide-casa-borde overflow-hidden rounded-2xl border border-casa-borde bg-casa-panel">
          {filas.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-12 shrink-0 text-xs text-casa-suave">{diaCorto(f.fecha)}</span>
              <span className="flex-1 text-sm text-casa-texto">{f.transferencia_id ? 'Transferencia confirmada' : f.esperado_o_real === 'real' ? 'Cobrado' : 'Esperado'}</span>
              <span className="text-sm font-semibold text-casa-texto">{formatearCentavos(f.monto)}</span>
              {!f.transferencia_id && <button type="button" aria-label="Borrar ingreso" onClick={() => (borrando === f.id ? void borrar(f.id) : setBorrando(f.id))} className={`rounded-lg p-2 ${borrando === f.id ? 'text-casa-error' : 'text-casa-suave'}`}><Trash2 size={16} /></button>}
            </li>
          ))}
        </ul>
      )}
      {abierto && (
        <Hoja titulo="Nuevo ingreso" alCerrar={() => setAbierto(false)}>
          <div className="space-y-4">
            <CampoDigitos etiqueta="Monto" valor={monto} onChange={setMonto} />
            <Chips<'real' | 'esperado'> opciones={[{ valor: 'real', etiqueta: 'Ya lo cobré' }, { valor: 'esperado', etiqueta: 'Lo espero' }]} valor={estado} onChange={setEstado} />
            <BotonPrincipal deshabilitado={digitosACentavos(monto) === null} onClick={() => void guardar()}>Guardar</BotonPrincipal>
          </div>
        </Hoja>
      )}
    </section>
  );
}
