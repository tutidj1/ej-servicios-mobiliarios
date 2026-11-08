'use client';

import { useCasa } from '@/lib/casa/sesion';
import PisoInicio from './PisoInicio';
import CostoHijos from './CostoHijos';
import RecibidoInicio from './RecibidoInicio';

/** Los adultos ven la casa y los hijos; los hijos y la administración técnica, solo lo suyo. */
export default function InicioSegunRol() {
  const { persona } = useCasa();
  if (!persona) return null;
  if (persona.rol === 'adulto') {
    return (
      <div className="space-y-10">
        <PisoInicio />
        <CostoHijos />
      </div>
    );
  }
  return <RecibidoInicio />;
}
