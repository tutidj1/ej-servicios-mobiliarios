'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { digitosACentavos, fechaLocalISO, formatearCentavos, mesDe, moverMes, nombreMes, type Mes } from '@/lib/casa/dinero';
import {
  diaReal, estadoVencimiento, medianaUltimosTres, periodosPendientes, RECURRENCIAS, totalesDelMes, type Recurrencia,
} from '@/lib/casa/obligaciones';
import { BotonPrincipal, CampoDigitos, CampoTexto, Chips, Hoja } from './ui';

type Miembro = { id: string; nombre: string; hogar_id: string };
type Hijo = { id: string; nombre: string };
type Obligacion = {
  id: string; concepto: string; monto_estimado: number; dia_vencimiento: number; recurrencia: Recurrencia;
  responsable_id: string | null; hijo_id: string | null;
};
type Instancia = {
  id: string; obligacion_id: string; periodo: string; monto_real: number | null; pagado_por: string | null;
  fecha_pago: string | null; estado: 'pendiente' | 'pagado';
};

const clave = (m: Mes) => `${m.anio}-${String(m.mes).padStart(2, '0')}-01`;

export default function ObligacionesPantalla() {
  const { cliente, persona } = useCasa();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [obls, setObls] = useState<Obligacion[]>([]);
  const [insts, setInsts] = useState<Instancia[]>([]);
  const [mes, setMes] = useState<Mes>(() => mesDe(new Date()));
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ editar?: Obligacion } | null>(null);
  const [abierta, setAbierta] = useState<Instancia | null>(null);
  const hoy = useMemo(() => new Date(), []);
  const mesActual = mesDe(hoy);
  const esActual = mes.anio === mesActual.anio && mes.mes === mesActual.mes;

  const nombreDe = useCallback((id: string | null) => miembros.find((m) => m.id === id)?.nombre ?? null, [miembros]);
  const hogarId = miembros.find((m) => m.id === persona?.id)?.hogar_id ?? null;

  /** Crea las instancias que falten hasta el mes actual (ya existentes se ignoran: la clave única lo impide). */
  const asegurarInstancias = useCallback(async (lista: Obligacion[]) => {
    if (!cliente || lista.length === 0) return;
    const { data } = await cliente.from('obligacion_instancias').select('obligacion_id, periodo').order('periodo', { ascending: false }).limit(2000);
    const ultimo = new Map<string, string>();
    for (const r of (data ?? []) as { obligacion_id: string; periodo: string }[]) if (!ultimo.has(r.obligacion_id)) ultimo.set(r.obligacion_id, r.periodo);
    const nuevas = lista.flatMap((o) =>
      periodosPendientes(ultimo.get(o.id) ?? null, o.recurrencia, clave(mesActual), clave(mesActual)).map((periodo) => ({ obligacion_id: o.id, periodo, estado: 'pendiente' })),
    );
    if (nuevas.length) await cliente.from('obligacion_instancias').upsert(nuevas, { onConflict: 'obligacion_id,periodo', ignoreDuplicates: true });
  }, [cliente, mesActual]);

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const [p, h, o] = await Promise.all([
      cliente.from('personas').select('id, nombre, hogar_id').order('nombre'),
      cliente.from('hijos').select('id, nombre').order('nombre'),
      cliente.from('obligaciones').select('id, concepto, monto_estimado, dia_vencimiento, recurrencia, responsable_id, hijo_id').order('concepto'),
    ]);
    if (p.error || h.error || o.error) { setError('No se pudieron cargar las obligaciones.'); return; }
    const lista = (o.data ?? []) as Obligacion[];
    await asegurarInstancias(lista);
    const i = await cliente.from('obligacion_instancias').select('id, obligacion_id, periodo, monto_real, pagado_por, fecha_pago, estado').eq('periodo', clave(mes));
    if (i.error) { setError('No se pudieron cargar las obligaciones.'); return; }
    setError(null);
    setMiembros((p.data ?? []) as Miembro[]);
    setHijos((h.data ?? []) as Hijo[]);
    setObls(lista);
    setInsts((i.data ?? []) as Instancia[]);
  }, [cliente, mes, asegurarInstancias]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  const filas = useMemo(
    () => insts
      .map((i) => ({ i, o: obls.find((x) => x.id === i.obligacion_id) }))
      .filter((f): f is { i: Instancia; o: Obligacion } => !!f.o)
      .sort((a, b) => a.o.dia_vencimiento - b.o.dia_vencimiento || a.o.concepto.localeCompare(b.o.concepto)),
    [insts, obls],
  );
  const tot = totalesDelMes(filas.map(({ i, o }) => ({ estado: i.estado, monto_real: i.monto_real, monto_estimado: o.monto_estimado })));

  const guardarObligacion = async (v: DatosObligacion, id?: string) => {
    if (!cliente || !hogarId) return;
    const r = id
      ? await cliente.from('obligaciones').update(v).eq('id', id)
      : await cliente.from('obligaciones').insert({ hogar_id: hogarId, ...v });
    if (r.error) { setError('No se pudo guardar la obligación.'); return; }
    setForm(null);
    await cargar();
  };

  const cambiarResponsable = async (o: Obligacion, responsable: string | null) => {
    if (!cliente) return;
    const r = await cliente.from('obligaciones').update({ responsable_id: responsable }).eq('id', o.id);
    if (r.error) setError('No se pudo cambiar el responsable.');
    setAbierta(null);
    await cargar();
  };

  const pagar = async (i: Instancia, o: Obligacion, centavos: number, quien: string) => {
    if (!cliente) return;
    const r = await cliente.from('obligacion_instancias')
      .update({ estado: 'pagado', monto_real: centavos, pagado_por: quien, fecha_pago: fechaLocalISO(new Date()) })
      .eq('id', i.id);
    if (r.error) { setError('No se pudo marcar como pagada.'); return; }
    // El estimado sigue a la mediana de los últimos tres pagos reales
    const ult = await cliente.from('obligacion_instancias').select('monto_real').eq('obligacion_id', o.id).eq('estado', 'pagado').not('monto_real', 'is', null).order('periodo', { ascending: false }).limit(3);
    const mediana = medianaUltimosTres(((ult.data ?? []) as { monto_real: number }[]).map((x) => x.monto_real));
    if (mediana !== null && mediana !== o.monto_estimado) await cliente.from('obligaciones').update({ monto_estimado: mediana }).eq('id', o.id);
    setAbierta(null);
    await cargar();
  };

  const deshacerPago = async (i: Instancia) => {
    if (!cliente) return;
    const r = await cliente.from('obligacion_instancias').update({ estado: 'pendiente', monto_real: null, pagado_por: null, fecha_pago: null }).eq('id', i.id);
    if (r.error) setError('No se pudo deshacer el pago.');
    setAbierta(null);
    await cargar();
  };

  const borrar = async (o: Obligacion) => {
    if (!cliente) return;
    const r = await cliente.from('obligaciones').delete().eq('id', o.id);
    if (r.error) setError('No se pudo borrar.');
    setAbierta(null);
    await cargar();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setMes((m) => moverMes(m, -1))} aria-label="Mes anterior" className="rounded-xl p-2 text-casa-suave active:bg-casa-panel"><ChevronLeft size={22} /></button>
        <div className="text-center">
          <p className="font-playfair text-lg capitalize text-casa-texto">{nombreMes(mes)}</p>
          <p className="text-sm text-casa-suave">
            {cargando ? 'Cargando…' : filas.length === 0 ? 'Sin obligaciones este mes' : `Pagado ${formatearCentavos(tot.pagado)} de ${formatearCentavos(tot.total)} · ${tot.pendientes} ${tot.pendientes === 1 ? 'pendiente' : 'pendientes'}`}
          </p>
        </div>
        <button type="button" disabled={esActual} onClick={() => setMes((m) => moverMes(m, 1))} aria-label="Mes siguiente" className="rounded-xl p-2 text-casa-suave active:bg-casa-panel disabled:opacity-30"><ChevronRight size={22} /></button>
      </div>

      {error && <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>}

      <div className="flex justify-end">
        <button type="button" onClick={() => setForm({})} className="flex items-center gap-1.5 rounded-xl bg-casa-acento px-3.5 py-2 text-sm font-bold text-casa-fondo"><Plus size={16} /> Agregar</button>
      </div>

      {!cargando && obls.length === 0 && (
        <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">
          Todavía no hay obligaciones. Cargá una vez la luz, el gas, la escuela… y cada mes aparece sola. La ven los dos, completa.
        </p>
      )}

      <ul className="space-y-3">
        {filas.map(({ i, o }) => {
          const pagada = i.estado === 'pagado';
          const venc = estadoVencimiento(i.periodo, o.dia_vencimiento, hoy, pagada);
          const hijo = hijos.find((h) => h.id === o.hijo_id)?.nombre;
          return (
            <li key={i.id}>
              <button type="button" onClick={() => setAbierta(i)} className="w-full rounded-2xl border border-casa-borde bg-casa-panel p-4 text-left active:bg-casa-panel-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-casa-texto">{o.concepto}{hijo ? ` · ${hijo}` : ''}</p>
                    <p className="mt-0.5 text-xs text-casa-suave">
                      Se hace cargo: {nombreDe(o.responsable_id) ?? 'cualquiera de los dos'} · vence el {diaReal(i.periodo, o.dia_vencimiento)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-casa-texto">{formatearCentavos(pagada ? i.monto_real ?? o.monto_estimado : o.monto_estimado)}</p>
                </div>
                <p className={`mt-2 text-xs font-semibold ${pagada ? 'text-casa-acento' : venc.clase === 'vencida' ? 'text-casa-error' : venc.clase === 'pronto' ? 'text-casa-alerta' : 'text-casa-suave'}`}>
                  {pagada
                    ? `Pagada${nombreDe(i.pagado_por) ? ` por ${nombreDe(i.pagado_por)}` : ''}`
                    : venc.clase === 'vencida' ? `Vencida hace ${-venc.dias} ${venc.dias === -1 ? 'día' : 'días'}`
                    : venc.dias === 0 ? 'Vence hoy'
                    : venc.clase === 'pronto' ? `Vence en ${venc.dias} ${venc.dias === 1 ? 'día' : 'días'}`
                    : 'Pendiente'}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {form && (
        <FormularioObligacion
          inicial={form.editar}
          miembros={miembros}
          hijos={hijos}
          alCerrar={() => setForm(null)}
          alGuardar={(v) => guardarObligacion(v, form.editar?.id)}
        />
      )}

      {abierta && (() => {
        const o = obls.find((x) => x.id === abierta.obligacion_id);
        return o ? (
          <DetalleInstancia
            inst={abierta}
            obl={o}
            miembros={miembros}
            yo={persona?.id ?? null}
            alCerrar={() => setAbierta(null)}
            alPagar={pagar}
            alDeshacer={deshacerPago}
            alResponsable={cambiarResponsable}
            alEditar={() => { setAbierta(null); setForm({ editar: o }); }}
            alBorrar={borrar}
          />
        ) : null;
      })()}
    </div>
  );
}

type DatosObligacion = {
  concepto: string; monto_estimado: number; dia_vencimiento: number; recurrencia: Recurrencia;
  responsable_id: string | null; hijo_id: string | null;
};

function FormularioObligacion({ inicial, miembros, hijos, alCerrar, alGuardar }: {
  inicial?: Obligacion; miembros: Miembro[]; hijos: Hijo[]; alCerrar: () => void; alGuardar: (v: DatosObligacion) => Promise<void>;
}) {
  const [concepto, setConcepto] = useState(inicial?.concepto ?? '');
  const [monto, setMonto] = useState(inicial ? String(Math.round(inicial.monto_estimado / 100)) : '');
  const [dia, setDia] = useState(inicial ? String(inicial.dia_vencimiento) : '');
  const [rec, setRec] = useState<Recurrencia>(inicial?.recurrencia ?? 'mensual');
  const [resp, setResp] = useState<string>(inicial?.responsable_id ?? 'nadie');
  const [hijo, setHijo] = useState<string>(inicial?.hijo_id ?? 'ninguno');
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    const c = digitosACentavos(monto);
    const d = Number(dia);
    if (!concepto.trim()) return setError('Poné el concepto (luz, gas, escuela…).');
    if (c === null) return setError('Poné el monto estimado.');
    if (!(d >= 1 && d <= 31)) return setError('El día de vencimiento va de 1 a 31.');
    void alGuardar({ concepto: concepto.trim(), monto_estimado: c, dia_vencimiento: d, recurrencia: rec, responsable_id: resp === 'nadie' ? null : resp, hijo_id: hijo === 'ninguno' ? null : hijo });
  };

  return (
    <Hoja titulo={inicial ? 'Editar obligación' : 'Nueva obligación'} alCerrar={alCerrar}>
      <div className="space-y-4">
        <CampoTexto etiqueta="Concepto" valor={concepto} onChange={setConcepto} placeholder="Luz" />
        <CampoDigitos etiqueta="Monto estimado" valor={monto} onChange={setMonto} ayuda="Se ajusta solo con la mediana de los últimos tres pagos." />
        <CampoDigitos etiqueta="Día de vencimiento" valor={dia} onChange={setDia} prefijo="" maximo={2} />
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">Cada cuánto</p>
          <Chips<Recurrencia> opciones={RECURRENCIAS} valor={rec} onChange={setRec} />
        </div>
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">Se hace cargo</p>
          <Chips<string> opciones={[{ valor: 'nadie', etiqueta: 'Cualquiera' }, ...miembros.map((m) => ({ valor: m.id, etiqueta: m.nombre }))]} valor={resp} onChange={setResp} />
        </div>
        {hijos.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">A nombre de un hijo (opcional)</p>
            <Chips<string> opciones={[{ valor: 'ninguno', etiqueta: 'Ninguno' }, ...hijos.map((h) => ({ valor: h.id, etiqueta: h.nombre }))]} valor={hijo} onChange={setHijo} />
          </div>
        )}
        {error && <p className="text-sm text-casa-error" role="alert">{error}</p>}
        <BotonPrincipal onClick={guardar}>Guardar</BotonPrincipal>
      </div>
    </Hoja>
  );
}

function DetalleInstancia({ inst, obl, miembros, yo, alCerrar, alPagar, alDeshacer, alResponsable, alEditar, alBorrar }: {
  inst: Instancia; obl: Obligacion; miembros: Miembro[]; yo: string | null; alCerrar: () => void;
  alPagar: (i: Instancia, o: Obligacion, centavos: number, quien: string) => Promise<void>;
  alDeshacer: (i: Instancia) => Promise<void>;
  alResponsable: (o: Obligacion, r: string | null) => Promise<void>;
  alEditar: () => void;
  alBorrar: (o: Obligacion) => Promise<void>;
}) {
  const [monto, setMonto] = useState(String(Math.round((inst.monto_real ?? obl.monto_estimado) / 100)));
  const [quien, setQuien] = useState<string>(inst.pagado_por ?? obl.responsable_id ?? yo ?? '');
  const [seguro, setSeguro] = useState(false);
  const centavos = digitosACentavos(monto);
  const pagada = inst.estado === 'pagado';

  return (
    <Hoja titulo={obl.concepto} alCerrar={alCerrar}>
      <div className="space-y-4">
        {!pagada ? (
          <>
            <CampoDigitos etiqueta="Monto real pagado" valor={monto} onChange={setMonto} ayuda={`Estimado: ${formatearCentavos(obl.monto_estimado)}`} />
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">Quién pagó</p>
              <Chips<string> opciones={miembros.map((m) => ({ valor: m.id, etiqueta: m.nombre }))} valor={quien} onChange={setQuien} />
            </div>
            <BotonPrincipal deshabilitado={centavos === null || !quien} onClick={() => centavos !== null && void alPagar(inst, obl, centavos, quien)}>Marcar como pagada</BotonPrincipal>
          </>
        ) : (
          <>
            <p className="text-sm text-casa-suave">
              Pagada el {inst.fecha_pago ? new Date(inst.fecha_pago + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : '—'}: {formatearCentavos(inst.monto_real ?? 0)}.
            </p>
            <button type="button" onClick={() => void alDeshacer(inst)} className="w-full rounded-xl border border-casa-borde py-3 text-sm font-semibold text-casa-texto">Deshacer el pago</button>
          </>
        )}

        <div className="border-t border-casa-borde pt-4">
          <p className="mb-1.5 text-xs uppercase tracking-wider text-casa-suave">Se hace cargo (cambia de acá en adelante)</p>
          <Chips<string>
            opciones={[{ valor: 'nadie', etiqueta: 'Cualquiera' }, ...miembros.map((m) => ({ valor: m.id, etiqueta: m.nombre }))]}
            valor={obl.responsable_id ?? 'nadie'}
            onChange={(v) => void alResponsable(obl, v === 'nadie' ? null : v)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={alEditar} className="rounded-xl border border-casa-borde py-3 text-sm font-semibold text-casa-texto">Editar</button>
          <button type="button" onClick={() => (seguro ? void alBorrar(obl) : setSeguro(true))} className="flex items-center justify-center gap-2 rounded-xl border border-casa-error/50 py-3 text-sm font-semibold text-casa-error">
            <Trash2 size={16} /> {seguro ? 'Tocá de nuevo' : 'Borrar'}
          </button>
        </div>
      </div>
    </Hoja>
  );
}
