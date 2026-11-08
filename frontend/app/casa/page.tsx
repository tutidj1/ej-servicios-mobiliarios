import Link from 'next/link';
import { Home, Target } from 'lucide-react';
import PantallaVacia from '@/components/casa/PantallaVacia';
import TarjetaHuella from '@/components/casa/TarjetaHuella';

export default function Inicio() {
  return (
    <>
      <TarjetaHuella />
      <Link href="/casa/objetivos" className="mb-5 flex items-center gap-4 rounded-2xl border border-casa-borde bg-casa-panel px-4 py-4 active:bg-casa-panel-2">
        <Target size={22} className="text-casa-acento" />
        <span>
          <span className="block text-sm font-semibold text-casa-texto">Mis objetivos</span>
          <span className="block text-xs text-casa-suave">Lo que estás juntando. Solo lo ves vos.</span>
        </span>
      </Link>
      <PantallaVacia
        icono={Home}
        titulo="Todavía no hay datos"
        texto="Acá va a estar cuánto necesita la casa por mes y qué parte va cubierta."
        detalle="El piso se calcula con los gastos y obligaciones que se vayan cargando; necesita unos meses de datos para ser confiable."
      />
    </>
  );
}
