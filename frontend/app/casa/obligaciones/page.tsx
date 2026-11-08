import { CalendarCheck } from 'lucide-react';
import PantallaVacia from '@/components/casa/PantallaVacia';

export default function Pagina() {
  return <PantallaVacia icono={CalendarCheck} titulo="Sin obligaciones cargadas" texto="Acá van a estar las cuentas de la casa de cada mes: qué hay que pagar, quién se hace cargo y qué ya está pago." detalle="Las ven los dos adultos de la casa, completas." />;
}
