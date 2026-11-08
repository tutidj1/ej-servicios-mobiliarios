import { CreditCard } from 'lucide-react';
import PantallaVacia from '@/components/casa/PantallaVacia';

export default function Pagina() {
  return <PantallaVacia icono={CreditCard} titulo="Sin deudas ni cuotas" texto="Acá vas a ver cuánto tenés comprometido por mes en cuotas y cuándo termina cada deuda." detalle="Es privado: lo ves solo vos." />;
}
