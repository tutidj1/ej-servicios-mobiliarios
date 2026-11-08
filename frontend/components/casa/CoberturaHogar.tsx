'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { digitosACentavos, fechaLocalISO, formatearCentavos, mesDe, nombreMes } from '@/lib/casa/dinero';
import {
  claveMes, coberturaDelMes, pagadoPorMes, saldosEntreAdultos, ultimosMeses, type InstanciaHogar, type Liquidacion, type Saldo,
} from '@/lib/casa/cobertura';
import { BotonPrincipal, CampoDigitos, Hoja } from './ui';

type Miembro = { id: string; nombre: string; hogar_id: string };
type Obl = { id: string; concepto: string; monto_estimado: number };
type LiquidacionFila = Liquidacion & { id: string; fecha: string };

const COLORES = ['#2DD4BF', '#F59E0B', '#60A5FA', '#C084FC'];

/** Cobertura del mes (un anillo), saldos entre los adultos con "saldar", e historial de seis meses. */
export default function CoberturaHogar() {
  const { cliente, persona } = useCasa();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [obls, setObls] = useState<Obl[]>([]);
  const [insts, setInsts] = useState<InstanciaHogar[]>([]);
  const [liqs, setLiqs] = useState<LiquidacionFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saldando, setSaldando] = useState<Saldo | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const mesActual = useMemo(() => mesDe(new Date()), []);
  const hogarId = miembros.find((m) => m.id === persona?.id)?.hogar_id ?? null;

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const [p, o, i, l] = await Promise.all([
      cliente.from('personas').select('id, nombre, hogar_id').order('nombre'),
      cliente.from('obligaciones').select('id, concepto, monto_estimado'),
      cliente.from('obligacion_instancias').select('obligacion_id, periodo, estado, monto_real, pagado_por, responsable_id').limit(5000),
      cliente.from('liquidaciones').select('id, pagador_id, receptor_id, monto, fecha').order('fecha', { ascending: false }).limit(200),
    ]);
    if (p.error || o.error || i.error || l.error) { setError('No se pudo cargar la cobertura.'); return; }
    setError(null);
    setMiembros((p.data ?? []) as Miembro[]);
    setObls((o.data ?? []) as Obl[]);
    setInsts((i.data ?? []) as InstanciaHogar[]);
    setLiqs((l.data ?? []) as LiquidacionFila[]);
  }, [cliente]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  const color = (id: string) => COLORES[Math.max(0, miembros.findIndex((m) => m.id === id)) % COLORES.length];
  const nombre = (id: string) => miembros.find((m) => m.id === id)?.nombre ?? 'Alguien';
  const estimados = useMemo(() => new Map(obls.map((o) => [o.id, o.monto_estimado])), [obls]);
  const delMes = insts.filter((i) => i.periodo === claveMes(mesActual));
  const cob = coberturaDelMes(delMes, estimados);
  const saldos = saldosEntreAdultos(insts, estimados, liqs);
  const meses = ultimosMeses(mesActual, 6);
  const historial = pagadoPorMes(insts, estimados, meses);
  const pagadoTotal = cob.total - cob.pendiente;

  const saldar = async (s: Saldo, centavos: number) => {
    if (!cliente || !hogarId) return;
    const r = await cliente.from('liquidaciones').insert({ hogar_id: hogarId, pagador_id: s.deudor, receptor_id: s.acreedor, monto: centavos, fecha: fechaLocalISO(new Date()) });
    if (r.error) { setError('No se pudo registrar la transferencia.'); return; }
    setSaldando(null);
    await cargar();
  };

  const borrarLiquidacion = async (id: string) => {
    if (!cliente) return;
    const r = await cliente.from('liquidaciones').delete().eq('id', id);
    if (r.error) setError('No se pudo borrar.');
    setBorrando(null);
    await cargar();
  };

  // Anillo
  const R = 52, C = 2 * Math.PI * R;
  let acumulado = 0;

  if (cargando) return <p className="text-sm text-casa-suave">Cargando…</p>;

  return (
    <div className="space-y-8">
      {error && <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>}

      {/* Cobertura del mes */}
      <section aria-label="Cobertura del mes">
        <p className="mb-3 font-playfair text-lg text-casa-texto">Quién cubrió <span className="capitalize">{nombreMes(mesActual)}</span></p>
        {cob.total === 0 ? (
          <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">Este mes no hay obligaciones cargadas.</p>
        ) : (
          <div className="flex items-center gap-6 rounded-2xl border border-casa-borde bg-casa-panel p-5">
            <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label={`${Math.floor((pagadoTotal * 100) / cob.total)}% de la casa cubierto`}>
              <circle cx="70" cy="70" r={R} fill="none" stroke="#1B3231" strokeWidth="16" />
              {cob.porPersona.map((p) => {
                const largo = (p.monto / cob.total) * C;
                const seg = (
                  <circle key={p.id} cx="70" cy="70" r={R} fill="none" stroke={color(p.id)} strokeWidth="16"
                    strokeDasharray={`${largo} ${C - largo}`} strokeDashoffset={-acumulado} />
                );
                acumulado += largo;
                return seg;
              })}
              <text x="70" y="70" textAnchor="middle" dominantBaseline="central" transform="rotate(90 70 70)" className="fill-casa-texto text-[26px] font-semibold">
                {Math.floor((pagadoTotal * 100) / cob.total)}%
              </text>
            </svg>
            <ul className="min-w-0 flex-1 space-y-2.5 text-sm">
              {cob.porPersona.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color(p.id) }} />
                  <span className="min-w-0 flex-1 truncate text-casa-texto">{nombre(p.id)}</span>
                  <span className="text-casa-suave">{p.porcentaje}%</span>
                </li>
              ))}
              {cob.pendiente > 0 && (
                <li className="flex items-center gap-2 text-casa-suave">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-casa-panel-2 ring-1 ring-casa-borde" />
                  <span className="flex-1">Pendiente</span>
                  <span>{formatearCentavos(cob.pendiente)}</span>
                </li>
              )}
            </ul>
          </div>
        )}
        {cob.total > 0 && (
          <p className="mt-2 text-xs text-casa-suave">
            Cubierto {formatearCentavos(pagadoTotal)} de {formatearCentavos(cob.total)}. Es lo que cada uno pagó; no hay una cuenta de lo que "le tocaba".
          </p>
        )}
      </section>

      {/* Saldos */}
      <section aria-label="Saldos entre ustedes">
        <p className="mb-3 font-playfair text-lg text-casa-texto">Saldar entre ustedes</p>
        {saldos.length === 0 ? (
          <p className="rounded-2xl border border-casa-borde bg-casa-panel px-4 py-4 text-sm text-casa-suave">No hay saldos pendientes. Cuando uno paga algo que se hacía cargo el otro, aparece acá.</p>
        ) : (
          <ul className="space-y-3">
            {saldos.map((s) => (
              <li key={`${s.deudor}-${s.acreedor}`} className="flex items-center justify-between gap-3 rounded-2xl border border-casa-borde bg-casa-panel p-4">
                <p className="text-sm text-casa-texto">{nombre(s.deudor)} le debe <strong>{formatearCentavos(s.monto)}</strong> a {nombre(s.acreedor)}</p>
                <button type="button" onClick={() => setSaldando(s)} className="shrink-0 rounded-xl bg-casa-acento px-3.5 py-2 text-sm font-bold text-casa-fondo">Saldar</button>
              </li>
            ))}
          </ul>
        )}
        {liqs.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs uppercase tracking-wider text-casa-suave">Últimas transferencias</p>
            <ul className="divide-y divide-casa-borde overflow-hidden rounded-2xl border border-casa-borde bg-casa-panel">
              {liqs.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-casa-texto">{nombre(l.pagador_id)} → {nombre(l.receptor_id)}</span>
                  <span className="text-casa-suave">{formatearCentavos(l.monto)}</span>
                  <button type="button" aria-label="Borrar transferencia" onClick={() => (borrando === l.id ? void borrarLiquidacion(l.id) : setBorrando(l.id))} className={`rounded-lg p-2 ${borrando === l.id ? 'text-casa-error' : 'text-casa-suave'}`}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Historial */}
      <section aria-label="Historial de seis meses">
        <p className="mb-1 font-playfair text-lg text-casa-texto">Últimos seis meses</p>
        <p className="mb-3 text-xs text-casa-suave">Quién pagó cada cosa. Sirve de base para volver a hablar el acuerdo cuando cambia la estación o el ingreso del negocio; la app no opina.</p>

        <ul className="mb-5 space-y-2">
          {[...historial].reverse().map((h) => (
            <li key={claveMes(h.mes)} className="rounded-2xl border border-casa-borde bg-casa-panel p-3">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="capitalize text-casa-texto">{nombreMes(h.mes)}</span>
                <span className="text-casa-suave">{formatearCentavos(h.total)}</span>
              </div>
              {h.total > 0 ? (
                <>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-casa-panel-2">
                    {Array.from(h.porPersona.entries()).map(([id, monto]) => (
                      <span key={id} style={{ width: `${(monto * 100) / h.total}%`, background: color(id) }} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-casa-suave">
                    {Array.from(h.porPersona.entries()).map(([id, monto]) => `${nombre(id)} ${formatearCentavos(monto)}`).join(' · ')}
                  </p>
                </>
              ) : <p className="text-xs text-casa-suave">Sin pagos registrados.</p>}
            </li>
          ))}
        </ul>

        <MatrizHistorial obls={obls} insts={insts} meses={meses} nombre={nombre} />
      </section>

      {saldando && (
        <FormularioSaldar saldo={saldando} nombre={nombre} alCerrar={() => setSaldando(null)} alGuardar={saldar} />
      )}
    </div>
  );
}

function MatrizHistorial({ obls, insts, meses, nombre }: { obls: Obl[]; insts: InstanciaHogar[]; meses: ReturnType<typeof ultimosMeses>; nombre: (id: string) => string }) {
  const claves = meses.map(claveMes);
  const filas = obls.filter((o) => insts.some((i) => i.obligacion_id === o.id && claves.includes(i.periodo))).sort((a, b) => a.concepto.localeCompare(b.concepto));
  if (filas.length === 0) return null;
  const inicial = (id: string | null) => (id ? nombre(id).charAt(0).toUpperCase() : '?');
  const pagadores = Array.from(new Set(insts.filter((i) => claves.includes(i.periodo) && i.pagado_por).map((i) => i.pagado_por as string)));
  return (
    <div className="overflow-x-auto rounded-2xl border border-casa-borde bg-casa-panel p-3">
      <table className="w-full min-w-[22rem] text-xs">
        <thead>
          <tr className="text-casa-suave">
            <th className="pb-2 text-left font-semibold">Obligación</th>
            {meses.map((m) => <th key={claveMes(m)} className="pb-2 text-center font-semibold capitalize">{nombreMes(m).slice(0, 3)}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((o) => (
            <tr key={o.id} className="border-t border-casa-borde">
              <td className="max-w-[7rem] truncate py-2 pr-2 text-casa-texto">{o.concepto}</td>
              {claves.map((c) => {
                const i = insts.find((x) => x.obligacion_id === o.id && x.periodo === c);
                return (
                  <td key={c} className="py-2 text-center">
                    {!i ? <span className="text-casa-suave/40">–</span>
                      : i.estado === 'pagado' ? <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-casa-acento/20 font-bold text-casa-acento" title={nombre(i.pagado_por ?? '')}>{inicial(i.pagado_por)}</span>
                      : <span className="text-casa-alerta" title="Pendiente">·</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[0.7rem] text-casa-suave">
        La letra es quien pagó{pagadores.length ? ` (${pagadores.map((id) => `${inicial(id)} = ${nombre(id)}`).join(', ')})` : ''}. El punto es pendiente; el guion, que ese mes no tocaba.
      </p>
    </div>
  );
}

function FormularioSaldar({ saldo, nombre, alCerrar, alGuardar }: { saldo: Saldo; nombre: (id: string) => string; alCerrar: () => void; alGuardar: (s: Saldo, c: number) => Promise<void> }) {
  const [monto, setMonto] = useState(String(Math.round(saldo.monto / 100)));
  const centavos = digitosACentavos(monto);
  return (
    <Hoja titulo="Saldar" alCerrar={alCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-casa-suave">{nombre(saldo.deudor)} le transfirió a {nombre(saldo.acreedor)}. Cuando se anota, el saldo baja; si es todo, vuelve a cero.</p>
        <CampoDigitos etiqueta="Monto transferido" valor={monto} onChange={setMonto} ayuda={`Saldo actual: ${formatearCentavos(saldo.monto)}`} />
        <BotonPrincipal deshabilitado={centavos === null} onClick={() => centavos !== null && void alGuardar(saldo, centavos)}>Registrar transferencia</BotonPrincipal>
      </div>
    </Hoja>
  );
}
