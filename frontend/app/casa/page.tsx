import Link from 'next/link';
import { Target, Wallet } from 'lucide-react';
import InicioSegunRol from '@/components/casa/InicioSegunRol';
import TarjetaHuella from '@/components/casa/TarjetaHuella';

export default function Inicio() {
  return (
    <>
      <TarjetaHuella />
      <InicioSegunRol />
      <Link href="/casa/excedente" className="mt-8 flex items-center gap-4 rounded-2xl border border-casa-borde bg-casa-panel px-4 py-4 active:bg-casa-panel-2">
        <Wallet size={22} className="text-casa-acento" />
        <span>
          <span className="block text-sm font-semibold text-casa-texto">Mi excedente</span>
          <span className="block text-xs text-casa-suave">Lo que te queda después de cumplir con todo. Solo lo ves vos.</span>
        </span>
      </Link>
      <Link href="/casa/objetivos" className="mt-3 flex items-center gap-4 rounded-2xl border border-casa-borde bg-casa-panel px-4 py-4 active:bg-casa-panel-2">
        <Target size={22} className="text-casa-acento" />
        <span>
          <span className="block text-sm font-semibold text-casa-texto">Mis objetivos</span>
          <span className="block text-xs text-casa-suave">Lo que estás juntando. Solo lo ves vos.</span>
        </span>
      </Link>
    </>
  );
}
