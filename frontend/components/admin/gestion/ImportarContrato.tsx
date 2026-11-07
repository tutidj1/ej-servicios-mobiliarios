'use client';

import React, { useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hoyArgentina, pesos } from '@/lib/gestion/calculos';
import { type DatosContratoLeido, interpretarContrato, leerLineasPdf } from '@/lib/gestion/importarContrato';
import { leerMonto, mensajeError } from '@/lib/gestion/tipos';
import { AYUDA, type Aviso, BTN_PRIMARIO, BTN_SECUNDARIO, CAMPO, ETIQUETA, TARJETA } from '../estilos';
import { Mensaje } from '../ui';
import { CampoFecha } from './Calendarios';

const NOMBRE_ARTICULO = 'Alquiler (contrato anterior)';

type Cobro = 'completo' | 'sena' | 'nada';

/**
 * Carga un contrato que ya estaba hecho: se sube el PDF, se leen los datos y se confirma.
 * El objetivo es que el evento cuente en la ganancia del mes. No hace falta el precio de cada artículo:
 * se guarda un solo renglón con el total del contrato.
 */
export default function ImportarContrato({ onCancelar, onCreado }: { onCancelar: () => void; onCreado: (id: string, mensaje: string) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [lugar, setLugar] = useState('');
  const [fecha, setFecha] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [total, setTotal] = useState('');
  const [gastos, setGastos] = useState('');
  const [sena, setSena] = useState<number | null>(null);
  const [cobro, setCobro] = useState<Cobro>('completo');
  const [leido, setLeido] = useState(false);

  const alElegir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setAviso(null);
    setNombreArchivo(archivo.name);
    setLeyendo(true);
    try {
      const d: DatosContratoLeido = interpretarContrato(await leerLineasPdf(archivo));
      setCliente(d.cliente);
      setTelefono(d.telefono);
      setLugar(d.lugar);
      setFecha(d.fechaFirma && d.fechaDevolucion && d.fechaFirma > d.fechaDevolucion ? d.fechaDevolucion : d.fechaFirma || d.fechaDevolucion);
      setFechaHasta(d.fechaDevolucion);
      setTotal(d.total ? String(d.total) : '');
      setSena(d.sena);
      setCobro('completo');
      setLeido(true);
      const faltan = [!d.cliente && 'el cliente', !d.total && 'el monto', !(d.fechaFirma || d.fechaDevolucion) && 'la fecha'].filter(Boolean);
      setAviso(
        faltan.length
          ? { tipo: 'error', texto: `Leí el contrato, pero no encontré ${faltan.join(', ')}. Completalo acá abajo.` }
          : { tipo: 'ok', texto: 'Leí el contrato. Revisá que esté todo bien antes de guardar.' },
      );
    } catch {
      setLeido(true);
      setAviso({ tipo: 'error', texto: 'No pude leer ese PDF (puede ser una foto o escaneo). Cargá los datos a mano acá abajo.' });
    }
    setLeyendo(false);
    if (entrada.current) entrada.current.value = '';
  };

  const montoTotal = leerMonto(total) ?? 0;
  const montoGastos = leerMonto(gastos) ?? 0;
  const ganancia = montoTotal - montoGastos;

  const guardar = async () => {
    setAviso(null);
    if (!cliente.trim()) return setAviso({ tipo: 'error', texto: 'Falta el nombre del cliente.' });
    if (!fecha) return setAviso({ tipo: 'error', texto: 'Falta la fecha del evento.' });
    if (montoTotal <= 0) return setAviso({ tipo: 'error', texto: 'Falta el monto total del contrato.' });
    const hasta = fechaHasta && fechaHasta >= fecha ? fechaHasta : fecha;
    setGuardando(true);
    try {
      // 1) artículo genérico para este tipo de carga (se crea una sola vez)
      let itemId: string | undefined;
      const { data: existente } = await supabase.from('items').select('id').eq('nombre', NOMBRE_ARTICULO).maybeSingle();
      if (existente) itemId = existente.id;
      else {
        const { data, error } = await supabase
          .from('items')
          .insert({ nombre: NOMBRE_ARTICULO, categoria: 'otros', stock_total: null, sugerencia: 'ninguna', alias: [] })
          .select('id')
          .single();
        if (error || !data) throw error ?? { message: 'No se pudo preparar la carga.' };
        itemId = data.id;
      }
      // 2) cliente (si ya existe con ese nombre se reutiliza)
      let clienteId: string | undefined;
      const { data: previo } = await supabase.from('clientes').select('id').ilike('nombre_apellido', cliente.trim()).limit(1);
      if (previo && previo.length) clienteId = previo[0].id;
      else {
        const { data, error } = await supabase
          .from('clientes')
          .insert({ nombre_apellido: cliente.trim(), telefono: telefono.trim() || null, canal_origen: 'otro' })
          .select('id')
          .single();
        if (error || !data) throw error ?? { message: 'No se pudo crear el cliente.' };
        clienteId = data.id;
      }
      // 3) evento + un renglón con el total
      const { data: ev, error: e3 } = await supabase
        .from('eventos')
        .insert({
          cliente_id: clienteId,
          fecha_evento: fecha,
          fecha_entrega: fecha,
          fecha_devolucion: hasta,
          lugar: lugar.trim() || null,
          notas: `Cargado desde un contrato anterior${nombreArchivo ? ` (${nombreArchivo})` : ''}. El total es el del contrato; no tiene el detalle por artículo.`,
        })
        .select('id')
        .single();
      if (e3 || !ev) throw e3 ?? { message: 'No se pudo crear el evento.' };
      const { error: e4 } = await supabase
        .from('evento_lineas')
        .insert({ evento_id: ev.id, item_id: itemId, cantidad_total: 1, cantidad_propia: 1, cantidad_subalquilada: 0, precio_unitario: montoTotal });
      if (e4) throw e4;
      if (montoGastos > 0) {
        const { error } = await supabase.from('evento_costos').insert({ evento_id: ev.id, tipo: 'otro', monto: montoGastos, descripcion: 'Gastos del evento (contrato anterior)' });
        if (error) throw error;
      }
      // 4) lo cobrado
      const cobrado = cobro === 'completo' ? montoTotal : cobro === 'sena' && sena ? Math.min(sena, montoTotal) : 0;
      if (cobrado > 0) {
        const { error } = await supabase.from('pagos').insert({ evento_id: ev.id, tipo: cobro === 'completo' ? 'saldo' : 'seña', monto: cobrado, medio: 'efectivo', fecha: hasta <= hoyArgentina() ? hasta : hoyArgentina() });
        if (error) throw error;
      }
      // 5) si ya pasó, queda como devuelto (cuenta en la ganancia del mes)
      if (hasta < hoyArgentina()) {
        const { error } = await supabase.rpc('cambiar_estado_evento', { p_evento: ev.id, p_estado: 'devuelto' });
        if (error) throw error;
      }
      onCreado(ev.id, `Cargué el contrato de ${cliente.trim()}. Total ${pesos(montoTotal)}${montoGastos > 0 ? `, gastos ${pesos(montoGastos)}` : ''}. Ganancia ${pesos(ganancia)}.`);
    } catch (e) {
      setAviso({ tipo: 'error', texto: mensajeError(e as { message?: string }, 'No se pudo guardar. Probá de nuevo.') });
    }
    setGuardando(false);
  };

  return (
    <div className={`${TARJETA} mb-6 space-y-4`}>
      <div className="flex items-center justify-between">
        <h2 className="font-playfair text-xl font-bold">Cargar un contrato que ya tenías</h2>
        <button type="button" onClick={onCancelar} className="h-11 w-11 flex items-center justify-center" aria-label="Cerrar"><X size={20} /></button>
      </div>
      <p className={AYUDA}>Subí el PDF del contrato y leo el cliente, las fechas y el monto. No hace falta el precio de cada cosa: lo importante es que el evento sume a la ganancia del mes.</p>

      <input ref={entrada} type="file" accept="application/pdf,.pdf" className="hidden" onChange={alElegir} />
      <button type="button" className={`${BTN_PRIMARIO} min-h-[52px] w-full sm:w-auto`} onClick={() => entrada.current?.click()} disabled={leyendo}>
        <FileUp size={18} /> {leyendo ? 'Leyendo el PDF…' : leido ? 'Elegir otro PDF' : 'Elegir el PDF del contrato'}
      </button>
      {leido && nombreArchivo && <span className="ml-3 font-manrope text-sm text-stone-600">{nombreArchivo}</span>}

      <Mensaje aviso={aviso} />

      {leido && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ETIQUETA} htmlFor="imp-cliente">Cliente</label>
              <input id="imp-cliente" className={CAMPO} value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="imp-tel">Teléfono (opcional)</label>
              <input id="imp-tel" className={CAMPO} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div>
              <label className={ETIQUETA}>Fecha del evento</label>
              <CampoFecha valor={fecha} onChange={setFecha} />
            </div>
            <div>
              <label className={ETIQUETA}>Fecha de devolución</label>
              <CampoFecha valor={fechaHasta} onChange={setFechaHasta} />
            </div>
            <div className="sm:col-span-2">
              <label className={ETIQUETA} htmlFor="imp-lugar">Lugar (opcional)</label>
              <input id="imp-lugar" className={CAMPO} value={lugar} onChange={(e) => setLugar(e.target.value)} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="imp-total">Monto total del contrato</label>
              <input id="imp-total" className={CAMPO} inputMode="decimal" placeholder="$" value={total} onChange={(e) => setTotal(e.target.value)} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="imp-gastos">Lo que gastaste en ese evento (opcional)</label>
              <input id="imp-gastos" className={CAMPO} inputMode="decimal" placeholder="$ flete, subalquiler, etc." value={gastos} onChange={(e) => setGastos(e.target.value)} />
              <p className={AYUDA}>Si no te acordás, dejalo vacío: la ganancia va a mostrar el total y lo podés corregir después.</p>
            </div>
          </div>

          <div>
            <p className={ETIQUETA}>¿Cuánto se cobró?</p>
            <div className="flex flex-wrap gap-2">
              {([['completo', 'Se cobró todo'], ...(sena ? [['sena', `Solo la seña (${pesos(sena)})`]] : []), ['nada', 'Nada todavía']] as [Cobro, string][]).map(([v, t]) => (
                <button key={v} type="button" aria-pressed={cobro === v} onClick={() => setCobro(v)} className={`min-h-[48px] rounded-full px-4 font-manrope text-sm font-semibold ${cobro === v ? 'bg-stone-900 text-white' : 'border border-stone-300 bg-white text-stone-700'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-emerald-600 p-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Ganancia que suma este evento</p>
            <p className="text-2xl font-bold tabular-nums">{pesos(ganancia)}</p>
          </div>

          <div className="flex gap-2">
            <button type="button" className={BTN_PRIMARIO} onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar evento'}</button>
            <button type="button" className={BTN_SECUNDARIO} onClick={onCancelar}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
