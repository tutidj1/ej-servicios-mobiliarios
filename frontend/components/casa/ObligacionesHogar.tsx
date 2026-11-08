'use client';

import { useState } from 'react';
import { Chips } from './ui';
import { MesObligaciones } from './ObligacionesPantalla';
import CoberturaHogar from './CoberturaHogar';

/** Obligaciones del hogar: el mes, y la cobertura con saldos e historial. */
export default function ObligacionesHogar() {
  const [vista, setVista] = useState<'mes' | 'cobertura'>('mes');
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
