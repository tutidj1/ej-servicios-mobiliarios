'use client';

import { useState } from 'react';
import { Chips } from './ui';
import { useCasa } from '@/lib/casa/sesion';
import { MesObligaciones } from './ObligacionesPantalla';
import CoberturaHogar from './CoberturaHogar';

/** Obligaciones del hogar: el mes, y la cobertura con saldos e historial. */
export default function ObligacionesHogar() {
  const { persona } = useCasa();
  const [vista, setVista] = useState<'mes' | 'cobertura'>('mes');
  if (persona && persona.rol !== 'adulto') {
    return <p className="rounded-2xl border border-dashed border-casa-borde px-4 py-8 text-center text-sm text-casa-suave">Las obligaciones de la casa son de los adultos. Acá ves solo lo tuyo.</p>;
  }
  return (
    <div className="space-y-5">
      <Chips<'mes' | 'cobertura'>
        opciones={[{ valor: 'mes', etiqueta: 'Este mes' }, { valor: 'cobertura', etiqueta: 'Cobertura e historial' }]}
        valor={vista}
        onChange={setVista}
      />
      {vista === 'mes' ? <MesObligaciones /> : <CoberturaHogar />}
    </div>
  );
}
