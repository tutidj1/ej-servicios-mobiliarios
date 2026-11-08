'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { formatearCentavos, mesDe, nombreMes } from '@/lib/casa/dinero';
import { coberturaDelMes, claveMes, type InstanciaHogar } from '@/lib/casa/cobertura';
import { comprometidoMensual, type Deuda } from '@/lib/casa/deudas';
import { asignadoA, confiabilidad, mesesDeDatos, pisoDeLaCasa, pisoPersonal, type GastoPiso, type OblPiso } from '@/lib/casa/piso';

type Obl = OblPiso & { id: string };

function Renglon({ etiqueta, monto, suave }: { etiqueta: string; monto: number; suave?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-2 text-sm ${suave ? 'text-casa-suave' : 'text-casa-texto'}`}>
      <span>{etiqueta}</span>
      <span className="font-semibold">{formatearCentavos(monto)}</span>
    </div>
  );
}

/** Pantalla principal: el piso de la casa (compartido) y, solo para vos, lo que no podés bajar. */
export default function PisoInicio() {
  const { cliente, persona } = useCasa();
  const [obls, setObls] = useState<Obl[]>([]);
  const [insts, setInsts] = useState<InstanciaHogar[]>([]);
  const [gastos, setGastos] = useState<GastoPiso[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [ipc, setIpc] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mes = useMemo(() => mesDe(new Date()), []);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const desde = new Date(mes.anio, mes.mes - 7, 1);
    const desdeISO = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}-01`;
    const [o, i, g, d, c] = await Promise.all([
      cliente.from('obligaciones').select('id, monto_estimado, recurrencia, hijo_id, responsable_id'),
      cliente.from('obligacion_instancias').select('obligacion_id, periodo, estado, monto_real, pagado_por, responsable_id').gte('periodo', desdeISO),
      cliente.from('gastos').select('monto, tipo, fecha, mes_ipc').gte('fecha', desdeISO).limit(5000),
      cliente.from('deudas').select('id, descripcion, tipo, monto_total, saldo, valor_cuota, cuotas_total, cuotas_pagas, tasa, mes_fin'),
      cliente.from('ipc').select('mes, indice'),
    ]);
    if (o.error || i.error || g.error || d.error) { setError('No se pudieron cargar los números.'); return; }
    setError(null);
    setObls((o.data ?? []) as Obl[]);
    setInsts((i.data ?? []) as InstanciaHogar[]);
    setGastos((g.data ?? []) as GastoPiso[]);
    setDeudas((d.data ?? []) as Deuda[]);
    setIpc(Object.fromEntries(((c.data ?? []) as { mes: string; indice: number | string }[]).map((r) => [r.mes, Number(r.indice)])));
  }, [cliente, mes]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  if (cargando) return <p className="text-sm text-casa-suave">Calculando…</p>;
  if (error) return <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>;

  // ---- Piso de la casa (compartido) ----
  const piso = pisoDeLaCasa(obls);
  const estimados = new Map(obls.map((o) => [o.id, o.monto_estimado]));
  const delMes = insts.filter((x) => x.periodo === claveMes(mes));
  const cob = coberturaDelMes(delMes, estimados);
  const pendientes = delMes.filter((x) => x.estado === 'pendiente').length;
  const pagadoTotal = cob.total - cob.pendiente;
  const meses = mesesDeDatos(insts.map((x) => x.periodo), mes);
  const conf = confiabilidad(meses);

  // ---- Solo para vos ----
  const personal = pisoPersonal(gastos, mes, ipc);
  const asignado = persona ? asignadoA(obls, persona.id) : 0;
  const cuotas = comprometidoMensual(deudas);

  return (
    <div className="space-y-8">
      {obls.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-casa-borde bg-casa-panel/50 px-6 py-12 text-center">
          <h2 className="mb-2 font-playfair text-xl text-casa-texto">Todavía no hay piso</h2>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-casa-suave">
            El piso se arma con las obligaciones de la casa. Cargalas en <strong>Obligaciones</strong> y acá aparece cuánto necesita la casa por mes.
          </p>
        </section>
      ) : (
        <section aria-label="Piso de la casa">
          <p className="text-sm text-casa-suave">La casa necesita</p>
          <p className="mt-1 font-playfair text-5xl text-casa-texto">{formatearCentavos(piso.total)}</p>
          <p className="mt-1 text-sm text-casa-suave">por mes</p>

          {cob.total > 0 && (
            <p className="mt-4 text-base text-casa-texto">
              Este mes va cubierta en un <strong>{Math.floor((pagadoTotal * 100) / cob.total)}%</strong>
              {pendientes > 0 ? `, con ${pendientes} ${pendientes === 1 ? 'obligación pendiente' : 'obligaciones pendientes'}` : ', sin obligaciones pendientes'}.
            </p>
          )}

          {conf !== 'buena' && (
            <p className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${conf === 'baja' ? 'border-casa-alerta/40 bg-casa-alerta/10 text-casa-alerta' : 'border-casa-borde bg-casa-panel text-casa-suave'}`}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Calculado con {meses} {meses === 1 ? 'mes' : 'meses'} de datos
                {conf === 'baja' ? ', todavía poco confiable. Necesita tres meses para ser utilizable y seis para ser bueno.' : '. Con seis meses de datos es bueno.'}
              </span>
            </p>
          )}

          <div className="mt-5 divide-y divide-casa-borde rounded-2xl border border-casa-borde bg-casa-panel px-4">
            <Renglon etiqueta="Obligaciones de la casa" monto={piso.obligaciones} />
            <Renglon etiqueta="Costo de los hijos (obligaciones a su nombre)" monto={piso.hijos} />
            <Renglon etiqueta="Provisión de gastos anuales (1/12 por mes)" monto={piso.anuales} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-casa-suave">
            Sale de los montos estimados de cada obligación. No tiene adentro ningún gasto personal, y por eso lo ven los dos.
            No incluye las transferencias a los hijos, que hoy son gastos personales de cada uno.
          </p>
        </section>
      )}

      {/* Privado */}
      <section aria-label="Lo que no podés bajar" className="rounded-3xl border border-casa-acento/30 bg-casa-acento/5 p-5">
        <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-casa-acento"><Lock size={14} /> Solo lo ves vos</p>
        <p className="font-playfair text-xl text-casa-texto">Lo que no podés bajar</p>

        {personal.mediana === null && asignado === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-casa-suave">
            Se calcula con las obligaciones que tenés a cargo y la mediana de tus gastos variables necesarios de los últimos seis meses cerrados.
            Todavía no hay datos para calcularlo.
          </p>
        ) : (
          <>
            <p className="mt-2 font-playfair text-4xl text-casa-texto">{formatearCentavos(asignado + (personal.mediana ?? 0))}</p>
            <p className="text-sm text-casa-suave">por mes</p>
            <div className="mt-4 divide-y divide-casa-borde/60">
              <Renglon etiqueta="Obligaciones que tenés a cargo" monto={asignado} />
              <Renglon etiqueta={personal.mediana === null ? 'Tu piso personal (sin meses cerrados todavía)' : `Tu piso personal (mediana de ${personal.meses} ${personal.meses === 1 ? 'mes' : 'meses'})`} monto={personal.mediana ?? 0} />
            </div>
            {personal.mediana !== null && (
              <p className="mt-3 text-xs text-casa-suave">
                {personal.ajustado && personal.mesReferencia
                  ? `En pesos de ${nombreMes({ anio: Number(personal.mesReferencia.slice(0, 4)), mes: Number(personal.mesReferencia.slice(5, 7)) })}, ajustado por IPC.`
                  : 'En pesos de cada mes, sin ajustar por inflación (falta cargar el IPC de algún mes).'}
                {personal.meses < 3 ? ' Calculado con pocos meses de datos: todavía poco confiable.' : ''}
              </p>
            )}
            {cuotas > 0 && (
              <p className="mt-3 text-xs text-casa-suave">Aparte, tenés {formatearCentavos(cuotas)} por mes comprometidos en cuotas (ver Deudas).</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
