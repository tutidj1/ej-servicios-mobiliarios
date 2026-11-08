'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { useCasa } from '@/lib/casa/sesion';
import { diaCorto, fechaLocalISO, formatearCentavos } from '@/lib/casa/dinero';
import { corregirMonto, parsearGasto, type ContextoVoz, type ResultadoVoz } from '@/lib/casa/vozGasto';

type Categoria = { id: string; nombre: string; tipo_defecto: 'fijo_obligatorio' | 'variable_necesario' | 'discrecional' };

// La API de voz del navegador (Chrome/Android, Safari recientes). Si no existe, queda el texto.
type Reconocedor = {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  start(): void; stop(): void;
  onresult: ((e: { results: { 0: { transcript: string }; isFinal: boolean }[] & { length: number } }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function crearReconocedor(): Reconocedor | null {
  const w = window as unknown as { SpeechRecognition?: new () => Reconocedor; webkitSpeechRecognition?: new () => Reconocedor };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = 'es-AR';
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.continuous = false;
  return r;
}

/**
 * Carga por voz o texto libre: se dice o se escribe una frase ("quince lucas en el súper") y la app devuelve UNA tarjeta
 * de confirmación con la categoría para cambiarla de un toque. Si no está segura del monto, pregunta; nunca lo inventa.
 */
export default function VozGasto({ categorias, alGuardar }: { categorias: Categoria[]; alGuardar: () => void | Promise<void> }) {
  const { cliente, persona } = useCasa();
  const [hayVoz, setHayVoz] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [texto, setTexto] = useState('');
  const [res, setRes] = useState<ResultadoVoz | null>(null);
  const [monto, setMonto] = useState<number | null>(null);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [origen, setOrigen] = useState<'voz' | 'web'>('web');
  const [correccion, setCorreccion] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<ContextoVoz>({});
  const rec = useRef<Reconocedor | null>(null);

  useEffect(() => { setHayVoz(crearReconocedor() !== null); }, []);

  // Para resolver "pagué la luz, 85" y reconocer "le transferí a <hijo>": solo lo que esta persona puede ver
  useEffect(() => {
    if (!cliente) return;
    Promise.all([
      cliente.from('obligaciones').select('concepto, monto_estimado'),
      cliente.from('hijos').select('nombre'),
    ]).then(([o, h]) => setCtx({
      obligaciones: (o.data ?? []) as ContextoVoz['obligaciones'],
      hijos: ((h.data ?? []) as { nombre: string }[]).map((x) => x.nombre),
    }));
  }, [cliente]);

  const procesar = useCallback((frase: string, desde: 'voz' | 'web') => {
    const r = parsearGasto(frase, fechaLocalISO(new Date()), ctx);
    setRes(r);
    setMonto(r.monto);
    setOrigen(desde);
    setCorreccion('');
    setError(null);
    setMensaje(null);
    setCategoriaId(categorias.find((c) => c.nombre === r.categoria)?.id ?? null);
  }, [ctx, categorias]);

  const escuchar = () => {
    if (escuchando) { rec.current?.stop(); return; }
    const r = crearReconocedor();
    if (!r) { setError('Este navegador no tiene reconocimiento de voz. Escribilo abajo.'); return; }
    rec.current = r;
    r.onresult = (e) => {
      const frase = e.results[0]?.[0]?.transcript ?? '';
      setTexto(frase);
      if (frase.trim()) procesar(frase, 'voz');
    };
    r.onerror = (e) => {
      setEscuchando(false);
      setError(e.error === 'not-allowed' ? 'No hay permiso para usar el micrófono. Podés escribirlo abajo.' : 'No se pudo escuchar. Probá de nuevo o escribilo abajo.');
    };
    r.onend = () => setEscuchando(false);
    setError(null);
    setEscuchando(true);
    r.start();
  };

  const guardar = async () => {
    if (!cliente || !persona || !res || monto === null) return;
    const cat = categorias.find((c) => c.id === categoriaId);
    if (!cat) return;
    const { error: e } = await cliente.from('gastos').insert({
      persona_id: persona.id, monto, categoria_id: cat.id, tipo: cat.tipo_defecto, fecha: res.fecha,
      descripcion: res.descripcion, origen,
    });
    if (e) { setError('No se pudo guardar el gasto. Probá de nuevo.'); return; }
    setMensaje(`Guardado ${formatearCentavos(monto)} en ${cat.nombre}`);
    setRes(null); setTexto(''); setMonto(null); setCategoriaId(null);
    await alGuardar();
  };

  const corregir = () => {
    const nuevo = corregirMonto(correccion, monto ?? res?.montoAmbiguo?.[1] ?? 0);
    if (nuevo === null) { setError('No entendí el monto. Decime solo el número (por ejemplo: "no, 20").'); return; }
    setMonto(nuevo);
    setCorreccion('');
    setError(null);
  };

  return (
    <section aria-label="Cargar por voz o texto" className="rounded-3xl border border-casa-borde bg-casa-panel p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={escuchar}
          disabled={!hayVoz}
          aria-label={escuchando ? 'Dejar de escuchar' : 'Hablar para cargar un gasto'}
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-casa-fondo transition-colors disabled:opacity-40 ${escuchando ? 'animate-pulse bg-casa-alerta' : 'bg-casa-acento active:bg-casa-acento-fuerte'}`}
        >
          <Mic size={34} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-casa-texto">{escuchando ? 'Te escucho…' : 'Decilo'}</p>
          <p className="text-xs text-casa-suave">{hayVoz ? 'Por ejemplo: "quince lucas en el súper".' : 'Este navegador no tiene voz: escribilo abajo.'}</p>
        </div>
      </div>

      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) procesar(texto, 'web'); }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="o escribilo: 45 mil de nafta, ayer"
          maxLength={160}
          className="min-w-0 flex-1 rounded-xl border border-casa-borde bg-casa-fondo px-4 py-3 text-base text-casa-texto placeholder:text-casa-suave/60 focus:border-casa-acento focus:outline-none"
        />
        <button type="submit" aria-label="Interpretar" className="rounded-xl bg-casa-panel-2 px-4 text-casa-acento"><Send size={20} /></button>
      </form>

      {hayVoz && <p className="mt-2 text-[0.7rem] leading-snug text-casa-suave">Ojo: al hablar, el navegador puede enviar el audio a su servicio de voz (Google, en Chrome) para pasarlo a texto. Nosotros no lo guardamos. Si preferís que no salga de tu teléfono, escribilo.</p>}

      {error && <p className="mt-3 text-sm text-casa-error" role="alert">{error}</p>}
      {mensaje && <p className="mt-3 text-sm font-semibold text-casa-acento" role="status">{mensaje}</p>}

      {res && (
        <div className="mt-4 space-y-4 rounded-2xl border border-casa-acento/30 bg-casa-fondo p-4" aria-label="Confirmación">
          <p className="text-xs text-casa-suave">Entendí: “{res.texto}”</p>

          {res.esTransferenciaAHijo ? (
            <p className="text-sm text-casa-texto">Eso es una transferencia a un hijo: cargala con el botón <strong>Transferencia</strong> en Inicio, así la ven los dos adultos.</p>
          ) : (
            <>
              {monto !== null ? (
                <p className="font-playfair text-3xl text-casa-texto">
                  {formatearCentavos(monto)}
                  {res.resueltoPorEstimado && <span className="ml-2 align-middle text-xs font-sans text-casa-suave">(por lo que suele costar {res.resueltoPorEstimado.toLowerCase()})</span>}
                </p>
              ) : res.montoAmbiguo ? (
                <div>
                  <p className="mb-2 text-sm text-casa-texto">¿De cuánto fue?</p>
                  <div className="flex gap-2">
                    {res.montoAmbiguo.map((m) => (
                      <button key={m} type="button" onClick={() => setMonto(m)} className="flex-1 rounded-xl border border-casa-borde py-3 text-base font-semibold text-casa-texto active:bg-casa-panel-2">{formatearCentavos(m)}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-casa-texto">No entendí el monto. Decilo de nuevo (por ejemplo “quince lucas”) o escribilo.</p>
              )}

              <p className="text-xs text-casa-suave">{res.fecha === fechaLocalISO(new Date()) ? 'Hoy' : diaCorto(res.fecha)}</p>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-casa-suave">{categoriaId ? 'Categoría (tocá para cambiarla)' : '¿En qué categoría?'}</p>
                <div className="grid grid-cols-2 gap-2">
                  {categorias.map((c) => (
                    <button key={c.id} type="button" onClick={() => setCategoriaId(c.id)} className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${categoriaId === c.id ? 'border-casa-acento bg-casa-acento/15 text-casa-acento' : 'border-casa-borde text-casa-texto'}`}>{c.nombre}</button>
                  ))}
                </div>
              </div>

              {monto !== null && (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (correccion.trim()) corregir(); }}>
                  <input value={correccion} onChange={(e) => setCorreccion(e.target.value)} placeholder="¿Otro monto? ej: no, 20" maxLength={40} className="min-w-0 flex-1 rounded-xl border border-casa-borde bg-casa-panel px-3 py-2.5 text-sm text-casa-texto placeholder:text-casa-suave/60 focus:border-casa-acento focus:outline-none" />
                  <button type="submit" className="rounded-xl border border-casa-borde px-3 text-sm font-semibold text-casa-texto">Corregir</button>
                </form>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setRes(null); setMonto(null); }} className="rounded-xl border border-casa-borde py-3 text-sm font-semibold text-casa-suave">Cancelar</button>
                <button type="button" onClick={() => void guardar()} disabled={monto === null || !categoriaId} className="rounded-xl bg-casa-acento py-3 text-sm font-bold text-casa-fondo disabled:opacity-40">Guardar</button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
