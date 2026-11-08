'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { formatearCentavos, mesDe, nombreMes, rangoMes } from '@/lib/casa/dinero';
import { comprometidoMensual, type Deuda } from '@/lib/casa/deudas';
import { pisoPersonal, type GastoPiso } from '@/lib/casa/piso';
import {
  asignadoDetalle, calcularExcedente, ingresoDelMes, reglaDifundida, repartir, salidaDeudas, type IngresoMes,
} from '@/lib/casa/excedente';
import type { OblPiso } from '@/lib/casa/piso';

function Renglon({ etiqueta, monto, resta }: { etiqueta: string; monto: number; resta?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 text-sm text-casa-texto">
      <span>{resta ? '− ' : ''}{etiqueta}</span>
      <span className="font-semibold">{formatearCentavos(monto)}</span>
    </div>
  );
}

function leerDestinos(clave: string): { deuda: number; ahorro: number } {
  try {
    const v = JSON.parse(window.localStorage.getItem(clave) ?? 'null');
    if (v && Number.isFinite(v.deuda) && Number.isFinite(v.ahorro)) return { deuda: v.deuda, ahorro: v.ahorro };
  } catch { /* sin almacenamiento: queda el valor inicial */ }
  return { deuda: 0, ahorro: 0 };
}

/** Excedente del mes: lo que le queda a cada uno después de cumplir con todo. Privado de su dueño. */
export default function ExcedentePantalla() {
  const { cliente, persona } = useCasa();
  const [ingresos, setIngresos] = useState<IngresoMes[]>([]);
  const [obls, setObls] = useState<OblPiso[]>([]);
  const [gastos, setGastos] = useState<GastoPiso[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [pagos, setPagos] = useState<{ deuda_id: string; monto: number }[]>([]);
  const [ipc, setIpc] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [destinos, setDestinos] = useState({ deuda: 0, ahorro: 0 });
  const mes = useMemo(() => mesDe(new Date()), []);
  const claveAlmacen = `casa-excedente-destinos-${persona?.id ?? 'x'}`;

  useEffect(() => { setDestinos(leerDestinos(claveAlmacen)); }, [claveAlmacen]);

  const cambiarDestinos = (d: { deuda: number; ahorro: number }) => {
    const deuda = Math.min(Math.max(d.deuda, 0), 100);
    const ahorro = Math.min(Math.max(d.ahorro, 0), 100 - deuda);
    setDestinos({ deuda, ahorro });
    try { window.localStorage.setItem(claveAlmacen, JSON.stringify({ deuda, ahorro })); } catch { /* es una comodidad, no un dato */ }
  };

  const cargar = useCallback(async () => {
    if (!cliente) return;
    const { desde, hasta } = rangoMes(mes);
    const d0 = new Date(mes.anio, mes.mes - 7, 1);
    const desde6 = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-01`;
    const hace90 = new Date(); hace90.setDate(hace90.getDate() - 90);
    const h90 = `${hace90.getFullYear()}-${String(hace90.getMonth() + 1).padStart(2, '0')}-${String(hace90.getDate()).padStart(2, '0')}`;
    const [i, o, g, d, p, c] = await Promise.all([
      cliente.from('ingresos').select('monto, esperado_o_real').gte('fecha', desde).lt('fecha', hasta),
      cliente.from('obligaciones').select('monto_estimado, recurrencia, hijo_id, responsable_id'),
      cliente.from('gastos').select('monto, tipo, fecha, mes_ipc').gte('fecha', desde6).limit(5000),
      cliente.from('deudas').select('id, descripcion, tipo, monto_total, saldo, valor_cuota, cuotas_total, cuotas_pagas, tasa, mes_fin'),
      cliente.from('deuda_pagos').select('deuda_id, monto').gte('fecha', h90),
      cliente.from('ipc').select('mes, indice'),
    ]);
    if (i.error || o.error || g.error || d.error || p.error) { setError('No se pudo calcular el excedente.'); return; }
    setError(null);
    setIngresos((i.data ?? []) as IngresoMes[]);
    setObls((o.data ?? []) as OblPiso[]);
    setGastos((g.data ?? []) as GastoPiso[]);
    setDeudas((d.data ?? []) as Deuda[]);
    setPagos((p.data ?? []) as { deuda_id: string; monto: number }[]);
    setIpc(Object.fromEntries(((c.data ?? []) as { mes: string; indice: number | string }[]).map((r) => [r.mes, Number(r.indice)])));
  }, [cliente, mes]);

  useEffect(() => { setCargando(true); cargar().finally(() => setCargando(false)); }, [cargar]);

  if (cargando) return <p className="text-sm text-casa-suave">Calculando…</p>;
  if (error) return <p className="rounded-xl border border-casa-error/40 bg-casa-error/10 p-3 text-sm text-casa-error" role="alert">{error}</p>;

  const { ingreso, cobrado, esperado } = ingresoDelMes(ingresos);
  const asig = persona ? asignadoDetalle(obls, persona.id) : { mensuales: 0, anuales: 0 };
  const personal = pisoPersonal(gastos, mes, ipc);
  const cuotas = comprometidoMensual(deudas);
  const exc = calcularExcedente({ ingreso, asignadas: asig.mensuales, anuales: asig.anuales, pisoPersonal: personal.mediana ?? 0, cuotas });
  const reparto = repartir(exc, destinos.deuda, destinos.ahorro);
  const regla = reglaDifundida(ingreso);

  // Consecuencia en vivo: deudas sin cronograma
  const sinCrono = deudas.filter((x) => x.tipo === 'sin_cronograma' && x.saldo > 0);
  const saldoSin = sinCrono.reduce((t, x) => t + x.saldo, 0);
  const ids = new Set(sinCrono.map((x) => x.id));
  const ritmo = Math.round(pagos.filter((x) => ids.has(x.deuda_id)).reduce((t, x) => t + x.monto, 0) / 3);
  const hoy = salidaDeudas(saldoSin, ritmo, 0, mes);
  const conExtra = salidaDeudas(saldoSin, ritmo, reparto.deuda, mes);

  return (
    <div className="space-y-6">
      <section aria-label="Excedente del mes">
        <p className="text-sm capitalize text-casa-suave">{nombreMes(mes)}</p>
        <p className="mt-1 text-sm text-casa-suave">{exc >= 0 ? 'Te queda' : 'No alcanza'}</p>
        <p className={`mt-1 font-playfair text-5xl ${exc >= 0 ? 'text-casa-texto' : 'text-casa-error'}`}>{formatearCentavos(Math.abs(exc))}</p>
        {exc < 0 && (
          <p className="mt-3 text-base text-casa-texto">Este mes te faltan {formatearCentavos(-exc)} para cubrir lo que tenés comprometido.</p>
        )}
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-casa-alerta/40 bg-casa-alerta/10 p-3 text-sm text-casa-alerta">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Es una estimación: el mes todavía no cerró, así que pueden faltar pagos y puede faltar ingreso.</span>
        </p>
      </section>

      <section aria-label="Cómo se calcula" className="rounded-2xl border border-casa-borde bg-casa-panel px-4 py-2">
        <div className="divide-y divide-casa-borde">
          <div className="py-2">
            <Renglon etiqueta="Ingreso del mes" monto={ingreso} />
            <p className="-mt-1 pb-1 text-xs text-casa-suave">
              Cobrado {formatearCentavos(cobrado)}{esperado > 0 ? ` · esperado ${formatearCentavos(esperado)}` : ''}. Se toma el mayor, para no contar dos veces el mismo ingreso.
            </p>
          </div>
          <Renglon etiqueta="Obligaciones que tenés a cargo" monto={asig.mensuales} resta />
          <Renglon etiqueta="Tu piso personal" monto={personal.mediana ?? 0} resta />
          <Renglon etiqueta="Cuotas del mes" monto={cuotas} resta />
          <Renglon etiqueta="Provisión de gastos anuales (1/12)" monto={asig.anuales} resta />
        </div>
        {personal.mediana === null && (
          <p className="pb-2 text-xs text-casa-suave">Tu piso personal todavía no se puede calcular: necesita al menos un mes cerrado con gastos cargados.</p>
        )}
        {ingreso === 0 && (
          <p className="pb-2 text-xs text-casa-suave">No cargaste ingresos este mes. Podés hacerlo en Gastos, en la sección Ingresos.</p>
        )}
      </section>

      {exc > 0 && (
        <section aria-label="Tres destinos" className="space-y-5">
          <div>
            <p className="font-playfair text-lg text-casa-texto">¿A dónde va?</p>
            <p className="text-xs text-casa-suave">Lo fijás vos con las barras. La app hace la cuenta y te muestra la consecuencia.</p>
          </div>

          <label className="block">
            <span className="flex items-baseline justify-between text-sm text-casa-texto"><span>A deudas</span><span className="font-semibold">{destinos.deuda}% · {formatearCentavos(reparto.deuda)}</span></span>
            <input type="range" min={0} max={100} step={5} value={destinos.deuda} onChange={(e) => cambiarDestinos({ ...destinos, deuda: Number(e.target.value) })} className="mt-2 w-full accent-[#2DD4BF]" />
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between text-sm text-casa-texto"><span>A ahorro o inversión</span><span className="font-semibold">{destinos.ahorro}% · {formatearCentavos(reparto.ahorro)}</span></span>
            <input type="range" min={0} max={100 - destinos.deuda} step={5} value={destinos.ahorro} onChange={(e) => cambiarDestinos({ ...destinos, ahorro: Number(e.target.value) })} className="mt-2 w-full accent-[#2DD4BF]" />
          </label>
          <div className="flex items-baseline justify-between text-sm text-casa-texto">
            <span>Libre</span>
            <span className="font-semibold">{100 - destinos.deuda - destinos.ahorro}% · {formatearCentavos(reparto.libre)}</span>
          </div>

          <div className="space-y-2 rounded-2xl border border-casa-borde bg-casa-panel p-4 text-sm text-casa-texto">
            {saldoSin > 0 ? (
              <p>
                Deudas sin cronograma: te quedan {formatearCentavos(saldoSin)}.{' '}
                {hoy ? <>Al ritmo de los últimos 3 meses terminás en <span className="capitalize">{nombreMes(hoy.mesFin)}</span>.</> : 'Sin pagos en los últimos 3 meses no hay fecha de salida.'}{' '}
                {reparto.deuda > 0 && conExtra && <>Sumando {formatearCentavos(reparto.deuda)} por mes, terminás en <strong className="capitalize">{nombreMes(conExtra.mesFin)}</strong>{hoy && conExtra.meses < hoy.meses ? ` (${hoy.meses - conExtra.meses} ${hoy.meses - conExtra.meses === 1 ? 'mes' : 'meses'} antes)` : ''}.</>}
              </p>
            ) : (
              <p>No tenés deudas sin cronograma cargadas. Las cuotas siguen su calendario (ver Deudas).</p>
            )}
            <p className="text-xs text-casa-suave">No incluye intereses: no hay una tasa cargada para las deudas.</p>
          </div>

          {ingreso > 0 && (
            <p className="text-xs leading-relaxed text-casa-suave">
              Una regla general bastante difundida es apartar entre el 10% y el 20% de lo que entra; en tu caso serían entre {formatearCentavos(regla.minimo)} y {formatearCentavos(regla.maximo)}.
              Es una regla general, no una recomendación para tu situación.
            </p>
          )}
          <p className="text-xs text-casa-suave">El reparto queda guardado solo en este dispositivo.</p>
        </section>
      )}
    </div>
  );
}
