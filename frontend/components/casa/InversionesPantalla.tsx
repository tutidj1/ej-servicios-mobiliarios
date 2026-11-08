'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { digitosACentavos, fechaLocalISO, formatearCentavos, nombreMes } from '@/lib/casa/dinero';
import {
  CLASES, desactualizada, netoAjustadoPorIpc, netoAportado, rendimiento, type ClaseInversion, type Inversion,
  type IpcPorMes, type MonedaCasa, type MovInversion, type Rendimiento,
} from '@/lib/casa/inversiones';
import { BotonPrincipal, CampoDigitos, CampoTexto, Chips, Hoja } from './ui';

const COLS = 'id, descripcion, clase, moneda, modo_valuacion, valor_actual, valuado_el, objetivo_id';

function dinero(centavos: number, moneda: MonedaCasa) {
  return moneda === 'USD' ? formatearCentavos(centavos).replace('$', 'US$') : formatearCentavos(centavos);
}

function signo(r: Rendimiento, moneda: MonedaCasa) {
  return `${r.ganancia >= 0 ? '+' : ''}${r.porcentaje.toString().replace('.', ',')}% (${r.ganancia >= 0 ? '+' : ''}${dinero(r.ganancia, moneda)})`;
}

export default function InversionesPantalla() {
  const { cliente, persona } = useCasa();
  const [invs, setInvs] = useState<Inversion[]>([]);
  const [movs, setMovs] = useState<MovInversion[]>([]);
  const [ipc, setIpc] = useState<IpcPorMes>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [abierta, setAbierta] = useState<Inversion | null>(null);
  const hoy = useMemo(() => new Date(), []);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const [a, b, c] = await Promise.all([
      cliente.from('inversiones').select(COLS).order('descripcion'),
      cliente.from('inversion_movimientos').select('inversion_id, monto, moneda, tc_del_dia, tipo, fecha, mes_ipc'),
      cliente.from('ipc').select('mes, indice'),
    ]);
    if (a.error || b.error) { setError('No se pudieron cargar tus inversiones.'); return; }
    setError(null);
    setInvs((a.data ?? []) as Inversion[]);
    setMovs((b.data ?? []) as MovInversion[]);
    setIpc(Object.fromEntries(((c.data ?? []) as { mes: string; indice: number | string }[]).map((r) => [r.mes, Number(r.indice)])));
  }, [cliente]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  const crear = async (n: { descripcion: string; clase: ClaseInversion; moneda: MonedaCasa }) => {
    if (!cliente || !persona) return;
    const r = await cliente.from('inversiones').insert({ persona_id: persona.id, ...n, modo_valuacion: 'manual', valor_actual: 0 });
    if (r.error) { setError('No se pudo guardar la inversión.'); return; }
    setAgregando(false);
    await cargar();
  };

  const movimiento = async (i: Inversion, tipo: 'aporte' | 'retiro', centavos: number, tcCentavos: number | null, motivo: string) => {
    if (!cliente) return;
    const r = await cliente.from('inversion_movimientos').insert({
      inversion_id: i.id, monto: centavos, moneda: i.moneda, tc_del_dia: i.moneda === 'USD' ? tcCentavos : null,
      tipo, motivo, fecha: fechaLocalISO(new Date()),
    });
    if (r.error) { setError('No se pudo registrar el movimiento.'); return; }
    setAbierta(null);
    await cargar();
  };

  const valuar = async (i: Inversion, centavos: number) => {
    if (!cliente) return;
    const r = await cliente.from('inversiones').update({ valor_actual: centavos, valuado_el: fechaLocalISO(new Date()) }).eq('id', i.id);
    if (r.error) { setError('No se pudo actualizar el valor.'); return; }
    setAbierta(null);
    await cargar();
  };

  const borrar = async (i: Inversion) => {
    if (!cliente) return;
    const r = await cliente.from('inversiones').delete().eq('id', i.id);
    if (r.error) setError('No se pudo borrar.');
    setAbierta(null);
    await cargar();
  };

  return (
    <div className="space-y-5">
      {error && <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-casa-suave">{cargando ? 'Cargando…' : `${invs.length} ${invs.length === 1 ? 'inversión' : 'inversiones'}`}</p>
        <button type="button" onClick={() => setAgregando(true)} className="flex items-center gap-1.5 rounded-xl bg-casa-acento px-3.5 py-2 text-sm font-bold text-casa-fondo"><Plus size={16} /> Agregar</button>
      </div>

      {!cargando && invs.length === 0 && (
        <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">
          Todavía no cargaste inversiones. Es privado: lo ves solo vos.
        </p>
      )}

      <ul className="space-y-3">
        {invs.map((i) => {
          const m = movs.filter((x) => x.inversion_id === i.id);
          const neto = netoAportado(m);
          const nominal = i.valuado_el ? rendimiento(i.valor_actual, neto) : null;
          const ajuste = i.moneda === 'ARS' && m.length ? netoAjustadoPorIpc(m, ipc) : null;
          const real = ajuste && 'base' in ajuste && i.valuado_el ? rendimiento(i.valor_actual, ajuste.base) : null;
          const vieja = i.valuado_el !== null && desactualizada(i.valuado_el, hoy);
          return (
            <li key={i.id}>
              <button type="button" onClick={() => setAbierta(i)} className="w-full rounded-2xl border border-casa-borde bg-casa-panel p-4 text-left active:bg-casa-panel-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-casa-texto">{i.descripcion}</p>
                    <p className="text-xs text-casa-suave">{CLASES.find((c) => c.valor === i.clase)?.etiqueta} · {i.moneda === 'USD' ? 'dólares' : 'pesos'}</p>
                  </div>
                  <p className="font-playfair text-xl text-casa-texto">{i.valuado_el ? dinero(i.valor_actual, i.moneda) : '—'}</p>
                </div>
                <p className="mt-2 text-xs text-casa-suave">
                  {i.valuado_el ? `Valuada el ${new Date(i.valuado_el + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}` : 'Sin valuar todavía'}
                  {neto !== 0 ? ` · aportado ${dinero(neto, i.moneda)}` : ''}
                </p>
                {vieja && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-casa-alerta"><AlertTriangle size={14} /> Desactualizada: pasaron más de 3 meses sin valuarla.</p>
                )}
                {i.valuado_el && neto > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-casa-borde pt-3 text-xs">
                    <div>
                      <dt className="text-casa-suave">{i.moneda === 'USD' ? 'En dólares' : 'Nominal'}</dt>
                      <dd className="mt-0.5 font-semibold text-casa-texto">{nominal ? signo(nominal, i.moneda) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-casa-suave">{i.moneda === 'USD' ? 'Real' : 'Real (ajustado por IPC)'}</dt>
                      <dd className="mt-0.5 font-semibold text-casa-texto">
                        {i.moneda === 'USD'
                          ? 'En dólares ya es el real'
                          : real && ajuste && 'mesReferencia' in ajuste
                            ? `${signo(real, 'ARS')} en pesos de ${nombreMes({ anio: Number(ajuste.mesReferencia.slice(0, 4)), mes: Number(ajuste.mesReferencia.slice(5, 7)) })}`
                            : 'Falta cargar el IPC'}
                      </dd>
                    </div>
                  </dl>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {agregando && <FormularioInversion alCerrar={() => setAgregando(false)} alGuardar={crear} />}
      {abierta && <DetalleInversion inv={abierta} alCerrar={() => setAbierta(null)} alMovimiento={movimiento} alValuar={valuar} alBorrar={borrar} />}
    </div>
  );
}

function FormularioInversion({ alCerrar, alGuardar }: { alCerrar: () => void; alGuardar: (n: { descripcion: string; clase: ClaseInversion; moneda: MonedaCasa }) => Promise<void> }) {
  const [descripcion, setDescripcion] = useState('');
  const [clase, setClase] = useState<ClaseInversion>('plazo_fijo');
  const [moneda, setMoneda] = useState<MonedaCasa>('ARS');
  const [error, setError] = useState<string | null>(null);
  return (
    <Hoja titulo="Agregar inversión" alCerrar={alCerrar}>
      <div className="space-y-4">
        <CampoTexto etiqueta="Qué es" valor={descripcion} onChange={setDescripcion} placeholder="Plazo fijo del banco" />
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">Tipo</p>
          <Chips<ClaseInversion> opciones={CLASES} valor={clase} onChange={(c) => { setClase(c); if (c === 'dolares') setMoneda('USD'); }} />
        </div>
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">Moneda</p>
          <Chips<MonedaCasa> opciones={[{ valor: 'ARS', etiqueta: 'Pesos' }, { valor: 'USD', etiqueta: 'Dólares' }]} valor={moneda} onChange={setMoneda} />
        </div>
        <p className="text-xs text-casa-suave">El valor actual se carga a mano y queda con su fecha.</p>
        {error && <p className="text-sm text-casa-error" role="alert">{error}</p>}
        <BotonPrincipal onClick={() => (descripcion.trim() ? void alGuardar({ descripcion: descripcion.trim(), clase, moneda }) : setError('Poné qué es.'))}>Guardar</BotonPrincipal>
      </div>
    </Hoja>
  );
}

function DetalleInversion({ inv, alCerrar, alMovimiento, alValuar, alBorrar }: {
  inv: Inversion; alCerrar: () => void;
  alMovimiento: (i: Inversion, tipo: 'aporte' | 'retiro', centavos: number, tc: number | null, motivo: string) => Promise<void>;
  alValuar: (i: Inversion, centavos: number) => Promise<void>;
  alBorrar: (i: Inversion) => Promise<void>;
}) {
  const [modo, setModo] = useState<'valor' | 'aporte' | 'retiro'>('valor');
  const [monto, setMonto] = useState('');
  const [tc, setTc] = useState('');
  const [motivo, setMotivo] = useState('');
  const [seguro, setSeguro] = useState(false);
  const centavos = digitosACentavos(monto);
  const tcCentavos = tc ? digitosACentavos(tc) : null;
  const sufijo = inv.moneda === 'USD' ? 'US$' : '$';

  return (
    <Hoja titulo={inv.descripcion} alCerrar={alCerrar}>
      <div className="space-y-4">
        <Chips<'valor' | 'aporte' | 'retiro'>
          opciones={[{ valor: 'valor', etiqueta: 'Actualizar valor' }, { valor: 'aporte', etiqueta: 'Aporte' }, { valor: 'retiro', etiqueta: 'Retiro' }]}
          valor={modo}
          onChange={setModo}
        />
        <CampoDigitos etiqueta={modo === 'valor' ? 'Cuánto vale hoy' : 'Monto'} valor={monto} onChange={setMonto} prefijo={sufijo} />
        {modo !== 'valor' && inv.moneda === 'USD' && (
          <CampoDigitos etiqueta="Cotización del día (opcional)" valor={tc} onChange={setTc} ayuda="Pesos por dólar. Queda guardada con el movimiento." />
        )}
        {modo === 'retiro' && <CampoTexto etiqueta="Motivo" valor={motivo} onChange={setMotivo} placeholder="Para qué fue" />}
        <BotonPrincipal
          deshabilitado={centavos === null}
          onClick={() => {
            if (centavos === null) return;
            if (modo === 'valor') void alValuar(inv, centavos);
            else void alMovimiento(inv, modo, centavos, tcCentavos, motivo.trim());
          }}
        >
          {modo === 'valor' ? 'Guardar valor de hoy' : modo === 'aporte' ? 'Registrar aporte' : 'Registrar retiro'}
        </BotonPrincipal>
        <button type="button" onClick={() => (seguro ? void alBorrar(inv) : setSeguro(true))} className="flex w-full items-center justify-center gap-2 rounded-xl border border-casa-error/50 py-3 text-sm font-semibold text-casa-error">
          <Trash2 size={18} /> {seguro ? 'Tocá de nuevo para borrarla' : 'Borrar esta inversión'}
        </button>
      </div>
    </Hoja>
  );
}
