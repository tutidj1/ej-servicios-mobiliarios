'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import {
  digitosACentavos, fechaLocalISO, formatearCentavos, haceDias, mesDe, nombreMes,
} from '@/lib/casa/dinero';
import {
  claveMes, comprometidoMensual, cuotasRestantes, liberaciones, mesFinCronograma, parseTasaMensual, porcentajePagado,
  proyeccionCuotas, ritmoSinCronograma, simularDeuda, ultimaCuota, type Deuda, type PagoDeuda, type TipoDeuda,
} from '@/lib/casa/deudas';
import { Barra, BotonPrincipal, CampoDigitos, CampoTexto, Chips, Hoja } from './ui';

const COLUMNAS = 'id, descripcion, tipo, monto_total, saldo, valor_cuota, cuotas_total, cuotas_pagas, tasa, mes_fin';

export default function DeudasPantalla() {
  const { cliente, persona } = useCasa();
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [pagos, setPagos] = useState<PagoDeuda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [pagando, setPagando] = useState<Deuda | null>(null);
  const [detalle, setDetalle] = useState<Deuda | null>(null);

  const hoy = useMemo(() => new Date(), []);
  const mesHoy = mesDe(hoy);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const desde = fechaLocalISO(haceDias(new Date(), 90));
    const [d, p] = await Promise.all([
      cliente.from('deudas').select(COLUMNAS).order('descripcion'),
      cliente.from('deuda_pagos').select('deuda_id, monto, fecha').gte('fecha', desde),
    ]);
    if (d.error || p.error) { setError('No se pudieron cargar tus deudas.'); return; }
    setError(null);
    setDeudas((d.data ?? []) as Deuda[]);
    setPagos((p.data ?? []) as PagoDeuda[]);
  }, [cliente]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  const activas = deudas.filter((d) => d.saldo > 0);
  const comprometido = comprometidoMensual(deudas);
  const ultima = ultimaCuota(deudas, mesHoy);
  const proy = proyeccionCuotas(deudas, mesHoy, 12);
  const libera = liberaciones(proy);
  const maxProy = Math.max(...proy.map((p) => p.monto), 1);

  const pagarCuota = async (d: Deuda) => {
    if (!cliente || d.valor_cuota === null) return;
    const pagas = (d.cuotas_pagas ?? 0) + 1;
    const saldo = Math.max(d.saldo - d.valor_cuota, 0);
    const fin = mesFinCronograma(mesHoy, Math.max((d.cuotas_total ?? 0) - pagas, 0));
    const ins = await cliente.from('deuda_pagos').insert({ deuda_id: d.id, monto: d.valor_cuota, fecha: fechaLocalISO(new Date()), es_minimo: true });
    if (ins.error) { setError('No se pudo registrar el pago.'); return; }
    const upd = await cliente.from('deudas').update({ cuotas_pagas: pagas, saldo, mes_fin: fin ? claveMes(fin) : null }).eq('id', d.id);
    if (upd.error) setError('El pago se registró pero no se pudo actualizar la deuda. Avisale a Tomás.');
    setDetalle(null);
    await cargar();
  };

  const pagarSaldo = async (d: Deuda, centavos: number, esMinimo: boolean) => {
    if (!cliente) return;
    const ins = await cliente.from('deuda_pagos').insert({ deuda_id: d.id, monto: centavos, fecha: fechaLocalISO(new Date()), es_minimo: esMinimo });
    if (ins.error) { setError('No se pudo registrar el pago.'); return; }
    const upd = await cliente.from('deudas').update({ saldo: Math.max(d.saldo - centavos, 0) }).eq('id', d.id);
    if (upd.error) setError('El pago se registró pero no se pudo actualizar el saldo. Avisale a Tomás.');
    setPagando(null);
    await cargar();
  };

  const guardarTasa = async (d: Deuda, tasa: number | null) => {
    if (!cliente) return;
    const r = await cliente.from('deudas').update({ tasa }).eq('id', d.id);
    if (r.error) { setError('No se pudo guardar la tasa.'); return; }
    await cargar();
    setDetalle((x) => (x && x.id === d.id ? { ...x, tasa } : x));
  };

  const borrar = async (d: Deuda) => {
    if (!cliente) return;
    const r = await cliente.from('deudas').delete().eq('id', d.id);
    if (r.error) setError('No se pudo borrar.');
    setDetalle(null);
    await cargar();
  };

  const crear = async (n: NuevaDeuda) => {
    if (!cliente || !persona) return;
    const r = await cliente.from('deudas').insert({ persona_id: persona.id, ...n });
    if (r.error) { setError('No se pudo guardar la deuda.'); return; }
    setAgregando(false);
    await cargar();
  };

  return (
    <div className="space-y-6">
      {/* Los dos números que no existen en ningún otro lado */}
      <section className="grid grid-cols-2 gap-3" aria-label="Resumen de cuotas">
        <div className="rounded-2xl border border-casa-borde bg-casa-panel p-4">
          <p className="text-xs uppercase tracking-wider text-casa-suave">Comprometido por mes en cuotas</p>
          <p className="mt-2 font-playfair text-2xl text-casa-texto">{formatearCentavos(comprometido)}</p>
        </div>
        <div className="rounded-2xl border border-casa-borde bg-casa-panel p-4">
          <p className="text-xs uppercase tracking-wider text-casa-suave">Cae la última cuota</p>
          <p className="mt-2 font-playfair text-2xl capitalize text-casa-texto">{ultima ? nombreMes(ultima) : '—'}</p>
        </div>
      </section>

      {proy[0]?.monto > 0 && (
        <section aria-label="Cómo baja el compromiso" className="rounded-2xl border border-casa-borde bg-casa-panel p-4">
          <p className="mb-3 text-xs uppercase tracking-wider text-casa-suave">Cuotas por mes, próximos 12 meses</p>
          <ul className="space-y-1.5">
            {proy.map((p) => (
              <li key={`${p.mes.anio}-${p.mes.mes}`} className="flex items-center gap-3 text-xs">
                <span className="w-20 shrink-0 capitalize text-casa-suave">{nombreMes(p.mes).replace(/ \d{4}$/, '')}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-casa-panel-2">
                  <span className="block h-full rounded-full bg-casa-acento" style={{ width: `${(p.monto * 100) / maxProy}%` }} />
                </span>
                <span className="w-24 shrink-0 text-right text-casa-texto">{formatearCentavos(p.monto)}</span>
              </li>
            ))}
          </ul>
          {libera.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-casa-borde pt-3 text-sm text-casa-texto">
              {libera.map((l) => (
                <li key={`${l.mes.anio}-${l.mes.mes}`}>En <span className="capitalize">{nombreMes(l.mes)}</span> se liberan {formatearCentavos(l.libera)} de cuotas.</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {error && <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>}

      <section aria-label="Deudas y cuotas">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-casa-suave">{cargando ? 'Cargando…' : `${activas.length} ${activas.length === 1 ? 'activa' : 'activas'}`}</p>
          <button type="button" onClick={() => setAgregando(true)} className="flex items-center gap-1.5 rounded-xl bg-casa-acento px-3.5 py-2 text-sm font-bold text-casa-fondo">
            <Plus size={16} /> Agregar
          </button>
        </div>

        {!cargando && deudas.length === 0 && (
          <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">
            Todavía no cargaste deudas ni cuotas. Es privado: lo ves solo vos.
          </p>
        )}

        <ul className="space-y-3">
          {deudas.map((d) => {
            const pct = porcentajePagado(d.monto_total, d.saldo);
            const ritmo = d.tipo === 'sin_cronograma' ? ritmoSinCronograma(d.saldo, pagos.filter((p) => p.deuda_id === d.id), hoy) : null;
            const resto = cuotasRestantes(d);
            const saldada = d.saldo <= 0;
            return (
              <li key={d.id}>
                <button type="button" onClick={() => setDetalle(d)} className="w-full rounded-2xl border border-casa-borde bg-casa-panel p-4 text-left active:bg-casa-panel-2">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-casa-texto">{d.descripcion}</p>
                    <p className="shrink-0 text-sm text-casa-suave">{saldada ? 'Saldada' : `Saldo ${formatearCentavos(d.saldo)}`}</p>
                  </div>
                  <Barra porcentaje={pct} />
                  <p className="mt-2 text-xs text-casa-suave">
                    {pct}% pagado de {formatearCentavos(d.monto_total)}
                    {d.tipo === 'con_cronograma' && d.cuotas_total ? ` · cuota ${Math.min((d.cuotas_pagas ?? 0) + (saldada ? 0 : 1), d.cuotas_total)} de ${d.cuotas_total} (${formatearCentavos(d.valor_cuota ?? 0)})` : ''}
                  </p>
                  {d.tipo === 'con_cronograma' && resto > 0 && (
                    <p className="mt-1 text-xs text-casa-suave">Termina en <span className="capitalize">{nombreMes(mesFinCronograma(mesHoy, resto)!)}</span>.</p>
                  )}
                  {ritmo && (
                    <p className="mt-1 text-xs text-casa-suave">
                      Con lo que pagaste en los últimos 3 meses ({formatearCentavos(ritmo.promedioMensual)} por mes), terminás en <span className="capitalize">{nombreMes(ritmo.mesFin)}</span>.
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {agregando && <FormularioDeuda alCerrar={() => setAgregando(false)} alGuardar={crear} />}

      {detalle && (
        <Hoja titulo={detalle.descripcion} alCerrar={() => setDetalle(null)}>
          <div className="space-y-3">
            <p className="text-sm text-casa-suave">Saldo {formatearCentavos(detalle.saldo)} de {formatearCentavos(detalle.monto_total)}.</p>
            {detalle.saldo > 0 && detalle.tipo === 'con_cronograma' && detalle.valor_cuota !== null && (
              <BotonPrincipal onClick={() => void pagarCuota(detalle)}>Pagué la cuota de {formatearCentavos(detalle.valor_cuota)}</BotonPrincipal>
            )}
            {detalle.saldo > 0 && detalle.tipo === 'sin_cronograma' && (
              <BotonPrincipal onClick={() => { setPagando(detalle); setDetalle(null); }}>Registrar un pago</BotonPrincipal>
            )}
            {detalle.saldo > 0 && detalle.tipo === 'sin_cronograma' && (
              <SimuladorInteres
                key={detalle.id}
                deuda={detalle}
                ritmo={ritmoSinCronograma(detalle.saldo, pagos.filter((p) => p.deuda_id === detalle.id), hoy)?.promedioMensual ?? 0}
                mesHoy={mesHoy}
                alGuardarTasa={(t) => guardarTasa(detalle, t)}
              />
            )}
            <BorrarConfirmado alBorrar={() => void borrar(detalle)} />
          </div>
        </Hoja>
      )}

      {pagando && <FormularioPago deuda={pagando} alCerrar={() => setPagando(null)} alPagar={pagarSaldo} />}
    </div>
  );
}

function BorrarConfirmado({ alBorrar }: { alBorrar: () => void }) {
  const [seguro, setSeguro] = useState(false);
  return (
    <button type="button" onClick={() => (seguro ? alBorrar() : setSeguro(true))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-casa-error/50 py-3 text-sm font-semibold text-casa-error">
      <Trash2 size={18} /> {seguro ? 'Tocá de nuevo para borrarla' : 'Borrar esta deuda'}
    </button>
  );
}

type NuevaDeuda = {
  descripcion: string; tipo: TipoDeuda; monto_total: number; saldo: number;
  valor_cuota: number | null; cuotas_total: number | null; cuotas_pagas: number | null; mes_fin: string | null; tasa: number | null;
};

function FormularioDeuda({ alCerrar, alGuardar }: { alCerrar: () => void; alGuardar: (n: NuevaDeuda) => Promise<void> }) {
  const [tipo, setTipo] = useState<TipoDeuda>('con_cronograma');
  const [descripcion, setDescripcion] = useState('');
  const [cuota, setCuota] = useState('');
  const [total, setTotal] = useState('');
  const [pagas, setPagas] = useState('');
  const [original, setOriginal] = useState('');
  const [saldo, setSaldo] = useState('');
  const [tasaTxt, setTasaTxt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!descripcion.trim()) return setError('Poné qué fue (por ejemplo: lavarropas).');
    if (tipo === 'con_cronograma') {
      const valor = digitosACentavos(cuota);
      const cantidad = Number(total);
      const hechas = Number(pagas || '0');
      if (valor === null || !(cantidad > 0)) return setError('Completá el valor de la cuota y cuántas cuotas son.');
      if (hechas > cantidad) return setError('Las cuotas pagas no pueden ser más que el total.');
      const restantes = cantidad - hechas;
      const fin = mesFinCronograma(mesDe(new Date()), restantes);
      return alGuardar({
        descripcion: descripcion.trim(), tipo, valor_cuota: valor, cuotas_total: cantidad, cuotas_pagas: hechas,
        monto_total: valor * cantidad, saldo: valor * restantes, mes_fin: fin ? claveMes(fin) : null, tasa: null,
      });
    }
    const orig = digitosACentavos(original);
    const act = saldo ? digitosACentavos(saldo) : orig;
    if (orig === null || act === null) return setError('Completá el monto original y el saldo actual.');
    if (act > orig) return setError('El saldo no puede ser mayor al monto original.');
    const tasa = tasaTxt.trim() ? parseTasaMensual(tasaTxt) : null;
    if (tasaTxt.trim() && tasa === null) return setError('La tasa no es válida. Ponela en % mensual, con coma para los decimales (por ejemplo 3,5).');
    return alGuardar({ descripcion: descripcion.trim(), tipo, monto_total: orig, saldo: act, valor_cuota: null, cuotas_total: null, cuotas_pagas: null, mes_fin: null, tasa });
  };

  return (
    <Hoja titulo="Agregar deuda o cuota" alCerrar={alCerrar}>
      <div className="space-y-4">
        <Chips<TipoDeuda>
          opciones={[{ valor: 'con_cronograma', etiqueta: 'En cuotas' }, { valor: 'sin_cronograma', etiqueta: 'Le debo a alguien' }]}
          valor={tipo}
          onChange={setTipo}
        />
        <CampoTexto etiqueta="Qué es" valor={descripcion} onChange={setDescripcion} placeholder={tipo === 'con_cronograma' ? 'Lavarropas' : 'Préstamo de un familiar'} />
        {tipo === 'con_cronograma' ? (
          <>
            <CampoDigitos etiqueta="Valor de la cuota" valor={cuota} onChange={setCuota} />
            <div className="grid grid-cols-2 gap-3">
              <CampoDigitos etiqueta="Cuotas en total" valor={total} onChange={setTotal} prefijo="" maximo={3} />
              <CampoDigitos etiqueta="Ya pagadas" valor={pagas} onChange={setPagas} prefijo="" maximo={3} />
            </div>
          </>
        ) : (
          <>
            <CampoDigitos etiqueta="Monto original" valor={original} onChange={setOriginal} />
            <CampoDigitos etiqueta="Saldo actual" valor={saldo} onChange={setSaldo} ayuda="Si lo dejás vacío, es igual al monto original." />
            <CampoTexto etiqueta="Interés mensual en % (opcional)" valor={tasaTxt} onChange={setTasaTxt} placeholder="3,5" />
          </>
        )}
        {error && <p className="text-sm text-casa-error" role="alert">{error}</p>}
        <BotonPrincipal onClick={() => void guardar()}>Guardar</BotonPrincipal>
      </div>
    </Hoja>
  );
}

function FormularioPago({ deuda, alCerrar, alPagar }: { deuda: Deuda; alCerrar: () => void; alPagar: (d: Deuda, centavos: number, esMinimo: boolean) => Promise<void> }) {
  const [monto, setMonto] = useState('');
  const [minimo, setMinimo] = useState(false);
  const centavos = digitosACentavos(monto);
  return (
    <Hoja titulo={`Pago de ${deuda.descripcion}`} alCerrar={alCerrar}>
      <div className="space-y-4">
        <CampoDigitos etiqueta="Monto pagado" valor={monto} onChange={setMonto} ayuda={`Saldo actual: ${formatearCentavos(deuda.saldo)}`} />
        <label className="flex items-center gap-3 text-sm text-casa-texto">
          <input type="checkbox" checked={minimo} onChange={(e) => setMinimo(e.target.checked)} className="h-5 w-5 accent-[#2DD4BF]" />
          Es el pago mínimo comprometido
        </label>
        <BotonPrincipal deshabilitado={centavos === null} onClick={() => centavos !== null && void alPagar(deuda, centavos, minimo)}>Registrar pago</BotonPrincipal>
      </div>
    </Hoja>
  );
}

/** Para una deuda sin cronograma: pagando $X por mes, cuándo terminás y cuánto pagás de interés (tasa mensual). */
function SimuladorInteres({ deuda, ritmo, mesHoy, alGuardarTasa }: {
  deuda: Deuda; ritmo: number; mesHoy: ReturnType<typeof mesDe>; alGuardarTasa: (t: number | null) => Promise<void>;
}) {
  const [tasaTxt, setTasaTxt] = useState(deuda.tasa ? String(deuda.tasa).replace('.', ',') : '');
  const [pagoTxt, setPagoTxt] = useState(ritmo > 0 ? String(Math.round(ritmo / 100)) : '');
  const [errorTasa, setErrorTasa] = useState<string | null>(null);
  const tasa = deuda.tasa;
  const pago = digitosACentavos(pagoTxt);
  const sim = pago !== null ? simularDeuda(deuda.saldo, tasa, pago, mesHoy) : null;

  const guardar = async () => {
    if (!tasaTxt.trim()) { setErrorTasa(null); return alGuardarTasa(null); }
    const t = parseTasaMensual(tasaTxt);
    if (t === null) return setErrorTasa('La tasa no es válida. Ponela en % mensual, con coma para los decimales.');
    setErrorTasa(null);
    await alGuardarTasa(t);
  };

  return (
    <div className="space-y-3 border-t border-casa-borde pt-4">
      <p className="text-xs uppercase tracking-wider text-casa-suave">Cuándo terminás</p>
      <div className="flex items-end gap-2">
        <div className="flex-1"><CampoTexto etiqueta="Interés mensual en %" valor={tasaTxt} onChange={setTasaTxt} placeholder="Sin interés" /></div>
        <button type="button" onClick={() => void guardar()} className="mb-0.5 rounded-xl border border-casa-borde px-4 py-3 text-sm font-semibold text-casa-texto">Guardar</button>
      </div>
      {errorTasa && <p className="text-sm text-casa-error" role="alert">{errorTasa}</p>}
      <CampoDigitos etiqueta="Pagando por mes" valor={pagoTxt} onChange={setPagoTxt} ayuda={ritmo > 0 ? `Lo que venís pagando: ${formatearCentavos(ritmo)} por mes (últimos 3 meses).` : 'Todavía no hay pagos en los últimos 3 meses.'} />
      {sim && sim.sinFin && (
        <p className="rounded-xl border border-casa-alerta/40 bg-casa-alerta/10 p-3 text-sm text-casa-alerta">
          Con ese monto la deuda no baja: el interés de un mes ({formatearCentavos(sim.interesPrimerMes)}) es igual o mayor que lo que pagás.
        </p>
      )}
      {sim && !sim.sinFin && (
        <p className="rounded-xl border border-casa-borde bg-casa-fondo p-3 text-sm text-casa-texto">
          Terminás en <strong className="capitalize">{nombreMes(sim.mesFin)}</strong> ({sim.meses} {sim.meses === 1 ? 'mes' : 'meses'}).
          {tasa ? <> Pagás {formatearCentavos(sim.totalInteres)} de interés en total, o sea {formatearCentavos(sim.totalPagado)} por una deuda de {formatearCentavos(deuda.saldo)}.</> : ' Sin interés cargado, no se suma ninguno.'}
        </p>
      )}
    </div>
  );
}
